# ==========================================
# PRICING DATABASE
# ==========================================
PRICING_DB = {
    "grab_bike": {
        "name": "GrabBike",
        "category": "bike",
        "type": "tech",
        "base": 12500,
        "base_km": 2.0,
        "per_km": 4300
    },
    "be_bike": {
        "name": "BeBike",
        "category": "bike",
        "type": "tech",
        "base": 11000,
        "base_km": 2.0,
        "per_km": 4000
    },
    "grab_car_4": {
        "name": "GrabCar 4 Seats",
        "category": "car",
        "type": "tech",
        "base": 29000,
        "base_km": 2.0,
        "per_km": 10000
    },
    "be_car_4": {
        "name": "BeCar 4 Seats",
        "category": "car",
        "type": "tech",
        "base": 27000,
        "base_km": 2.0,
        "per_km": 9500
    },
    "vinasun_taxi": {
        "name": "Vinasun Taxi",
        "category": "car",
        "type": "traditional", # Traditional taxis will bypass promo logic
        "base": 11000,
        "base_km": 0.5,
        "per_km": 17500
    },
    "mai_linh_taxi": {
        "name": "Mai Linh Taxi",
        "category": "car",
        "type": "traditional",
        "base": 11500,
        "base_km": 0.5,
        "per_km": 17000
    }
}

# ==========================================
# PROMO CODES DATABASE
# ==========================================

PROMO_DB = {
    # 1. AIRPORT MEGA: Only for long trips to the airport
    "AIRPORT_MEGA": {
        "type": "fixed",
        "value": 100000,
        "max": 100000,
        "max_combine": 1,
        "conditions": {
            "location_type": "airport",
            "min_fare": 250000  # Only applies if the base fare is >= 250k
        }
    },

    # 2. STUDENT SAVER: No min_fare, but exclusive (max_combine = 0)
    "STUDENT20": {
        "type": "percent",
        "value": 0.20,
        "max": 30000,
        "max_combine": 0,
        "conditions": {
            "location_type": "university",
            "min_fare": 0       # No minimum required
        }
    },

    # 3. PREMIUM CAR PROMO: Only for cars and trips over 150k
    "PREMIUM_CAR": {
        "type": "percent",
        "value": 0.15,
        "max": 50000,
        "max_combine": 1,
        "conditions": {
            "applicable_services": ["grab_car_4", "be_car_4"],
            "min_fare": 150000
        }
    },

    # 4. ZALOPAY10K: Always available for tech rides
    "ZALOPAY10K": {
        "type": "fixed",
        "value": 10000,
        "max": 10000,
        "max_combine": 99,
        "conditions": {
            "min_fare": 20000   # To avoid 0 VND or negative fares
        }
    }
}