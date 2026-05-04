# RAG Transportation Suggestion Service

This document outlines the architecture, data flow, and components for the Retrieval-Augmented Generation (RAG) service designed to suggest optimal transportation methods (walk, bike, motorbike, car, bus, metro, etc.).

## 🏗️ System Architecture

### 1. Core Components

*   **LLM (Language Model):** **Gemini 2.5 Flash** (via external API). Chosen for its high speed, multimodal capabilities, and excellent reasoning, which is perfect for synthesizing context.
*   **Embedding Model:** **Gemini `text-embedding-004`** or **Hugging Face `all-MiniLM-L6-v2`**. 
    *   *Recommendation:* Use Gemini's `text-embedding-004` as it integrates seamlessly with the same API key you use for Gemini 2.5 Flash and has a generous free tier. Alternatively, `all-MiniLM-L6-v2` can be run locally for 100% free embeddings.
*   **Vector Database:** **PostgreSQL with `pgvector`**. We will store the transportation knowledge and their vector embeddings here.
*   **External APIs:**
    *   **Weather API** (e.g., OpenWeatherMap, WeatherAPI) for real-time weather conditions.
    *   **Routing API** (e.g., Google Maps Directions, Mapbox, or OSRM) for distance, elevation, and real-time traffic data.

---

## 🗄️ Database Schema (pgvector)

We need to update the Postgres Docker image to one that supports `pgvector` (e.g., `pgvector/pgvector:pg16`).

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE transport_knowledge (
    id SERIAL PRIMARY KEY,
    transport_type VARCHAR(50) NOT NULL, -- e.g., 'bike', 'motorbike', 'metro'
    description TEXT NOT NULL,           -- e.g., 'very agile, high compatibility inside heavy traffic...'
    embedding vector(768)                -- Dimension depends on the embedding model (768 for Gemini)
);
```

---

## 🔄 Data Flows

### Flow 1: Data Ingestion (Knowledge Base Population)
*Our team feeds the embedding model data.*

1. **Input:** Admin provides a descriptive text for a transport type.
   > *Example:* "bike - very agile, high compatibility inside heavy traffic, vulnerable to weather, very good sightseeing in cool day, bad for hot days, not allowed in storms."
2. **Embedding Generation:** The service sends the description to the Embedding Model (e.g., Gemini `text-embedding-004`).
3. **Storage:** The returned vector and the original text are stored in the `transport_knowledge` table in PostgreSQL.

### Flow 2: Inference (User Request & RAG Pipeline)
*The user asks for a recommendation.*

1. **User Request:** User requests a route from Point A to Point B.
2. **External Data Fetch:**
   *   Fetch current weather for the location (e.g., "Heavy rain, 28°C").
   *   Fetch route data (e.g., "Distance: 5km, Traffic: Heavy").
3. **Query Embedding:** Combine the user's implicit needs (weather + traffic) into a query string: *"Short distance in heavy rain and heavy traffic"* and generate an embedding for it.
4. **Vector Search:** Query `pgvector` to find the most relevant transportation knowledge.
   ```sql
   SELECT transport_type, description, embedding <=> '[...query_vector...]' AS distance
   FROM transport_knowledge
   ORDER BY distance ASC
   LIMIT 3;
   ```
5. **Prompt Construction:** Combine everything into a prompt for Gemini 2.5 Flash.
   ```text
   You are an expert travel assistant. Based on the following facts, recommend the best transport method.
   
   [Relevant Knowledge from DB]: 
   - Motorbike: medium agile, good for heavy traffic, vulnerable to weather...
   - Car: not agile, bad for heavy traffic, protected from weather...
   
   [Current Context]:
   - Weather: Heavy Rain, 28°C
   - Route: 5km, Heavy Traffic
   
   Question: Which transport method is best for the user right now and why?
   ```
6. **LLM Response:** Gemini 2.5 Flash streams back the customized, context-aware recommendation to the user.

---

## 🚀 Next Steps for Implementation

1. **Update `docker-compose.yml`**: Change the `postgres:16-alpine` image to `pgvector/pgvector:pg16` so `pgvector` can be used.
2. **Create the Go/Node Service inside `rag/`**: Set up a basic web server (e.g., using Gin in Go or Express in Node.js).
3. **Integrate Google GenAI SDK**: For calling both the Gemini 2.5 Flash model and the embedding model.
4. **Implement DB Connection**: Connect to Postgres and create the pgvector tables.
5. **Create Endpoints**:
   *   `POST /rag/ingest`: For the team to add new transport knowledge.
   *   `POST /rag/suggest`: For the frontend to request transport suggestions.
