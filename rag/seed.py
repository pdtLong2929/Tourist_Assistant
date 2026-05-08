import os
import hashlib
import time
import psycopg
from pgvector.psycopg import register_vector
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

try:
    client = genai.Client()
except Exception as e:
    print(f"Warning: Failed to initialize Gemini Client: {e}")
    client = None

EMBEDDING_MODEL_ID = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768
# Fix: .env uses DATABASE_URL, not POSTGRES_URL
DB_URL = os.getenv("DATABASE_URL")

seed_data = [
    {
        "type": "bike",
        "description": "Very agile and easy to maneuver.",
        "good_for": "light traffic, short distances, cool weather, sightseeing",
        "bad_for": "hot days, heavy rain, storms, long distances",
        "constraints": "not allowed during storms, requires physical effort",
        "weather_sensitivity": "high",
        "traffic_sensitivity": "low",
    },
    {
        "type": "motorbike",
        "description": "Medium agility, good urban mobility.",
        "good_for": "heavy traffic, any weather except storms, sightseeing",
        "bad_for": "storms, group travel, carrying large luggage",
        "constraints": "dangerous in storms, requires license",
        "weather_sensitivity": "medium",
        "traffic_sensitivity": "low",
    },
    {
        "type": "car",
        "description": "Low agility but fully enclosed and comfortable.",
        "good_for": "group travel, bad weather, long distances, storms, luggage",
        "bad_for": "heavy traffic, city centers, finding parking",
        "constraints": "difficult parking, high cost, not eco-friendly",
        "weather_sensitivity": "none",
        "traffic_sensitivity": "high",
    },
    {
        "type": "bus",
        "description": "Shared public transit on fixed routes.",
        "good_for": "budget travel, bad weather, storms, medium distances",
        "bad_for": "heavy traffic (shares road), tight schedules, remote destinations",
        "constraints": "fixed routes and timetables, crowded in peak hours",
        "weather_sensitivity": "none",
        "traffic_sensitivity": "medium",
    },
    {
        "type": "metro",
        "description": "Underground rail, completely isolated from street conditions.",
        "good_for": "any weather, storms, heavy traffic, long cross-city distances, reliability",
        "bad_for": "areas without metro stations, carrying large luggage",
        "constraints": "fixed stations only, no door-to-door service",
        "weather_sensitivity": "none",
        "traffic_sensitivity": "none",
    },
]


def build_embedding_text(item: dict) -> str:
    """Flatten structured fields into one string for embedding.
    Keeping field labels in the text (e.g. 'Bad for: storms') helps the
    model match query terms like 'storm' to the right concept."""
    return (
        f"{item['description']} "
        f"Good for: {item['good_for']}. "
        f"Bad for: {item['bad_for']}. "
        f"Constraints: {item['constraints']}. "
        f"Weather sensitivity: {item['weather_sensitivity']}. "
        f"Traffic sensitivity: {item['traffic_sensitivity']}."
    )


def content_hash(text: str, model: str) -> str:
    """Hash of (embedding text + model id). Any change — including a model
    swap — forces a re-embed rather than silently keeping a stale vector."""
    return hashlib.sha256(f"{model}::{text}".encode()).hexdigest()


def wait_for_db(url: str, retries: int = 10, delay: float = 2.0):
    """Retry until Postgres accepts a connection instead of sleeping blindly."""
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


def ensure_schema(conn):
    conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    register_vector(conn)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS transport_knowledge (
            id                  SERIAL PRIMARY KEY,
            transport_type      VARCHAR(50) UNIQUE NOT NULL,
            description         TEXT NOT NULL,
            good_for            TEXT,
            bad_for             TEXT,
            constraints         TEXT,
            weather_sensitivity VARCHAR(20),
            traffic_sensitivity VARCHAR(20),
            embedding           vector(768),
            content_hash        TEXT,
            embedding_model     VARCHAR(100),
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    # Migrate existing tables that were created before these columns were added.
    # ADD COLUMN IF NOT EXISTS is safe to run repeatedly — it's a no-op if the column exists.
    migrations = [
        "ALTER TABLE transport_knowledge ADD COLUMN IF NOT EXISTS good_for TEXT;",
        "ALTER TABLE transport_knowledge ADD COLUMN IF NOT EXISTS bad_for TEXT;",
        "ALTER TABLE transport_knowledge ADD COLUMN IF NOT EXISTS constraints TEXT;",
        "ALTER TABLE transport_knowledge ADD COLUMN IF NOT EXISTS weather_sensitivity VARCHAR(20);",
        "ALTER TABLE transport_knowledge ADD COLUMN IF NOT EXISTS traffic_sensitivity VARCHAR(20);",
        "ALTER TABLE transport_knowledge ADD COLUMN IF NOT EXISTS content_hash TEXT;",
        "ALTER TABLE transport_knowledge ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100);",
        "ALTER TABLE transport_knowledge ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE transport_knowledge ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();",
    ]
    for migration in migrations:
        conn.execute(migration)
    print("Schema up to date.")


def seed():
    # Fix: was raising RuntimeError which crashed the container before uvicorn started.
    # Now we warn and exit cleanly — uvicorn still starts with whatever is in the DB.
    if not client:
        print("Warning: Gemini client not initialized — skipping seed. "
              "Run seed.py manually once GEMINI_API_KEY is set.")
        return

    wait_for_db(DB_URL)
    conn = psycopg.connect(DB_URL, autocommit=True)
    print("Starting seeding process...")

    ensure_schema(conn)

    for item in seed_data:
        embed_text = build_embedding_text(item)
        chash = content_hash(embed_text, EMBEDDING_MODEL_ID)

        existing = conn.execute(
            "SELECT content_hash FROM transport_knowledge WHERE transport_type = %s",
            (item["type"],),
        ).fetchone()

        if existing and existing[0] == chash:
            print(f"Skipping '{item['type']}' — content unchanged.")
            continue

        print(f"Generating embedding for '{item['type']}'...")
        response = client.models.embed_content(
            model=EMBEDDING_MODEL_ID,
            contents=embed_text,
            config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
        )
        embedding = response.embeddings[0].values

        conn.execute(
            """
            INSERT INTO transport_knowledge
                (transport_type, description, good_for, bad_for, constraints,
                 weather_sensitivity, traffic_sensitivity,
                 embedding, content_hash, embedding_model, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (transport_type) DO UPDATE SET
                description         = EXCLUDED.description,
                good_for            = EXCLUDED.good_for,
                bad_for             = EXCLUDED.bad_for,
                constraints         = EXCLUDED.constraints,
                weather_sensitivity = EXCLUDED.weather_sensitivity,
                traffic_sensitivity = EXCLUDED.traffic_sensitivity,
                embedding           = EXCLUDED.embedding,
                content_hash        = EXCLUDED.content_hash,
                embedding_model     = EXCLUDED.embedding_model,
                updated_at          = NOW();
            """,
            (
                item["type"],
                item["description"],
                item["good_for"],
                item["bad_for"],
                item["constraints"],
                item["weather_sensitivity"],
                item["traffic_sensitivity"],
                embedding,
                chash,
                EMBEDDING_MODEL_ID,
            ),
        )
        print(f"Upserted '{item['type']}' successfully.")

    conn.close()
    print("Seeding complete!")


if __name__ == "__main__":
    seed()