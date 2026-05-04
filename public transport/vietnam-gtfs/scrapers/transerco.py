"""
Transerco scraper — official Hanoi bus operator (transerco.com.vn).

Transerco manages most Hanoi bus routes. Their website lists routes
in HTML format. We scrape:
  - Route list page: /tuyen-xe-buyt
  - Per-route detail page: /tuyen-xe-buyt/<slug>
    → stop sequence, schedule table, fare

This data is the authoritative source for Hanoi timetables and
supplements/corrects BusMap data where they disagree.

HOW TO RE-DISCOVER ENDPOINTS
------------------------------
1. Visit https://transerco.com.vn/tuyen-xe-buyt in a browser.
2. Each route card links to a detail page. Inspect the href.
3. The detail page has a table of stops and a schedule box.
4. Update CSS selectors in SELECTORS below if the site redesigns.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict

from bs4 import BeautifulSoup

from config import TRANSERCO_BASE
from utils.http import Session

log = logging.getLogger(__name__)


@dataclass
class TransercoStop:
    sequence: int
    name: str
    address: str = ""


@dataclass
class TransercoRoute:
    route_id: str           # e.g. "01", "86B"
    route_name: str         # full name
    slug: str               # URL slug
    distance_km: float
    fare_vnd: int
    operating_hours: str    # e.g. "05:00 - 22:30"
    headway_min: int
    stops_outbound: List[TransercoStop] = field(default_factory=list)
    stops_inbound: List[TransercoStop] = field(default_factory=list)
    notes: str = ""


# CSS selectors — update these if the site redesigns
SELECTORS = {
    # Route list page
    "route_cards":        "div.route-item, div.tuyen-item, li.route",
    "route_link":         "a[href*='tuyen-xe-buyt']",
    "route_number_badge": "span.route-no, div.so-tuyen, h3",

    # Route detail page
    "stop_table_rows":    "table.stop-list tr, table.danh-sach-tram tr",
    "schedule_box":       "div.lich-chay, div.schedule, .thoi-gian-chay",
    "headway_text":       "td.tan-suat, span.frequency",
    "fare_text":          "td.gia-ve, span.fare, .gia-ve",
    "distance_text":      "td.chieu-dai, span.distance",
}


class TransercoScraper:
    """
    Scrape Transerco (Hanoi) route data from transerco.com.vn.

    Usage:
        scraper = TransercoScraper()
        routes = scraper.scrape_all_routes()
    """

    def __init__(self):
        self.http = Session()
        self.base = TRANSERCO_BASE

    def scrape_all_routes(self) -> List[TransercoRoute]:
        stubs = self._fetch_route_stubs()
        log.info("[Transerco] Found %d routes", len(stubs))
        routes = []
        for stub in stubs:
            try:
                route = self._fetch_route_detail(stub)
                if route:
                    routes.append(route)
            except Exception as exc:
                log.warning("[Transerco] Failed %s: %s", stub.get("slug"), exc)
        log.info("[Transerco] Scraped %d routes", len(routes))
        return routes

    # ------------------------------------------------------------------
    def _fetch_route_stubs(self) -> List[Dict]:
        url = f"{self.base}/tuyen-xe-buyt"
        html = self.http.get_html(url)
        soup = BeautifulSoup(html, "lxml")
        stubs = []

        # Try to find route links
        links = soup.select("a[href*='tuyen-xe-buyt']")
        seen = set()
        for link in links:
            href = link.get("href", "")
            # Ignore the list page itself
            if href.rstrip("/") in ("/tuyen-xe-buyt", f"{self.base}/tuyen-xe-buyt"):
                continue
            slug = href.split("/")[-1].strip("/")
            if not slug or slug in seen:
                continue
            seen.add(slug)

            # Extract route number from link text or a badge inside it
            text = link.get_text(" ", strip=True)
            route_no = _extract_route_no(text) or slug
            stubs.append({"slug": slug, "route_no": route_no, "name": text})

        log.info("[Transerco] Found %d route stubs from list page", len(stubs))
        return stubs

    def _fetch_route_detail(self, stub: Dict) -> Optional[TransercoRoute]:
        slug = stub["slug"]
        url = f"{self.base}/tuyen-xe-buyt/{slug}"
        html = self.http.get_html(url)
        soup = BeautifulSoup(html, "lxml")

        route_id = stub["route_no"]
        route_name = (
            soup.select_one("h1, h2.route-name, div.ten-tuyen")
            or soup.select_one("title")
        )
        name_str = route_name.get_text(" ", strip=True) if route_name else f"Route {route_id}"

        # Distance
        distance_km = _extract_number(soup, SELECTORS["distance_text"]) or 0.0
        # Fare
        fare_vnd = int(_extract_number(soup, SELECTORS["fare_text"]) or 7000)
        # Headway
        headway_min = int(_extract_number(soup, SELECTORS["headway_text"]) or 15)
        # Operating hours (look for time pattern HH:MM - HH:MM)
        full_text = soup.get_text(" ")
        hours_match = re.search(r"(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})", full_text)
        operating_hours = (
            f"{hours_match.group(1)} - {hours_match.group(2)}"
            if hours_match else "05:00 - 21:30"
        )

        # Stops
        stops_out, stops_in = self._parse_stop_tables(soup)

        return TransercoRoute(
            route_id=route_id,
            route_name=name_str,
            slug=slug,
            distance_km=float(distance_km),
            fare_vnd=fare_vnd,
            operating_hours=operating_hours,
            headway_min=headway_min,
            stops_outbound=stops_out,
            stops_inbound=stops_in,
        )

    def _parse_stop_tables(self, soup: BeautifulSoup):
        """
        Try to find stop sequence tables. Transerco typically has two tables
        (outbound/inbound) or a single table with a direction toggle.
        """
        tables = soup.select("table")
        stops_out: List[TransercoStop] = []
        stops_in: List[TransercoStop] = []

        for i, table in enumerate(tables[:2]):  # at most 2 direction tables
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
                    stops.append(TransercoStop(sequence=seq, name=name, address=addr))
            if i == 0:
                stops_out = stops
            else:
                stops_in = stops

        return stops_out, stops_in


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_route_no(text: str) -> Optional[str]:
    m = re.search(r"\b(\d{1,3}[A-Z]?)\b", text)
    return m.group(1) if m else None


def _extract_number(soup: BeautifulSoup, selector: str) -> Optional[float]:
    el = soup.select_one(selector)
    if not el:
        return None
    m = re.search(r"[\d,\.]+", el.get_text())
    if not m:
        return None
    return float(m.group().replace(",", ""))


def _safe_int(s: str) -> Optional[int]:
    try:
        return int(re.sub(r"[^\d]", "", s))
    except Exception:
        return None
