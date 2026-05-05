import os
import psycopg
from pgvector.psycopg import register_vector
from google import genai
from google.genai import types
from dotenv import load_dotenv
import time

load_dotenv()

client = genai.Client()
EMBEDDING_MODEL_ID = "gemini-embedding-001"
DB_URL = os.getenv("POSTGRES_URL")

seed_data = [
    {
        "type": "bike",
        "description": "very agile, high compatibility inside heavy traffic, vulnerable to weather, very good sightseeing in cool day, bad for hot days, not allowed in storms."
    },
    {
        "type": "motorbike",
        "description": "medium agile, good for heavy traffic, vulnerable to weather, good sightseeing for any kind of weather, dangerous in storms."
    },
    {
        "type": "car",
        "description": "low agile, bad for heavy traffic, protected from weather, good for groups, safe in storms, difficult to find parking."
    },
    {
        "type": "walk",
        "description": "extremely agile, immune to traffic jams, highly vulnerable to weather, great for short distances and sightseeing, physically demanding for long distances."
    },
    {
        "type": "bus",
        "description": "low agile, affected by heavy traffic, protected from weather, very cheap, fixed routes and schedules, safe in storms."
    },
    {
        "type": "metro",
        "description": "not affected by street traffic, highly reliable, completely protected from weather, very fast for long cross-city distances, fixed stations."
    }
]

def seed():
    try:
        # Wait a moment for DB to be fully ready if started concurrently
        time.sleep(2)
        
        conn = psycopg.connect(DB_URL, autocommit=True)
        
        print("Starting seeding process...")
        
        # Ensure schema is correct
        conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        register_vector(conn)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS transport_knowledge (
                id SERIAL PRIMARY KEY,
                transport_type VARCHAR(50) UNIQUE NOT NULL,
                description TEXT NOT NULL,
                embedding vector(768)
            );
        """)
        
        for item in seed_data:
            # Check if description matches to avoid unnecessary API calls
            existing = conn.execute(
                "SELECT description FROM transport_knowledge WHERE transport_type = %s",
                (item["type"],)
            ).fetchone()
            
            if existing and existing[0] == item["description"]:
                print(f"Skipping '{item['type']}' - no changes detected.")
                continue

            print(f"Generating embedding for '{item['type']}'...")
            response = client.models.embed_content(
                model=EMBEDDING_MODEL_ID,
                contents=item["description"],
                config=types.EmbedContentConfig(output_dimensionality=768)
            )
            embedding = response.embeddings[0].values
            
            conn.execute("""
                INSERT INTO transport_knowledge (transport_type, description, embedding) 
                VALUES (%s, %s, %s)
                ON CONFLICT (transport_type) DO UPDATE 
                SET description = EXCLUDED.description,
                    embedding = EXCLUDED.embedding;
            """, (item["type"], item["description"], embedding))
            print(f"Upserted '{item['type']}' successfully.")
            
        conn.close()
        print("Seeding complete!")
    except Exception as e:
        print(f"Error during seeding: {e}")

if __name__ == "__main__":
    seed()
