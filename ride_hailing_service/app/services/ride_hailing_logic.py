import itertools
from data.mock_db import PRICING_DB, PROMO_DB

class RideService:

    def _auto_find_best_promo_combo(self, base_fare: float, location_type: str, service_id: str) -> tuple:
        """
        Scans PROMO_DB to find the combination of promos that yields the highest discount,
        respecting location, service specific constraints, and max_combine rules.
        """
        valid_promos = []
        for code, promo in PROMO_DB.items():
            cond = promo.get("conditions", {})
            
            # Check location constraint
            if "location_type" in cond and cond["location_type"] != location_type:
                continue 
                
            # Check service constraint (e.g., Grab only, Be only)
            applicable_services = cond.get("applicable_services", [])
            if applicable_services and service_id not in applicable_services:
                continue 

            min_fare_required = cond.get("min_fare", 0) 
            if base_fare < min_fare_required:
                continue

            valid_promos.append((code, promo))
        
        if not valid_promos:
            return [], 0

        best_discount = 0
        best_combo = []
        n = len(valid_promos)
        
        for r in range(1, n + 1):
            for combo in itertools.combinations(valid_promos, r):
                
                # Enforce the strictest max_combine rule in the current combination
                allowed_extra = min([p["max_combine"] for _, p in combo])
                
                if len(combo) - 1 > allowed_extra:
                    continue 

                current_fare = base_fare
                current_discount = 0
                
                # Apply percentage promos first
                sorted_combo = sorted(combo, key=lambda x: x[1]["type"], reverse=True)
                
                for code, promo in sorted_combo:
                    if current_fare <= 0: break
                    
                    discount = (current_fare * promo["value"]) if promo["type"] == "percent" else promo["value"]
                    discount_amount = min(discount, promo["max"])
                    
                    current_fare -= discount_amount
                    current_discount += discount_amount

                if current_discount > best_discount:
                    best_discount = current_discount
                    best_combo = [code for code, _ in sorted_combo]

        return best_combo, best_discount

    def _calculate_core(self, distance_km: float, location_type: str, vehicle_category: str = None, top_k: int = None) -> list:
        leg_options = []
        
        for s_id, s_info in PRICING_DB.items():
            
            # Pre-filtering: Skip if the vehicle category doesn't match the user's request
            if vehicle_category and s_info.get("category") != vehicle_category:
                continue 

            # Base fare calculation
            base_fare = s_info["base"]
            if distance_km > s_info["base_km"]:
                base_fare += (distance_km - s_info["base_km"]) * s_info["per_km"]
            
            final_fare = base_fare
            status = "Standard fare"
            applied_promos = []

            # Traditional taxis do not receive promotional discounts
            if s_info["type"] == "traditional":
                status = "Traditional taxi (No promos applicable)"
            else:
                # Trigger Auto-Promo Optimizer for tech vehicles
                best_combo_codes, total_discount = self._auto_find_best_promo_combo(base_fare, location_type, s_id)
                
                if total_discount > 0:
                    final_fare -= total_discount
                    applied_promos = best_combo_codes
                    status = f"Auto-applied best promos: -{int(total_discount):,} VND"

            leg_options.append({
                "service": s_info["name"],
                "category": s_info.get("category", "other"),
                "base_fare": int(base_fare),
                "final_fare": int(max(0, final_fare)),
                "applied_promos": applied_promos,
                "status": status
            })
        
        # Sort by cheapest final fare
        leg_options.sort(key=lambda x: x["final_fare"])
        
        if top_k is not None:
            return leg_options[:top_k]
        return leg_options
    
    def estimate_per_leg(self, legs: list, top_k: int) -> list:
        all_legs_results = []
        
        # Use enumerate to automatically get the index (i) of each leg in the array
        for i, leg in enumerate(legs):
            top_options = self._calculate_core(
                distance_km=leg.distance_km,
                location_type=leg.location_type,
                vehicle_category=leg.vehicle_category,
                top_k=top_k 
            )
            
            # Auto-generate routing logic based on the array position
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

    def estimate_single_leg(self, distance_km: float, location_type: str, vehicle_category: str = None) -> list:
        return self._calculate_core(distance_km, location_type, vehicle_category, top_k=None)