import csv
import math
import os
from collections import defaultdict
from typing import Dict, List, Optional
from pathlib import Path

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000  # Radius of Earth in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2)**2
    return 2 * R * math.asin(math.sqrt(a))

class MultiGTFSLoader:
    GTFS_ROUTE_TYPES = {
        "0": "tram",
        "1": "metro",
        "2": "train",
        "3": "bus",
        "4": "ferry"
    }

    def __init__(self, folder_paths: list):
        self.folder_paths = folder_paths
        self._loaded = False
        
        # Aggregated data across all transit modes
        self.stops = {}
        self.routes = {}
        self.trips = {}
        self.route_stop_seqs = defaultdict(list) 
        self.route_stops = defaultdict(set)      
        self.stop_routes = defaultdict(set)      

    def load(self):
        if self._loaded: return
        
        for folder_path in self.folder_paths:
            if not os.path.exists(folder_path):
                print(f"Skipping non-existent directory: {folder_path}")
                continue
                
            # Auto-generate prefix (e.g., "HCMC_BUS_", "HCMC_METRO_")
            p = Path(folder_path)
            city = p.parts[-2].upper()
            transit_type = p.parts[-1].upper()
            prefix = f"{city}_{transit_type}_"
            
            print(f"Loading data from: {folder_path} | ID Prefix: [{prefix}]")
            
            self._load_stops(folder_path, prefix, transit_type.lower())
            self._load_routes(folder_path, prefix, transit_type.lower())
            self._load_trips(folder_path, prefix)
            self._load_stop_times(folder_path, prefix)
            
        self._build_stop_routes_map()
        self._loaded = True
        print(f"Successfully loaded! Total stops: {len(self.stops)}, Total routes: {len(self.routes)}")

    def _load_stops(self, folder: str, prefix: str, transit_type: str):
        filepath = os.path.join(folder, "stops.txt")
        if not os.path.exists(filepath): return
        with open(filepath, "r", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                new_stop_id = f"{prefix}{row['stop_id']}"
                self.stops[new_stop_id] = {
                    "stop_id": new_stop_id,
                    "stop_name": row.get("stop_name", ""),
                    "lat": float(row["stop_lat"]),
                    "lon": float(row["stop_lon"]),
                    "type": transit_type
                }

    def _load_routes(self, folder: str, prefix: str, folder_transit_type: str):
        filepath = os.path.join(folder, "routes.txt")
        if not os.path.exists(filepath): return
        with open(filepath, "r", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                new_route_id = f"{prefix}{row['route_id']}"
                
                # Fetch route_type if available in GTFS data
                raw_route_type = row.get("route_type", "").strip()
                
                # Use standard mapping (e.g., "1" -> "metro"), otherwise fallback to folder name
                actual_type = self.GTFS_ROUTE_TYPES.get(raw_route_type, folder_transit_type)
                
                self.routes[new_route_id] = {
                    "route_id": new_route_id,
                    "route_short_name": row.get("route_short_name", ""),
                    "route_long_name": row.get("route_long_name", ""),
                    "type": actual_type
                }

    def _load_trips(self, folder: str, prefix: str):
        filepath = os.path.join(folder, "trips.txt")
        if not os.path.exists(filepath): return
        with open(filepath, "r", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                new_trip_id = f"{prefix}{row['trip_id']}"
                new_route_id = f"{prefix}{row['route_id']}"
                self.trips[new_trip_id] = {"route_id": new_route_id}

    def _load_stop_times(self, folder: str, prefix: str):
        filepath = os.path.join(folder, "stop_times.txt")
        if not os.path.exists(filepath): return
        
        trip_sequences = defaultdict(list)
        with open(filepath, "r", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                new_trip_id = f"{prefix}{row['trip_id']}"
                new_stop_id = f"{prefix}{row['stop_id']}"
                trip_sequences[new_trip_id].append((int(row["stop_sequence"]), new_stop_id))

        unique_patterns = set()
        for trip_id, stops in trip_sequences.items():
            stops.sort(key=lambda x: x[0])
            stop_ids = tuple(s[1] for s in stops)
            
            if trip_id not in self.trips: continue
            route_id = self.trips[trip_id]["route_id"]
            
            for sid in stop_ids:
                self.route_stops[route_id].add(sid)
            
            pattern_key = (route_id, stop_ids)
            if pattern_key not in unique_patterns:
                self.route_stop_seqs[route_id].append(list(stop_ids))
                unique_patterns.add(pattern_key)

    def _build_stop_routes_map(self):
        for route_id, stops in self.route_stops.items():
            
            route_data = self.routes.get(route_id)
            if not route_data:
                continue
                
            exact_route_type = route_data.get("type", "default")

            for stop_id in stops:
                self.stop_routes[stop_id].add(route_id)
                
                if stop_id in self.stops:
                    current_type = self.stops[stop_id].get("type", "")
                    if current_type == "bus" and exact_route_type in ["metro", "train"]:
                        self.stops[stop_id]["type"] = exact_route_type
                    elif current_type not in ["metro", "train"]:
                        self.stops[stop_id]["type"] = exact_route_type

    def nearest_stops(self, lat: float, lon: float, max_meters: float, top_n: int = 10) -> List[Dict]:
        res = []
        for s in self.stops.values():
            d = _haversine(lat, lon, s["lat"], s["lon"])
            if d <= max_meters:
                res.append({**s, "distance_m": round(d, 1)})
        res.sort(key=lambda x: x["distance_m"])
        return res[:top_n]

    def get_valid_path(self, route_id: str, s1: str, s2: str) -> Optional[List[str]]:
        for seq in self.route_stop_seqs.get(route_id, []):
            try:
                idx1, idx2 = seq.index(s1), seq.index(s2)
                if idx1 < idx2: return seq[idx1:idx2+1]
            except ValueError: continue
        return None

    def calculate_distance(self, stop_list: List[str]) -> float:
        total = 0.0
        for i in range(len(stop_list)-1):
            s1, s2 = self.stops[stop_list[i]], self.stops[stop_list[i+1]]
            total += _haversine(s1["lat"], s1["lon"], s2["lat"], s2["lon"])
        return round(total/1000, 2)