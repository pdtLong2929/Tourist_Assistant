"""
HCMC Public Transport Management Center scraper.
URL: https://www.hcmcptat.gov.vn

The center publishes route listings and details in HTML. This is the
authoritative source for HCMC bus routes & schedules (not BusMap).

HOW TO RE-DISCOVER ENDPOINTS
------------------------------
1. Visit https://www.hcmcptat.gov.vn/Lines/Lines
2. Inspect the route cards for href patterns.
3. Visit a detail page and look at the stop table and schedule info.
4. Update SELECTORS if the site is redesigned.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict

from bs4 import BeautifulSoup

from config import HCMC_TRANSPORT_BASE
from utils.http import Session

log = logging.getLogger(__name__)


@dataclass
class HCMCStop:
    sequence: int
    name: str
    address: str = ""
    lat: float = 0.0
    lon: float = 0.0


@dataclass
class HCMCRoute:
    route_id: str
    route_name: str
    distance_km: float
    fare_vnd: int
    first_departure: str
    last_departure: str
    headway_min: int
    stops_outbound: List[HCMCStop] = field(default_factory=list)
    stops_inbound: List[HCMCStop] = field(default_factory=list)


SELECTORS = {
    "route_links":    "a[href*='/Lines/Detail'], a[href*='/tuyen/']",
    "route_no":       "span.LineCode, span.line-code, h3, .route-number",
    "stop_rows":      "table.tbl-stops tr, .stop-list tr",
    "headway":        ".frequency, .tan-suat, td:contains('Tần suất')",
    "distance":       ".distance, .chieu-dai",
    "fare":           ".fare, .gia-ve",
    "hours_start":    ".time-start, .gio-bat-dau",
    "hours_end":      ".time-end, .gio-ket-thuc",
}

# HCMC also exposes a lightweight JSON API for some data:
HCMC_JSON_ROUTES = f"{HCMC_TRANSPORT_BASE}/api/Lines/GetAllLines"
HCMC_JSON_DETAIL = f"{HCMC_TRANSPORT_BASE}/api/Lines/GetLineDetail/{{route_id}}"


class HCMCTransportScraper:
    """
    Scrape HCMC transport authority for official route data.

    Tries JSON API first; falls back to HTML scraping.

    Usage:
        scraper = HCMCTransportScraper()
        routes = scraper.scrape_all_routes()
    """

    def __init__(self):
        self.http = Session()
        self.base = HCMC_TRANSPORT_BASE

    def scrape_all_routes(self) -> List[HCMCRoute]:
        routes = self._try_json_api()
        if routes:
            log.info("[HCMC] Got %d routes from JSON API", len(routes))
            return routes

        log.info("[HCMC] JSON API unavailable, falling back to HTML scraping")
        return self._scrape_html()

    # ------------------------------------------------------------------
    def _try_json_api(self) -> List[HCMCRoute]:
        """Attempt the undocumented JSON API (not always available)."""
        try:
            data = self.http.get_json(HCMC_JSON_ROUTES)
            items = data if isinstance(data, list) else data.get("data") or []
            routes = []
            for item in items:
                route_id = str(item.get("LineID") or item.get("id") or "")
                if not route_id:
                    continue
                detail = self._fetch_json_detail(route_id)
                routes.append(self._parse_json_route(item, detail))
            return routes
        except Exception as exc:
            log.debug("[HCMC] JSON API error: %s", exc)
            return []

    def _fetch_json_detail(self, route_id: str) -> dict:
        try:
            url = HCMC_JSON_DETAIL.format(route_id=route_id)
            data = self.http.get_json(url)
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def _parse_json_route(self, item: dict, detail: dict) -> HCMCRoute:
        stops_raw = detail.get("Stops") or detail.get("stops") or []
        stops_out = [
            HCMCStop(
                sequence=i,
                name=s.get("StopName") or s.get("name") or "",
                address=s.get("Address") or "",
                lat=float(s.get("Lat") or s.get("lat") or 0),
                lon=float(s.get("Lng") or s.get("lng") or 0),
            )
            for i, s in enumerate(stops_raw)
        ]
        return HCMCRoute(
            route_id=str(item.get("LineID") or item.get("id")),
            route_name=item.get("LineName") or item.get("name") or "",
            distance_km=float(item.get("Distance") or item.get("distance") or 0),
            fare_vnd=int(item.get("Price") or item.get("fare") or 7000),
            first_departure=item.get("TimeStart") or "05:00",
            last_departure=item.get("TimeEnd") or "21:30",
            headway_min=int(item.get("Frequency") or item.get("headway") or 15),
            stops_outbound=stops_out,
        )

    # ------------------------------------------------------------------
    def _scrape_html(self) -> List[HCMCRoute]:
        """Fallback HTML scraper for the transport center website."""
        url = f"{self.base}/Lines/Lines"
        try:
            html = self.http.get_html(url)
        except Exception as exc:
            log.error("[HCMC] Cannot fetch route list: %s", exc)
            return []

        soup = BeautifulSoup(html, "lxml")
        links = soup.select(SELECTORS["route_links"])
        route_ids = []
        seen = set()
        for a in links:
            href = a.get("href", "")
            m = re.search(r"/Lines/Detail/(\d+)|/tuyen/(\d+)", href)
            if m:
                rid = m.group(1) or m.group(2)
                if rid not in seen:
                    seen.add(rid)
                    route_ids.append(rid)

        log.info("[HCMC] Found %d route IDs in HTML", len(route_ids))
        routes = []
        for rid in route_ids:
            try:
                route = self._scrape_html_detail(rid)
                if route:
                    routes.append(route)
            except Exception as exc:
                log.warning("[HCMC] Failed route %s: %s", rid, exc)
        return routes

    def _scrape_html_detail(self, route_id: str) -> Optional[HCMCRoute]:
        url = f"{self.base}/Lines/Detail/{route_id}"
        html = self.http.get_html(url)
        soup = BeautifulSoup(html, "lxml")

        name_el = soup.select_one("h1, h2, .line-name, .route-name")
        name = name_el.get_text(" ", strip=True) if name_el else f"Route {route_id}"

        full_text = soup.get_text(" ")
        hours = re.findall(r"\d{1,2}:\d{2}", full_text)
        first_dep = hours[0] if hours else "05:00"
        last_dep = hours[1] if len(hours) > 1 else "21:30"

        headway_m = re.search(r"(\d+)\s*(phút|min)", full_text)
        headway = int(headway_m.group(1)) if headway_m else 15

        fare_m = re.search(r"([\d\.]+)\s*đồng|VND", full_text, re.IGNORECASE)
        fare = int(fare_m.group(1).replace(".", "")) if fare_m else 7000

        dist_m = re.search(r"([\d,\.]+)\s*km", full_text, re.IGNORECASE)
        distance = float(dist_m.group(1).replace(",", "")) if dist_m else 0.0

        stops_out, stops_in = self._parse_stop_tables(soup)

        return HCMCRoute(
            route_id=route_id,
            route_name=name,
            distance_km=distance,
            fare_vnd=fare,
            first_departure=first_dep,
            last_departure=last_dep,
            headway_min=headway,
            stops_outbound=stops_out,
            stops_inbound=stops_in,
        )

    def _parse_stop_tables(self, soup: BeautifulSoup):
        tables = soup.select("table")
        stops_out: List[HCMCStop] = []
        stops_in: List[HCMCStop] = []

        for i, table in enumerate(tables[:2]):
            rows = table.select("tr")
            stops = []
            for j, row in enumerate(rows):
                cells = [td.get_text(" ", strip=True) for td in row.select("td")]
                if len(cells) < 2:
                    continue
                seq = _safe_int(cells[0]) or j
                name = cells[1] if len(cells) > 1 else ""
                addr = cells[2] if len(cells) > 2 else ""
                if name:
                    stops.append(HCMCStop(sequence=seq, name=name, address=addr))
            if i == 0:
                stops_out = stops
            else:
                stops_in = stops

        return stops_out, stops_in


def _safe_int(s: str) -> Optional[int]:
    try:
        return int(re.sub(r"[^\d]", "", s))
    except Exception:
        return None
