#!/usr/bin/env python3
"""
gtfs_import.py — Import a GTFS feed folder into the trip_db PostgreSQL schema.
 
Tables written (in FK-safe order):
  gtfs_feeds → gtfs_agency → gtfs_routes → gtfs_calendar →
  gtfs_stops → gtfs_trips → gtfs_stop_times
 
Key type mappings from GTFS → trip_db:
  - arrival_time / departure_time : HH:MM:SS string → PostgreSQL INTERVAL
  - calendar dates                : YYYYMMDD string → DATE
  - boolean day columns           : "1"/"0"        → TRUE/FALSE
  - feed_id                       : char(10), left-padded/truncated to fit
 
Usage
-----
  python gtfs_import.py --feed-dir ./output/hanoi \\
                        --feed-id HANOI     \\
                        --city "Hanoi"      \\
                        --dsn "postgresql://admin:pass@localhost:5432/mydb"
 
  # Replace an existing feed entirely (DELETE + re-insert):
  python gtfs_import.py ... --replace
 
  # Dry run — validate files and show row counts, touch nothing:
  python gtfs_import.py ... --dry-run
 
Environment variable alternative to --dsn:
  export DATABASE_URL="postgresql://admin:pass@localhost:5432/mydb"
 
Requirements:
  pip install "psycopg[binary]"
"""
 
import argparse
import csv
import logging
import os
import sys
from datetime import date
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple
 
log = logging.getLogger("gtfs_import")
 
# ── dependency check ─────────────────────────────────────────────────────────
try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    sys.exit(
        "psycopg3 not found.\n"
        "Install with:  pip install \"psycopg[binary]\"\n"
    )
 
SCHEMA = "trip_db"
 
# GTFS files and the trip_db table they map to (in insert order)
GTFS_FILES = [
    ("agency.txt",    "gtfs_agency"),
    ("routes.txt",    "gtfs_routes"),
    ("calendar.txt",  "gtfs_calendar"),
    ("stops.txt",     "gtfs_stops"),
    ("trips.txt",     "gtfs_trips"),
    ("stop_times.txt","gtfs_stop_times"),
    # shapes.txt has no dedicated table in the schema — skipped
]
 
# Columns present in the DB table (in order) for each GTFS file.
# Only these columns are inserted; extra GTFS columns are silently ignored.
COLUMN_MAP: Dict[str, List[str]] = {
    "gtfs_agency": [
        "feed_id", "agency_id", "agency_name",
        "agency_url", "agency_timezone", "agency_lang",
    ],
    "gtfs_routes": [
        "feed_id", "route_id", "agency_id",
        "route_short_name", "route_long_name", "route_type",
        "route_color", "route_text_color", "route_url",
    ],
    "gtfs_calendar": [
        "feed_id", "service_id",
        "monday", "tuesday", "wednesday", "thursday",
        "friday", "saturday", "sunday",
        "start_date", "end_date",
    ],
    "gtfs_stops": [
        "feed_id", "stop_id", "stop_name",
        "stop_lat", "stop_lon", "stop_url",
    ],
    "gtfs_trips": [
        "feed_id", "trip_id", "route_id", "service_id",
        "trip_headsign", "direction_id", "shape_id",
    ],
    "gtfs_stop_times": [
        "feed_id", "trip_id", "stop_id", "stop_sequence",
        "arrival_time", "departure_time",
        "pickup_type", "drop_off_type",
    ],
}
 
# Columns that need type coercion before insert
BOOL_COLS  = {"monday","tuesday","wednesday","thursday","friday","saturday","sunday"}
DATE_COLS  = {"start_date", "end_date"}
INT_COLS   = {"route_type","stop_sequence","direction_id","pickup_type","drop_off_type","location_type"}
# arrival_time / departure_time stay as HH:MM:SS strings — PostgreSQL accepts
# that format directly for INTERVAL columns.
 
BATCH_SIZE = 500   # rows per executemany call
 
 
# ── helpers ───────────────────────────────────────────────────────────────────
 
def _coerce(col: str, val: str) -> Any:
    """Convert a raw CSV string value to the right Python type for psycopg."""
    if val == "" or val is None:
        return None
    if col in BOOL_COLS:
        return val.strip() in ("1", "true", "True", "TRUE")
    if col in DATE_COLS:
        # YYYYMMDD → date object
        s = val.strip()
        return date(int(s[:4]), int(s[4:6]), int(s[6:8]))
    if col in INT_COLS:
        return int(val.strip())
    return val.strip()
 
 
def _read_gtfs(path: Path, needed_cols: List[str], feed_id: str) -> Iterator[Dict[str, Any]]:
    """
    Yield one dict per row for the columns we need, adding feed_id.
    Extra columns in the file are ignored. Missing optional columns get None.
    """
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            out: Dict[str, Any] = {"feed_id": feed_id}
            for col in needed_cols:
                if col == "feed_id":
                    continue
                raw = row.get(col, "")
                out[col] = _coerce(col, raw)
            yield out
 
 
