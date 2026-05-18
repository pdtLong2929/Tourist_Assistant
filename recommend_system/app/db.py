import os
import time
import psycopg
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_URL = os.getenv("DATABASE_URL")

def wait_for_db(url: str, retries: int = 15, delay: float = 2.0):
    if not url:
        print("DATABASE_URL is not configured. Skipping database check.")
        return False
    for attempt in range(1, retries + 1):
        try:
            conn = psycopg.connect(url, autocommit=True)
            conn.close()
            print("PostgreSQL Database is ready and reachable.")
            return True
        except Exception as e:
            print(f"PostgreSQL not ready yet (attempt {attempt}/{retries}): {e}")
            if attempt == retries:
                raise RuntimeError("Could not connect to database after maximum retries.") from e
            time.sleep(delay)
    return False

def ensure_schema(conn):
    with conn.cursor() as cur:
        # 1. Car Features Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS car_features (
                id SERIAL PRIMARY KEY,
                company_name TEXT,
                car_name TEXT,
                engines TEXT,
                cc_battery_capacity DOUBLE PRECISION,
                horsepower DOUBLE PRECISION,
                total_speed DOUBLE PRECISION,
                performance_0_100 DOUBLE PRECISION,
                car_prices TEXT,
                fuel_type TEXT,
                seats TEXT,
                torque DOUBLE PRECISION
            );
        """)
        # 2. Bike Features Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS bike_features (
                id SERIAL PRIMARY KEY,
                power DOUBLE PRECISION,
                make_model TEXT,
                fuel TEXT,
                company_name TEXT
            );
        """)
        # 3. Car IDs Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS car_ids (
                veh_id VARCHAR(50) PRIMARY KEY,
                model TEXT
            );
        """)
        # 4. Bike IDs Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS bike_ids (
                veh_id VARCHAR(50) PRIMARY KEY,
                model TEXT
            );
        """)
        # 5. Car Rentals Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS car_rentals (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50),
                destination TEXT,
                length TEXT,
                veh_id VARCHAR(50),
                price DOUBLE PRECISION,
                weather_id INTEGER,
                color TEXT
            );
        """)
        # 6. Bike Rentals Table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS bike_rentals (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50),
                destination TEXT,
                length TEXT,
                veh_id VARCHAR(50),
                price DOUBLE PRECISION,
                weather_id INTEGER,
                color TEXT
            );
        """)

        # Add Indexes for high-speed joins
        cur.execute("CREATE INDEX IF NOT EXISTS idx_car_ids_model ON car_ids(model);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_bike_ids_model ON bike_ids(model);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_car_rentals_veh_id ON car_rentals(veh_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_bike_rentals_veh_id ON bike_rentals(veh_id);")
        
        print("Database schemas and indexes verified/created.")

