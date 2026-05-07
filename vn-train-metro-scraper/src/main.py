"""
main.py — Entry point for the Vietnam GTFS scraper.

Usage
-----
  python src/main.py                    # scrape all cities
  python src/main.py --city hanoi       # only Hanoi
  python src/main.py --city hcmc        # only HCMC
  python src/main.py --output /tmp/out  # custom output directory
  python src/main.py --dry-run          # print queries, don't write files
"""

import argparse
import logging
import os
import sys

# Make sure src/ is importable when running as `python src/main.py`
sys.path.insert(0, os.path.dirname(__file__))

from cities import ALL_CITIES, CITY_BY_SLUG, CityConfig
from overpass import OverpassClient, OverpassError
from gtfs_builder import GTFSBuilder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("main")

DEFAULT_OUTPUT = os.path.join(os.path.dirname(__file__), "..", "output")


def parse_args():
    p = argparse.ArgumentParser(description="Scrape Vietnamese metro/rail GTFS from Overpass")
    p.add_argument(
        "--city",
        choices=list(CITY_BY_SLUG.keys()) + ["all"],
        default="all",
        help="Which city to scrape (default: all)",
    )
    p.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help="Root output directory (default: ./output)",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Print queries without writing GTFS files",
    )
    p.add_argument(
        "--timeout",
        type=int,
        default=120,
        help="Overpass request timeout in seconds (default: 120)",
    )
    return p.parse_args()


def scrape_city(city: CityConfig, output_root: str, client: OverpassClient, dry_run: bool):
    log.info("=" * 60)
    log.info("Scraping %s", city.name)
    log.info("=" * 60)

    builder = GTFSBuilder(city)

    # 1. Fetch by known relation IDs (always the most reliable)
    if city.osm_relation_ids:
        log.info("Fetching %d known relation IDs …", len(city.osm_relation_ids))
        if not dry_run:
            data = client.fetch_relations_by_id(city.osm_relation_ids)
            builder.ingest(data)
        else:
            log.info("[dry-run] would fetch relation IDs: %s", city.osm_relation_ids)

    # 2. Bounding-box sweep to catch any unmapped / newly added relations
    s, w, n, e = city.bbox
    log.info("Bounding-box sweep: (%.4f,%.4f) → (%.4f,%.4f)", s, w, n, e)
    if not dry_run:
        data = client.fetch_route_relations_in_bbox(s, w, n, e)
        builder.ingest(data)

        # 3. Also fetch loose stop nodes in the bbox for completeness
        stop_data = client.fetch_stops_in_bbox(s, w, n, e)
        builder.ingest(stop_data)
    else:
        log.info("[dry-run] would run bbox sweep and stop fetch")

    # 4. Write GTFS
    city_out = os.path.join(output_root, city.slug)
    if not dry_run:
        builder.write(city_out)
        log.info("✓ GTFS feed written to %s", city_out)
    else:
        log.info("[dry-run] would write GTFS to %s", city_out)


def main():
    args = parse_args()

    if args.city == "all":
        cities = ALL_CITIES
    else:
        cities = [CITY_BY_SLUG[args.city]]

    client = OverpassClient(timeout=args.timeout)

    errors = []
    for city in cities:
        try:
            scrape_city(city, args.output, client, dry_run=args.dry_run)
        except OverpassError as exc:
            log.error("Overpass error for %s: %s", city.name, exc)
            errors.append(city.slug)
        except Exception as exc:
            log.exception("Unexpected error for %s: %s", city.name, exc)
            errors.append(city.slug)

    if errors:
        log.error("Failed cities: %s", ", ".join(errors))
        sys.exit(1)

    log.info("Done. All cities scraped successfully.")


if __name__ == "__main__":
    main()
