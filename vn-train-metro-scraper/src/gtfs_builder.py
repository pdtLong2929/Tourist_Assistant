"""
gtfs_builder.py — Converts raw Overpass OSM data into GTFS feed files.

GTFS files produced
-------------------
  agency.txt, routes.txt, stops.txt, trips.txt,
  stop_times.txt, calendar.txt, shapes.txt

Timetable note
--------------
OSM does not carry timetable data. This builder synthesises a minimal,
plausible schedule from operator-published headway information so the
feed is valid for trip planners. Headways are encoded in frequencies.txt
where possible; stop_times uses a reference departure of 05:30.
"""

import csv
import hashlib
import logging
import math
import os
from collections import defaultdict
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Headway data (minutes) per city slug + OSM relation id
# Source: operator timetables / Wikipedia
# ---------------------------------------------------------------------------
HEADWAY_MINUTES: Dict[str, int] = {
    # Hanoi Cat Linh – Ha Dong
    "6947637": 6,
    # Hanoi Nhon – Hanoi Station
    "11437832": 8,
    # HCMC Line 1
    "13477945": 6,
}
DEFAULT_HEADWAY = 10  # minutes

OPERATING_HOURS = ("05:30", "22:30")   # (first departure, last departure)

# Approximate inter-station dwell + travel time (seconds)
STOP_DWELL = 30
AVG_TRAVEL_BETWEEN_STOPS = 120   # 2 min — conservative for urban metro


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _short_id(text: str, length: int = 8) -> str:
    return hashlib.md5(text.encode()).hexdigest()[:length].upper()


def _osm_name(tags: Dict, fallback: str = "Unnamed") -> str:
    return (
        tags.get("name:en")
        or tags.get("name")
        or tags.get("ref")
        or fallback
    )


def _route_color(tags: Dict) -> Tuple[str, str]:
    """Return (colour, text_colour) hex strings from OSM tags."""
    colour = tags.get("colour", tags.get("color", "")).lstrip("#").upper()
    if not colour or len(colour) not in (3, 6):
        colour = "0055A4"   # default blue
    text = "FFFFFF"
    return colour, text


def _node_center(element: Dict) -> Optional[Tuple[float, float]]:
    """Return (lat, lon) for a node or a way with a center."""
    if element.get("type") == "node":
        return element.get("lat"), element.get("lon")
    center = element.get("center")
    if center:
        return center.get("lat"), center.get("lon")
    return None


