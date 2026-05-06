import csv
import math
import os
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional

# Base directory for data
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000 # Radius of Earth in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2)**2
    return 2 * R * math.asin(math.sqrt(a))

class GTFSLoader:
    def __init__(self, folder_name: str):
        self.data_dir = os.path.join(DATA_DIR, folder_name)
        self._loaded = False
        self.stops = {}
        self.routes = {}
        self.trips = {}
        self.route_stop_seqs = defaultdict(list) # List of all unique trip sequences for a route
        self.route_stops = defaultdict(set)      # Set of stop_ids belonging to a route
        self.stop_routes = defaultdict(set)      # Set of route_ids passing through a stop

    def load(self):
        if self._loaded: return
        self.stops = self._load_stops()
        self.routes = self._load_routes()
        self.trips = self._load_trips()
        self._load_stop_times()
        self._build_stop_routes_map()
        self._loaded = True

    def _load_stops(self) -> Dict:
        stops = {}
        with open(os.path.join(self.data_dir, "stops.txt"), encoding="utf-8") as f:
            for row in csv.DictReader(f):
                stops[row["stop_id"]] = {
                    "stop_id": row["stop_id"],
                    "stop_name": row["stop_name"],
                    "lat": float(row["stop_lat"]),
                    "lon": float(row["stop_lon"]),
                }
        return stops

    def _load_routes(self) -> Dict:
        routes = {}
        with open(os.path.join(self.data_dir, "routes.txt"), encoding="utf-8") as f:
            for row in csv.DictReader(f):
                routes[row["route_id"]] = row
        return routes

    def _load_trips(self) -> Dict:
        trips = {}
        with open(os.path.join(self.data_dir, "trips.txt"), encoding="utf-8") as f:
            for row in csv.DictReader(f):
                trips[row["trip_id"]] = {"route_id": row["route_id"]}
        return trips

    def _load_stop_times(self):
        trip_sequences = defaultdict(list)
        with open(os.path.join(self.data_dir, "stop_times.txt"), encoding="utf-8") as f:
            for row in csv.DictReader(f):
                trip_sequences[row["trip_id"]].append((int(row["stop_sequence"]), row["stop_id"]))

        unique_patterns = set()
        for trip_id, stops in trip_sequences.items():
            stops.sort(key=lambda x: x[0])
            stop_ids = tuple(s[1] for s in stops)
            route_id = self.trips[trip_id]["route_id"]
            
            for sid in stop_ids:
                self.route_stops[route_id].add(sid)
            
            pattern_key = (route_id, stop_ids)
            if pattern_key not in unique_patterns:
                self.route_stop_seqs[route_id].append(list(stop_ids))
                unique_patterns.add(pattern_key)

    def _build_stop_routes_map(self):
        for route_id, stops in self.route_stops.items():
            for stop_id in stops:
                self.stop_routes[stop_id].add(route_id)

    def nearest_stops(self, lat: float, lon: float, max_meters: float, top_n: int = 10) -> List[Dict]:
        res = []
        for s in self.stops.values():
            d = _haversine(lat, lon, s["lat"], s["lon"])
            if d <= max_meters:
                res.append({**s, "distance_m": round(d, 1)})
        res.sort(key=lambda x: x["distance_m"])
        return res[:top_n]

    def get_valid_path(self, route_id: str, s1: str, s2: str) -> Optional[List[str]]:
        """Check if any trip sequence for this route goes from s1 to s2."""
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