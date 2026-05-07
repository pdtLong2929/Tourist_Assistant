"""
cities.py — City configurations and known OSM relation IDs for Vietnamese rail.

Overpass queries use these as seed relations. The scraper also does a
bounding-box query so it catches any relations NOT listed here.
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class CityConfig:
    name: str
    slug: str                      # used for output folder name
    agency_id: str
    agency_name: str
    agency_url: str
    agency_timezone: str
    agency_lang: str
    bbox: tuple                    # (south, west, north, east)
    osm_relation_ids: List[int]    # known route relation IDs to always include
    route_type: int = 1            # 1 = subway/metro, 2 = rail


# ---------------------------------------------------------------------------
# Hanoi
# ---------------------------------------------------------------------------
HANOI = CityConfig(
    name="Hanoi",
    slug="hanoi",
    agency_id="HMR",
    agency_name="Hanoi Metro",
    agency_url="https://www.hanoimetro.net.vn",
    agency_timezone="Asia/Ho_Chi_Minh",
    agency_lang="vi",
    # Bounding box covers greater Hanoi metro area
    bbox=(20.75, 105.65, 21.20, 106.00),
    osm_relation_ids=[
        # Cat Linh – Ha Dong (Line 2A) — operational
        6947637,
        # Nhon – Hanoi Station (Line 3) — partial/under construction
        11437832,
        # Line 1 planning relation (if mapped)
        # Line 2 planning relation (if mapped)
    ],
)

# ---------------------------------------------------------------------------
# Ho Chi Minh City
# ---------------------------------------------------------------------------
HCMC = CityConfig(
    name="Ho Chi Minh City",
    slug="hcmc",
    agency_id="HCMC_METRO",
    agency_name="HCMC Metro",
    agency_url="https://www.hcmcmetro.vn",
    agency_timezone="Asia/Ho_Chi_Minh",
    agency_lang="vi",
    # Bounding box covers HCMC + Thu Duc
    bbox=(10.60, 106.50, 10.95, 106.90),
    osm_relation_ids=[
        # Metro Line 1: Ben Thanh – Suoi Tien — operational (opened 2024)
        13477945,
        # Metro Line 2 (planned)
        # Metro Line 3A (planned)
    ],
)

ALL_CITIES: List[CityConfig] = [HANOI, HCMC]

CITY_BY_SLUG = {c.slug: c for c in ALL_CITIES}
