"""
Shared HTTP session with rate-limiting, retries and polite delays.
"""

import time
import logging
from typing import Optional

import requests
from tenacity import (
    retry, stop_after_attempt, wait_exponential,
    retry_if_exception_type, before_sleep_log,
)

from config import (
    HTTP_TIMEOUT, HTTP_DELAY, HTTP_MAX_RETRIES,
    HTTP_BACKOFF_FACTOR, HEADERS,
)

log = logging.getLogger(__name__)

_last_request_time: float = 0.0


def _throttle():
    """Enforce minimum delay between requests."""
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < HTTP_DELAY:
        time.sleep(HTTP_DELAY - elapsed)
    _last_request_time = time.time()


class Session:
    """Thin wrapper around requests.Session with retry + rate-limit."""

    def __init__(self, base_headers: Optional[dict] = None):
        self._session = requests.Session()
        self._session.headers.update(HEADERS)
        if base_headers:
            self._session.headers.update(base_headers)

    @retry(
        retry=retry_if_exception_type((requests.Timeout, requests.ConnectionError)),
        stop=stop_after_attempt(HTTP_MAX_RETRIES),
        wait=wait_exponential(multiplier=HTTP_BACKOFF_FACTOR, min=1, max=30),
        before_sleep=before_sleep_log(log, logging.WARNING),
        reraise=True,
    )
    def get(self, url: str, **kwargs) -> requests.Response:
        _throttle()
        log.debug("GET %s", url)
        resp = self._session.get(url, timeout=HTTP_TIMEOUT, **kwargs)
        resp.raise_for_status()
        return resp

    @retry(
        retry=retry_if_exception_type((requests.Timeout, requests.ConnectionError)),
        stop=stop_after_attempt(HTTP_MAX_RETRIES),
        wait=wait_exponential(multiplier=HTTP_BACKOFF_FACTOR, min=1, max=30),
        before_sleep=before_sleep_log(log, logging.WARNING),
        reraise=True,
    )
    def post(self, url: str, **kwargs) -> requests.Response:
        _throttle()
        log.debug("POST %s", url)
        resp = self._session.post(url, timeout=HTTP_TIMEOUT, **kwargs)
        resp.raise_for_status()
        return resp

    def get_json(self, url: str, **kwargs) -> dict | list:
        resp = self.get(url, **kwargs)
        return resp.json()

    def get_html(self, url: str, **kwargs) -> str:
        resp = self.get(url, **kwargs)
        return resp.text
