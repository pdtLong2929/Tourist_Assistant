"""
GTFS Builder — assembles valid GTFS text files from scraped data and
packages them into a zip archive.

GTFS spec reference: https://gtfs.org/schedule/reference/

Files produced:
  agency.txt        - transit agency
  routes.txt        - route definitions
  stops.txt         - stop locations
  trips.txt         - one trip per route×direction×time-of-day-band
  stop_times.txt    - interpolated stop times per trip
  calendar.txt      - service days (daily service)
  shapes.txt        - route polylines
  frequencies.txt   - headway-based service (when exact times unavailable)
  feed_info.txt     - feed metadata
"""

import csv
import io
import logging
import os
import zipfile
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import List, Optional, Dict, Tuple

from config import CityConfig
from dataclasses import dataclass, field as dc_field
from typing import Optional as Opt

@dataclass
class BusStop:
    stop_id: str
    name: str
    lat: float
    lon: float
    address: str = ""
    street: str = ""

@dataclass
class RouteSchedule:
    headway_min: int
    headway_offpeak_min: int
    first_departure: str
    last_departure: str
    operates_days: list = dc_field(default_factory=lambda: [
        "monday","tuesday","wednesday","thursday","friday","saturday","sunday"
    ])

@dataclass
class BusRoute:
    route_id: str
    route_short_name: str
    route_long_name: str
    route_color: str
    route_text_color: str
    distance_km: float
    fare_vnd: int
    city_code: str
    stops_outbound: list = dc_field(default_factory=list)
    shape_outbound: list = dc_field(default_factory=list)
    stops_inbound: list = dc_field(default_factory=list)
    shape_inbound: list = dc_field(default_factory=list)
    schedule: Opt[RouteSchedule] = None
from utils.geo import cumulative_dist, snap_stop_to_shape

log = logging.getLogger(__name__)

# Service date range: today → today + 180 days
_today = date.today()
FEED_START = _today.strftime("%Y%m%d")
FEED_END = (_today + timedelta(days=180)).strftime("%Y%m%d")

# Average bus speed used for interpolating stop times (km/h)
BUS_SPEED_KMH = 20.0

ROUTE_TYPE_BUS = "3"
DIRECTION_OUTBOUND = "0"
DIRECTION_INBOUND = "1"


