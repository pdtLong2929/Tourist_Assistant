import itertools
import math
import random
from data.db_proxy import RideHailingDBProxy 

def calculate_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

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

    def _find_matching_driver(self, city: str, vehicle_category: str, origin_lat: float = None, origin_lon: float = None) -> dict:
        drivers = self.db.get_active_drivers(city)
        # Filter drivers matching the specific category (car or bike)
        matching_drivers = [d for d in drivers if d.get("vehicle_category") == vehicle_category]
        
        if not matching_drivers:
            # Fallback if no matching driver found
            return {
                "driver_id": "drv_fallback_001",
                "name": "Lê Anh Tuấn (Fallback)",
                "rating": 4.8,
                "phone": "+84 900 000 000",
                "plate_number": "XX-XXX.XX",
                "distance_to_pickup_km": 2.5,
                "eta_minutes": 7.0
            }

        if origin_lat is not None and origin_lon is not None:
            # Calculate actual Haversine distances to the origin pickup point
            scored_drivers = []
            for d in matching_drivers:
                dist = calculate_haversine(d["lat"], d["lon"], origin_lat, origin_lon)
                # Combined rank score: proximity prioritized, slightly boosted by better rating
                score = dist / (d["rating"] / 5.0)
                scored_drivers.append((score, dist, d))
            
            # Match the one with the lowest score (closest + highest rated)
            scored_drivers.sort(key=lambda x: x[0])
            best_score, best_dist, matched = scored_drivers[0]
            
            # ETA estimation: ~3 minutes per km plus 2 minutes baseline prep time
            eta = round(best_dist * 3.0 + 2.0, 1)
            
            return {
                "driver_id": matched["driver_id"],
                "name": matched["name"],
                "rating": matched["rating"],
                "phone": matched["phone"],
                "plate_number": matched["plate_number"],
                "distance_to_pickup_km": round(best_dist, 2),
                "eta_minutes": eta
            }
        else:
            # If no coordinates are passed, match a random driver from the category
            matched = random.choice(matching_drivers)
            rand_dist = round(random.uniform(1.2, 3.8), 2)
            eta = round(rand_dist * 3.0 + 2.0, 1)
            return {
                "driver_id": matched["driver_id"],
                "name": matched["name"],
                "rating": matched["rating"],
                "phone": matched["phone"],
                "plate_number": matched["plate_number"],
                "distance_to_pickup_km": rand_dist,
                "eta_minutes": eta
            }

    def _calculate_core(self, distance_km: float, location_type: str, city: str, vehicle_category: str = None, top_k: int = None, origin_lat: float = None, origin_lon: float = None, promo_code: str = None) -> list:
        leg_options = []
        active_services = self.db.get_active_services(city)

        for s_id, s_info in active_services.items():
            s_category = s_info.get("vehicle_category", "car")
            if vehicle_category and s_category != vehicle_category:
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
                # Check for manual coupon override first!
                applied_manual = False
                if promo_code:
                    clean_code = promo_code.strip().upper()
                    active_promos = self.db.get_active_promos(city)
                    promo = active_promos.get(clean_code)
                    if promo and promo.get("is_active", True):
                        loc_ok = promo.get("location_type") == "general" or promo.get("location_type") == location_type
                        applicable_services = promo.get("applicable_services", [])
                        srv_ok = not applicable_services or s_id in applicable_services
                        fare_ok = base_fare >= promo.get("min_fare", 0)
                        
                        if loc_ok and srv_ok and fare_ok:
                            if promo["discount_type"] == "percent":
                                discount = base_fare * promo["discount_value"]
                            else:
                                discount = promo["discount_value"]
                            discount_amount = min(discount, promo["max_discount"])
                            
                            final_fare -= discount_amount
                            applied_promos = [clean_code]
                            status = f"Manual promo applied: -{int(discount_amount):,} VND"
                            applied_manual = True
                
                if not applied_manual:
                    best_combo_codes, total_discount = self._auto_find_best_promo_combo(base_fare, location_type, s_id, city)
                    if total_discount > 0:
                        final_fare -= total_discount
                        applied_promos = best_combo_codes
                        status = f"Auto-applied best promos: -{int(total_discount):,} VND"

            # Find matching driver for this vehicle category (bike/car)
            driver = self._find_matching_driver(city, s_category, origin_lat, origin_lon)

            leg_options.append({
                "service": s_info["service_name"], 
                "category": s_category,
                "base_fare": int(base_fare),
                "final_fare": int(max(0, final_fare)),
                "applied_promos": applied_promos,
                "status": status,
                "matched_driver": driver
            })
        
        leg_options.sort(key=lambda x: x["final_fare"])
        
        if top_k is not None:
            return leg_options[:top_k]
        return leg_options
    
    def estimate_per_leg(self, legs: list, city: str, top_k: int, promo_code: str = None) -> list:
        all_legs_results = []
        for i, leg in enumerate(legs):
            top_options = self._calculate_core(
                distance_km=leg.distance_km,
                location_type=leg.location_type,
                city=city, 
                vehicle_category=leg.vehicle_category,
                top_k=top_k,
                origin_lat=leg.origin_lat,
                origin_lon=leg.origin_lon,
                promo_code=promo_code
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

    def estimate_single_leg(self, distance_km: float, location_type: str, city: str, vehicle_category: str = None, origin_lat: float = None, origin_lon: float = None) -> list:
        return self._calculate_core(
            distance_km=distance_km, 
            location_type=location_type, 
            city=city, 
            vehicle_category=vehicle_category, 
            top_k=None,
            origin_lat=origin_lat,
            origin_lon=origin_lon
        )

    def apply_smart_coupons(self, legs: list, city: str, promo_code: str = None) -> dict:
        results = []
        total_saved = 0
        
        for i, leg in enumerate(legs):
            base_fare = leg.base_fare
            location_type = leg.location_type
            service_id = leg.service_id
            
            final_fare = base_fare
            applied_promos = []
            status = "Standard fare"
            
            applied_manual = False
            if promo_code:
                clean_code = promo_code.strip().upper()
                active_promos = self.db.get_active_promos(city)
                promo = active_promos.get(clean_code)
                if promo and promo.get("is_active", True):
                    loc_ok = promo.get("location_type") == "general" or promo.get("location_type") == location_type
                    applicable_services = promo.get("applicable_services", [])
                    srv_ok = not applicable_services or service_id in applicable_services
                    fare_ok = base_fare >= promo.get("min_fare", 0)
                    
                    if loc_ok and srv_ok and fare_ok:
                        if promo["discount_type"] == "percent":
                            discount = base_fare * promo["discount_value"]
                        else:
                            discount = promo["discount_value"]
                        discount_amount = min(discount, promo["max_discount"])
                        
                        final_fare -= discount_amount
                        applied_promos = [clean_code]
                        status = f"Manual promo applied: -{int(discount_amount):,} VND"
                        applied_manual = True
            
            if not applied_manual:
                best_combo_codes, total_discount = self._auto_find_best_promo_combo(base_fare, location_type, service_id, city)
                if total_discount > 0:
                    final_fare -= total_discount
                    applied_promos = best_combo_codes
                    status = f"Auto-applied best promos: -{int(total_discount):,} VND"
            
            final_fare = max(0, int(final_fare))
            cost_saved = int(base_fare - final_fare)
            total_saved += cost_saved
            
            results.append({
                "leg_index": i,
                "service_id": service_id,
                "base_fare": int(base_fare),
                "final_fare": int(final_fare),
                "applied_promos": applied_promos,
                "cost_saved": int(cost_saved),
                "status": status
            })
            
        return {
            "status": "success",
            "total_saved": total_saved,
            "data": results
        }

    def preview_all_coupon_savings(self, legs: list, city: str) -> dict:
        """
        Calculates how much every active promo code in the city would save
        across the entire journey if applied as a manual override.
        """
        active_promos = self.db.get_active_promos(city)
        savings_map = {}

        for promo_code, promo in active_promos.items():
            if not promo.get("is_active", True):
                continue
            
            total_saved = 0
            for leg in legs:
                base_fare = leg.base_fare
                location_type = leg.location_type
                service_id = leg.service_id
                
                loc_ok = promo.get("location_type") == "general" or promo.get("location_type") == location_type
                applicable_services = promo.get("applicable_services", [])
                srv_ok = not applicable_services or service_id in applicable_services
                fare_ok = base_fare >= promo.get("min_fare", 0)
                
                if loc_ok and srv_ok and fare_ok:
                    if promo["discount_type"] == "percent":
                        discount = base_fare * promo["discount_value"]
                    else:
                        discount = promo["discount_value"]
                    discount_amount = min(discount, promo["max_discount"])
                    total_saved += discount_amount
                    
            savings_map[promo_code] = int(total_saved)
            
        return {"status": "success", "savings": savings_map}