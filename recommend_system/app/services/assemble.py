from app.services.utils.difficulty_score import compute_route_difficulty
from app.services.utils.vehicle_score import ranking_car, ranking_bike
from app.services.route import  getroute
from app.schema.schema import Coordinate, user_item
from app.services.user_orientation.user_orie import recommend_vehicles_user
from pathlib import Path
import pandas as pd
import redis
import hashlib
import json
import os

BASE_DIR = Path(__file__).resolve().parents[2]

redis_client = None
try:
    redis_addr = os.getenv("REDIS_ADDR", "localhost:6379")
    redis_password = os.getenv("REDIS_PASSWORD")
    
    if "://" in redis_addr:
        redis_client = redis.Redis.from_url(
            redis_addr, 
            password=redis_password, 
            decode_responses=True, 
            socket_timeout=1.0
        )
    else:
        parts = redis_addr.split(":")
        host = parts[0]
        port = int(parts[1]) if len(parts) > 1 else 6379
        redis_client = redis.Redis(
            host=host, 
            port=port, 
            password=redis_password, 
            decode_responses=True, 
            socket_timeout=1.0
        )
    redis_client.ping()
    print(f"Recommend system caching ENABLED via Redis at: {redis_addr}")
except Exception as re:
    print(f"Warning: Redis caching disabled/unavailable ({re}). Recommendations will NOT be cached.")
    redis_client = None


