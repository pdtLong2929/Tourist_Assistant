import hashlib
import json
import os

import psycopg
import redis
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

MODEL_ID = "gemini-3.1-flash-lite"
EMBEDDING_MODEL_ID = "gemini-embedding-2"
EMBEDDING_DIMENSIONS = 768

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
    print(f"RAG suggestion caching ENABLED via Redis at: {redis_addr}")
except Exception as re:
    print(f"Warning: Redis caching disabled/unavailable ({re}). RAG suggestion responses will NOT be cached.")
    redis_client = None

def is_mock() -> bool:
    return os.getenv("MOCK_EMBEDDING", "false").lower() == "true"

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
    weather_condition: Optional[str] = None  # e.g. "heavy rain", "clear sky", "storm"
    temperature: Optional[str] = None        # e.g. "32°C hot", "18°C mild"
    distance: Optional[str] = None           # e.g. "2 km", "15 km cross-city"
    traffic_condition: Optional[str] = None  # e.g. "heavy", "moderate", "light"
    time_of_day: Optional[str] = None        # e.g. "07:00 rush hour"

    # Raw fallback fields to handle unstructured inputs from Go workers or legacy clients
    query: Optional[str] = None
    weather: Optional[str] = None

    # Hard filters: eliminate options that are objectively unsafe before LLM reasoning.
    # e.g. exclude_weather_sensitive=true during a storm drops bike and walk entirely.
    exclude_weather_sensitive: bool = False
    exclude_traffic_sensitive: bool = False

    top_k: int = 2


@app.post("/rag/ingest")
def ingest_knowledge(req: IngestRequest):
    if not client and not is_mock():
        raise HTTPException(status_code=500, detail="Gemini client not initialized")

    embed_text = (
        f"{req.description} "
        f"Good for: {req.good_for or 'unspecified'}. "
        f"Bad for: {req.bad_for or 'unspecified'}. "
        f"Constraints: {req.constraints or 'none'}."
    )

    try:
        if is_mock():
            embedding = [0.1] * EMBEDDING_DIMENSIONS
        else:
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
    if not client and not is_mock():
        raise HTTPException(status_code=500, detail="Gemini client not initialized")

    try:
        if req.query:
            query_text = req.query
        else:
            weather_desc = req.weather_condition or req.weather or "unknown"
            query_text = (
                f"Weather is {weather_desc} with a temperature of {req.temperature or 'unknown'}. "
                f"Route distance is {req.distance or 'unknown'} and traffic is {req.traffic_condition or 'unknown'}."
            )
            if req.time_of_day:
                query_text += f" Trip starts at {req.time_of_day}."

        # Check Redis Cache before invoking LLM or Embedding API
        cache_key = None
        if redis_client:
            try:
                # Deterministic identification formula including filters and query text
                cache_str = f"{query_text}|k={req.top_k}|w={req.exclude_weather_sensitive}|t={req.exclude_traffic_sensitive}"
                query_hash = hashlib.sha256(cache_str.encode("utf-8")).hexdigest()
                cache_key = f"rag:suggest:{query_hash}"
                
                cached_val = redis_client.get(cache_key)
                if cached_val:
                    print(f"Cache HIT [0 Tokens]: Returning suggestion for query hash {query_hash[:8]}")
                    return json.loads(cached_val)
            except Exception as ce:
                print(f"Warning: Suggestion cache check encountered an error: {ce}")

        if is_mock():
            query_embedding = [0.1] * EMBEDDING_DIMENSIONS
        else:
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
                    ORDER BY distance ASC
                    LIMIT %s;
                    """,
                    (query_embedding, req.top_k),
                ).fetchall()
        finally:
            conn.close()

        if not scenario_results and not knowledge_results:
            raise HTTPException(
                status_code=404,
                detail="No RAG records found. Run seed.py to load dataset.csv.",
            )

        if scenario_results:
            # Token Saving: Create tight, dense context blocks instead of verbose multiliners
            context_lines = [
                f"Q:{r[7]}|M:{r[5]}|R:{r[6]}" for r in scenario_results
            ]
            context_str = "\n".join(context_lines)
            
            prompt = f"""[SCENARIOS]
{context_str}

[QUERY]
{query_text}"""
            
            sys_inst = "Expert SE Asia transport planner. Modes: bike, motorbike, car, walk, transit. Rate all 5 for current query. Return ONLY a JSON array: [{'type': '...', 'rating': '0-100', 'explanation': 'concise sentence'}]."
        else:
            context_lines = [
                f"{r[0]}: {r[1]}|Good:{r[2]}|Bad:{r[3]}|Const:{r[4]}|WSen:{r[5]}|TSen:{r[6]}"
                for r in knowledge_results
            ]
            context_str = "\n".join(context_lines)
            
            prompt = f"""[MODES]
{context_str}
 
