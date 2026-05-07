#!/usr/bin/env python3
"""
gtfs_loader.py
Loads a GTFS feed directory into the trip_db GTFS tables.
Automatically creates the gtfs_feeds parent row if it doesn't exist.

Usage:
    python gtfs_loader.py \
        --feed-id FEED000001 \
        --gtfs-dir ./hanoi_gtfs \
        --city "Hanoi" \
        --agency "Transerco" \
        --dsn "postgresql://user:pass@localhost:5432/mydb"

    # HCMC:
    python gtfs_loader.py \
        --feed-id FEED000002 \
        --gtfs-dir ./hcmc_gtfs \
        --city "Ho Chi Minh City" \
        --agency "HCMC Bus" \
        --feed-url "https://..." \
        --dsn "postgresql://user:pass@localhost:5432/mydb"

Run this once on first setup, then again whenever the feed updates.
Safe to re-run — all inserts use ON CONFLICT DO UPDATE.
"""

import argparse
import csv
import os
import psycopg2
from datetime import date


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_date(s: str) -> date | None:
    """GTFS dates are YYYYMMDD strings."""
    if not s:
        return None
    return date(int(s[:4]), int(s[4:6]), int(s[6:8]))


def parse_bool(s: str) -> bool:
    return s.strip() == "1"


def parse_interval(s: str) -> str | None:
    """
    GTFS times look like HH:MM:SS and can exceed 24:00:00.
    PostgreSQL INTERVAL handles this natively.
    '25:30:00' → '25 hours 30 minutes' works fine.
    """
    if not s or s.strip() == "00:00:00":
        return None  # store NULL if scraper gave us no real time
    return s.strip()


def read_csv(path: str) -> list[dict]:
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


# ---------------------------------------------------------------------------
# Feed row upsert — runs before any GTFS table inserts
# ---------------------------------------------------------------------------

def upsert_feed(cur, feed_id: str, city: str, agency: str, feed_url: str | None, realtime_url: str | None):
    """Insert gtfs_feeds row if missing, update metadata if it already exists."""
    cur.execute(
        """
        INSERT INTO trip_db.gtfs_feeds
            (feed_id, city, agency_name, feed_url, realtime_url, is_active, last_fetched_at)
        VALUES (%s, %s, %s, %s, %s, true, now())
        ON CONFLICT (feed_id) DO UPDATE SET
            city            = EXCLUDED.city,
            agency_name     = EXCLUDED.agency_name,
            feed_url        = COALESCE(EXCLUDED.feed_url,      trip_db.gtfs_feeds.feed_url),
            realtime_url    = COALESCE(EXCLUDED.realtime_url,  trip_db.gtfs_feeds.realtime_url),
            last_fetched_at = now(),
            last_updated_at = now()
        """,
        (feed_id, city, agency, feed_url, realtime_url),
    )
    print(f"  gtfs_feeds: upserted feed '{feed_id.strip()}' — {city} / {agency}")


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def load_agency(cur, feed_id: str, gtfs_dir: str):
    rows = read_csv(os.path.join(gtfs_dir, "agency.txt"))
    cur.executemany(
        """
        INSERT INTO trip_db.gtfs_agency
            (feed_id, agency_id, agency_name, agency_url, agency_timezone, agency_lang)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (feed_id, agency_id) DO UPDATE SET
            agency_name     = EXCLUDED.agency_name,
            agency_url      = EXCLUDED.agency_url,
            agency_timezone = EXCLUDED.agency_timezone,
            agency_lang     = EXCLUDED.agency_lang
        """,
        [
            (feed_id, r["agency_id"], r["agency_name"],
             r.get("agency_url"), r["agency_timezone"], r.get("agency_lang"))
            for r in rows
        ],
    )
    print(f"  agency:     {len(rows)} rows")


def load_calendar(cur, feed_id: str, gtfs_dir: str):
    rows = read_csv(os.path.join(gtfs_dir, "calendar.txt"))
    cur.executemany(
        """
        INSERT INTO trip_db.gtfs_calendar
            (feed_id, service_id, monday, tuesday, wednesday, thursday,
             friday, saturday, sunday, start_date, end_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (feed_id, service_id) DO UPDATE SET
            monday = EXCLUDED.monday, tuesday = EXCLUDED.tuesday,
            wednesday = EXCLUDED.wednesday, thursday = EXCLUDED.thursday,
            friday = EXCLUDED.friday, saturday = EXCLUDED.saturday,
            sunday = EXCLUDED.sunday,
            start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
        """,
        [
            (feed_id, r["service_id"],
             parse_bool(r["monday"]), parse_bool(r["tuesday"]),
             parse_bool(r["wednesday"]), parse_bool(r["thursday"]),
             parse_bool(r["friday"]), parse_bool(r["saturday"]),
             parse_bool(r["sunday"]),
             parse_date(r["start_date"]), parse_date(r["end_date"]))
            for r in rows
        ],
    )
    print(f"  calendar:   {len(rows)} rows")