def recommend(origin: Coordinate, destination: Coordinate, date, item:user_item):
    # Check Redis Cache
    cache_key = None
    query_hash = None
    if redis_client:
        try:
            # Deterministic identification formula including coordinates, date, user_id and budget
            cache_str = f"origin={origin.lat},{origin.lon}|dest={destination.lat},{destination.lon}|date={date}|user={item.user_id}|budget={item.budget}"
            query_hash = hashlib.sha256(cache_str.encode("utf-8")).hexdigest()
            cache_key = f"recommend:vehicle:{query_hash}"
            
            cached_val = redis_client.get(cache_key)
            if cached_val:
                print(f"Cache HIT [0 PostgreSQL/CSV Queries]: Returning vehicle recommendation for hash {query_hash[:8]}")
                return json.loads(cached_val)
        except Exception as ce:
            print(f"Warning: Recommendation cache check encountered an error: {ce}")

    route, distance = getroute(origin.lat, origin.lon, destination.lat, destination.lon)

    difficulty,weather_score = compute_route_difficulty(route, date)

    import os
    import psycopg

    db_url = os.getenv("DATABASE_URL")
    db_loaded = False

    if db_url:
        try:
            print("Connecting to PostgreSQL to load vehicle data...")
            with psycopg.connect(db_url) as conn:
                car_list = pd.read_sql_query("""
                    SELECT company_name AS "Company Names", car_name AS "Cars Names", engines AS "Engines", 
                           cc_battery_capacity AS "CC/Battery Capacity", horsepower AS "HorsePower", 
                           total_speed AS "Total Speed", performance_0_100 AS "Performance(0 - 100 )KM/H", 
                           car_prices AS "Cars Prices", fuel_type AS "Fuel Types", seats AS "Seats", torque AS "Torque" 
                    FROM car_features;
                """, conn)
                
                bike_list = pd.read_sql_query("""
                    SELECT power, make_model, fuel, company_name AS "Company Names" 
                    FROM bike_features;
                """, conn)
                
                bike_id = pd.read_sql_query("""
                    SELECT veh_id AS "vehicle_id", model 
                    FROM bike_ids;
                """, conn)
                
                car_id = pd.read_sql_query("""
                    SELECT veh_id AS "vehicle_id", model 
                    FROM car_ids;
                """, conn)
                
                car_rent = pd.read_sql_query("""
                    SELECT user_id, destination, length, veh_id, price, weather_id, color 
                    FROM car_rentals;
                """, conn)
                
                bike_rent = pd.read_sql_query("""
                    SELECT user_id, destination, length, veh_id, price, weather_id, color 
                    FROM bike_rentals;
                """, conn)
                
                print("Successfully loaded vehicle data from PostgreSQL.")
                db_loaded = True
        except Exception as e:
            print(f"Error loading vehicle data from PostgreSQL: {e}. Falling back to CSVs.")

    if not db_loaded:
        car_list = pd.read_csv(BASE_DIR/"./data/vehicle/car.csv")
        bike_list = pd.read_csv(BASE_DIR/"./data/vehicle/motorbike.csv")
        bike_id = pd.read_csv(BASE_DIR/"./data/vehicle/motorbike_id.csv")
        car_id = pd.read_csv(BASE_DIR/"./data/vehicle/car_id.csv")
        car_rent = pd.read_csv(BASE_DIR/"./data/vehicle/car_rent.csv")
        bike_rent = pd.read_csv(BASE_DIR/"./data/vehicle/motorbike_rent.csv")

    car_rank = ranking_car(car_list, difficulty)
    bike_rank = ranking_bike(bike_list, difficulty)


    bike_rank = bike_rank[0:20]
    car_rank = car_rank[0:20]

    bike_rank['model'] = (
        bike_rank['make_model']
        .str.split(' ', n=1)
        .str[1]
        .str.lower()
        .str.strip()
    )

    bike_id['model'] = (
        bike_id['model']
        .str.lower()
        .str.strip()
    )

    car_rank['model'] = (
        car_rank['Cars Names']
        .str.lower()
        .str.strip()
    )

    car_id['model'] = (
        car_id['model']
        .str.lower()
        .str.strip()
    )



    bike_id = bike_id.rename(
        columns={
            'vehicle_id': 'veh_id'
        }
    )

    car_id = car_id.rename(
        columns={
            'vehicle_id': 'veh_id'
        }
    )



    merged_bike = pd.merge(
        bike_id,
        bike_rank,
        on='model',
        how='inner'
    )

    merged_car = pd.merge(
        car_id,
        car_rank,
        on='model',
        how='inner'
    )
    print(merged_car)


    bike_selected = bike_rent[
        bike_rent['veh_id'].isin(
            merged_bike['veh_id']
        )
    ]

    car_selected = car_rent[
        car_rent['veh_id'].isin(
            merged_car['veh_id']
        )
    ]
    print(car_selected)


    car_final = recommend_vehicles_user(
        car_selected,
        item.user_id,
        destination.lon,
        destination.lat,
        distance,
        item.budget,
        weather_score
    )

    bike_final = recommend_vehicles_user(
        bike_selected,
        item.user_id,
        destination.lon,
        destination.lat,
        distance,
        item.budget,
        weather_score
    )



    car_final = pd.merge(
        car_final,
        merged_car,
        on='veh_id',
        how='inner'
    )

    bike_final = pd.merge(
        bike_final,
        merged_bike,
        on='veh_id',
        how='inner'
    )



    car_final['final_score'] = (
            car_final['rating'] * 0.6
            +
            car_final['compatibility'] * 0.4
    )

    bike_final['final_score'] = (
            bike_final['rating'] * 0.6
            +
            bike_final['compatibility'] * 0.4
    )


    car_final = (
        car_final
        .sort_values(
            by='final_score',
            ascending=False
        )
        .head(10)
    )

    bike_final = (
        bike_final
        .sort_values(
            by='final_score',
            ascending=False
        )
        .head(10)
    )

    # Rename keys to clean snake_case to prevent access issues in JS/TS
    car_rename_map = {
        "Company Names": "company_name",
        "Cars Names": "car_name",
        "Engines": "engine",
        "CC/Battery Capacity": "battery_capacity",
        "HorsePower": "horsepower",
        "Total Speed": "total_speed",
        "Performance(0 - 100 )KM/H": "performance",
        "Cars Prices": "car_price",
        "Fuel Types": "fuel_type",
        "Seats": "seats",
        "Torque": "torque"
    }
    car_final = car_final.rename(columns=car_rename_map)

    bike_rename_map = {
        "Company Names": "company_name",
        "fuel": "fuel_type"
    }
    bike_final = bike_final.rename(columns=bike_rename_map)

    final_response = {
        "cars": car_final.to_dict(orient='records'),
        "bikes": bike_final.to_dict(orient='records')
    }

    # Write completed recommendation back to Redis with a 24-hour TTL (86400 seconds)
    if cache_key and redis_client:
        try:
            redis_client.setex(cache_key, 86400, json.dumps(final_response))
            print(f"Cache WRITE: Successfully cached vehicle recommendation for hash {query_hash[:8]}")
        except Exception as ce:
            print(f"Warning: Failed writing recommendation to cache: {ce}")

    return final_response


