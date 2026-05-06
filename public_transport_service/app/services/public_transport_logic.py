"""
TransitService: Sequential Routing with "Walking Distance" Optimization,
Leg-based Grouping, and Multi-direction Support.
"""

from typing import List, Dict, Optional
from .gtfs_loader import GTFSLoader

class TransitService:
    def __init__(self, folder_name: str):
        self.loader = GTFSLoader(folder_name)
        self.loader.load()
        # Constants for optimization
        self.WALK_FINISH_THRESHOLD = 400.0  # If dist to target < 400m, stop taking buses
        self.BUS_SPEED_KMH = 18.0

    def recommend(self, locations: List[Dict], top_k: int = 5, max_walk_meters: float = 1000.0, combine_routes: bool = True) -> List[Dict]:
        """
        Suggests sequential routes with grouped legs and walking instructions.
        """
        all_legs_results = []
        
        # Process each leg: Loc 0 -> Loc 1, Loc 1 -> Loc 2, etc.
        for i in range(len(locations) - 1):
            leg_options = self._find_options_for_leg(
                locations[i], locations[i+1], i, i+1, max_walk_meters, combine_routes
            )
            
            if not leg_options:
                print(f"[TransitService] Impossible leg: {i} -> {i+1}")
                return []
            
            all_legs_results.append(leg_options)

        # Assemble recommendations
        recommendations = []
        for r_idx in range(min(top_k, len(all_legs_results[0]))):
            legs_data = []
            total_dist = 0.0
            total_dur = 0
            
            for leg_opt in all_legs_results:
                best_opt = leg_opt[min(r_idx, len(leg_opt)-1)]
                legs_data.append(best_opt)
                # Aggregate totals
                for seg in best_opt["segments"]:
                    total_dist += seg["estimated_distance_km"]
                    total_dur += seg["estimated_duration_min"]
            
            recommendations.append({
                "rank": r_idx + 1,
                "legs": legs_data,
                "total_distance_km": round(total_dist, 2),
                "total_duration_min": total_dur,
                "locations_total": len(locations)
            })
            
        return recommendations

    def _find_options_for_leg(self, loc1: Dict, loc2: Dict, idx1: int, idx2: int, max_walk: float, combine_routes: bool) -> List[Dict]:
        """
        Finds how to get from loc1 to loc2 by testing multiple stop combinations 
        to avoid the 'Closest Stop Trap'. Supports Direct and 1-Transfer routes.
        """
        options = []
        # Increase top_n to 15 to catch stops slightly further away but in the correct travel direction
        stops1 = self.loader.nearest_stops(loc1["lat"], loc1["lon"], max_walk, top_n=15)
        stops2 = self.loader.nearest_stops(loc2["lat"], loc2["lon"], max_walk, top_n=15)
        
        if not stops1 or not stops2: 
            return []

        # 1. DIRECT ROUTES (Test all stop combinations to ensure correct travel direction)
        best_direct = {} 
        for s1 in stops1:
            r1_set = self.loader.stop_routes.get(s1["stop_id"], set())
            for s2 in stops2:
                r2_set = self.loader.stop_routes.get(s2["stop_id"], set())
                common_routes = r1_set & r2_set
                
                for rid in common_routes:
                    path = self.loader.get_valid_path(rid, s1["stop_id"], s2["stop_id"])
                    if path:
                        dist = self.loader.calculate_distance(path)
                        score = -(s1["distance_m"] + s2["distance_m"] + dist * 5)
                        
                        # Only keep the highest scoring pair of stops for this specific route
                        if rid not in best_direct or score > best_direct[rid]["score"]:
                            seg = self._build_segment(rid, s1, s2, len(path)-1, [idx1, idx2], dist)
                            best_direct[rid] = {"segments": [seg], "score": score}

        options.extend(best_direct.values())

        # 2. TRANSFER ROUTES (Only if requested and we need more options)
        if combine_routes and len(options) < 5:
            # Map routes to their single best stop to avoid exponential explosion in transfer logic
            r1_dict = {}
            for s in stops1:
                for r in self.loader.stop_routes.get(s["stop_id"], set()):
                    if r not in r1_dict or s["distance_m"] < r1_dict[r]["distance_m"]: 
                        r1_dict[r] = s
            
            r2_dict = {}
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
                            t_stop_raw = self.loader.stops[t_id]
                            t_stop = {**t_stop_raw, "distance_m": 0.0}
                            
                            dist1 = self.loader.calculate_distance(path1)
                            dist2 = self.loader.calculate_distance(path2)
                            
                            score = -(s_board["distance_m"] + s_alight["distance_m"] + (dist1 + dist2) * 8 + 1000)
                            
                            seg1 = self._build_segment(r1, s_board, t_stop, len(path1)-1, [idx1], dist1)
                            seg2 = self._build_segment(r2, t_stop, s_alight, len(path2)-1, [idx2], dist2)
                            options.append({"segments": [seg1, seg2], "score": score})

        # Sort all options for this leg by score (highest/least negative first)
        options.sort(key=lambda x: x["score"], reverse=True)

        # 3. WALKING FINISH LOGIC
        final_options = []
        for opt in options:
            last_stop = opt["segments"][-1]["alight_stop"]
            dist_to_target = last_stop["distance_m"] 
            
            final_options.append({
                "from_index": idx1,
                "to_index": idx2,
                "segments": opt["segments"],
                "walk_to_target_m": dist_to_target,
                "instruction": f"Alight at {last_stop['stop_name']}, walk {dist_to_target} meters to destination."
            })
            
        return final_options

    def _build_segment(self, rid: str, board: Dict, alight: Dict, count: int, idxs: List[int], dist: float) -> Dict:
        """Helper to format a route segment."""
        r = self.loader.routes.get(rid, {})
        return {
            "route_id": rid, 
            "route_short_name": r.get("route_short_name", "N/A"),
            "route_long_name": r.get("route_long_name", "N/A"),
            "board_stop": board, 
            "alight_stop": alight, 
            "stops_on_route": count,
            "covered_location_indices": idxs, 
            "estimated_distance_km": dist,
            "estimated_duration_min": round(dist/self.BUS_SPEED_KMH * 60)
        }
    
    def get_all_routes(self) -> List[Dict]:
        """Retrieve a list of all bus routes."""
        return list(self.loader.routes.values())

    def get_route_by_id(self, route_id: str) -> Optional[Dict]:
        """Retrieve detailed information about a specific bus route."""
        return self.loader.routes.get(route_id)

    def get_all_stops(self) -> List[Dict]:
        """Retrieve a list of all bus stops."""
        return list(self.loader.stops.values())

    def get_stop_by_id(self, stop_id: str) -> Optional[Dict]:
        """Retrieve detailed information about a specific bus stop."""
        return self.loader.stops.get(stop_id)

    def get_stops_by_route(self, route_id: str) -> List[Dict]:
        """Retrieve a list of stops that a specific bus route passes through."""
        stop_ids = self.loader.route_stops.get(route_id, set())
        stops = [self.loader.stops.get(sid) for sid in stop_ids if sid in self.loader.stops]
        return stops