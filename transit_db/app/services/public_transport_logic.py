"""
public_transport_logic.py — TransitService (DB-backed version).

Replaces all in-memory dict/set access with GTFSRepository calls.
The logic for scoring, direct routes, and transfer routes is unchanged.
"""

import math
from typing import Dict, List, Optional

from .gtfs_repository import GTFSRepository, _haversine


class TransitService:
    def __init__(self, city_code: str):
        self.city_code = city_code
        # Thin repository — no data loaded into RAM
        self.repo = GTFSRepository(city_code)

        self.SPEEDS_KMH = {
            "bus": 18.0, "metro": 35.0, "train": 50.0,
            "tram": 25.0, "ferry": 15.0, "default": 20.0,
        }
        self.WEIGHTS = {
            "coverage": 0.45,
            "transfers": 0.20,
            "duration": 0.15,
            "walk": 0.10,
            "tsp_direction": 0.10,
        }

    # ------------------------------------------------------------------
    # SCORING
    # ------------------------------------------------------------------
    def _calculate_combo_score(
        self, combo: Dict, total_locs: int, max_walk: float
    ) -> float:
        unique_covered: set = set()
        total_transfers = 0
        total_walk = 0.0

        for leg in combo["legs"]:
            board_walk = leg["segments"][0]["board_stop"]["distance_m"] if leg["segments"] else 0
            total_walk += board_walk + leg["walk_to_target_m"]
            total_transfers += max(0, len(leg["segments"]) - 1)
            for seg in leg["segments"]:
                unique_covered.update(seg["covered_location_indices"])

        s_coverage = len(unique_covered) / total_locs
        s_walk = (
            max(0, 1 - total_walk / (max_walk * len(combo["legs"])))
            if max_walk > 0 else 0
        )
        s_transfer = 1.0 / (total_transfers + 1)
        s_duration = max(0, 1 - combo["total_duration_min"] / 180)

        return round(
            s_coverage  * self.WEIGHTS["coverage"]
            + s_walk      * self.WEIGHTS["walk"]
            + s_transfer  * self.WEIGHTS["transfers"]
            + s_duration  * self.WEIGHTS["duration"]
            + 1.0         * self.WEIGHTS["tsp_direction"],
            4,
        )

    # ------------------------------------------------------------------
    # MAIN RECOMMEND
    # ------------------------------------------------------------------
    def recommend(
        self,
        locations: List[Dict],
        top_k: int = 5,
        max_walk_meters: float = 1000.0,
        combine_routes: bool = True,
    ) -> List[Dict]:
        all_legs_results: List[List[Dict]] = []

        for i in range(len(locations) - 1):
            leg_options = self._find_options_for_leg(
                locations[i], locations[i + 1], i, i + 1,
                max_walk_meters, combine_routes,
            )
            if not leg_options:
                print(f"[TransitService] Impossible leg: {i} → {i+1}.")
                return []
            all_legs_results.append(leg_options)

        all_combos: List[Dict] = []
        for r_idx in range(min(10, len(all_legs_results[0]))):
            legs_data, total_dist, total_dur = [], 0.0, 0

            for leg_opt in all_legs_results:
                opt = leg_opt[min(r_idx, len(leg_opt) - 1)]
                legs_data.append(opt)
                for seg in opt["segments"]:
                    total_dist += seg["estimated_distance_km"]
                    total_dur += seg["estimated_duration_min"]

            combo = {
                "legs": legs_data,
                "total_distance_km": round(total_dist, 2),
                "total_duration_min": total_dur,
                "locations_total": len(locations),
            }
            combo["score"] = self._calculate_combo_score(combo, len(locations), max_walk_meters)
            all_combos.append(combo)

        all_combos.sort(key=lambda x: x["score"], reverse=True)
        for idx, c in enumerate(all_combos):
            c["rank"] = idx + 1

        return all_combos[:top_k]

    # ------------------------------------------------------------------
    # LEG FINDER
    # ------------------------------------------------------------------
    def _find_options_for_leg(
        self,
        loc1: Dict, loc2: Dict,
        idx1: int, idx2: int,
        max_walk: float,
        combine_routes: bool,
    ) -> List[Dict]:
        options: List[Dict] = []

        stops1 = self.repo.nearest_stops(loc1["lat"], loc1["lon"], max_walk, top_n=15)
        stops2 = self.repo.nearest_stops(loc2["lat"], loc2["lon"], max_walk, top_n=15)

        # ----------------------------------------------------------------
        # 1. DIRECT ROUTES
        # ----------------------------------------------------------------
        if stops1 and stops2:
            all_stop_ids_1 = [s["stop_id"] for s in stops1]
            all_stop_ids_2 = [s["stop_id"] for s in stops2]

            routes_for_1 = self.repo.routes_for_stops(all_stop_ids_1)
            routes_for_2 = self.repo.routes_for_stops(all_stop_ids_2)

            best_direct: Dict[str, Dict] = {}

            for s1 in stops1:
                r1_set = routes_for_1.get(s1["stop_id"], set())
                for s2 in stops2:
                    r2_set = routes_for_2.get(s2["stop_id"], set())
                    common_routes = r1_set & r2_set

                    for rid in common_routes:
                        path = self.repo.get_valid_path(rid, s1["stop_id"], s2["stop_id"])
                        if not path:
                            continue

                        dist = self.repo.calculate_distance(path)
                        transit_time_min = (dist / self.SPEEDS_KMH["default"]) * 60
                        walk_time_min = (s1["distance_m"] + s2["distance_m"]) / 72.0
                        score = -(transit_time_min + walk_time_min * 2)

                        if rid not in best_direct or score > best_direct[rid]["score"]:
                            seg = self._build_segment(rid, s1, s2, len(path) - 1, [idx1, idx2], dist)
                            best_direct[rid] = {"segments": [seg], "score": score}

            options.extend(best_direct.values())

        # ----------------------------------------------------------------
        # 2. TRANSFER ROUTES
        # ----------------------------------------------------------------
        if combine_routes and len(options) < 5 and stops1 and stops2:
            all_stop_ids_1 = [s["stop_id"] for s in stops1]
            all_stop_ids_2 = [s["stop_id"] for s in stops2]

            routes_for_1 = self.repo.routes_for_stops(all_stop_ids_1)
            routes_for_2 = self.repo.routes_for_stops(all_stop_ids_2)

            stop_map_1 = {s["stop_id"]: s for s in stops1}
            stop_map_2 = {s["stop_id"]: s for s in stops2}

            r1_dict: Dict[str, Dict] = {}
            for sid, rset in routes_for_1.items():
                s = stop_map_1[sid]
                for r in rset:
                    if r not in r1_dict or s["distance_m"] < r1_dict[r]["distance_m"]:
                        r1_dict[r] = s

            r2_dict: Dict[str, Dict] = {}
            for sid, rset in routes_for_2.items():
                s = stop_map_2[sid]
                for r in rset:
                    if r not in r2_dict or s["distance_m"] < r2_dict[r]["distance_m"]:
                        r2_dict[r] = s

            all_r1_ids = list(r1_dict.keys())
            all_r2_ids = list(r2_dict.keys())
            stops_for_r1 = self.repo.stops_for_routes(all_r1_ids)
            stops_for_r2 = self.repo.stops_for_routes(all_r2_ids)

            for r1, s_board in r1_dict.items():
                for r2, s_alight in r2_dict.items():
                    if r1 == r2:
                        continue

                    intersections = stops_for_r1.get(r1, set()) & stops_for_r2.get(r2, set())
                    for t_id in intersections:
                        path1 = self.repo.get_valid_path(r1, s_board["stop_id"], t_id)
                        path2 = self.repo.get_valid_path(r2, t_id, s_alight["stop_id"])

                        if not (path1 and path2):
                            continue

                        t_stop_data = self.repo.get_stop_by_id(t_id)
                        if not t_stop_data:
                            continue
                        t_stop = {**t_stop_data, "distance_m": 0.0}

                        dist1 = self.repo.calculate_distance(path1)
                        dist2 = self.repo.calculate_distance(path2)
                        score = -(
                            s_board["distance_m"]
                            + s_alight["distance_m"]
                            + (dist1 + dist2) * 8
                            + 1000
                        )
                        seg1 = self._build_segment(r1, s_board, t_stop, len(path1) - 1, [idx1], dist1)
                        seg2 = self._build_segment(r2, t_stop, s_alight, len(path2) - 1, [idx2], dist2)
                        options.append({"segments": [seg1, seg2], "score": score})

        # ----------------------------------------------------------------
        # 3. PURE WALKING FALLBACK
        # ----------------------------------------------------------------
        if not options:
            direct_dist = _haversine(loc1["lat"], loc1["lon"], loc2["lat"], loc2["lon"])
            if direct_dist <= max_walk:
                return [{
                    "from_index": idx1, "to_index": idx2,
                    "segments": [],
                    "walk_to_target_m": round(direct_dist, 1),
                    "instruction": f"Walk directly for {round(direct_dist, 1)} meters.",
                }]
            return []

        options.sort(key=lambda x: x["score"], reverse=True)

        # ----------------------------------------------------------------
        # 4. FORMAT FINAL LEGS
        # ----------------------------------------------------------------
        final_options: List[Dict] = []
        for opt in options[:10]:
            last_stop = opt["segments"][-1]["alight_stop"]
            final_options.append({
                "from_index": idx1,
                "to_index": idx2,
                "segments": opt["segments"],
                "walk_to_target_m": last_stop["distance_m"],
                "instruction": (
                    f"Alight at {last_stop['stop_name']}, "
                    f"walk {last_stop['distance_m']} meters to destination."
                ),
            })

        return final_options

    # ------------------------------------------------------------------
    # SEGMENT BUILDER
    # ------------------------------------------------------------------
    def _build_segment(
        self,
        rid: str,
        board: Dict,
        alight: Dict,
        count: int,
        idxs: List[int],
        dist: float,
    ) -> Dict:
        route = self.repo.get_route_by_id(rid) or {}
        transit_type = route.get("type", "default").lower()
        speed_kmh = self.SPEEDS_KMH.get(transit_type, self.SPEEDS_KMH["default"])

        return {
            "route_id": rid,
            "route_short_name": route.get("route_short_name", "N/A"),
            "route_long_name": route.get("route_long_name", "N/A"),
            "transit_type": transit_type,
            "board_stop": board,
            "alight_stop": alight,
            "stops_on_route": count,
            "covered_location_indices": idxs,
            "estimated_distance_km": dist,
            "estimated_duration_min": round((dist / speed_kmh) * 60),
        }

    # ------------------------------------------------------------------
    # DATA RETRIEVAL (pass-through to repository)
    # ------------------------------------------------------------------
    def get_all_routes(self) -> List[Dict]:
        return self.repo.get_all_routes()

    def get_route_by_id(self, route_id: str) -> Optional[Dict]:
        return self.repo.get_route_by_id(route_id)

    def get_all_stops(self) -> List[Dict]:
        return self.repo.get_all_stops()

    def get_stop_by_id(self, stop_id: str) -> Optional[Dict]:
        return self.repo.get_stop_by_id(stop_id)

    def get_stops_by_route(self, route_id: str) -> List[Dict]:
        stop_ids = self.repo.stops_for_routes([route_id]).get(route_id, set())
        stops = [self.repo.get_stop_by_id(sid) for sid in stop_ids]
        return [s for s in stops if s]
