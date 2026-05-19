import json
import os

class RideHailingDBProxy:
    def __init__(self):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        services_path = os.path.join(current_dir, "services.json")
        promos_path = os.path.join(current_dir, "promo_codes.json")
        drivers_path = os.path.join(current_dir, "drivers.json")

        if not os.path.exists(services_path):
            self._services_raw = []
            self._promos_raw = []
            self._drivers_raw = []
            return

        with open(services_path, "r", encoding="utf-8") as f:
            self._services_raw = json.load(f)
        with open(promos_path, "r", encoding="utf-8") as f:
            self._promos_raw = json.load(f)
        with open(drivers_path, "r", encoding="utf-8") as f:
            self._drivers_raw = json.load(f)

    def get_active_services(self, city: str) -> dict:
        target_city = city.strip().upper()
        
        active_services = [
            s for s in self._services_raw 
            if s.get("is_active") == True and s.get("city", "").strip().upper() == target_city
        ]
        return {s["service_id"]: s for s in active_services}

    def get_active_promos(self, city: str) -> dict:
        target_city = city.strip().upper()

        active_promos = [
            p for p in self._promos_raw 
            if p.get("is_active") == True and p.get("city", "").strip().upper() == target_city
        ]
        return {p["promo_code"]: p for p in active_promos}

    def get_active_drivers(self, city: str) -> list:
        target_city = city.strip().upper()
        return [
            d for d in self._drivers_raw
            if d.get("city", "").strip().upper() == target_city
        ]