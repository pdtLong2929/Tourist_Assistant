"""
tests/test_gtfs.py — Validate GTFS output and unit-test builder logic.

Run:
    pytest tests/
"""

import csv
import os
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from cities import HANOI, HCMC
from gtfs_builder import GTFSBuilder, _hhmm_from_seconds, _seconds_from_hhmm, _osm_name


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_RELATION = {
    "type": "relation",
    "id": 99999,
    "tags": {
        "type": "route",
        "route": "subway",
        "name": "Test Metro Line",
        "ref": "TM1",
        "colour": "#FF0000",
    },
    "members": [
        {"type": "node", "ref": 1001, "role": "stop"},
        {"type": "node", "ref": 1002, "role": "stop"},
        {"type": "node", "ref": 1003, "role": "stop"},
    ],
}

SAMPLE_NODES = [
    {
        "type": "node", "id": 1001,
        "lat": 10.7769, "lon": 106.7009,
        "tags": {"name": "Ben Thanh", "railway": "station", "public_transport": "stop_position"},
    },
    {
        "type": "node", "id": 1002,
        "lat": 10.7900, "lon": 106.7100,
        "tags": {"name": "Opera House", "railway": "station", "public_transport": "stop_position"},
    },
    {
        "type": "node", "id": 1003,
        "lat": 10.8000, "lon": 106.7200,
        "tags": {"name": "Ba Son", "railway": "station", "public_transport": "stop_position"},
    },
]

SAMPLE_OVERPASS = {"elements": [SAMPLE_RELATION] + SAMPLE_NODES}


def make_builder(city=None) -> GTFSBuilder:
    return GTFSBuilder(city or HCMC)


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

class TestHelpers:
    def test_seconds_round_trip(self):
        s = _seconds_from_hhmm("05:30")
        assert _hhmm_from_seconds(s) == "05:30:00"

    def test_osm_name_prefers_english(self):
        tags = {"name": "Bến Thành", "name:en": "Ben Thanh"}
        assert _osm_name(tags) == "Ben Thanh"

    def test_osm_name_fallback(self):
        assert _osm_name({}) == "Unnamed"
        assert _osm_name({}, fallback="Stop X") == "Stop X"


class TestBuilder:
    def test_ingest_counts(self):
        b = make_builder()
        b.ingest(SAMPLE_OVERPASS)
        assert len(b._nodes) == 3
        assert len(b._relations) == 1

    def test_ingest_twice_deduplicates_nodes(self):
        b = make_builder()
        b.ingest(SAMPLE_OVERPASS)
        b.ingest(SAMPLE_OVERPASS)
        assert len(b._nodes) == 3   # not doubled

    def test_write_creates_all_files(self):
        b = make_builder()
        b.ingest(SAMPLE_OVERPASS)
        with tempfile.TemporaryDirectory() as tmpdir:
            b.write(tmpdir)
            required = [
                "agency.txt", "routes.txt", "stops.txt",
                "trips.txt", "stop_times.txt", "calendar.txt", "shapes.txt",
            ]
            for fname in required:
                assert os.path.exists(os.path.join(tmpdir, fname)), f"Missing {fname}"

    def test_agency_content(self):
        b = make_builder(HCMC)
        b.ingest(SAMPLE_OVERPASS)
        with tempfile.TemporaryDirectory() as tmpdir:
            b.write(tmpdir)
            rows = _read_csv(tmpdir, "agency.txt")
            assert len(rows) == 1
            assert rows[0]["agency_id"] == "HCMC_METRO"
            assert rows[0]["agency_timezone"] == "Asia/Ho_Chi_Minh"

    def test_routes_content(self):
        b = make_builder()
        b.ingest(SAMPLE_OVERPASS)
        with tempfile.TemporaryDirectory() as tmpdir:
            b.write(tmpdir)
            rows = _read_csv(tmpdir, "routes.txt")
            assert len(rows) == 1
            assert rows[0]["route_short_name"] == "TM1"
            assert rows[0]["route_color"] == "FF0000"

    def test_stops_content(self):
        b = make_builder()
        b.ingest(SAMPLE_OVERPASS)
        with tempfile.TemporaryDirectory() as tmpdir:
            b.write(tmpdir)
            rows = _read_csv(tmpdir, "stops.txt")
            assert len(rows) == 3
            names = {r["stop_name"] for r in rows}
            assert "Ben Thanh" in names

    def test_stop_times_ordered(self):
        b = make_builder()
        b.ingest(SAMPLE_OVERPASS)
        with tempfile.TemporaryDirectory() as tmpdir:
            b.write(tmpdir)
            rows = _read_csv(tmpdir, "stop_times.txt")
            assert len(rows) > 0
            # For the first trip, sequences should be 0, 1, 2
            first_trip = rows[0]["trip_id"]
            first_trip_rows = [r for r in rows if r["trip_id"] == first_trip]
            seqs = [int(r["stop_sequence"]) for r in first_trip_rows]
            assert seqs == sorted(seqs)
            assert seqs[0] == 0

    def test_calendar_dates(self):
        from datetime import date
        b = make_builder()
        b.ingest(SAMPLE_OVERPASS)
        with tempfile.TemporaryDirectory() as tmpdir:
            b.write(tmpdir)
            rows = _read_csv(tmpdir, "calendar.txt")
            assert len(rows) == 1
            row = rows[0]
            assert row["monday"] == "1"
            assert row["sunday"] == "1"
            # end_date should be after start_date
            assert row["end_date"] > row["start_date"]

    def test_shapes_content(self):
        b = make_builder()
        b.ingest(SAMPLE_OVERPASS)
        with tempfile.TemporaryDirectory() as tmpdir:
            b.write(tmpdir)
            rows = _read_csv(tmpdir, "shapes.txt")
            assert len(rows) == 3
            seqs = [int(r["shape_pt_sequence"]) for r in rows]
            assert seqs == sorted(seqs)


class TestCityConfigs:
    def test_hanoi_bbox_valid(self):
        s, w, n, e = HANOI.bbox
        assert s < n
        assert w < e

    def test_hcmc_bbox_valid(self):
        s, w, n, e = HCMC.bbox
        assert s < n
        assert w < e

    def test_relation_ids_non_empty(self):
        assert len(HANOI.osm_relation_ids) > 0
        assert len(HCMC.osm_relation_ids) > 0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _read_csv(directory: str, filename: str):
    path = os.path.join(directory, filename)
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))
