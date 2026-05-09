import json
import os

class RideHailingDBProxy:
    def __init__(self):
        # Lấy đường dẫn tuyệt đối của thư mục chứa file db_proxy.py hiện tại
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Vì services.json nằm cùng thư mục với db_proxy.py (trong /data)
        services_path = os.path.join(current_dir, "services.json")
        promos_path = os.path.join(current_dir, "promo_codes.json")

        if not os.path.exists(services_path):
            self._services_raw = []
            self._promos_raw = []
            return

        with open(services_path, "r", encoding="utf-8") as f:
            self._services_raw = json.load(f)
        with open(promos_path, "r", encoding="utf-8") as f:
            self._promos_raw = json.load(f)
            
        

    def get_active_services(self, city: str) -> dict:
        # Dùng .strip() và .upper() để đảm bảo "hcmc " hay "HCMC" đều khớp
        target_city = city.strip().upper()
        
        active_services = [
            s for s in self._services_raw 
            if s.get("is_active") == True and s.get("city", "").strip().upper() == target_city
        ]
        return {s["service_id"]: s for s in active_services}

    def get_active_promos(self, city: str) -> dict:
        # Dùng .strip() và .upper() để đảm bảo "hcmc " hay "HCMC" đều khớp
        target_city = city.strip().upper()

        active_promos = [
            p for p in self._promos_raw 
            if p.get("is_active") == True and p.get("city", "").strip().upper() == target_city
        ]
        return {p["promo_code"]: p for p in active_promos}