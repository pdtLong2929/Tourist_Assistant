import itertools
from data.db_proxy import RideHailingDBProxy 

class RideService:
    def __init__(self):
        self.db = RideHailingDBProxy()

    def _auto_find_best_promo_combo(self, base_fare: float, location_type: str, service_id: str, city: str) -> tuple:
        active_promos = self.db.get_active_promos(city)
        valid_promos = []
        
        for code, promo in active_promos.items():
            if promo.get("location_type") != "general" and promo.get("location_type") != location_type:
                continue 
                
            applicable_services = promo.get("applicable_services", [])
            if applicable_services and service_id not in applicable_services:
                continue 

            if base_fare < promo.get("min_fare", 0):
                continue

            valid_promos.append((code, promo))
        
        if not valid_promos:
            return [], 0

        best_discount = 0
        best_combo = []
        n = len(valid_promos)
        
        for r in range(1, n + 1):
            for combo in itertools.combinations(valid_promos, r):
                allowed_extra = min([p["max_combine"] for _, p in combo])
                
                if len(combo) - 1 > allowed_extra:
                    continue 

                current_fare = base_fare
                current_discount = 0
                
                sorted_combo = sorted(combo, key=lambda x: x[1]["discount_type"], reverse=True)
                
                for code, promo in sorted_combo:
                    if current_fare <= 0: break
                    
                    if promo["discount_type"] == "percent":
                        discount = current_fare * promo["discount_value"]
                    else:
                        discount = promo["discount_value"]
                        
                    discount_amount = min(discount, promo["max_discount"])
                    
                    current_fare -= discount_amount
                    current_discount += discount_amount

                if current_discount > best_discount:
                    best_discount = current_discount
                    best_combo = [code for code, _ in sorted_combo]

        return best_combo, best_discount

    def _calculate_core(self, distance_km: float, location_type: str, city: str, vehicle_category: str = None, top_k: int = None) -> list:
        leg_options = []
        
        active_services = self.db.get_active_services(city)

        for s_id, s_info in active_services.items():
            
            if vehicle_category and s_info.get("vehicle_category") != vehicle_category:
                continue 

            base_fare = s_info["base_fare"]
            if distance_km > s_info["base_km"]:
                base_fare += (distance_km - s_info["base_km"]) * s_info["per_km_fare"]
            
            final_fare = base_fare
            status = "Standard fare"
            applied_promos = []

            if s_info["service_type"] == "traditional":
                status = "Traditional taxi (No promos applicable)"
            else:
                best_combo_codes, total_discount = self._auto_find_best_promo_combo(base_fare, location_type, s_id, city)
                
                if total_discount > 0:
                    final_fare -= total_discount
                    applied_promos = best_combo_codes
                    status = f"Auto-applied best promos: -{int(total_discount):,} VND"

            leg_options.append({
                "service": s_info["service_name"], 
                "category": s_info.get("vehicle_category", "other"),
                "base_fare": int(base_fare),
                "final_fare": int(max(0, final_fare)),
                "applied_promos": applied_promos,
                "status": status
            })
        
        leg_options.sort(key=lambda x: x["final_fare"])
        
        if top_k is not None:
            return leg_options[:top_k]
        return leg_options
    
    def estimate_per_leg(self, legs: list, city: str,  top_k: int) -> list:
        all_legs_results = []
        for i, leg in enumerate(legs):
            top_options = self._calculate_core(
                distance_km=leg.distance_km,
                location_type=leg.location_type,
                city=city, 
                vehicle_category=leg.vehicle_category,
                top_k=top_k 
            )
            
            from_index = i
            to_index = i + 1
            generated_leg_id = f"leg_{from_index}_{to_index}"
            
            all_legs_results.append({
                "leg_id": generated_leg_id,
                "from_index": from_index,
                "to_index": to_index,
                "distance_km": leg.distance_km,
                "options": top_options
            })
            
        return all_legs_results

    def estimate_single_leg(self, distance_km: float, location_type: str, city: str, vehicle_category: str = None) -> list:
        return self._calculate_core(distance_km, location_type, city, vehicle_category, top_k=None)