"""
OpenStreetMap Overpass API enrichment.

Fetches bus stops from OSM for a given bounding box, then merges with
scraped stops to fill in missing lat/lon coordinates.
"""

import logging
from typing import List, Dict, Optional
import difflib

import requests

from config import OVERPASS_API, OVERPASS_QUERIES, HTTP_TIMEOUT

log = logging.getLogger(__name__)


class OverpassScraper:
    """
    Fetch bus stops and routes from OpenStreetMap via Overpass API.

    Results are returned as dicts.
    """

    def __init__(self, city: str):
        """city: 'hanoi' or 'hcmc'"""
        self.city = city
        self.stops_query_key = f"{city}_stops"
        self.routes_query_key = f"{city}_routes"

    def fetch_stops(self) -> List[Dict]:
        query = OVERPASS_QUERIES.get(self.stops_query_key)
        if not query:
            log.warning("[OSM] No Overpass query for city=%s", self.city)
            return []

        log.info("[OSM] Fetching bus stops from Overpass for %s...", self.city)
        try:
            resp = requests.post(
                OVERPASS_API,
                data=query,
                headers={'Content-Type': 'text/plain', 'User-Agent': 'python-requests/2.32.5'},
                timeout=HTTP_TIMEOUT,
            )
            resp.raise_for_status()
            elements = resp.json().get("elements", [])
            stops = [self._parse_element(e) for e in elements if e.get("type") == "node"]
            log.info("[OSM] Got %d stops from OSM", len(stops))
            return stops
        except Exception as exc:
            log.warning("[OSM] Overpass fetch failed: %s", exc)
            return []

    def fetch_routes(self) -> List[Dict]:
        query = OVERPASS_QUERIES.get(self.routes_query_key)
        if not query:
            log.warning("[OSM] No Overpass query for routes city=%s", self.city)
            return []

        log.info("[OSM] Fetching bus routes from Overpass for %s...", self.city)
        try:
            resp = requests.post(
                OVERPASS_API,
                data=query,
                headers={'Content-Type': 'text/plain'},
                timeout=HTTP_TIMEOUT,
            )
            resp.raise_for_status()
            elements = resp.json().get("elements", [])
            
            relations = [e for e in elements if e.get("type") == "relation"]
            if not relations:
                log.info("[OSM] Got 0 routes from OSM")
                return []
            
            # Collect all node ids from relation members
            node_ids = set()
            for rel in relations:
                for member in rel.get("members", []):
                    if member.get("type") == "node" and member.get("role") in ("stop", "platform"):
                        node_ids.add(member["ref"])
            
            nodes = {}
            if node_ids:
                node_query = f'[out:json]; node(id:{",".join(map(str, sorted(node_ids)))}); out body;'
                log.info("[OSM] Fetching %d nodes for stops...", len(node_ids))
                resp2 = requests.post(
                    OVERPASS_API,
                    data=node_query,
                    headers={'Content-Type': 'text/plain'},
                    timeout=HTTP_TIMEOUT,
                )
                resp2.raise_for_status()
                nodes = {e["id"]: e for e in resp2.json().get("elements", [])}
            
            routes = []
            for rel in relations:
                route = self._parse_route(rel, nodes)
                if route:
                    routes.append(route)
            
            log.info("[OSM] Got %d routes from OSM", len(routes))
            return routes
        except Exception as exc:
            log.warning("[OSM] Overpass fetch routes failed: %s", exc)
            return []

    def _parse_route(self, relation: dict, nodes: dict) -> Optional[Dict]:
        tags = relation.get("tags", {})
        if tags.get("route") != "bus":
            return None
        
        route_id = tags.get("ref") or str(relation["id"])
        route_name = tags.get("name") or tags.get("name:vi") or route_id
        
        stops = []
        for member in relation.get("members", []):
            if member.get("type") == "node" and member.get("role") in ("stop", "platform"):
                node_id = member["ref"]
                node = nodes.get(node_id)
                if node:
                    stop = self._parse_element(node)
                    stops.append(stop)
        
        if not stops:
            return None
        
        return {
            "route_id": route_id,
            "route_name": route_name,
            "stops": stops,
            "tags": tags,
        }

    def _parse_element(self, e: dict) -> dict:
        tags = e.get("tags", {})
        return {
            "osm_id": str(e["id"]),
            "name": tags.get("name") or tags.get("name:vi") or tags.get("ref") or "",
            "name_vi": tags.get("name:vi") or tags.get("name") or "",
            "lat": float(e["lat"]),
            "lon": float(e["lon"]),
            "tags": tags,
        }


def enrich_stops_with_osm(scraped_stops: list, osm_stops: List[Dict], threshold: float = 0.6):
    """
    For scraped stops missing coordinates (lat=0, lon=0),
    attempt to find a matching OSM stop by name similarity
    and copy its coordinates.

    scraped_stops: list of objects with .lat, .lon, .name attributes
    osm_stops: list of dicts from OverpassScraper.fetch_stops()
    threshold: minimum name similarity score (0–1)
    """
    if not osm_stops:
        return

    osm_names = [s["name"] for s in osm_stops]
    enriched = 0

    for stop in scraped_stops:
        if stop.lat != 0.0 and stop.lon != 0.0:
            continue  # already has coordinates

        matches = difflib.get_close_matches(stop.name, osm_names, n=1, cutoff=threshold)
        if not matches:
            continue

        match_name = matches[0]
        osm_stop = next(s for s in osm_stops if s["name"] == match_name)
        stop.lat = osm_stop["lat"]
        stop.lon = osm_stop["lon"]
        enriched += 1
        log.debug("[OSM] Enriched stop '%s' → OSM '%s'", stop.name, match_name)

    log.info("[OSM] Enriched %d stops with OSM coordinates", enriched)
