"""Logging configuration."""
import logging
from rich.logging import RichHandler


def setup(level: str = "INFO"):
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(message)s",
        handlers=[RichHandler(rich_tracebacks=True)],
    )