def load_routes(cur, feed_id: str, gtfs_dir: str):
    rows = read_csv(os.path.join(gtfs_dir, "routes.txt"))
    cur.executemany(
        """
        INSERT INTO trip_db.gtfs_routes
            (feed_id, route_id, agency_id, route_short_name, route_long_name,
             route_type, route_color, route_text_color, route_url, route_desc)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (feed_id, route_id) DO UPDATE SET
            route_short_name = EXCLUDED.route_short_name,
            route_long_name  = EXCLUDED.route_long_name,
            route_type       = EXCLUDED.route_type,
            route_color      = EXCLUDED.route_color,
            route_text_color = EXCLUDED.route_text_color
        """,
        [
            (feed_id, r["route_id"], r.get("agency_id"),
             r.get("route_short_name"), r.get("route_long_name"),
             int(r["route_type"]), r.get("route_color") or None,
             r.get("route_text_color") or None,
             r.get("route_url") or None, r.get("route_desc") or None)
            for r in rows
        ],
    )
    print(f"  routes:     {len(rows)} rows")


def load_stops(cur, feed_id: str, gtfs_dir: str):
    rows = read_csv(os.path.join(gtfs_dir, "stops.txt"))
    cur.executemany(
        """
        INSERT INTO trip_db.gtfs_stops
            (feed_id, stop_id, stop_name, stop_desc, stop_lat, stop_lon, zone_id, stop_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (feed_id, stop_id) DO UPDATE SET
            stop_name = EXCLUDED.stop_name,
            stop_lat  = EXCLUDED.stop_lat,
            stop_lon  = EXCLUDED.stop_lon
        """,
        [
            (feed_id, r["stop_id"], r["stop_name"],
             r.get("stop_desc") or None,
             float(r["stop_lat"]), float(r["stop_lon"]),
             r.get("zone_id") or None, r.get("stop_url") or None)
            for r in rows
        ],
    )
    print(f"  stops:      {len(rows)} rows")


def load_trips(cur, feed_id: str, gtfs_dir: str):
    rows = read_csv(os.path.join(gtfs_dir, "trips.txt"))
    cur.executemany(
        """
        INSERT INTO trip_db.gtfs_trips
            (feed_id, trip_id, route_id, service_id, trip_headsign, direction_id, shape_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (feed_id, trip_id) DO UPDATE SET
            trip_headsign = EXCLUDED.trip_headsign,
            direction_id  = EXCLUDED.direction_id
        """,
        [
            (feed_id, r["trip_id"], r["route_id"], r["service_id"],
             r.get("trip_headsign") or None,
             int(r["direction_id"]) if r.get("direction_id") != "" else None,
             r.get("shape_id") or None)
            for r in rows
        ],
    )
    print(f"  trips:      {len(rows)} rows")


def load_stop_times(cur, feed_id: str, gtfs_dir: str):
    rows = read_csv(os.path.join(gtfs_dir, "stop_times.txt"))
    # Batch insert in chunks to avoid huge memory usage
    CHUNK = 2000
    total = 0
    for i in range(0, len(rows), CHUNK):
        chunk = rows[i : i + CHUNK]
        cur.executemany(
            """
            INSERT INTO trip_db.gtfs_stop_times
                (feed_id, trip_id, stop_id, stop_sequence,
                 arrival_time, departure_time, shape_dist_traveled,
                 pickup_type, drop_off_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (feed_id, trip_id, stop_sequence) DO UPDATE SET
                stop_id        = EXCLUDED.stop_id,
                arrival_time   = EXCLUDED.arrival_time,
                departure_time = EXCLUDED.departure_time
            """,
            [
                (feed_id, r["trip_id"], r["stop_id"],
                 int(r["stop_sequence"]),
                 parse_interval(r.get("arrival_time", "")),
                 parse_interval(r.get("departure_time", "")),
                 float(r["shape_dist_traveled"]) if r.get("shape_dist_traveled") else None,
                 int(r.get("pickup_type") or 0),
                 int(r.get("drop_off_type") or 0))
                for r in chunk
            ],
        )
        total += len(chunk)
    print(f"  stop_times: {total} rows")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Load GTFS feed into trip_db")
    parser.add_argument("--feed-id",      required=True,  help="10-char feed_id (e.g. FEED000001)")
    parser.add_argument("--gtfs-dir",     required=True,  help="Directory containing GTFS txt files")
    parser.add_argument("--dsn",          required=True,  help="PostgreSQL DSN")
    parser.add_argument("--city",         required=True,  help="City name (e.g. 'Hanoi')")
    parser.add_argument("--agency",       required=True,  help="Agency name (e.g. 'Transerco')")
    parser.add_argument("--feed-url",     default=None,   help="Static GTFS zip URL (optional)")
    parser.add_argument("--realtime-url", default=None,   help="GTFS-RT endpoint URL (optional)")
    args = parser.parse_args()

    feed_id  = args.feed_id.ljust(10)[:10]   # pad/truncate to char(10)
    gtfs_dir = args.gtfs_dir

    conn = psycopg2.connect(args.dsn)
    conn.autocommit = False
    cur  = conn.cursor()

    try:
        print(f"\nLoading GTFS feed '{feed_id.strip()}' from {gtfs_dir}")

        # Upsert the parent gtfs_feeds row first (fixes FK violation)
        upsert_feed(cur, feed_id, args.city, args.agency, args.feed_url, args.realtime_url)

        # Load in FK-safe order
        load_agency(cur, feed_id, gtfs_dir)
        load_calendar(cur, feed_id, gtfs_dir)
        load_routes(cur, feed_id, gtfs_dir)
        load_stops(cur, feed_id, gtfs_dir)
        load_trips(cur, feed_id, gtfs_dir)
        load_stop_times(cur, feed_id, gtfs_dir)

        conn.commit()
        print("\nDone. All changes committed.")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
