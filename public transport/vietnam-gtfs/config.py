"""
Central configuration: city definitions, API endpoints, GTFS constants.
"""

from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# BusMap internal API (reverse-engineered from map.busmap.vn XHR traffic)
# Base URL used by the BusMap web app frontend.
# ---------------------------------------------------------------------------
BUSMAP_API_BASE = "https://busmap.vn/api"

# Observed endpoint patterns (all return JSON):
#   GET /api/en/route/hcm              -> list all routes for a city
#   GET /api/en/route/{city}/{route_id} -> route detail (stops, shape, schedule)
#   GET /api/en/stop/{city}            -> all stops for a city
#   GET /api/en/stop/{city}/{stop_id}  -> stop detail + passing routes

BUSMAP_ENDPOINTS = {
    "routes_list":   "{base}/en/route/{city_code}",
    "route_detail":  "{base}/en/route/{city_code}/{route_id}",
    "stops_list":    "{base}/en/stop/{city_code}",
    "stop_detail":   "{base}/en/stop/{city_code}/{stop_id}",
}

# BusMap city codes as used in their API
BUSMAP_CITY_CODES = {
    "hcmc":  "hcm",
    "hanoi": "hn",
}

# ---------------------------------------------------------------------------
# Transerco (Hanoi official operator) – https://transerco.com.vn
# Provides route listings and timetable PDFs/HTML.
# ---------------------------------------------------------------------------
TRANSERCO_BASE = "https://transerco.com.vn"
TRANSERCO_ENDPOINTS = {
    "routes_list":  "{base}/tuyen-xe-buyt",
    "route_detail": "{base}/tuyen-xe-buyt/{route_slug}",
}

# ---------------------------------------------------------------------------
# HCMC Public Transport Management Center
# ---------------------------------------------------------------------------
HCMC_TRANSPORT_BASE = "https://www.hcmcptat.gov.vn"
HCMC_ENDPOINTS = {
    "routes_list":  "{base}/Lines/Lines",
    "route_detail": "{base}/Lines/Detail/{route_id}",
}

# ---------------------------------------------------------------------------
# OpenStreetMap Overpass API – used for stop geometry enrichment
# ---------------------------------------------------------------------------
OVERPASS_API = "https://overpass.kumi.systems/api/interpreter"

OVERPASS_QUERIES = {
    # Fetch all bus stops in Hanoi bounding box
    "hanoi_stops": '[out:json]; (node["highway"="bus_stop"](20.5,105.5,21.5,106.5); node["public_transport"="stop_position"](20.5,105.5,21.5,106.5);); out body;',
    # Fetch all bus stops in HCMC bounding box
    "hcmc_stops": '[out:json]; (node["highway"="bus_stop"](10.5,106.0,11.0,107.0); node["public_transport"="stop_position"](10.5,106.0,11.0,107.0);); out body;',
    # Fetch all bus routes in Hanoi bounding box
    "hanoi_routes": '[out:json]; relation["route"="bus"](20.5,105.5,21.5,106.5); out body;',
    # Fetch all bus routes in HCMC bounding box
    "hcmc_routes": '[out:json]; relation["route"="bus"](10.5,106.0,11.0,107.0); out body;',
}

# ---------------------------------------------------------------------------
# City definitions
# ---------------------------------------------------------------------------

@dataclass
class CityConfig:
    name: str                    # human-readable
    gtfs_agency_id: str
    gtfs_agency_name: str
    gtfs_agency_url: str
    gtfs_agency_timezone: str
    gtfs_agency_lang: str
    busmap_code: str             # code used in BusMap API
    output_dir: str              # relative to project root
    bbox: tuple                  # (min_lat, min_lon, max_lat, max_lon)
    overpass_stop_query: str     # key into OVERPASS_QUERIES
    transerco: bool = False      # has Transerco scraper
    hcmc_transport: bool = False # has HCMC transport scraper


CITIES = {
    "hanoi": CityConfig(
        name="Hanoi",
        gtfs_agency_id="transerco",
        gtfs_agency_name="Transerco (Hanoi Metropolitan Bus Transport)",
        gtfs_agency_url="https://transerco.com.vn",
        gtfs_agency_timezone="Asia/Ho_Chi_Minh",
        gtfs_agency_lang="vi",
        busmap_code="hn",
        output_dir="output/hanoi",
        bbox=(20.9, 105.7, 21.1, 106.0),
        overpass_stop_query="hanoi_stops",
        transerco=True,
    ),
    "hcmc": CityConfig(
        name="Ho Chi Minh City",
        gtfs_agency_id="hcmc_transport",
        gtfs_agency_name="HCMC Management Center for Public Transport",
        gtfs_agency_url="https://www.hcmcptat.gov.vn",
        gtfs_agency_timezone="Asia/Ho_Chi_Minh",
        gtfs_agency_lang="vi",
        busmap_code="hcm",
        output_dir="output/hcmc",
        bbox=(10.6, 106.5, 10.9, 106.9),
        overpass_stop_query="hcmc_stops",
        hcmc_transport=True,
    ),
}

# ---------------------------------------------------------------------------
# HTTP / scraping settings
# ---------------------------------------------------------------------------
HTTP_TIMEOUT = 30           # seconds
HTTP_DELAY = 1.0            # seconds between requests (be polite)
HTTP_MAX_RETRIES = 3
HTTP_BACKOFF_FACTOR = 2.0

HEADERS = {
    "User-Agent": (
        "vietnam-gtfs/1.0 (research project; "
        "github.com/yourname/vietnam-gtfs)"
    ),
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "vi,en;q=0.9",
}