[QUERY]
{query_text}"""
            
            sys_inst = "Practical travel assistant. Modes: bike, motorbike, car, walk, transit. Rate all 5 for current conditions. Return ONLY JSON array: [{'type': '...', 'rating': '0-100', 'explanation': 'concise sentence'}]."

        if is_mock():
            # Parse query_text to dynamically adjust mock ratings to look very realistic
            q_lower = query_text.lower()
            
            # Default base ratings
            ratings = {
                "bike": 60,
                "motorbike": 80,
                "car": 75,
                "walk": 50,
                "transit": 80
            }
            
            explanations = {
                "bike": "[MOCK] Bike is healthy and eco-friendly.",
                "motorbike": "[MOCK] Motorbike is extremely agile in city streets.",
                "car": "[MOCK] Car provides premium air-conditioned comfort.",
                "walk": "[MOCK] Walking is best for short active micro-trips.",
                "transit": "[MOCK] Public transit is highly efficient, affordable, and traffic-free."
            }
            
            # Adjust based on weather
            if "rain" in q_lower or "storm" in q_lower or "wet" in q_lower:
                ratings["bike"] -= 40
                ratings["walk"] -= 30
                ratings["motorbike"] -= 25
                ratings["car"] += 15
                ratings["transit"] += 10
                explanations["bike"] = "[MOCK] Riding a bike is highly unsafe during active rain/storm."
                explanations["walk"] = "[MOCK] Walking is uncomfortable due to heavy rain."
                explanations["motorbike"] = "[MOCK] Motorbike lacks shelter; caution advised in rain."
                explanations["car"] = "[MOCK] Car provides excellent shelter and safety in rain."
                explanations["transit"] = "[MOCK] Public transit offers a safe, covered, and stress-free journey in wet weather."
            
            # Adjust based on traffic
            if "heavy" in q_lower or "jam" in q_lower or "congest" in q_lower or "rush hour" in q_lower:
                ratings["car"] -= 35
                ratings["transit"] += 15
                ratings["motorbike"] += 10
                explanations["car"] = "[MOCK] Car is severely delayed by heavy gridlock/traffic."
                explanations["transit"] = "[MOCK] Public transit bypasses ground-level road congestion entirely."
                explanations["motorbike"] = "[MOCK] Motorbike easily filters through heavy traffic jams."
                
            # Adjust based on distance
            if "km" in q_lower:
                import re
                match = re.search(r"(\d+(\.\d+)?)\s*km", q_lower)
                if match:
                    dist = float(match.group(1))
                    if dist > 10:
                        ratings["walk"] = max(5, ratings["walk"] - 45)
                        ratings["bike"] = max(10, ratings["bike"] - 30)
                        ratings["transit"] += 10
                        explanations["walk"] = f"[MOCK] Walk is impractical for a long distance of {dist} km."
                        explanations["bike"] = f"[MOCK] Biking is very tiring for a {dist} km journey."
                        explanations["transit"] = f"[MOCK] Public transit is the most efficient and reliable choice for a {dist} km journey."
                    elif dist < 2:
                        ratings["walk"] += 35
                        ratings["bike"] += 20
                        ratings["car"] -= 30
                        ratings["transit"] -= 20
                        explanations["walk"] = f"[MOCK] Walking is highly recommended for this short {dist} km micro-trip."
                        explanations["car"] = f"[MOCK] Car is inefficient for a very short trip of {dist} km."
                        explanations["transit"] = f"[MOCK] Public transit is overkill and inconvenient for just {dist} km."

            # Ensure all ratings stay within 0-100 range
            mock_list = []
            for mode in ["bike", "motorbike", "car", "walk", "transit"]:
                score = max(0, min(100, ratings[mode]))
                mock_list.append({
                    "type": mode,
                    "rating": str(score),
                    "explanation": explanations[mode]
                })
            
            class MockResponse:
                text = json.dumps(mock_list)
            llm_response = MockResponse()
        else:
            # Token Saving: Utilize system_instruction and constrain output size to strictly prevent runaway tokens
            llm_response = client.models.generate_content(
                model=MODEL_ID,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=sys_inst,
                    response_mime_type="application/json",
                    max_output_tokens=512,
                    temperature=0.1  # Higher determinism for structured format
                )
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

        final_response = {
            "suggestion": llm_response.text,
            "retrieved": retrieved,
            "filters_applied": {
                "exclude_weather_sensitive": req.exclude_weather_sensitive,
                "exclude_traffic_sensitive": req.exclude_traffic_sensitive,
            },
        }

        # Write completed recommendation back to Redis with a 24-hour TTL
        if cache_key and redis_client:
            try:
                redis_client.setex(cache_key, 86400, json.dumps(final_response))
            except Exception as ce:
                print(f"Warning: Failed writing suggestion to cache: {ce}")

        return final_response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
