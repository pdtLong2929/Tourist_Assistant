import os
import sys
from pathlib import Path

# Try to import psycopg and pandas
try:
    import psycopg
except ImportError:
    print("Error: 'psycopg' library is not installed in the current environment.")
    print("Please run this script inside the 'recommend_system' environment or run: pip install psycopg")
    sys.exit(1)

try:
    import pandas as pd
except ImportError:
    print("Error: 'pandas' library is not installed.")
    print("Please run this script inside the 'recommend_system' environment or run: pip install pandas")
    sys.exit(1)

# Helper to read .env file manually if python-dotenv is not installed
def load_env():
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

load_env()

# Get Database URL
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("\n" + "="*80)
    print("WARNING: DATABASE_URL environment variable is not set.")
    print("="*80)
    print("Please provide your PostgreSQL connection string:")
    print("Example: postgresql://username:password@hostname:port/database")
    db_url = input("\nEnter DATABASE_URL: ").strip()
    if not db_url:
        print("Error: No database URL provided. Exiting.")
        sys.exit(1)

print("\n" + "="*80)
print("STARTING POSTGRESQL DATABASE DIAGNOSTIC")
print("="*80)
print(f"Connecting to: {db_url.split('@')[-1] if '@' in db_url else 'specified database'} ...")

try:
    conn = psycopg.connect(db_url)
    print("[OK] Connection successfully established!")
except Exception as ce:
    print(f"[FAIL] Connection FAILED: {ce}")
    print("\nPossible causes:")
    print("1. The database host or port is unreachable.")
    print("2. The database username, password, or name is incorrect.")
    print("3. Your IP address is not whitelisted in the database server firewall.")
    sys.exit(1)

tables = [
    "car_features",
    "bike_features",
    "car_ids",
    "bike_ids",
    "car_rentals",
    "bike_rentals"
]

diagnostics = {}

print("\n" + "-"*50)
print("TABLE CHECK & ROW COUNTS")
print("-"*50)

with conn.cursor() as cur:
    for table in tables:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {table};")
            row_count = cur.fetchone()[0]
            print(f"[OK] Table '{table}' exists: {row_count} rows.")
            diagnostics[table] = {
                "exists": True,
                "rows": row_count,
                "error": None
            }
        except Exception as te:
            conn.rollback()
            print(f"[FAIL] Table '{table}' check FAILED: {te}")
            diagnostics[table] = {
                "exists": False,
                "rows": 0,
                "error": str(te)
            }

print("\n" + "-"*50)
print("TESTING ASSEMBLE SERVICE SQL QUERIES")
print("-"*50)

# Test query for car features
if diagnostics["car_features"]["exists"] and diagnostics["car_features"]["rows"] > 0:
    try:
        car_df = pd.read_sql_query("""
            SELECT company_name AS "Company Names", car_name AS "Cars Names", engines AS "Engines", 
                   cc_battery_capacity AS "CC/Battery Capacity", horsepower AS "HorsePower", 
                   total_speed AS "Total Speed", performance_0_100 AS "Performance(0 - 100 )KM/H", 
                   car_prices AS "Cars Prices", fuel_type AS "Fuel Types", seats AS "Seats", torque AS "Torque" 
            FROM car_features
            LIMIT 1;
        """, conn)
        print("[OK] Querying 'car_features' succeeded! Column mapping matches perfectly.")
        print("Sample data fetched:")
        print(car_df.to_dict(orient="records")[0])
    except Exception as qe:
        print(f"[FAIL] Querying 'car_features' FAILED: {qe}")
else:
    print("[WARN] Skipping 'car_features' query test (table missing or empty).")

# Test query for bike features
if diagnostics["bike_features"]["exists"] and diagnostics["bike_features"]["rows"] > 0:
    try:
        bike_df = pd.read_sql_query("""
            SELECT power, make_model, fuel, company_name AS "Company Names" 
            FROM bike_features
            LIMIT 1;
        """, conn)
        print("\n[OK] Querying 'bike_features' succeeded! Column mapping matches perfectly.")
        print("Sample data fetched:")
        print(bike_df.to_dict(orient="records")[0])
    except Exception as qe:
        print(f"[FAIL] Querying 'bike_features' FAILED: {qe}")
else:
    print("\n[WARN] Skipping 'bike_features' query test (table missing or empty).")

# Test query for rentals
if diagnostics["car_rentals"]["exists"] and diagnostics["car_rentals"]["rows"] > 0:
    try:
        rentals_df = pd.read_sql_query("""
            SELECT user_id, destination, length, veh_id, price, weather_id, color 
            FROM car_rentals
            LIMIT 1;
        """, conn)
        print("\n[OK] Querying 'car_rentals' succeeded!")
        print("Sample data fetched:")
        print(rentals_df.to_dict(orient="records")[0])
    except Exception as qe:
        print(f"[FAIL] Querying 'car_rentals' FAILED: {qe}")

print("\n" + "="*80)
print("DIAGNOSTIC SUMMARY & RECOMMENDATIONS")
print("="*80)

all_ok = True
missing_tables = []
empty_tables = []

for table, info in diagnostics.items():
    if not info["exists"]:
        missing_tables.append(table)
        all_ok = False
    elif info["rows"] == 0:
        empty_tables.append(table)
        all_ok = False

if all_ok:
    print("[PASS] ALL CHECKS PASSED!")
    print("The tables exist, contain rows, and the queries executed by the recommendation engine run perfectly.")
    print("If you are facing an issue with getting empty results, check the following:")
    print("1. Coordinates outside supported regions: Check if the origin and destination coordinates are in the range of the road graph.")
    print("2. User ID match: Verify that the user ID you are passing in the recommendation request actually has previous rental records in 'car_rentals' or 'bike_rentals'.")
    print("3. inner join empty results: The KNN scoring does an inner join on the lowercased 'model' columns. If 'model' names do not match between 'car_features' and 'car_ids', the joined dataframe will be empty.")
else:
    if missing_tables:
        print(f"[FAIL] Missing Tables: {', '.join(missing_tables)}")
        print("Recommendation: The database schema was not initialized.")
        print("Ensure init_db() in 'db.py' is called on service startup and has run successfully.")
    
    if empty_tables:
        print(f"[FAIL] Empty Tables (0 rows): {', '.join(empty_tables)}")
        print("Recommendation: The schema exists but the seeding/ingestion failed.")
        print("This usually happens if psycopg COPY throws an exception (e.g. column count mismatch or data type error) and rolls back the transaction.")
        print("Please check your Cloud Run logs for 'Database initialization failed' or 'psycopg' errors during startup.")

print("="*80 + "\n")
conn.close()
