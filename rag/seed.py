import csv
import hashlib
import os
import re
import time
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pgvector.psycopg import register_vector

load_dotenv()

try:
    client = genai.Client()
except Exception as e:
    print(f"Warning: Failed to initialize Gemini Client: {e}")
    client = None

EMBEDDING_MODEL_ID = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768
DB_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
EMBEDDING_DELAY_SECONDS = float(os.getenv("EMBEDDING_DELAY_SECONDS", "0.75"))
EMBEDDING_MAX_RETRIES = int(os.getenv("EMBEDDING_MAX_RETRIES", "8"))

REQUIRED_COLUMNS = {
    "weather_condition",
    "temperature",
    "distance",
    "traffic_condition",
    "time_of_day",
    "chosen_mode",
    "reasoning",
    "serialized_query",
    "serialized_with_label",
}


def content_hash(text: str, model: str) -> str:
    return hashlib.sha256(f"{model}::{text}".encode("utf-8")).hexdigest()


def wait_for_db(url: str, retries: int = 10, delay: float = 2.0):
    for attempt in range(1, retries + 1):
        try:
            conn = psycopg.connect(url, autocommit=True)
            conn.close()
            print("Database is ready.")
            return
        except Exception as e:
            print(f"DB not ready (attempt {attempt}/{retries}): {e}")
            if attempt == retries:
                raise RuntimeError("Could not connect to database after retries.") from e
            time.sleep(delay)


def resolve_dataset_path() -> Path:
    configured = os.getenv("DATASET_PATH")
    candidates = [
        Path(configured) if configured else None,
        Path("dataset.csv"),
        Path(__file__).resolve().parent / "dataset.csv",
        Path(__file__).resolve().parent.parent / "dataset.csv",
    ]

    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate

    tried = ", ".join(str(p) for p in candidates if p)
    raise FileNotFoundError(f"Could not find dataset.csv. Tried: {tried}")


def load_dataset(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"{path} is missing required columns: {sorted(missing)}")
        return [row for row in reader if row.get("serialized_with_label")]


def retry_delay_from_error(error: Exception, fallback: float) -> float:
    message = str(error)
    match = re.search(r"retryDelay': '(\d+)s", message)
    if match:
        return float(match.group(1)) + 2.0

    match = re.search(r"retry in ([\d.]+)s", message, re.IGNORECASE)
    if match:
        return float(match.group(1)) + 2.0

    return fallback


def generate_embedding(text: str) -> list[float]:
    delay = 5.0
    for attempt in range(1, EMBEDDING_MAX_RETRIES + 1):
        try:
            response = client.models.embed_content(
                model=EMBEDDING_MODEL_ID,
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
            )
            if EMBEDDING_DELAY_SECONDS > 0:
                time.sleep(EMBEDDING_DELAY_SECONDS)
            return response.embeddings[0].values
        except Exception as e:
            is_rate_limit = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
            if not is_rate_limit or attempt == EMBEDDING_MAX_RETRIES:
                raise

            sleep_for = retry_delay_from_error(e, delay)
            print(
                f"Embedding quota hit; sleeping {sleep_for:.1f}s "
                f"(attempt {attempt}/{EMBEDDING_MAX_RETRIES})..."
            )
            time.sleep(sleep_for)
            delay = min(delay * 2, 60.0)

    raise RuntimeError("Embedding retry loop exited unexpectedly.")


def ensure_schema(conn):
    conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    register_vector(conn)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS transport_scenarios (
            id                    SERIAL PRIMARY KEY,
            scenario_hash         TEXT UNIQUE NOT NULL,
            weather_condition     TEXT NOT NULL,
            temperature           TEXT NOT NULL,
            distance              TEXT NOT NULL,
            traffic_condition     TEXT NOT NULL,
            time_of_day           TEXT NOT NULL,
            chosen_mode           VARCHAR(50) NOT NULL,
            reasoning             TEXT,
            serialized_query      TEXT NOT NULL,
            serialized_with_label TEXT NOT NULL,
            embedding             vector(768),
            embedding_model       VARCHAR(100),
            created_at            TIMESTAMPTZ DEFAULT NOW(),
            updated_at            TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    migrations = [
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS scenario_hash TEXT;",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS weather_condition TEXT;",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS temperature TEXT;",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS distance TEXT;",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS traffic_condition TEXT;",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS time_of_day TEXT;",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS chosen_mode VARCHAR(50);",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS reasoning TEXT;",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS serialized_query TEXT;",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS serialized_with_label TEXT;",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS embedding vector(768);",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100);",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE transport_scenarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();",
    ]
    for migration in migrations:
        conn.execute(migration)
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS transport_scenarios_hash_idx
        ON transport_scenarios (scenario_hash);
    """)
    print("Scenario schema up to date.")


def seed():
    if not DB_URL:
        raise RuntimeError("DATABASE_URL or POSTGRES_URL must be set.")

    if not client:
        print(
            "Warning: Gemini client not initialized — skipping seed. "
            "Run seed.py manually once GEMINI_API_KEY is set."
        )
        return

    dataset_path = resolve_dataset_path()
    rows = load_dataset(dataset_path)
    print(f"Loaded {len(rows)} rows from {dataset_path}.")

    wait_for_db(DB_URL)
    conn = psycopg.connect(DB_URL, autocommit=True)
    print("Starting dataset seeding process...")

    try:
        ensure_schema(conn)

        inserted = 0
        skipped = 0
        for index, row in enumerate(rows, start=1):
            embedding_text = row["serialized_with_label"]
            scenario_hash = content_hash(embedding_text, EMBEDDING_MODEL_ID)

            existing = conn.execute(
                "SELECT embedding_model FROM transport_scenarios WHERE scenario_hash = %s",
                (scenario_hash,),
            ).fetchone()
            if existing:
                skipped += 1
                continue

            print(f"Generating embedding for dataset row {index}/{len(rows)}...")
            embedding = generate_embedding(embedding_text)

            conn.execute(
                """
                INSERT INTO transport_scenarios
                    (scenario_hash, weather_condition, temperature, distance,
                     traffic_condition, time_of_day, chosen_mode, reasoning,
                     serialized_query, serialized_with_label, embedding,
                     embedding_model, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (scenario_hash) DO UPDATE SET
                    weather_condition     = EXCLUDED.weather_condition,
                    temperature           = EXCLUDED.temperature,
                    distance              = EXCLUDED.distance,
                    traffic_condition     = EXCLUDED.traffic_condition,
                    time_of_day           = EXCLUDED.time_of_day,
                    chosen_mode           = EXCLUDED.chosen_mode,
                    reasoning             = EXCLUDED.reasoning,
                    serialized_query      = EXCLUDED.serialized_query,
                    serialized_with_label = EXCLUDED.serialized_with_label,
                    embedding             = EXCLUDED.embedding,
                    embedding_model       = EXCLUDED.embedding_model,
                    updated_at            = NOW();
                """,
                (
                    scenario_hash,
                    row["weather_condition"],
                    row["temperature"],
                    row["distance"],
                    row["traffic_condition"],
                    row["time_of_day"],
                    row["chosen_mode"],
                    row["reasoning"],
                    row["serialized_query"],
                    row["serialized_with_label"],
                    embedding,
                    EMBEDDING_MODEL_ID,
                ),
            )
            inserted += 1

        print(f"Seeding complete. Inserted {inserted}, skipped {skipped}.")
    finally:
        conn.close()


if __name__ == "__main__":
    seed()
