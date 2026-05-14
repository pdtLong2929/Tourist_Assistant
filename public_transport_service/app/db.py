"""
db.py — Postgres connection pool (psycopg2 + SimpleConnectionPool).
Usage: from .db import get_conn, release_conn
"""

import os
from psycopg2 import pool, extras

_pool: pool.SimpleConnectionPool | None = None


def init_pool(minconn: int = 2, maxconn: int = 10) -> None:
    """Call once at application startup."""
    global _pool
    if _pool is not None:
        return

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError(
            "DATABASE_URL env var is not set. "
            "Example: postgresql://user:pass@localhost:5432/gtfs_db"
        )

    _pool = pool.SimpleConnectionPool(minconn, maxconn, dsn=dsn)
    print(f"[DB] Connection pool created (min={minconn}, max={maxconn})")


def get_conn():
    """Borrow a connection from the pool."""
    if _pool is None:
        init_pool()
    return _pool.getconn()


def release_conn(conn) -> None:
    """Return a connection to the pool."""
    if _pool and conn:
        _pool.putconn(conn)


def close_pool() -> None:
    """Call on application shutdown."""
    global _pool
    if _pool:
        _pool.closeall()
        _pool = None
        print("[DB] Connection pool closed.")