def _insert_batch(cur, table: str, columns: List[str], rows: List[Dict]) -> None:
    col_list  = ", ".join(columns)
    placeholders = ", ".join(f"%({c})s" for c in columns)
    sql = f"INSERT INTO {SCHEMA}.{table} ({col_list}) VALUES ({placeholders})"
    cur.executemany(sql, rows)
 
 
def _load_table(
    conn,
    gtfs_file: Path,
    table: str,
    feed_id: str,
    dry_run: bool,
) -> int:
    columns = COLUMN_MAP[table]
    rows = list(_read_gtfs(gtfs_file, columns, feed_id))
    total = len(rows)
 
    if dry_run:
        log.info("  [dry-run] %s → %s.%s  (%d rows)", gtfs_file.name, SCHEMA, table, total)
        return total
 
    with conn.cursor() as cur:
        for i in range(0, total, BATCH_SIZE):
            batch = rows[i : i + BATCH_SIZE]
            _insert_batch(cur, table, columns, batch)
 
    log.info("  ✓  %s → %s.%s  (%d rows)", gtfs_file.name, SCHEMA, table, total)
    return total
 
 
def _list_feeds(conn) -> None:
    """Print all existing feed_ids in the database and exit."""
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT
                f.feed_id,
                f.city,
                f.is_active,
                f.last_fetched_at,
                COUNT(DISTINCT r.route_id)    AS routes,
                COUNT(DISTINCT s.stop_id)     AS stops,
                COUNT(DISTINCT t.trip_id)     AS trips
            FROM {SCHEMA}.gtfs_feeds f
            LEFT JOIN {SCHEMA}.gtfs_routes r    USING (feed_id)
            LEFT JOIN {SCHEMA}.gtfs_stops  s    USING (feed_id)
            LEFT JOIN {SCHEMA}.gtfs_trips  t    USING (feed_id)
            GROUP BY f.feed_id, f.city, f.is_active, f.last_fetched_at
            ORDER BY f.feed_id
        """)
        rows = cur.fetchall()
    if not rows:
        print("No feeds found in the database.")
        return
    print(f"\n{'FEED_ID':<12} {'CITY':<25} {'ACTIVE':<8} {'ROUTES':>7} {'STOPS':>7} {'TRIPS':>7}  LAST_FETCHED")
    print("─" * 80)
    for r in rows:
        fetched = str(r["last_fetched_at"])[:16] if r["last_fetched_at"] else "never"
        print(
            f"{r['feed_id'].strip():<12} {r['city']:<25} "
            f"{'yes' if r['is_active'] else 'no':<8} "
            f"{r['routes']:>7} {r['stops']:>7} {r['trips']:>7}  {fetched}"
        )
    print()
 
 
def _check_conflict(conn, feed_id: str) -> Optional[Dict]:
    """Return the existing feed row if feed_id already exists, else None."""
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT feed_id, city, is_active FROM {SCHEMA}.gtfs_feeds WHERE feed_id = %s",
            (feed_id,),
        )
        return cur.fetchone()
 
 
def _ensure_feed_row(conn, feed_id: str, city: str, dry_run: bool) -> None:
    """Upsert a row in gtfs_feeds so FK constraints on child tables pass."""
    sql = f"""
        INSERT INTO {SCHEMA}.gtfs_feeds (feed_id, city)
        VALUES (%s, %s)
        ON CONFLICT (feed_id) DO UPDATE SET city = EXCLUDED.city, last_updated_at = now()
    """
    if dry_run:
        log.info("  [dry-run] upsert gtfs_feeds  feed_id=%r  city=%r", feed_id, city)
        return
    with conn.cursor() as cur:
        cur.execute(sql, (feed_id, city))
 
 
def _delete_feed(conn, feed_id: str, dry_run: bool) -> None:
    """
    Remove all child rows for this feed_id.
    gtfs_feeds uses ON DELETE CASCADE, so deleting the parent removes everything.
    """
    if dry_run:
        log.info("  [dry-run] DELETE FROM gtfs_feeds WHERE feed_id = %r", feed_id)
        return
    with conn.cursor() as cur:
        cur.execute(f"DELETE FROM {SCHEMA}.gtfs_feeds WHERE feed_id = %s", (feed_id,))
        log.info("  Deleted existing feed %r (cascade)", feed_id)
 
 
# ── main ──────────────────────────────────────────────────────────────────────
 
def run(
    feed_dir: Path,
    feed_id: str,
    city: str,
    dsn: str,
    replace: bool,
    dry_run: bool,
    list_feeds: bool,
) -> None:
    feed_id = feed_id.ljust(10)[:10]   # char(10) — pad/truncate
    log.info("Feed dir : %s", feed_dir)
    log.info("Feed ID  : %r", feed_id)
    log.info("City     : %s", city)
    log.info("Replace  : %s", replace)
    log.info("Dry run  : %s", dry_run)
 
    # Validate files exist before touching the DB (skip for --list-feeds)
    if not list_feeds:
        missing = []
        for fname, _ in GTFS_FILES:
            p = feed_dir / fname
            if not p.exists():
                missing.append(fname)
        if missing:
            sys.exit(f"Missing GTFS files in {feed_dir}: {', '.join(missing)}")
 
    if dry_run:
        # Simulate without a real DB connection
        log.info("── DRY RUN ── no database changes will be made")
        _ensure_feed_row(None, feed_id, city, dry_run=True)
        if replace:
            _delete_feed(None, feed_id, dry_run=True)
        total = 0
        for fname, table in GTFS_FILES:
            columns = COLUMN_MAP[table]
            rows = list(_read_gtfs(feed_dir / fname, columns, feed_id))
            log.info("  [dry-run] %s → %s.%s  (%d rows)", fname, SCHEMA, table, len(rows))
            total += len(rows)
        log.info("Dry run complete. Would insert %d rows total.", total)
        return
 
    conn_kwargs = dict(row_factory=dict_row, autocommit=False)
 
    with psycopg.connect(dsn, **conn_kwargs) as conn:
 
        # ------------------------------------------------------------------
        # --list-feeds mode: just print and exit
        # ------------------------------------------------------------------
        if list_feeds:
            _list_feeds(conn)
            return
 
        # ------------------------------------------------------------------
        # Conflict detection — protect existing feeds
        # ------------------------------------------------------------------
        existing = _check_conflict(conn, feed_id)
        if existing and not replace:
            sys.exit(
                f"\n⚠️  Feed '{feed_id.strip()}' already exists in the database "
                f"(city: {existing['city']}).\n"
                f"   Use --replace to delete it and re-import, or choose a different --feed-id.\n"
                f"   Tip: run --list-feeds to see all existing feed IDs."
            )
        if existing and replace:
            log.warning(
                "Replacing existing feed '%s' (city: %s) — all rows will be deleted first.",
                feed_id.strip(), existing["city"],
            )
 
        with conn.transaction():
            if replace:
                _delete_feed(conn, feed_id, dry_run=False)
 
            _ensure_feed_row(conn, feed_id, city, dry_run=False)
 
            total = 0
            for fname, table in GTFS_FILES:
                n = _load_table(conn, feed_dir / fname, table, feed_id, dry_run=False)
                total += n
 
        log.info("Committed. %d rows inserted for feed %r.", total, feed_id.strip())
 
 
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Import a GTFS feed folder into the trip_db PostgreSQL schema.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument(
        "--feed-dir", type=Path, default=Path("."),
        help="Path to the folder containing GTFS .txt files",
    )
    p.add_argument(
        "--feed-id", default="UNKNOWN",
        help="Unique feed identifier, max 10 chars (e.g. HANOI, HCMC)",
    )
    p.add_argument(
        "--city", default="Unknown",
        help='Human-readable city name (e.g. "Hanoi")',
    )
    p.add_argument(
        "--dsn",
        default=os.environ.get("DATABASE_URL"),
        help="PostgreSQL DSN. Defaults to $DATABASE_URL env var.",
    )
    p.add_argument(
        "--replace", action="store_true",
        help="Delete existing data for this feed_id before inserting",
    )
    p.add_argument(
        "--dry-run", action="store_true",
        help="Validate and count rows without writing to the database",
    )
    p.add_argument(
        "--list-feeds", action="store_true",
        help="List all existing feed_ids in the database and exit",
    )
    p.add_argument(
        "--log-level", default="INFO",
        choices=["DEBUG","INFO","WARNING","ERROR"],
    )
    return p.parse_args()
 
 
if __name__ == "__main__":
    args = parse_args()
    logging.basicConfig(
        level=args.log_level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )
 
    if not args.list_feeds and not args.dry_run and not args.dsn:
        sys.exit(
            "No DSN provided. Use --dsn or set DATABASE_URL.\n"
            "Example: export DATABASE_URL='postgresql://admin:pass@localhost:5432/mydb'"
        )
 
    if not args.list_feeds and args.feed_id == "UNKNOWN":
        sys.exit("--feed-id is required unless using --list-feeds")
 
    run(
        feed_dir=args.feed_dir,
        feed_id=args.feed_id,
        city=args.city,
        dsn=args.dsn,
        replace=args.replace,
        dry_run=args.dry_run,
        list_feeds=args.list_feeds,
    )
 