class GTFSBuilder:
    """
    Build GTFS feed from scraped BusRoute objects.

    Usage:
        builder = GTFSBuilder(city_config)
        for route in routes:
            builder.add_route(route)
        builder.write_zip("output/hcmc/gtfs.zip")
    """

    def __init__(self, city: CityConfig):
        self.city = city
        self._stops: Dict[str, dict] = {}       # stop_id → row
        self._routes: List[dict] = []
        self._trips: List[dict] = []
        self._stop_times: List[dict] = []
        self._shapes: List[dict] = []
        self._frequencies: List[dict] = []
        self._trip_counter = 0
        self._shape_counter = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add_route(self, route: BusRoute):
        """Add a BusRoute to the feed."""
        route_row = {
            "route_id":         route.route_id,
            "agency_id":        self.city.gtfs_agency_id,
            "route_short_name": route.route_short_name,
            "route_long_name":  route.route_long_name,
            "route_type":       ROUTE_TYPE_BUS,
            "route_color":      route.route_color,
            "route_text_color": route.route_text_color,
            "route_url":        "",
            "route_desc":       f"Distance: {route.distance_km:.1f} km | Fare: {route.fare_vnd:,} VND",
        }
        self._routes.append(route_row)

        sched = route.schedule

        # Outbound direction
        if route.stops_outbound:
            shape_id = self._add_shape(route.shape_outbound or [], route.route_id, "out")
            trip_id = self._add_trip(route, DIRECTION_OUTBOUND, shape_id, "service_daily")
            self._add_stop_times(trip_id, route.stops_outbound, route.shape_outbound or [])
            if sched:
                self._add_frequency(trip_id, sched)

        # Inbound direction
        if route.stops_inbound:
            shape_id_in = self._add_shape(route.shape_inbound or [], route.route_id, "in")
            trip_id_in = self._add_trip(route, DIRECTION_INBOUND, shape_id_in, "service_daily")
            self._add_stop_times(trip_id_in, route.stops_inbound, route.shape_inbound or [])
            if sched:
                self._add_frequency(trip_id_in, sched)

        # Register stops
        for stop in route.stops_outbound + route.stops_inbound:
            self._register_stop(stop)

    def write_zip(self, output_path: str):
        """Write all GTFS files into a zip archive."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        log.info("[GTFS] Writing feed to %s", output_path)

        with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("agency.txt",      self._agency_txt())
            zf.writestr("routes.txt",      self._csv(self._routes))
            zf.writestr("stops.txt",       self._csv(list(self._stops.values())))
            zf.writestr("trips.txt",       self._csv(self._trips))
            zf.writestr("stop_times.txt",  self._csv(self._stop_times))
            zf.writestr("calendar.txt",    self._calendar_txt())
            zf.writestr("shapes.txt",      self._csv(self._shapes))
            zf.writestr("frequencies.txt", self._csv(self._frequencies))
            zf.writestr("feed_info.txt",   self._feed_info_txt())

        log.info(
            "[GTFS] Done: %d routes, %d stops, %d trips, %d stop_times",
            len(self._routes), len(self._stops),
            len(self._trips), len(self._stop_times),
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _add_shape(self, coords: List[tuple], route_id: str, direction: str) -> str:
        self._shape_counter += 1
        shape_id = f"shape_{route_id}_{direction}"
        dists = cumulative_dist(coords) if coords else []
        for seq, (coord, dist) in enumerate(zip(coords, dists)):
            self._shapes.append({
                "shape_id":             shape_id,
                "shape_pt_lat":         f"{coord[0]:.6f}",
                "shape_pt_lon":         f"{coord[1]:.6f}",
                "shape_pt_sequence":    seq,
                "shape_dist_traveled":  f"{dist:.1f}",
            })
        return shape_id

    def _add_trip(
        self, route: BusRoute, direction: str,
        shape_id: str, service_id: str,
    ) -> str:
        self._trip_counter += 1
        trip_id = f"trip_{route.route_id}_{direction}_{self._trip_counter}"
        headsign = self._make_headsign(route, direction)
        self._trips.append({
            "route_id":     route.route_id,
            "service_id":   service_id,
            "trip_id":      trip_id,
            "trip_headsign":headsign,
            "direction_id": direction,
            "shape_id":     shape_id,
        })
        return trip_id

    def _make_headsign(self, route: BusRoute, direction: str) -> str:
        parts = route.route_long_name.split("–")
        if len(parts) >= 2:
            return parts[0].strip() if direction == DIRECTION_INBOUND else parts[-1].strip()
        return route.route_long_name

    def _add_stop_times(
        self,
        trip_id: str,
        stops: List[BusStop],
        shape: List[tuple],
    ):
        """
        Interpolate stop times based on cumulative distance and average speed.
        Departure time starts at 00:00:00 (offset from trip start).
        frequencies.txt defines actual departure times.
        """
        shape_dists = cumulative_dist(shape) if shape else []
        total_dist_m = shape_dists[-1] if shape_dists else 0.0

        for seq, stop in enumerate(stops):
            if shape and shape_dists:
                dist_m = snap_stop_to_shape((stop.lat, stop.lon), shape, shape_dists)
            elif total_dist_m > 0 and len(stops) > 1:
                # Linear interpolation if no shape
                dist_m = total_dist_m * seq / (len(stops) - 1)
            else:
                dist_m = 0.0

            travel_sec = int(dist_m / (BUS_SPEED_KMH * 1000 / 3600))
            time_str = _seconds_to_gtfs_time(travel_sec)

            self._stop_times.append({
                "trip_id":              trip_id,
                "arrival_time":         time_str,
                "departure_time":       time_str,
                "stop_id":              stop.stop_id,
                "stop_sequence":        seq,
                "shape_dist_traveled":  f"{dist_m:.1f}",
                "pickup_type":          "0",
                "drop_off_type":        "0",
            })

    def _add_frequency(self, trip_id: str, sched):
        # Peak hours: 06:00–09:00 and 16:00–20:00
        # Off-peak: rest
        intervals = [
            (sched.first_departure, "06:00", sched.headway_offpeak_min),
            ("06:00", "09:00", sched.headway_min),
            ("09:00", "16:00", sched.headway_offpeak_min),
            ("16:00", "20:00", sched.headway_min),
            ("20:00", sched.last_departure, sched.headway_offpeak_min),
        ]
        for start, end, hw in intervals:
            if _time_to_seconds(start) >= _time_to_seconds(end):
                continue
            self._frequencies.append({
                "trip_id":       trip_id,
                "start_time":    start,
                "end_time":      end,
                "headway_secs":  hw * 60,
                "exact_times":   "0",
            })

    def _register_stop(self, stop: BusStop):
        if stop.stop_id and stop.stop_id not in self._stops:
            self._stops[stop.stop_id] = {
                "stop_id":   stop.stop_id,
                "stop_name": stop.name,
                "stop_desc": stop.address,
                "stop_lat":  f"{stop.lat:.6f}",
                "stop_lon":  f"{stop.lon:.6f}",
                "zone_id":   "",
                "stop_url":  "",
            }

    # ------------------------------------------------------------------
    # Text file builders
    # ------------------------------------------------------------------

    def _agency_txt(self) -> str:
        rows = [{
            "agency_id":       self.city.gtfs_agency_id,
            "agency_name":     self.city.gtfs_agency_name,
            "agency_url":      self.city.gtfs_agency_url,
            "agency_timezone": self.city.gtfs_agency_timezone,
            "agency_lang":     self.city.gtfs_agency_lang,
        }]
        return self._csv(rows)

    def _calendar_txt(self) -> str:
        rows = [{
            "service_id": "service_daily",
            "monday": "1", "tuesday": "1", "wednesday": "1",
            "thursday": "1", "friday": "1", "saturday": "1", "sunday": "1",
            "start_date": FEED_START,
            "end_date": FEED_END,
        }]
        return self._csv(rows)

    def _feed_info_txt(self) -> str:
        rows = [{
            "feed_publisher_name": "vietnam-gtfs (community scraper)",
            "feed_publisher_url":  "https://github.com/yourname/vietnam-gtfs",
            "feed_lang":           "vi",
            "feed_start_date":     FEED_START,
            "feed_end_date":       FEED_END,
            "feed_version":        _today.strftime("%Y%m%d"),
        }]
        return self._csv(rows)

    @staticmethod
    def _csv(rows: List[dict]) -> str:
        if not rows:
            return ""
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        return buf.getvalue()


# ---------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------

def _seconds_to_gtfs_time(seconds: int) -> str:
    """Convert seconds-since-midnight to HH:MM:SS (may exceed 24h)."""
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def _time_to_seconds(t: str) -> int:
    """Convert 'HH:MM' or 'HH:MM:SS' to seconds since midnight."""
    parts = t.strip().split(":")
    h, m = int(parts[0]), int(parts[1])
    s = int(parts[2]) if len(parts) > 2 else 0
    return h * 3600 + m * 60 + s
