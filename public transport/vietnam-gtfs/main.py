"""
vietnam-gtfs — CLI entry point.

Sources (in priority order):
  Both cities: OpenStreetMap (Overpass API) for routes and stops

Usage:
    python main.py --city all
    python main.py --city hcmc
    python main.py --city hanoi
    python main.py --city all --validate
"""

import logging
import os

import click
from rich.console import Console
from rich.table import Table

import utils.log as logsetup
from config import CITIES, CityConfig
from scrapers.overpass import OverpassScraper
from gtfs.builder import GTFSBuilder
from gtfs.validator import validate

console = Console()
log = logging.getLogger(__name__)


@click.command()
@click.option(
    "--city", default="all",
    type=click.Choice(["all", "hcmc", "hanoi"], case_sensitive=False),
    help="Which city to scrape.",
)
@click.option("--validate", "run_validate", is_flag=True, help="Run MobilityData GTFS validator.")
@click.option("--osm-enrich", is_flag=True, default=True, help="Enrich stops with OSM coordinates.")
@click.option("--log-level", default="INFO", help="Logging verbosity.")
def main(city, run_validate, osm_enrich, log_level):
    logsetup.setup(log_level)

    cities = list(CITIES.values()) if city == "all" else [CITIES[city.lower()]]

    results = []
    for cfg in cities:
        try:
            output_path = _run_city(cfg, osm_enrich)
            ok = True
            report = ""
            if run_validate and output_path:
                ok, report = validate(output_path)
            results.append((cfg.name, output_path, ok, report))
        except Exception as exc:
            log.exception("Failed for %s: %s", cfg.name, exc)
            results.append((cfg.name, "", False, ""))

    _print_summary(results)


def _run_city(cfg: CityConfig, osm_enrich: bool) -> str:
    console.rule(f"[bold blue]{cfg.name}")

    # 1. Scrape routes from Overpass
    osm_city = "hanoi" if cfg.name == "Hanoi" else "hcmc"
    scraper = OverpassScraper(osm_city)
    raw_routes = scraper.fetch_routes()
    routes = [_overpass_to_builder_route(r, cfg) for r in raw_routes]

    log.info("Got %d routes for %s", len(routes), cfg.name)

    # 2. OSM enrichment — already have coordinates from Overpass
    # No need for enrichment since stops have lat/lon

    # 3. Build GTFS
    builder = GTFSBuilder(cfg)
    for route in routes:
        builder.add_route(route)

    os.makedirs(cfg.output_dir, exist_ok=True)
    output_path = os.path.join(cfg.output_dir, "gtfs.zip")
    builder.write_zip(output_path)
    return output_path


# ---------------------------------------------------------------------------
# Adapters: convert scraper models → GTFSBuilder's BusRoute model
# ---------------------------------------------------------------------------

def _overpass_to_builder_route(r, cfg):
    """Convert an Overpass route dict to a BusRoute for GTFSBuilder."""
    from gtfs.builder import BusRoute, BusStop, RouteSchedule
    
    stops = [
        BusStop(
            stop_id=f"{cfg.name.lower()}_stop_{s['osm_id']}",
            name=s["name"],
            lat=s["lat"],
            lon=s["lon"],
        )
        for s in r["stops"]
    ]
    
    # Calculate approximate distance
    from utils.geo import cumulative_dist
    if len(stops) > 1:
        coords = [(s.lat, s.lon) for s in stops]
        distance_km = cumulative_dist(coords)[-1] / 1000
    else:
        distance_km = 0.0
    
    return BusRoute(
        route_id=f"{cfg.name.lower()}_{r['route_id']}",
        route_short_name=r["route_id"],
        route_long_name=r["route_name"],
        route_color="E53935",
        route_text_color="FFFFFF",
        distance_km=distance_km,
        fare_vnd=0,  # Unknown from OSM
        city_code=cfg.busmap_code,
        stops_outbound=stops,
        stops_inbound=[],  # Assume one direction
        shape_outbound=[],
        shape_inbound=[],
        schedule=None,  # No schedule from OSM
    )


def _print_summary(results):
    console.rule("[bold]Summary")
    table = Table(title="vietnam-gtfs results")
    table.add_column("City")
    table.add_column("Output")
    table.add_column("Valid?")
    for city_name, path, ok, report in results:
        table.add_row(city_name, path or "FAILED", "✅" if ok else "⚠️")
    console.print(table)



if __name__ == "__main__":
    main()
