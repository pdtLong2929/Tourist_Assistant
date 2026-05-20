"""GTFSRepository: interface between GTFS data in DB and app logic.

Tables:
    gtfs_stops      (feed_id, stop_id, stop_name, stop_lat, stop_lon, ...)
    gtfs_routes     (feed_id, route_id, route_short_name, route_long_name, route_type, ...)
    gtfs_trips      (feed_id, trip_id, route_id, ...)
    gtfs_stop_times (feed_id, trip_id, stop_sequence, stop_id, ...)

"""

from functools import lru_cache
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


@lru_cache(maxsize=5000)
def _get_stop_by_id_full_cached(feed_id: tuple, stop_id: str) -> Optional[dict]:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SET search_path TO trip_db, public")
            cur.execute(
                """
                SELECT distinct stop_id,
                       stop_name,
                       stop_lat AS lat,
                       stop_lon AS lon
                FROM   trip_db.gtfs_stops
                WHERE  feed_id IN %s AND stop_id = %s
                """,
                (feed_id, stop_id),
            )
            import decimal
            if cur.description is None:
                return None
            cols = [d[0] for d in cur.description]
            rows = []
            for row in cur.fetchall():
                d = dict(zip(cols, row))
                for k, v in d.items():
                    if isinstance(v, decimal.Decimal):
                        d[k] = float(v)
                rows.append(d)
            if not rows:
                return None
            stop = rows[0]
            
            # Now fetch route type
            cur.execute(
                """
                SELECT DISTINCT r.route_type
                FROM   trip_db.gtfs_stop_times st
                JOIN   trip_db.gtfs_trips      tr ON tr.trip_id = st.trip_id
                                         AND tr.feed_id = st.feed_id
                JOIN   trip_db.gtfs_routes     r  ON r.route_id = tr.route_id
                                         AND r.feed_id  = tr.feed_id
                WHERE  st.feed_id IN %s
                  AND  st.stop_id = %s
                """,
                (feed_id, stop_id),
            )
            priority = {"metro": 3, "train": 3, "tram": 2, "bus": 1, "ferry": 1}
            stop_type = "bus"
            for r in cur.fetchall():
                t = GTFS_ROUTE_TYPES.get(str(r[0]), "bus")
                if priority.get(t, 0) > priority.get(stop_type, 0):
                    stop_type = t
            stop["type"] = stop_type
            return stop
    finally:
        release_conn(conn)


@lru_cache(maxsize=10000)
def _get_stop_coordinates_cached(feed_id: tuple, stop_id: str) -> Optional[tuple]:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SET search_path TO trip_db, public")
            cur.execute(
                """
                SELECT stop_lat AS lat, stop_lon AS lon
                FROM   trip_db.gtfs_stops
                WHERE  feed_id IN %s AND stop_id = %s
                """,
                (feed_id, stop_id),
            )
            row = cur.fetchone()
            if row:
                return (float(row[0]), float(row[1]))
            return None
    finally:
        release_conn(conn)


@lru_cache(maxsize=1000)
def _get_route_by_id_cached(feed_id: tuple, route_id: str) -> Optional[dict]:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SET search_path TO trip_db, public")
            cur.execute(
                """
                SELECT route_id,
                       route_short_name,
                       route_long_name,
                       route_type
                FROM   trip_db.gtfs_routes
                WHERE  feed_id IN %s AND route_id = %s
                """,
                (feed_id, route_id),
            )
            if cur.description is None:
                return None
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
            if not rows:
                return None
            row = rows[0]
            return {
                "route_id":         row["route_id"],
                "route_short_name": row.get("route_short_name", ""),
                "route_long_name":  row.get("route_long_name", ""),
                "type": GTFS_ROUTE_TYPES.get(str(row.get("route_type", "3")), "bus"),
            }
    finally:
        release_conn(conn)


