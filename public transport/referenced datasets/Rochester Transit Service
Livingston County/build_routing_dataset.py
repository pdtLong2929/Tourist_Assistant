#!/usr/bin/env python3
"""Build AI-routing-friendly artifacts from this GTFS feed."""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "generated"


def read_csv(name: str) -> list[dict[str, str]]:
    with (ROOT / name).open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def to_float(value: str) -> float | None:
    if value == "":
        return None
    return float(value)


def parse_time(value: str) -> int | None:
    if not value:
        return None
    hours, minutes, seconds = (int(part) for part in value.split(":"))
    return hours * 3600 + minutes * 60 + seconds


def compact_row(row: dict[str, str]) -> dict[str, str]:
    return {key: value for key, value in row.items() if value != ""}


def date_label(value: str) -> str:
    return datetime.strptime(value, "%Y%m%d").date().isoformat()


def build() -> None:
    OUT.mkdir(exist_ok=True)

    agencies = read_csv("agency.txt")
    feed_info = read_csv("feed_info.txt")
    routes = read_csv("routes.txt")
    stops = read_csv("stops.txt")
    trips = read_csv("trips.txt")
    stop_times = read_csv("stop_times.txt")
    shapes = read_csv("shapes.txt")
    calendar = read_csv("calendar.txt")
    calendar_dates = read_csv("calendar_dates.txt")

    stops_by_id = {
        row["stop_id"]: {
            "id": row["stop_id"],
            "code": row.get("stop_code") or None,
            "name": row["stop_name"],
            "lat": to_float(row["stop_lat"]),
            "lon": to_float(row["stop_lon"]),
            "zone_id": row.get("zone_id") or None,
        }
        for row in stops
    }

    routes_by_id = {
        row["route_id"]: {
            "id": row["route_id"],
            "agency_id": row["agency_id"],
            "short_name": row["route_short_name"],
            "long_name": row["route_long_name"],
            "type": "bus" if row["route_type"] == "3" else row["route_type"],
            "color": row.get("route_color") or None,
            "text_color": row.get("route_text_color") or None,
        }
        for row in routes
    }

    shapes_by_id: dict[str, list[dict[str, float]]] = defaultdict(list)
    for row in shapes:
        shapes_by_id[row["shape_id"]].append(
            {
                "lat": float(row["shape_pt_lat"]),
                "lon": float(row["shape_pt_lon"]),
                "sequence": int(row["shape_pt_sequence"]),
                "dist_traveled": to_float(row.get("shape_dist_traveled", "")),
            }
        )
    for points in shapes_by_id.values():
        points.sort(key=lambda point: point["sequence"])

    stop_times_by_trip: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in stop_times:
        arrival = parse_time(row["arrival_time"])
        departure = parse_time(row["departure_time"])
        stop_times_by_trip[row["trip_id"]].append(
            {
                "stop_id": row["stop_id"],
                "stop_sequence": int(row["stop_sequence"]),
                "arrival_time": row["arrival_time"],
                "departure_time": row["departure_time"],
                "arrival_seconds": arrival,
                "departure_seconds": departure,
                "pickup_type": row.get("pickup_type") or None,
                "drop_off_type": row.get("drop_off_type") or None,
                "shape_dist_traveled": to_float(row.get("shape_dist_traveled", "")),
                "timepoint": row.get("timepoint") or None,
            }
        )
    for rows in stop_times_by_trip.values():
        rows.sort(key=lambda row: int(row["stop_sequence"]))

    services = {}
    for row in calendar:
        services[row["service_id"]] = {
            "id": row["service_id"],
            "days": {
                day: row[day] == "1"
                for day in (
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                )
            },
            "start_date": date_label(row["start_date"]),
            "end_date": date_label(row["end_date"]),
            "exceptions": [],
        }
    for row in calendar_dates:
        services.setdefault(
            row["service_id"],
            {"id": row["service_id"], "days": {}, "start_date": None, "end_date": None, "exceptions": []},
        )
        services[row["service_id"]]["exceptions"].append(
            {
                "date": date_label(row["date"]),
                "type": "added" if row["exception_type"] == "1" else "removed",
            }
        )

    route_stop_sets: dict[str, set[str]] = defaultdict(set)
    route_trip_ids: dict[str, list[str]] = defaultdict(list)
    pattern_ids: dict[tuple[str, tuple[str, ...]], str] = {}
    patterns: dict[str, dict[str, object]] = {}
    normalized_trips = []
    edges = []

    for trip in trips:
        trip_id = trip["trip_id"]
        route_id = trip["route_id"]
        times = stop_times_by_trip[trip_id]
        stop_sequence = tuple(str(row["stop_id"]) for row in times)
        pattern_key = (route_id, stop_sequence)
        if pattern_key not in pattern_ids:
            pattern_id = f"pattern-{len(pattern_ids) + 1}"
            pattern_ids[pattern_key] = pattern_id
            patterns[pattern_id] = {
                "id": pattern_id,
                "route_id": route_id,
                "stop_ids": list(stop_sequence),
                "trip_ids": [],
            }
        pattern_id = pattern_ids[pattern_key]
        patterns[pattern_id]["trip_ids"].append(trip_id)
        route_trip_ids[route_id].append(trip_id)
        route_stop_sets[route_id].update(stop_sequence)

        normalized_trips.append(
            {
                "id": trip_id,
                "route_id": route_id,
                "service_id": trip["service_id"],
                "headsign": trip.get("trip_headsign") or None,
                "short_name": trip.get("trip_short_name") or None,
                "shape_id": trip.get("shape_id") or None,
                "pattern_id": pattern_id,
                "stop_times": times,
            }
        )

        for index, origin in enumerate(times[:-1]):
            destination = times[index + 1]
            dep = origin["departure_seconds"]
            arr = destination["arrival_seconds"]
            travel_seconds = None
            if isinstance(dep, int) and isinstance(arr, int):
                travel_seconds = arr - dep
                if travel_seconds < 0:
                    travel_seconds += 24 * 60 * 60
            distance = None
            origin_dist = origin["shape_dist_traveled"]
            destination_dist = destination["shape_dist_traveled"]
            if origin_dist is not None and destination_dist is not None:
                distance = destination_dist - origin_dist
            edges.append(
                {
                    "route_id": route_id,
                    "trip_id": trip_id,
                    "pattern_id": pattern_id,
                    "from_stop_id": origin["stop_id"],
                    "from_stop_name": stops_by_id[str(origin["stop_id"])]["name"],
                    "to_stop_id": destination["stop_id"],
                    "to_stop_name": stops_by_id[str(destination["stop_id"])]["name"],
                    "departure_time": origin["departure_time"],
                    "arrival_time": destination["arrival_time"],
                    "travel_seconds": travel_seconds,
                    "shape_distance": distance,
                }
            )

    for route_id, route in routes_by_id.items():
        route["trip_ids"] = route_trip_ids[route_id]
        route["stop_ids"] = sorted(route_stop_sets[route_id], key=lambda value: int(value))

    dataset = {
        "metadata": {
            "source": "GTFS",
            "generated_by": "build_routing_dataset.py",
            "feed": compact_row(feed_info[0]) if feed_info else {},
            "agency": compact_row(agencies[0]) if agencies else {},
            "counts": {
                "routes": len(routes_by_id),
                "stops": len(stops_by_id),
                "trips": len(normalized_trips),
                "patterns": len(patterns),
                "edges": len(edges),
                "shapes": len(shapes_by_id),
            },
        },
        "routes": list(routes_by_id.values()),
        "stops": list(stops_by_id.values()),
        "services": list(services.values()),
        "patterns": list(patterns.values()),
        "trips": normalized_trips,
        "shapes": shapes_by_id,
    }
    routing_core = {
        key: value
        for key, value in dataset.items()
        if key != "shapes"
    }
    routing_core["edges"] = edges

    (OUT / "routing_dataset.json").write_text(json.dumps(dataset, indent=2), encoding="utf-8")
    (OUT / "routing_core.json").write_text(json.dumps(routing_core, indent=2), encoding="utf-8")
    (OUT / "stops.json").write_text(json.dumps(list(stops_by_id.values()), indent=2), encoding="utf-8")

    with (OUT / "route_edges.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(edges[0].keys()))
        writer.writeheader()
        writer.writerows(edges)

    summary = {
        "routes": len(routes_by_id),
        "stops": len(stops_by_id),
        "trips": len(normalized_trips),
        "patterns": len(patterns),
        "edges": len(edges),
        "shapes": len(shapes_by_id),
    }
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")


if __name__ == "__main__":
    build()