def seed_data(conn):
    # Load and seed car features
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM car_features;")
        if cur.fetchone()[0] == 0:
            print("Seeding car_features from CSV...")
            csv_path = BASE_DIR / "data" / "vehicle" / "car.csv"
            df = pd.read_csv(csv_path)
            # Replace NaNs with None
            df = df.where(pd.notnull(df), None)
            
            # Map column names:
            # ,Company Names,Cars Names,Engines,CC/Battery Capacity,HorsePower,Total Speed,Performance(0 - 100 )KM/H,Cars Prices,Fuel Types,Seats,Torque
            with cur.copy("""
                COPY car_features (
                    company_name, car_name, engines, cc_battery_capacity, 
                    horsepower, total_speed, performance_0_100, car_prices, 
                    fuel_type, seats, torque
                ) FROM STDIN
            """) as copy:
                for _, row in df.iterrows():
                    copy.write_row((
                        row["Company Names"],
                        row["Cars Names"],
                        row["Engines"],
                        row["CC/Battery Capacity"],
                        row["HorsePower"],
                        row["Total Speed"],
                        row["Performance(0 - 100 )KM/H"],
                        row["Cars Prices"],
                        row["Fuel Types"],
                        row["Seats"],
                        row["Torque"]
                    ))
            print(f"Successfully seeded {len(df)} rows to car_features.")

        # Load and seed bike features
        cur.execute("SELECT COUNT(*) FROM bike_features;")
        if cur.fetchone()[0] == 0:
            print("Seeding bike_features from CSV...")
            csv_path = BASE_DIR / "data" / "vehicle" / "motorbike.csv"
            df = pd.read_csv(csv_path)
            df = df.where(pd.notnull(df), None)
            
            # Unnamed: 0,power,make_model,fuel,Company Names
            with cur.copy("""
                COPY bike_features (
                    power, make_model, fuel, company_name
                ) FROM STDIN
            """) as copy:
                for _, row in df.iterrows():
                    copy.write_row((
                        row["power"],
                        row["make_model"],
                        row["fuel"],
                        row["Company Names"]
                    ))
            print(f"Successfully seeded {len(df)} rows to bike_features.")

        # Load and seed car IDs
        cur.execute("SELECT COUNT(*) FROM car_ids;")
        if cur.fetchone()[0] == 0:
            print("Seeding car_ids from CSV...")
            csv_path = BASE_DIR / "data" / "vehicle" / "car_id.csv"
            df = pd.read_csv(csv_path)
            df = df.where(pd.notnull(df), None)
            
            with cur.copy("COPY car_ids (veh_id, model) FROM STDIN") as copy:
                for _, row in df.iterrows():
                    copy.write_row((
                        row["vehicle_id"],
                        row["model"]
                    ))
            print(f"Successfully seeded {len(df)} rows to car_ids.")

        # Load and seed bike IDs
        cur.execute("SELECT COUNT(*) FROM bike_ids;")
        if cur.fetchone()[0] == 0:
            print("Seeding bike_ids from CSV...")
            csv_path = BASE_DIR / "data" / "vehicle" / "motorbike_id.csv"
            df = pd.read_csv(csv_path)
            df = df.where(pd.notnull(df), None)
            
            with cur.copy("COPY bike_ids (veh_id, model) FROM STDIN") as copy:
                for _, row in df.iterrows():
                    copy.write_row((
                        row["vehicle_id"],
                        row["model"]
                    ))
            print(f"Successfully seeded {len(df)} rows to bike_ids.")

        # Load and seed car rentals
        cur.execute("SELECT COUNT(*) FROM car_rentals;")
        if cur.fetchone()[0] == 0:
            print("Seeding car_rentals from CSV...")
            csv_path = BASE_DIR / "data" / "vehicle" / "car_rent.csv"
            df = pd.read_csv(csv_path)
            df = df.where(pd.notnull(df), None)
            
            with cur.copy("""
                COPY car_rentals (
                    user_id, destination, length, veh_id, price, weather_id, color
                ) FROM STDIN
            """) as copy:
                for _, row in df.iterrows():
                    copy.write_row((
                        row["user_id"],
                        row["destination"],
                        row["length"],
                        row["veh_id"],
                        row["price"],
                        row["weather_id"],
                        row["color"]
                    ))
            print(f"Successfully seeded {len(df)} rows to car_rentals.")

        # Load and seed bike rentals
        cur.execute("SELECT COUNT(*) FROM bike_rentals;")
        if cur.fetchone()[0] == 0:
            print("Seeding bike_rentals from CSV...")
            csv_path = BASE_DIR / "data" / "vehicle" / "motorbike_rent.csv"
            df = pd.read_csv(csv_path)
            df = df.where(pd.notnull(df), None)
            
            with cur.copy("""
                COPY bike_rentals (
                    user_id, destination, length, veh_id, price, weather_id, color
                ) FROM STDIN
            """) as copy:
                for _, row in df.iterrows():
                    copy.write_row((
                        row["user_id"],
                        row["destination"],
                        row["length"],
                        row["veh_id"],
                        row["price"],
                        row["weather_id"],
                        row["color"]
                    ))
            print(f"Successfully seeded {len(df)} rows to bike_rentals.")

def init_db():
    if not DB_URL:
        print("DATABASE_URL is not set. Skipping SQL Database initialization.")
        return
    try:
        if wait_for_db(DB_URL):
            with psycopg.connect(DB_URL, autocommit=True) as conn:
                ensure_schema(conn)
                seed_data(conn)
            print("PostgreSQL Seeding completed successfully.")
    except Exception as e:
        print(f"Database initialization failed: {e}")

if __name__ == "__main__":
    init_db()