@lru_cache(maxsize=20000)
def _get_valid_path_cached(feed_id: tuple, route_id: str, stop_id_1: str, stop_id_2: str) -> Optional[tuple]:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SET search_path TO trip_db, public")
            cur.execute(
                """
                WITH trip_candidate AS (
                    SELECT st1.trip_id,
                           st1.stop_sequence AS seq1,
                           st2.stop_sequence AS seq2
                    FROM   trip_db.gtfs_stop_times st1
                    JOIN   trip_db.gtfs_stop_times st2 ON st2.trip_id      = st1.trip_id
                                                       AND st2.feed_id     = st1.feed_id
                                                       AND st2.stop_id     = %s
                    JOIN   trip_db.gtfs_trips      tr  ON tr.trip_id       = st1.trip_id
                                                       AND tr.feed_id      = st1.feed_id
                    WHERE  st1.feed_id       IN %s
                      AND  st1.stop_id       = %s
                      AND  tr.route_id       = %s
                      AND  st1.stop_sequence < st2.stop_sequence
                    ORDER  BY (st2.stop_sequence - st1.stop_sequence)
                    LIMIT  1
                )
                SELECT st.stop_id
                FROM   trip_db.gtfs_stop_times st
                JOIN   trip_candidate  tc ON tc.trip_id = st.trip_id
                WHERE  st.feed_id       IN %s
                  AND  st.stop_sequence BETWEEN tc.seq1 AND tc.seq2
                ORDER  BY st.stop_sequence
                """,
                (stop_id_2, feed_id, stop_id_1, route_id, feed_id),
            )
            res = [row[0] for row in cur.fetchall()]
            return tuple(res) if res else None
    finally:
        release_conn(conn)


