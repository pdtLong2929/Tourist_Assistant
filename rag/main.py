import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import psycopg
from pgvector.psycopg import register_vector
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RAG Transportation Service")

# Initialize Gemini Client
# Assumes GEMINI_API_KEY is in environment variables
try:
    client = genai.Client()
except Exception as e:
    print(f"Warning: Failed to initialize Gemini Client: {e}")
    client = None
MODEL_ID = "gemini-2.5-flash"
EMBEDDING_MODEL_ID = "gemini-embedding-001"

DB_URL = os.getenv("POSTGRES_URL")

class IngestRequest(BaseModel):
    transport_type: str
    description: str

class SuggestRequest(BaseModel):
    query: str

def get_db_connection():
    conn = psycopg.connect(DB_URL, autocommit=True)
    register_vector(conn)
    return conn

@app.on_event("startup")
def startup_event():
    conn = get_db_connection()
    try:
        conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS transport_knowledge (
                id SERIAL PRIMARY KEY,
                transport_type VARCHAR(50) UNIQUE NOT NULL,
                description TEXT NOT NULL,
                embedding vector(768)
            );
        """)
    finally:
        conn.close()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/rag/ingest")
def ingest_knowledge(req: IngestRequest):
    try:
        if not client:
            raise HTTPException(status_code=500, detail="Gemini client not initialized")
            
        # Generate embedding
        response = client.models.embed_content(
            model=EMBEDDING_MODEL_ID,
            contents=req.description,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        embedding = response.embeddings[0].values

        conn = get_db_connection()
        try:
            conn.execute(
                "INSERT INTO transport_knowledge (transport_type, description, embedding) VALUES (%s, %s, %s)",
                (req.transport_type, req.description, embedding)
            )
        finally:
            conn.close()
        return {"status": "success", "message": "Knowledge ingested."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rag/suggest")
def suggest_transport(req: SuggestRequest):
    try:
        if not client:
            raise HTTPException(status_code=500, detail="Gemini client not initialized")
            
        query_text = req.query
        
        # Generate embedding for the query
        embed_res = client.models.embed_content(
            model=EMBEDDING_MODEL_ID,
            contents=query_text,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        query_embedding = embed_res.embeddings[0].values

        # Perform vector search
        conn = get_db_connection()
        try:
            results = conn.execute("""
                SELECT transport_type, description, embedding <=> %s::vector AS distance
                FROM transport_knowledge
                ORDER BY distance ASC
                LIMIT 3;
            """, (query_embedding,)).fetchall()
        finally:
            conn.close()

        context_blocks = []
        for row in results:
            context_blocks.append(f"- {row[0]}: {row[1]}")
        context_str = "\n".join(context_blocks)

        prompt = f"""You are an expert travel assistant. Based on the following facts, please evaluate the relevant transportation types and provide reasoning.

[Relevant Knowledge from DB]: 
{context_str}

[Current Context]:
{query_text}

Task: Return a strict JSON array evaluating exactly 3 transport options.
Format example:
[
  {{"type": "car", "rating": 85, "explanation": "..."}},
  {{"type": "bus", "rating": 60, "explanation": "..."}},
  {{"type": "metro", "rating": 90, "explanation": "..."}}
]
Use lowercase lowercase keys exactly as above. 'type' MUST be one of: bike, motorbike, car, walk, bus, metro.
"""
        
        print("--- SENDING PROMPT TO LLM ---")
        print(prompt)
        print("-----------------------------")

        # Generate response using Gemini
        llm_response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )

        return {"suggestion": llm_response.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
