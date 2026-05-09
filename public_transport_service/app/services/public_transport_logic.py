import os
import math
from typing import List, Dict, Optional
from .gtfs_loader import MultiGTFSLoader

class TransitService:
    def __init__(self, city_code: str):
        self.city_code = city_code
        print(f"Initializing core transit engine for: {city_code.upper()}")
        
        base_dir = os.path.join("data", city_code)
        folders = []
        if os.path.exists(base_dir):
            for folder_name in os.listdir(base_dir):
                folder_path = os.path.join(base_dir, folder_name)
                if os.path.isdir(folder_path):
                    folders.append(folder_path)
        else:
            print(f"Warning: No data directory found for {city_code.upper()}")
            
        self.loader = MultiGTFSLoader(folders)
        self.loader.load()
        
        # Configuration
        self.SPEEDS_KMH = {
            "bus": 18.0, "metro": 35.0, "train": 50.0, 
            "tram": 25.0, "ferry": 15.0, "default": 20.0
        }
        
        # 5-Criteria Weights
        self.WEIGHTS = {
            "coverage": 0.45,
            "transfers": 0.20,
            "duration": 0.15,
            "walk": 0.10,
            "tsp_direction": 0.10
        }

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate direct distance between 2 coordinates in meters."""
        R = 6371000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2)**2
        return 2 * R * math.asin(math.sqrt(a))

    def _calculate_combo_score(self, combo: Dict, total_locs: int, max_walk: float) -> float:
        unique_covered = set()
        total_transfers = 0
        total_walk = 0
        
        for leg in combo["legs"]:
            total_walk += leg["walk_to_target_m"]
            total_transfers += max(0, len(leg["segments"]) - 1)
            for seg in leg["segments"]:
                unique_covered.update(seg["covered_location_indices"])
        
        s_coverage = len(unique_covered) / total_locs
        s_walk = max(0, 1 - (total_walk / (max_walk * len(combo["legs"])))) if max_walk > 0 else 0
        s_transfer = 1.0 / (total_transfers + 1)
        s_duration = max(0, 1 - (combo["total_duration_min"] / 180))
        s_direction = 1.0
        
        final_score = (
            s_coverage * self.WEIGHTS["coverage"] +
            s_walk * self.WEIGHTS["walk"] +
            s_transfer * self.WEIGHTS["transfers"] +
            s_duration * self.WEIGHTS["duration"] +
            s_direction * self.WEIGHTS["tsp_direction"]
        )
        return round(final_score, 4)

    def recommend(self, locations: List[Dict], top_k: int = 5, max_walk_meters: float = 1000.0, combine_routes: bool = True) -> List[Dict]:
        all_legs_results = []
        
        for i in range(len(locations) - 1):
            leg_options = self._find_options_for_leg(
                locations[i], locations[i+1], i, i+1, max_walk_meters, combine_routes
            )
            if not leg_options:
                print(f"[TransitService] Impossible leg: {i} -> {i+1}. Distance exceeds max_walk_meters.")
                return []
            all_legs_results.append(leg_options)

        all_combos = []
        for r_idx in range(min(10, len(all_legs_results[0]))): 
            legs_data = []
            total_dist = 0.0
            total_dur = 0
            
            for leg_opt in all_legs_results:
                opt = leg_opt[min(r_idx, len(leg_opt)-1)]
                legs_data.append(opt)
                for seg in opt["segments"]:
                    total_dist += seg["estimated_distance_km"]
                    total_dur += seg["estimated_duration_min"]
            
            combo = {
                "legs": legs_data,
                "total_distance_km": round(total_dist, 2),
                "total_duration_min": total_dur,
                "locations_total": len(locations)
            }
            
            combo["score"] = self._calculate_combo_score(combo, len(locations), max_walk_meters)
            all_combos.append(combo)

        all_combos.sort(key=lambda x: x["score"], reverse=True)

        for idx, c in enumerate(all_combos):
            c["rank"] = idx + 1
            
        return all_combos[:top_k]

    def _find_options_for_leg(self, loc1: Dict, loc2: Dict, idx1: int, idx2: int, max_walk: float, combine_routes: bool) -> List[Dict]:
        options = []
        stops1 = self.loader.nearest_stops(loc1["lat"], loc1["lon"], max_walk, top_n=15)
        stops2 = self.loader.nearest_stops(loc2["lat"], loc2["lon"], max_walk, top_n=15)
        
        # 1. DIRECT ROUTES
        if stops1 and stops2:
            best_direct = {} 
            for s1 in stops1:
                for s2 in stops2:
                    common_routes = self.loader.stop_routes.get(s1["stop_id"], set()) & self.loader.stop_routes.get(s2["stop_id"], set())
                    
                    for rid in common_routes:
                        path = self.loader.get_valid_path(rid, s1["stop_id"], s2["stop_id"])
                        if path:
                            dist = self.loader.calculate_distance(path)
                            score = -(s1["distance_m"] + s2["distance_m"] + dist * 5)
                            if rid not in best_direct or score > best_direct[rid]["score"]:
                                seg = self._build_segment(rid, s1, s2, len(path)-1, [idx1, idx2], dist)
                                best_direct[rid] = {"segments": [seg], "score": score}

            options.extend(best_direct.values())

        # 2. TRANSFER ROUTES
        if combine_routes and len(options) < 5 and stops1 and stops2:
            r1_dict, r2_dict = {}, {}
            for s in stops1:
                for r in self.loader.stop_routes.get(s["stop_id"], set()):
                    if r not in r1_dict or s["distance_m"] < r1_dict[r]["distance_m"]: 
                        r1_dict[r] = s
            for s in stops2:
                for r in self.loader.stop_routes.get(s["stop_id"], set()):
                    if r not in r2_dict or s["distance_m"] < r2_dict[r]["distance_m"]: 
                        r2_dict[r] = s

            for r1, s_board in r1_dict.items():
                for r2, s_alight in r2_dict.items():
                    if r1 == r2: continue
                    intersections = self.loader.route_stops[r1] & self.loader.route_stops[r2]
                    
                    for t_id in intersections:
                        path1 = self.loader.get_valid_path(r1, s_board["stop_id"], t_id)
                        path2 = self.loader.get_valid_path(r2, t_id, s_alight["stop_id"])
                        
                        if path1 and path2:
                            t_stop = {**self.loader.stops[t_id], "distance_m": 0.0}
                            dist1 = self.loader.calculate_distance(path1)
                            dist2 = self.loader.calculate_distance(path2)
                            score = -(s_board["distance_m"] + s_alight["distance_m"] + (dist1 + dist2) * 8 + 1000)
                            
                            seg1 = self._build_segment(r1, s_board, t_stop, len(path1)-1, [idx1], dist1)
                            seg2 = self._build_segment(r2, t_stop, s_alight, len(path2)-1, [idx2], dist2)
                            options.append({"segments": [seg1, seg2], "score": score})

        # 3. PURE WALKING FALLBACK - Only if no transit options found and within walkable distance
        if len(options) == 0:
            direct_walk_dist = self._haversine(loc1["lat"], loc1["lon"], loc2["lat"], loc2["lon"])
            if direct_walk_dist <= max_walk:
                return [{
                    "from_index": idx1, "to_index": idx2,
                    "segments": [], 
                    "walk_to_target_m": round(direct_walk_dist, 1),
                    "instruction": f"Walk directly for {round(direct_walk_dist, 1)} meters."
                }]
            else:
                return [] 

        options.sort(key=lambda x: x["score"], reverse=True)

        # 4. FORMAT FINAL LEGS
        final_options = []
        for opt in options[:10]:
            last_stop = opt["segments"][-1]["alight_stop"]
            final_options.append({
                "from_index": idx1, "to_index": idx2,
                "segments": opt["segments"],
                "walk_to_target_m": last_stop["distance_m"],
                "instruction": f"Alight at {last_stop['stop_name']}, walk {last_stop['distance_m']} meters to destination."
            })
            
        return final_options

    def _build_segment(self, rid: str, board: Dict, alight: Dict, count: int, idxs: List[int], dist: float) -> Dict:
        r = self.loader.routes.get(rid, {})
        transit_type = r.get("type", "default").lower()
        speed_kmh = self.SPEEDS_KMH.get(transit_type, self.SPEEDS_KMH["default"])
        
        return {
            "route_id": rid, 
            "route_short_name": r.get("route_short_name", "N/A"),
            "route_long_name": r.get("route_long_name", "N/A"),
            "transit_type": transit_type,
            "board_stop": board, 
            "alight_stop": alight, 
            "stops_on_route": count,
            "covered_location_indices": idxs, 
            "estimated_distance_km": dist,
            "estimated_duration_min": round((dist / speed_kmh) * 60)
        }

    # ==========================
    # DATA RETRIEVAL METHODS
    # ==========================
    def get_all_routes(self) -> List[Dict]:
        return list(self.loader.routes.values())

    def get_route_by_id(self, route_id: str) -> Optional[Dict]:
        return self.loader.routes.get(route_id)

    def get_all_stops(self) -> List[Dict]:
        return list(self.loader.stops.values())

    def get_stop_by_id(self, stop_id: str) -> Optional[Dict]:
        return self.loader.stops.get(stop_id)

    def get_stops_by_route(self, route_id: str) -> List[Dict]:
        stop_ids = self.loader.route_stops.get(route_id, set())
        return [self.loader.stops.get(sid) for sid in stop_ids if sid in self.loader.stops]