class GTFSRepository:
    def __init__(self, city_code: str):
        """
        city_code tương ứng với feed_id trong DB.
        Ví dụ: 'hcmc' hoặc 'hn'.
        """
        if city_code.lower() == "hcmc":
            self.feed_id = ("FEED000002", "HCMCNOBUS")
        elif city_code.lower() == "hn":
            self.feed_id = ("FEED000001", "HANOINOBUS")
        else:
            self.feed_id = (city_code,)

    # ------------------------------------------------------------------
    # INTERNAL HELPERS
    # ------------------------------------------------------------------
    def _exec(self, sql: str, params: tuple = ()) -> List[Dict]:
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("SET search_path TO trip_db, public")
                cur.execute(sql, params)
                if cur.description is None:
                    return []
                cols = [d[0] for d in cur.description]
                
                import decimal
                results = []
                for row in cur.fetchall():
                    d = dict(zip(cols, row))
                    for k, v in d.items():
                        if isinstance(v, decimal.Decimal):
                            d[k] = float(v)
                    results.append(d)
                return results
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
            FROM trip_db.gtfs_stops
            WHERE  feed_id IN %s
            ORDER  BY stop_id
            """,
            (self.feed_id,),
        )
        return self._attach_stop_type(rows)

    def get_stop_by_id(self, stop_id: str) -> Optional[Dict]:
        res = _get_stop_by_id_full_cached(self.feed_id, stop_id)
        if not res:
            return None
        return dict(res)

    def nearest_stops(
        self, lat: float, lon: float, max_meters: float, top_n: int = 15
    ) -> List[Dict]:
        """
        Bounding-box filter trong SQL, haversine chính xác trong Python.
        """
        delta = _deg_offset(max_meters)
        rows = self._exec(
            """
            SELECT distinct stop_id,
                   stop_name,
                   stop_lat AS lat,
                   stop_lon AS lon
            FROM trip_db.gtfs_stops
            WHERE feed_id IN %s
              AND  stop_lat BETWEEN %s AND %s
              AND  stop_lon BETWEEN %s AND %s
            """,
            (
                self.feed_id,
                lat - delta, lat + delta,
                lon - delta, lon + delta,
            ),
        )

        results = []
        for r in rows:
            stop_lat = float(r["lat"])
            stop_lon = float(r["lon"])
            d = _haversine(lat, lon, stop_lat, stop_lon)
            if d <= max_meters:
                results.append({"stop_id": r["stop_id"],
                "stop_name": r["stop_name"],
                "lat": stop_lat,
                "lon": stop_lon,
                "distance_m": round(d, 1)})

        results.sort(key=lambda x: x["distance_m"])
        candidates = results[:top_n]
        return self._attach_stop_type(candidates)

    def _attach_stop_type(self, stops: List[Dict]) -> List[Dict]:
        """
        Gắn thêm field 'type' (bus/metro/...) cho mỗi stop
        bằng 1 query bulk join qua stop_times → trips → routes.
        Ưu tiên metro/train hơn bus nếu stop phục vụ nhiều loại.
        """
        if not stops:
            return stops

        for s in stops:
            cached = _get_stop_by_id_full_cached(self.feed_id, s["stop_id"])
            s["type"] = cached["type"] if cached else "bus"

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
            FROM   trip_db.gtfs_routes
            WHERE  feed_id IN %s
            ORDER  BY route_id
            """,
            (self.feed_id,),
        )
        return [self._format_route(r) for r in rows]

    def get_route_by_id(self, route_id: str) -> Optional[Dict]:
        res = _get_route_by_id_cached(self.feed_id, route_id)
        if not res:
            return None
        return dict(res)

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
        Trả về {stop_id: {route_id, ...}} cho danh sách stop_ids.
        Join: gtfs_stop_times → gtfs_trips để lấy route_id.
        """
        if not stop_ids:
            return {}

        placeholders = ",".join(["%s"] * len(stop_ids))
        rows = self._exec(
            f"""
            SELECT DISTINCT st.stop_id, tr.route_id
            FROM   trip_db.gtfs_stop_times st
            JOIN   trip_db.gtfs_trips      tr ON tr.trip_id = st.trip_id
                                     AND tr.feed_id = st.feed_id
            WHERE  st.feed_id IN %s
              AND  st.stop_id IN ({placeholders})
            """,
            (self.feed_id, *stop_ids),
        )

        result: Dict[str, set] = {sid: set() for sid in stop_ids}
        for r in rows:
            result[r["stop_id"]].add(r["route_id"])
        return result

    def stops_for_routes(self, route_ids: List[str]) -> Dict[str, set]:
        """
        Trả về {route_id: {stop_id, ...}} cho danh sách route_ids.
        Dùng cho transfer-route intersection.
        """
        if not route_ids:
            return {}

        placeholders = ",".join(["%s"] * len(route_ids))
        rows = self._exec(
            f"""
            SELECT DISTINCT tr.route_id, st.stop_id
            FROM   trip_db.gtfs_trips      tr
            JOIN   trip_db.gtfs_stop_times st ON st.trip_id = tr.trip_id
                                             AND st.feed_id = tr.feed_id
            WHERE  tr.feed_id  IN %s
              AND  tr.route_id IN ({placeholders})
            """,
            (self.feed_id, *route_ids),
        )

        result: Dict[str, set] = {rid: set() for rid in route_ids}
        for r in rows:
            result[r["route_id"]].add(r["stop_id"])
        return result

    def get_stops_by_route(self, route_id: str) -> List[Dict]:
        """
        Trả về danh sách stop theo thứ tự stop_sequence của 1 trip đại diện.
        """
        rows = self._exec(
            """
            SELECT DISTINCT ON (st.stop_id)
                   st.stop_id,
                   s.stop_name,
                   s.stop_lat  AS lat,
                   s.stop_lon  AS lon,
                   st.stop_sequence
            FROM   trip_db.gtfs_trips      tr
            JOIN   trip_db.gtfs_stop_times st ON st.trip_id = tr.trip_id
                                             AND st.feed_id = st.feed_id
            JOIN   trip_db.gtfs_stops      s  ON s.stop_id  = st.stop_id
                                             AND s.feed_id  = st.feed_id
            WHERE  tr.feed_id  IN %s
              AND  tr.route_id = %s
            ORDER  BY st.stop_id, st.stop_sequence
            """,
            (self.feed_id, route_id),
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
        Tìm trip của route_id đi qua stop_id_1 TRƯỚC stop_id_2.
        Trả về danh sách stop_id theo thứ tự từ s1 đến s2.
        """
        res = _get_valid_path_cached(self.feed_id, route_id, stop_id_1, stop_id_2)
        return list(res) if res is not None else None

    def calculate_distance(self, stop_ids: List[str]) -> float:
        """
        Tính tổng khoảng cách haversine dọc theo danh sách stop_ids (km).
        """
        if len(stop_ids) < 2:
            return 0.0

        coord_map = {}
        for sid in stop_ids:
            coords = _get_stop_coordinates_cached(self.feed_id, sid)
            if coords:
                coord_map[sid] = coords

        total = 0.0
        for i in range(len(stop_ids) - 1):
            s1, s2 = stop_ids[i], stop_ids[i + 1]
            if s1 in coord_map and s2 in coord_map:
                total += _haversine(*coord_map[s1], *coord_map[s2])

        return round(total / 1000, 2)
