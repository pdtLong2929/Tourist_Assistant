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


def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    delay = 5.0
    for attempt in range(1, EMBEDDING_MAX_RETRIES + 1):
        try:
            response = client.models.embed_content(
                model=EMBEDDING_MODEL_ID,
                contents=texts,
                config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
            )
            if EMBEDDING_DELAY_SECONDS > 0:
                time.sleep(EMBEDDING_DELAY_SECONDS)
            return [emb.values for emb in response.embeddings]
        except Exception as e:
            err_str = str(e)
            is_retryable = (
                "429" in err_str
                or "RESOURCE_EXHAUSTED" in err_str
                or "503" in err_str
                or "UNAVAILABLE" in err_str
                or "502" in err_str
                or "504" in err_str
                or "500" in err_str
            )
            if not is_retryable or attempt == EMBEDDING_MAX_RETRIES:
                raise

            sleep_for = retry_delay_from_error(e, delay)
            print(
                f"Embedding API error/quota hit (attempt {attempt}/{EMBEDDING_MAX_RETRIES}): {err_str[:100]}... "
                f"Sleeping {sleep_for:.1f}s before retry..."
            )
            time.sleep(sleep_for)
            delay = min(delay * 2, 60.0)

    raise RuntimeError("Embedding batch retry loop exited unexpectedly.")


def generate_embedding(text: str) -> list[float]:
    return generate_embeddings_batch([text])[0]


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

        # 1. Fetch existing scenario hashes in a single query
        existing_hashes = set()
        try:
            existing_rows = conn.execute("SELECT scenario_hash FROM transport_scenarios").fetchall()
            existing_hashes = {r[0] for r in existing_rows if r[0]}
        except Exception as e:
            print(f"Warning: Could not pre-fetch existing hashes: {e}")

        # 2. Determine which rows need to be seeded
        to_seed = []
        skipped = 0
        for row in rows:
            embedding_text = row["serialized_with_label"]
            scenario_hash = content_hash(embedding_text, EMBEDDING_MODEL_ID)
            if scenario_hash in existing_hashes:
                skipped += 1
            else:
                to_seed.append((row, scenario_hash))

        print(f"Found {len(to_seed)} new rows to seed, skipping {skipped} already seeded rows.")

        # 3. Process remaining rows in batches
        inserted = 0
        batch_size = 50
        for i in range(0, len(to_seed), batch_size):
            chunk = to_seed[i : i + batch_size]
            chunk_texts = [r[0]["serialized_with_label"] for r in chunk]

            current_batch_idx = i // batch_size + 1
            total_batches = (len(to_seed) + batch_size - 1) // batch_size
            print(f"Generating embeddings for batch {current_batch_idx}/{total_batches} ({len(chunk)} rows)...")
            
            try:
                embeddings = generate_embeddings_batch(chunk_texts)
            except Exception as e:
                print(f"Failed to generate embeddings for batch {current_batch_idx}: {e}")
                raise

            if len(embeddings) != len(chunk):
                raise ValueError(
                    f"Mismatch in embeddings generated: expected {len(chunk)}, got {len(embeddings)}"
                )

            print(f"Writing batch {current_batch_idx}/{total_batches} to database...")
            for ((row, scenario_hash), embedding) in zip(chunk, embeddings):
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
