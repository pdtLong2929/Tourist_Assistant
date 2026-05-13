import os

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from google import genai
from google.genai import types
from pgvector.psycopg import register_vector
from pydantic import BaseModel
from typing import Optional

load_dotenv()

app = FastAPI(title="RAG Transportation Service")

try:
    client = genai.Client()
except Exception as e:
    print(f"Warning: Failed to initialize Gemini Client: {e}")
    client = None

MODEL_ID = "gemini-2.5-flash"
EMBEDDING_MODEL_ID = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768

DB_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")


def get_db_connection():
    if not DB_URL:
        raise RuntimeError("DATABASE_URL or POSTGRES_URL must be set.")
    conn = psycopg.connect(DB_URL, autocommit=True)
    register_vector(conn)
    return conn


@app.on_event("startup")
def startup_event():
    conn = get_db_connection()
    try:
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
    finally:
        conn.close()


@app.get("/health")
def health_check():
    return {"status": "ok"}


class IngestRequest(BaseModel):
    transport_type: str
    description: str
    good_for: Optional[str] = None
    bad_for: Optional[str] = None
    constraints: Optional[str] = None
    weather_sensitivity: Optional[str] = None  # none / low / medium / high / very high
    traffic_sensitivity: Optional[str] = None  # none / low / medium / high


class SuggestRequest(BaseModel):
    weather_condition: str  # e.g. "heavy rain", "clear sky", "storm"
    temperature: str        # e.g. "32°C hot", "18°C mild"
    distance: str           # e.g. "2 km", "15 km cross-city"
    traffic_condition: str  # e.g. "heavy", "moderate", "light"
    time_of_day: Optional[str] = None  # e.g. "07:00 rush hour"

    # Hard filters: eliminate options that are objectively unsafe before LLM reasoning.
    # e.g. exclude_weather_sensitive=true during a storm drops bike and walk entirely.
    exclude_weather_sensitive: bool = False
    exclude_traffic_sensitive: bool = False

    top_k: int = 5


@app.post("/rag/ingest")
def ingest_knowledge(req: IngestRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized")

    embed_text = (
        f"{req.description} "
        f"Good for: {req.good_for or 'unspecified'}. "
        f"Bad for: {req.bad_for or 'unspecified'}. "
        f"Constraints: {req.constraints or 'none'}."
    )

    try:
        response = client.models.embed_content(
            model=EMBEDDING_MODEL_ID,
            contents=embed_text,
            config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
        )
        embedding = response.embeddings[0].values

        conn = get_db_connection()
        try:
            conn.execute(
                """
                INSERT INTO transport_knowledge
                    (transport_type, description, good_for, bad_for, constraints,
                     weather_sensitivity, traffic_sensitivity, embedding, embedding_model)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (transport_type) DO UPDATE SET
                    description         = EXCLUDED.description,
                    good_for            = EXCLUDED.good_for,
                    bad_for             = EXCLUDED.bad_for,
                    constraints         = EXCLUDED.constraints,
                    weather_sensitivity = EXCLUDED.weather_sensitivity,
                    traffic_sensitivity = EXCLUDED.traffic_sensitivity,
                    embedding           = EXCLUDED.embedding,
                    embedding_model     = EXCLUDED.embedding_model,
                    updated_at          = NOW();
                """,
                (
                    req.transport_type, req.description,
                    req.good_for, req.bad_for, req.constraints,
                    req.weather_sensitivity, req.traffic_sensitivity,
                    embedding, EMBEDDING_MODEL_ID,
                ),
            )
        finally:
            conn.close()

        return {"status": "success", "message": f"'{req.transport_type}' ingested."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rag/suggest")
def suggest_transport(req: SuggestRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized")

    try:
        query_text = (
            f"Weather is {req.weather_condition} with a temperature of {req.temperature}. "
            f"Route distance is {req.distance} and traffic is {req.traffic_condition}."
        )
        if req.time_of_day:
            query_text += f" Trip starts at {req.time_of_day}."

        embed_res = client.models.embed_content(
            model=EMBEDDING_MODEL_ID,
            contents=query_text,
            config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
        )
        query_embedding = embed_res.embeddings[0].values

        conn = get_db_connection()
        try:
            scenario_results = conn.execute(
                """
                SELECT
                    weather_condition,
                    temperature,
                    distance,
                    traffic_condition,
                    time_of_day,
                    chosen_mode,
                    reasoning,
                    serialized_query,
                    serialized_with_label,
                    embedding <=> %s::vector AS similarity_distance
                FROM transport_scenarios
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector ASC
                LIMIT %s;
                """,
                (query_embedding, query_embedding, req.top_k),
            ).fetchall()

            knowledge_results = []
            if not scenario_results:
                where_clauses = []
                if req.exclude_weather_sensitive:
                    where_clauses.append("weather_sensitivity NOT IN ('high', 'very high')")
                if req.exclude_traffic_sensitive:
                    where_clauses.append("traffic_sensitivity NOT IN ('high')")
                where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

                knowledge_results = conn.execute(
                    f"""
                    SELECT
                        transport_type,
                        description,
                        good_for,
                        bad_for,
                        constraints,
                        weather_sensitivity,
                        traffic_sensitivity,
                        embedding <=> %s::vector AS distance
                    FROM transport_knowledge
                    {where_sql}
                    ORDER BY distance ASC;
                    """,
                    (query_embedding,),
                ).fetchall()
        finally:
            conn.close()

        if not scenario_results and not knowledge_results:
            raise HTTPException(
                status_code=404,
                detail="No RAG records found. Run seed.py to load dataset.csv.",
            )

        if scenario_results:
            context_lines = []
            for row in scenario_results:
                context_lines.append(
                    f"- Similar trip: {row[7]}\n"
                    f"  Recommended mode: {row[5]}\n"
                    f"  Reasoning: {row[6]}"
                )
            context_str = "\n".join(context_lines)
            prompt = f"""You are a transport planning expert for a Southeast Asian city.

[Similar labeled trips retrieved from the dataset]:
{context_str}

[Current travel conditions]:
{query_text}

Available modes: bike, motorbike, car, transit.

Task: Choose exactly one transport mode for the current conditions. Return the mode name first, then one concise sentence explaining the decision."""
        else:
            context_lines = []
            for row in knowledge_results:
                context_lines.append(
                    f"- {row[0]}: {row[1]}\n"
                    f"  Good for: {row[2]}\n"
                    f"  Bad for: {row[3]}\n"
                    f"  Constraints: {row[4]}\n"
                    f"  Weather sensitivity: {row[5]} | Traffic sensitivity: {row[6]}"
                )
            context_str = "\n".join(context_lines)
            prompt = f"""You are a practical travel assistant.

[Available transport options]:
{context_str}

[Current travel conditions]:
{query_text}

Task: Choose exactly one transport method that best fits the current conditions. State the method name, then give a single sentence explaining why it is the best choice. Do not mention or compare the other options."""

        llm_response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
        )

        retrieved = [
            {
                "weather_condition": row[0],
                "temperature": row[1],
                "distance": row[2],
                "traffic_condition": row[3],
                "time_of_day": row[4],
                "chosen_mode": row[5],
                "similarity_distance": round(row[9], 4),
            }
            for row in scenario_results
        ] or [
            {
                "transport_type": row[0],
                "similarity_distance": round(row[7], 4),
            }
            for row in knowledge_results[:req.top_k]
        ]

        return {
            "suggestion": llm_response.text,
            "retrieved": retrieved,
            "filters_applied": {
                "exclude_weather_sensitive": req.exclude_weather_sensitive,
                "exclude_traffic_sensitive": req.exclude_traffic_sensitive,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
