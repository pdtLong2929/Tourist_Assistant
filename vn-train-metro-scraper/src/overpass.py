"""
overpass.py — Strict Overpass API client.

Only queries the official Overpass API (overpass-api.de).
No fallbacks, no mirrors unless explicitly configured.
Raises on any HTTP error or Overpass-level error.
"""

import time
import logging
from typing import Any, Dict, List, Optional

import requests

log = logging.getLogger(__name__)

# Strictly use the main instance — change only if you run your own mirror
OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter"

# Respectful defaults
DEFAULT_TIMEOUT = 120          # seconds
RETRY_WAIT = 10                # seconds between retries on 429 / 503
MAX_RETRIES = 3


class OverpassError(RuntimeError):
    """Raised when Overpass returns an error or unexpected response."""


class OverpassClient:
    """
    Thin, strict wrapper around the Overpass API.

    Usage
    -----
    client = OverpassClient()
    data = client.query(ql_string)
    """

    def __init__(
        self,
        endpoint: str = OVERPASS_ENDPOINT,
        timeout: int = DEFAULT_TIMEOUT,
        user_agent: str = "vn-gtfs-scraper/1.0 (github.com/your-org/vn-gtfs-scraper)",
    ):
        self.endpoint = endpoint
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent})

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def query(self, ql: str) -> Dict[str, Any]:
        """
        Execute an Overpass QL query and return the parsed JSON dict.

        Parameters
        ----------
        ql : str
            Full Overpass QL query string (including [out:json] header).

        Returns
        -------
        dict with 'elements' list at minimum.
        """
        log.info("Sending Overpass query (%d chars)", len(ql))
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                resp = self.session.post(
                    self.endpoint,
                    data={"data": ql},
                    timeout=self.timeout,
                )
            except requests.exceptions.Timeout:
                raise OverpassError(
                    f"Overpass request timed out after {self.timeout}s"
                )
            except requests.exceptions.ConnectionError as exc:
                raise OverpassError(f"Could not connect to Overpass API: {exc}")

            if resp.status_code == 200:
                break
            elif resp.status_code in (429, 503):
                wait = RETRY_WAIT * attempt
                log.warning(
                    "Overpass returned %s (attempt %d/%d), waiting %ds …",
                    resp.status_code, attempt, MAX_RETRIES, wait,
                )
                time.sleep(wait)
            else:
                raise OverpassError(
                    f"Overpass returned HTTP {resp.status_code}: {resp.text[:300]}"
                )
        else:
            raise OverpassError(
                f"Overpass unavailable after {MAX_RETRIES} attempts (429/503)"
            )

        try:
            data = resp.json()
        except ValueError:
            raise OverpassError(
                f"Overpass returned non-JSON response: {resp.text[:300]}"
            )

        if "elements" not in data:
            raise OverpassError(
                f"Overpass response missing 'elements' key: {list(data.keys())}"
            )

        log.info("Overpass returned %d elements", len(data["elements"]))
        return data

    # ------------------------------------------------------------------
    # Pre-built query helpers
    # ------------------------------------------------------------------

    def fetch_route_relations_in_bbox(
        self,
        south: float,
        west: float,
        north: float,
        east: float,
        route_tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Fetch all route relations of type subway/rail within a bounding box.
        Returns full relation + way + node geometry.
        """
        if route_tags is None:
            route_tags = ["subway", "light_rail", "rail", "tram", "monorail"]

        tag_union = "\n".join(
            f'  relation["type"="route"]["route"="{rt}"]'
            f'({south},{west},{north},{east});'
            for rt in route_tags
        )

        ql = f"""
[out:json][timeout:{self.timeout}];
(
{tag_union}
);
// Recurse down to get ways and nodes
>>;
out body;
"""
        return self.query(ql)

    def fetch_relations_by_id(self, relation_ids: List[int]) -> Dict[str, Any]:
        """
        Fetch specific relations (and all their members) by OSM ID.
        """
        if not relation_ids:
            return {"elements": []}

        ids_str = ",".join(str(i) for i in relation_ids)
        ql = f"""
[out:json][timeout:{self.timeout}];
relation(id:{ids_str});
>>;
out body;
"""
        return self.query(ql)

    def fetch_stops_in_bbox(
        self,
        south: float,
        west: float,
        north: float,
        east: float,
    ) -> Dict[str, Any]:
        """
        Fetch all station/stop nodes within a bounding box.
        Catches both node-level stops and platform areas.
        """
        ql = f"""
[out:json][timeout:{self.timeout}];
(
  node["railway"="station"]({south},{west},{north},{east});
  node["railway"="halt"]({south},{west},{north},{east});
  node["subway"="yes"]({south},{west},{north},{east});
  node["public_transport"="stop_position"]({south},{west},{north},{east});
  node["public_transport"="platform"]({south},{west},{north},{east});
  way["public_transport"="platform"]({south},{west},{north},{east});
);
out center body;
"""
        return self.query(ql)