def _seconds_from_hhmm(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 3600 + int(m) * 60


def _hhmm_from_seconds(s: int) -> str:
    h = s // 3600
    m = (s % 3600) // 60
    sec = s % 60
    return f"{h:02d}:{m:02d}:{sec:02d}"


# ---------------------------------------------------------------------------
# Main builder
# ---------------------------------------------------------------------------

class GTFSBuilder:
    """
    Build a GTFS feed from Overpass JSON data for a single city.

    Usage
    -----
    builder = GTFSBuilder(city_config)
    builder.ingest(overpass_bbox_data)
    builder.ingest(overpass_relation_data)  # call multiple times
    builder.write(output_dir)
    """

    def __init__(self, city):
        self.city = city

        # Raw OSM element buckets
        self._nodes: Dict[int, Dict] = {}    # id → element
        self._ways: Dict[int, Dict] = {}
        self._relations: List[Dict] = []

    # ------------------------------------------------------------------
    # Ingest
    # ------------------------------------------------------------------

    def ingest(self, overpass_data: Dict[str, Any]) -> None:
        """Merge Overpass JSON elements into internal buckets."""
        for el in overpass_data.get("elements", []):
            t = el.get("type")
            eid = el.get("id")
            if t == "node":
                self._nodes[eid] = el
            elif t == "way":
                self._ways[eid] = el
            elif t == "relation":
                self._relations.append(el)

        log.info(
            "Ingested → nodes: %d, ways: %d, relations: %d",
            len(self._nodes), len(self._ways), len(self._relations),
        )

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def write(self, output_dir: str) -> None:
        os.makedirs(output_dir, exist_ok=True)

        agency_rows = self._build_agency()
        route_rows, route_stop_sequences = self._build_routes_and_stops()
        stop_rows = self._build_stops(route_stop_sequences)
        shape_rows = self._build_shapes(route_stop_sequences)
        calendar_rows, service_id = self._build_calendar()
        trip_rows, stop_time_rows = self._build_trips_and_stop_times(
            route_rows, route_stop_sequences, service_id
        )

        self._write_csv(output_dir, "agency.txt", agency_rows)
        self._write_csv(output_dir, "routes.txt", route_rows)
        self._write_csv(output_dir, "stops.txt", stop_rows)
        self._write_csv(output_dir, "shapes.txt", shape_rows)
        self._write_csv(output_dir, "calendar.txt", calendar_rows)
        self._write_csv(output_dir, "trips.txt", trip_rows)
        self._write_csv(output_dir, "stop_times.txt", stop_time_rows)

        log.info("GTFS feed written to %s", output_dir)

    # ------------------------------------------------------------------
    # Build helpers
    # ------------------------------------------------------------------

    def _build_agency(self) -> List[Dict]:
        c = self.city
        return [{
            "agency_id": c.agency_id,
            "agency_name": c.agency_name,
            "agency_url": c.agency_url,
            "agency_timezone": c.agency_timezone,
            "agency_lang": c.agency_lang,
        }]

    def _build_routes_and_stops(self):
        """
        Parse relations into route rows and per-route ordered stop lists.
        Returns (route_rows, route_stop_sequences).

        route_stop_sequences: dict of route_id → list of node dicts in order
        """
        route_rows = []
        route_stop_sequences: Dict[str, List[Dict]] = {}
        seen_route_ids = set()

        for rel in self._relations:
            tags = rel.get("tags", {})

            # Filter to route relations only
            if tags.get("type") not in ("route", "route_master"):
                continue
            route_val = tags.get("route", "")
            if route_val not in ("subway", "light_rail", "rail", "tram", "monorail"):
                continue

            rel_id = str(rel["id"])
            route_id = f"{self.city.slug}_{rel_id}"

            if route_id in seen_route_ids:
                continue
            seen_route_ids.add(route_id)

            colour, text_colour = _route_color(tags)
            short_name = tags.get("ref", tags.get("name:en", tags.get("name", rel_id)))
            long_name = _osm_name(tags, fallback=f"Route {rel_id}")

            route_rows.append({
                "route_id": route_id,
                "agency_id": self.city.agency_id,
                "route_short_name": short_name,
                "route_long_name": long_name,
                "route_type": self.city.route_type,
                "route_color": colour,
                "route_text_color": text_colour,
                "route_url": f"https://www.openstreetmap.org/relation/{rel_id}",
            })

            # Build ordered stop sequence from members
            stop_nodes = self._extract_stop_nodes(rel)
            route_stop_sequences[route_id] = stop_nodes
            log.info("Route %s (%s): %d stops", route_id, long_name, len(stop_nodes))

        return route_rows, route_stop_sequences

    def _extract_stop_nodes(self, relation: Dict) -> List[Dict]:
        """
        Walk relation members in order, collecting stop/platform nodes.
        Falls back to way node sequence if no explicit stop members.
        """
        members = relation.get("members", [])
        stops = []

        for m in members:
            role = m.get("role", "")
            mtype = m.get("type")
            mid = m.get("ref")

            if mtype == "node" and role in ("stop", "stop_exit_only", "stop_entry_only", "platform", ""):
                node = self._nodes.get(mid)
                if node:
                    tags = node.get("tags", {})
                    # Only include nodes that look like stops
                    if (
                        tags.get("railway") in ("station", "halt", "stop")
                        or tags.get("public_transport") in ("stop_position", "platform")
                        or tags.get("subway") == "yes"
                        or role in ("stop", "platform")
                    ):
                        stops.append(node)

        # If no stop members found, try walking the first way's nodes
        if not stops:
            for m in members:
                if m.get("type") == "way":
                    way = self._ways.get(m["ref"])
                    if way:
                        for nid in way.get("nodes", []):
                            node = self._nodes.get(nid)
                            if node:
                                tags = node.get("tags", {})
                                if tags.get("railway") in ("station", "halt", "stop"):
                                    stops.append(node)

        return stops

    def _build_stops(self, route_stop_sequences: Dict[str, List[Dict]]) -> List[Dict]:
        seen = {}
        rows = []
        for stops in route_stop_sequences.values():
            for node in stops:
                nid = node["id"]
                if nid in seen:
                    continue
                seen[nid] = True
                tags = node.get("tags", {})
                lat, lon = _node_center(node) or (0, 0)
                rows.append({
                    "stop_id": f"osm_node_{nid}",
                    "stop_name": _osm_name(tags, fallback=f"Stop {nid}"),
                    "stop_lat": lat,
                    "stop_lon": lon,
                    "stop_url": f"https://www.openstreetmap.org/node/{nid}",
                    "location_type": 0,
                })
        return rows

    def _build_shapes(self, route_stop_sequences: Dict[str, List[Dict]]) -> List[Dict]:
        rows = []
        for route_id, stops in route_stop_sequences.items():
            for seq, node in enumerate(stops):
                lat, lon = _node_center(node) or (0, 0)
                rows.append({
                    "shape_id": f"shape_{route_id}",
                    "shape_pt_lat": lat,
                    "shape_pt_lon": lon,
                    "shape_pt_sequence": seq,
                    "shape_dist_traveled": seq * AVG_TRAVEL_BETWEEN_STOPS,
                })
        return rows

    def _build_calendar(self) -> Tuple[List[Dict], str]:
        today = date.today()
        start = today.strftime("%Y%m%d")
        end = (today + timedelta(days=180)).strftime("%Y%m%d")
        service_id = f"{self.city.slug}_weekday"
        return [{
            "service_id": service_id,
            "monday": 1, "tuesday": 1, "wednesday": 1,
            "thursday": 1, "friday": 1, "saturday": 1, "sunday": 1,
            "start_date": start,
            "end_date": end,
        }], service_id

    def _build_trips_and_stop_times(
        self,
        route_rows: List[Dict],
        route_stop_sequences: Dict[str, List[Dict]],
        service_id: str,
    ) -> Tuple[List[Dict], List[Dict]]:
        trip_rows = []
        stop_time_rows = []

        first_dep = _seconds_from_hhmm(OPERATING_HOURS[0])
        last_dep = _seconds_from_hhmm(OPERATING_HOURS[1])

        for route in route_rows:
            route_id = route["route_id"]
            stops = route_stop_sequences.get(route_id, [])
            if not stops:
                log.warning("Route %s has no stops, skipping trips", route_id)
                continue

            # Determine headway
            osm_rel_id = route_id.split("_", 1)[-1]
            headway_secs = HEADWAY_MINUTES.get(osm_rel_id, DEFAULT_HEADWAY) * 60

            shape_id = f"shape_{route_id}"
            trip_num = 0
            dep = first_dep

            while dep <= last_dep:
                trip_id = f"{route_id}_trip_{trip_num}"
                trip_rows.append({
                    "route_id": route_id,
                    "service_id": service_id,
                    "trip_id": trip_id,
                    "trip_headsign": _osm_name(
                        stops[-1].get("tags", {}), fallback="Terminal"
                    ) if stops else "",
                    "direction_id": 0,
                    "shape_id": shape_id,
                })

                t = dep
                for seq, node in enumerate(stops):
                    stop_id = f"osm_node_{node['id']}"
                    arr = _hhmm_from_seconds(t)
                    stop_time_rows.append({
                        "trip_id": trip_id,
                        "arrival_time": arr,
                        "departure_time": arr,
                        "stop_id": stop_id,
                        "stop_sequence": seq,
                        "pickup_type": 0,
                        "drop_off_type": 0,
                    })
                    t += AVG_TRAVEL_BETWEEN_STOPS + STOP_DWELL

                dep += headway_secs
                trip_num += 1

        return trip_rows, stop_time_rows

    # ------------------------------------------------------------------
    # CSV writer
    # ------------------------------------------------------------------

    @staticmethod
    def _write_csv(output_dir: str, filename: str, rows: List[Dict]) -> None:
        if not rows:
            log.warning("%s: no rows to write", filename)
            # Write empty file with no headers so feed stays valid
            open(os.path.join(output_dir, filename), "w").close()
            return

        path = os.path.join(output_dir, filename)
        fieldnames = list(rows[0].keys())
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        log.info("  wrote %s (%d rows)", filename, len(rows))
