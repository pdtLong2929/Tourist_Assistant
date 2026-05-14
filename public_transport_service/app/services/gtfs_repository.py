"""GTFSRepository: interface between GTFS data in DB and app logic.

Tables:
    gtfs_stops      (feed_id, stop_id, stop_name, stop_lat, stop_lon, ...)
    gtfs_routes     (feed_id, route_id, route_short_name, route_long_name, route_type, ...)
    gtfs_trips      (feed_id, trip_id, route_id, ...)
    gtfs_stop_times (feed_id, trip_id, stop_sequence, stop_id, ...)

"""

import math
from typing import Dict, List, Optional

from ..db import get_conn, release_conn


GTFS_ROUTE_TYPES = {
    "0": "tram",
    "1": "metro",
    "2": "train",
    "3": "bus",
    "4": "ferry",
}


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _deg_offset(meters: float) -> float:
    return meters / 111_000


class GTFSRepository:
    def __init__(self, city_code: str):
        """
        The city_code corresponds to the feed_id in the DB.
        For example: 'hcmc' or 'hn'.
        """
        self.city_code = city_code

    # ------------------------------------------------------------------
    # INTERNAL HELPERS
    # ------------------------------------------------------------------
    def _exec(self, sql: str, params: tuple = ()) -> List[Dict]:
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, row)) for row in cur.fetchall()]
        finally:
            release_conn(conn)

    def _exec_one(self, sql: str, params: tuple = ()) -> Optional[Dict]:
        rows = self._exec(sql, params)
        return rows[0] if rows else None

    # ------------------------------------------------------------------
    # STOPS
    # ------------------------------------------------------------------
    def get_all_stops(self) -> List[Dict]:
        rows = self._exec(
            """
            SELECT distinct stop_id,
                   stop_name,
                   stop_lat AS lat,
                   stop_lon AS lon
            FROM   gtfs_stops
            WHERE  feed_id = %s
            ORDER  BY stop_id
            """,
            (self.city_code,),
        )
        return self._attach_stop_type(rows)

    def get_stop_by_id(self, stop_id: str) -> Optional[Dict]:
        row = self._exec_one(
            """
            SELECT distinct stop_id,
                   stop_name,
                   stop_lat AS lat,
                   stop_lon AS lon
            FROM   gtfs_stops
            WHERE  feed_id = %s AND stop_id = %s
            """,
            (self.city_code, stop_id),
        )
        if not row:
            return None
        return self._attach_stop_type([row])[0]

    def nearest_stops(
        self, lat: float, lon: float, max_meters: float, top_n: int = 10
    ) -> List[Dict]:
        """
        Bounding-box filter in SQL, precise Haversine in Python.
        """
        delta = _deg_offset(max_meters)
        rows = self._exec(
            """
            SELECT distinct stop_id,
                   stop_name,
                   stop_lat AS lat,
                   stop_lon AS lon
            FROM   gtfs_stops
            WHERE  feed_id  = %s
              AND  stop_lat BETWEEN %s AND %s
              AND  stop_lon BETWEEN %s AND %s
            """,
            (
                self.city_code,
                lat - delta, lat + delta,
                lon - delta, lon + delta,
            ),
        )

        results = []
        for r in rows:
            d = _haversine(lat, lon, r["lat"], r["lon"])
            if d <= max_meters:
                results.append({**r, "distance_m": round(d, 1)})

        results.sort(key=lambda x: x["distance_m"])
        candidates = results[:top_n]
        return self._attach_stop_type(candidates)

    def _attach_stop_type(self, stops: List[Dict]) -> List[Dict]:
        """
        Attach a 'type' field (bus/metro/...) to each stop
        using a bulk join query via stop_times → trips → routes.
        Prioritize metro/train over bus if a stop serves multiple types.
        """
        if not stops:
            return stops

        stop_ids = [s["stop_id"] for s in stops]
        placeholders = ",".join(["%s"] * len(stop_ids))

        rows = self._exec(
            f"""
            SELECT DISTINCT st.stop_id, r.route_type
            FROM   gtfs_stop_times st
            JOIN   gtfs_trips      tr ON tr.trip_id = st.trip_id
                                     AND tr.feed_id = st.feed_id
            JOIN   gtfs_routes     r  ON r.route_id = tr.route_id
                                     AND r.feed_id  = tr.feed_id
            WHERE  st.feed_id = %s
              AND  st.stop_id IN ({placeholders})
            """,
            (self.city_code, *stop_ids),
        )

        priority = {"metro": 3, "train": 3, "tram": 2, "bus": 1, "ferry": 1}
        type_map: Dict[str, str] = {}
        for r in rows:
            t = GTFS_ROUTE_TYPES.get(str(r["route_type"]), "bus")
            existing = type_map.get(r["stop_id"], "bus")
            if priority.get(t, 0) > priority.get(existing, 0):
                type_map[r["stop_id"]] = t

        for s in stops:
            s["type"] = type_map.get(s["stop_id"], "bus")

        return stops

    # ------------------------------------------------------------------
    # ROUTES
    # ------------------------------------------------------------------
    def get_all_routes(self) -> List[Dict]:
        rows = self._exec(
            """
            SELECT route_id,
                   route_short_name,
                   route_long_name,
                   route_type
            FROM   gtfs_routes
            WHERE  feed_id = %s
            ORDER  BY route_id
            """,
            (self.city_code,),
        )
        return [self._format_route(r) for r in rows]

    def get_route_by_id(self, route_id: str) -> Optional[Dict]:
        row = self._exec_one(
            """
            SELECT route_id,
                   route_short_name,
                   route_long_name,
                   route_type
            FROM   gtfs_routes
            WHERE  feed_id = %s AND route_id = %s
            """,
            (self.city_code, route_id),
        )
        return self._format_route(row) if row else None

    def _format_route(self, row: Dict) -> Dict:
        return {
            "route_id":         row["route_id"],
            "route_short_name": row.get("route_short_name", ""),
            "route_long_name":  row.get("route_long_name", ""),
            "type": GTFS_ROUTE_TYPES.get(str(row.get("route_type", "3")), "bus"),
        }

    # ------------------------------------------------------------------
    # STOP ↔ ROUTE LOOKUPS
    # ------------------------------------------------------------------
    def routes_for_stops(self, stop_ids: List[str]) -> Dict[str, set]:
        """
        Return {stop_id: {route_id, ...}} for a list of stop_ids.
        Join: gtfs_stop_times → gtfs_trips to get route_id.
        """
        if not stop_ids:
            return {}

        placeholders = ",".join(["%s"] * len(stop_ids))
        rows = self._exec(
            f"""
            SELECT DISTINCT st.stop_id, tr.route_id
            FROM   gtfs_stop_times st
            JOIN   gtfs_trips      tr ON tr.trip_id = st.trip_id
                                     AND tr.feed_id = st.feed_id
            WHERE  st.feed_id = %s
              AND  st.stop_id IN ({placeholders})
            """,
            (self.city_code, *stop_ids),
        )

        result: Dict[str, set] = {sid: set() for sid in stop_ids}
        for r in rows:
            result[r["stop_id"]].add(r["route_id"])
        return result

    def stops_for_routes(self, route_ids: List[str]) -> Dict[str, set]:
        """
        Return {route_id: {stop_id, ...}} for a list of route_ids.
        Used for transfer-route intersection.
        """
        if not route_ids:
            return {}

        placeholders = ",".join(["%s"] * len(route_ids))
        rows = self._exec(
            f"""
            SELECT DISTINCT tr.route_id, st.stop_id
            FROM   gtfs_trips      tr
            JOIN   gtfs_stop_times st ON st.trip_id = tr.trip_id
                                     AND st.feed_id = tr.feed_id
            WHERE  tr.feed_id  = %s
              AND  tr.route_id IN ({placeholders})
            """,
            (self.city_code, *route_ids),
        )

        result: Dict[str, set] = {rid: set() for rid in route_ids}
        for r in rows:
            result[r["route_id"]].add(r["stop_id"])
        return result

    def get_stops_by_route(self, route_id: str) -> List[Dict]:
        """
        Return a list of stops in the order of their stop_sequence for a representative trip.
        """
        rows = self._exec(
            """
            SELECT DISTINCT ON (st.stop_id)
                   st.stop_id,
                   s.stop_name,
                   s.stop_lat  AS lat,
                   s.stop_lon  AS lon,
                   st.stop_sequence
            FROM   gtfs_trips      tr
            JOIN   gtfs_stop_times st ON st.trip_id = tr.trip_id
                                     AND st.feed_id = tr.feed_id
            JOIN   gtfs_stops      s  ON s.stop_id  = st.stop_id
                                     AND s.feed_id  = st.feed_id
            WHERE  tr.feed_id  = %s
              AND  tr.route_id = %s
            ORDER  BY st.stop_id, st.stop_sequence
            """,
            (self.city_code, route_id),
        )
        rows.sort(key=lambda x: x["stop_sequence"])
        return self._attach_stop_type(rows)

    # ------------------------------------------------------------------
    # PATH / SEQUENCE
    # ------------------------------------------------------------------
    def get_valid_path(
        self, route_id: str, stop_id_1: str, stop_id_2: str
    ) -> Optional[List[str]]:
        """
        Find a trip of the given route_id that passes through stop_id_1 BEFORE stop_id_2.
        Return a list of stop_ids in the order from s1 to s2.
        """
        rows = self._exec(
            """
            WITH trip_candidate AS (
                SELECT st1.trip_id,
                       st1.stop_sequence AS seq1,
                       st2.stop_sequence AS seq2
                FROM   gtfs_stop_times st1
                JOIN   gtfs_stop_times st2 ON st2.trip_id      = st1.trip_id
                                           AND st2.feed_id     = st1.feed_id
                                           AND st2.stop_id     = %s
                JOIN   gtfs_trips      tr  ON tr.trip_id       = st1.trip_id
                                           AND tr.feed_id      = st1.feed_id
                WHERE  st1.feed_id       = %s
                  AND  st1.stop_id       = %s
                  AND  tr.route_id       = %s
                  AND  st1.stop_sequence < st2.stop_sequence
                ORDER  BY (st2.stop_sequence - st1.stop_sequence)
                LIMIT  1
            )
            SELECT st.stop_id
            FROM   gtfs_stop_times st
            JOIN   trip_candidate  tc ON tc.trip_id = st.trip_id
            WHERE  st.feed_id       = %s
              AND  st.stop_sequence BETWEEN tc.seq1 AND tc.seq2
            ORDER  BY st.stop_sequence
            """,
            (stop_id_2, self.city_code, stop_id_1, route_id, self.city_code),
        )

        if not rows:
            return None
        return [r["stop_id"] for r in rows]

    def calculate_distance(self, stop_ids: List[str]) -> float:
        """
        Calculate the total Haversine distance along a list of stop_ids (km).
        """
        if len(stop_ids) < 2:
            return 0.0

        placeholders = ",".join(["%s"] * len(stop_ids))
        rows = self._exec(
            f"""
            SELECT stop_id,
                   stop_lat AS lat,
                   stop_lon AS lon
            FROM   gtfs_stops
            WHERE  feed_id = %s AND stop_id IN ({placeholders})
            """,
            (self.city_code, *stop_ids),
        )

        coord_map = {r["stop_id"]: (r["lat"], r["lon"]) for r in rows}

        total = 0.0
        for i in range(len(stop_ids) - 1):
            s1, s2 = stop_ids[i], stop_ids[i + 1]
            if s1 in coord_map and s2 in coord_map:
                total += _haversine(*coord_map[s1], *coord_map[s2])

        return round(total / 1000, 2)