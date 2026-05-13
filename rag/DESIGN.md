# RAG Service Design

## Scope

This document covers only the Retrieval-Augmented Generation service in `rag/`.
The service recommends one transportation mode for a trip using current travel
conditions, previously labeled transport scenarios, vector search, and Gemini
generation.

Out of scope:

- Frontend UI design.
- Login, booking, renting, or user account flows.
- Map and weather provider integrations outside the fields they pass into RAG.
- Nginx routing and non-RAG backend services.

## Goals

- Recommend exactly one transport mode from `bike`, `motorbike`, `car`, or
  `transit`.
- Ground the recommendation in similar labeled examples from `dataset.csv`.
- Keep retrieval deterministic and auditable by returning the retrieved records
  with similarity distances.
- Support Docker Compose local development with PostgreSQL and `pgvector`.
- Allow optional manual ingestion of transport knowledge as a fallback knowledge
  base.

## Non-Goals

- The service does not calculate route distance, travel time, traffic, or
  weather by itself.
- The service does not train or fine-tune a model.
- The service does not guarantee globally optimal routing; it performs contextual
  recommendation based on the available dataset and prompt.
- The service does not persist user requests or generated answers.

## Components

### FastAPI Application

File: `main.py`

Responsibilities:

- Start a FastAPI service titled `RAG Transportation Service`.
- Initialize the Gemini client.
- Ensure required PostgreSQL tables exist on startup.
- Expose health, ingestion, and suggestion endpoints.
- Generate query embeddings for incoming travel conditions.
- Retrieve similar records from PostgreSQL using `pgvector`.
- Build a prompt from retrieved records and call Gemini for the final answer.

### Dataset Seeder

File: `seed.py`

Responsibilities:

- Locate and load `dataset.csv`.
- Validate required CSV columns.
- Generate embeddings for `serialized_with_label`.
- Upsert scenario records into `transport_scenarios`.
- Avoid duplicate rows by hashing the embedded text and embedding model.
- Retry embedding generation when Gemini returns quota or rate limit errors.

### Dataset

File: `dataset.csv`

The dataset contains labeled examples with these required columns:

- `weather_condition`
- `temperature`
- `distance`
- `traffic_condition`
- `time_of_day`
- `chosen_mode`
- `reasoning`
- `serialized_query`
- `serialized_with_label`

`serialized_query` represents the user-like trip context. `serialized_with_label`
adds the chosen transport mode and is used as the embedding text during seeding.

### PostgreSQL + pgvector

Docker Compose uses the `pgvector/pgvector:pg16` image. The RAG service creates
the `vector` extension and stores 768-dimensional Gemini embeddings in vector
columns.

## Runtime Flow

### 1. Startup

1. The `rag` container runs `python seed.py`.
2. The seeder waits for PostgreSQL.
3. The seeder creates or migrates the `transport_scenarios` table.
4. Each dataset row is embedded with `gemini-embedding-001`.
5. New scenario rows are inserted; existing hashes are skipped.
6. Uvicorn starts the FastAPI application.
7. The FastAPI startup hook ensures both RAG tables exist.

### 2. Suggestion Request

1. A client calls `POST /rag/suggest` with weather, temperature, distance,
   traffic, optional time of day, optional hard filters, and `top_k`.
2. The service serializes the request into natural-language query text.
3. Gemini creates a 768-dimensional embedding for the query text.
4. PostgreSQL retrieves the nearest rows from `transport_scenarios` using cosine
   distance through the `<=>` pgvector operator.
5. If scenario rows are found, they become the retrieval context for the prompt.
6. If no scenario rows exist, the service falls back to `transport_knowledge`.
7. Gemini `gemini-2.5-flash` generates a concise answer.
8. The service returns the generated suggestion plus retrieved records.

## Data Model

### `transport_scenarios`

Primary table for the current RAG path.

| Column | Purpose |
| --- | --- |
| `id` | Internal primary key. |
| `scenario_hash` | Unique SHA-256 hash of embedding model and embedded text. |
| `weather_condition` | Weather label from the dataset. |
| `temperature` | Temperature text from the dataset. |
| `distance` | Distance text from the dataset. |
| `traffic_condition` | Traffic label from the dataset. |
| `time_of_day` | Time context from the dataset. |
| `chosen_mode` | Ground-truth transport label. |
| `reasoning` | Dataset explanation for the label. |
| `serialized_query` | Query text without answer label. |
| `serialized_with_label` | Query text plus transport label; used for embeddings. |
| `embedding` | `vector(768)` embedding for similarity search. |
| `embedding_model` | Embedding model identifier. |
| `created_at` | Insert timestamp. |
| `updated_at` | Last update timestamp. |

### `transport_knowledge`

Fallback table for manually ingested transport option descriptions. This path is
used only when no seeded scenario rows are available.

| Column | Purpose |
| --- | --- |
| `id` | Internal primary key. |
| `transport_type` | Unique mode or transport option name. |
| `description` | Human-readable mode description. |
| `good_for` | Situations where this mode works well. |
| `bad_for` | Situations where this mode is weak. |
| `constraints` | Operational or safety constraints. |
| `weather_sensitivity` | Optional sensitivity marker. |
| `traffic_sensitivity` | Optional sensitivity marker. |
| `embedding` | `vector(768)` embedding for similarity search. |
| `content_hash` | Reserved content hash field. |
| `embedding_model` | Embedding model identifier. |
| `created_at` | Insert timestamp. |
| `updated_at` | Last update timestamp. |

## API Contract

### `GET /health`

Returns service liveness.

Response:

```json
{
  "status": "ok"
}
```

### `POST /rag/suggest`

Main recommendation endpoint.

Request:

```json
{
  "weather_condition": "heavy rain",
  "temperature": "28 C hot",
  "distance": "5 km",
  "traffic_condition": "heavy traffic",
  "time_of_day": "18:00 evening rush",
  "exclude_weather_sensitive": false,
  "exclude_traffic_sensitive": false,
  "top_k": 5
}
```

Response:

```json
{
  "suggestion": "car - Heavy rain makes a car the safest and most comfortable option for this trip.",
  "retrieved": [
    {
      "weather_condition": "heavy rain",
      "temperature": "30 C hot",
      "distance": "20 km",
      "traffic_condition": "heavy traffic",
      "time_of_day": "18:00 evening rush",
      "chosen_mode": "car",
      "similarity_distance": 0.1234
    }
  ],
  "filters_applied": {
    "exclude_weather_sensitive": false,
    "exclude_traffic_sensitive": false
  }
}
```

Failure cases:

- `500` when the Gemini client is not initialized.
- `404` when no scenario or fallback knowledge records exist.
- `500` for database, embedding, or generation errors.

### `POST /rag/ingest`

Optional fallback knowledge ingestion endpoint.

Request:

```json
{
  "transport_type": "taxi",
  "description": "Comfortable, protected from weather, expensive, affected by traffic.",
  "good_for": "Rain, heat, late night trips",
  "bad_for": "Gridlock and low budget trips",
  "constraints": "Requires road access and fare availability",
  "weather_sensitivity": "low",
  "traffic_sensitivity": "high"
}
```

Response:

```json
{
  "status": "success",
  "message": "'taxi' ingested."
}
```

## Prompting Strategy

The primary prompt uses retrieved labeled scenarios, not generic transport
descriptions. Each retrieved example includes:

- Similar trip conditions.
- Recommended mode.
- Dataset reasoning.

The prompt instructs Gemini to act as a Southeast Asian city transport planning
expert, choose exactly one available mode, and return the mode first followed by
one concise sentence.

The fallback prompt uses manually ingested transport knowledge and instructs
Gemini to choose one transport method without comparing other options.

## Configuration

Required environment variables:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Google Gemini API key used by the SDK. |
| `DATABASE_URL` or `POSTGRES_URL` | PostgreSQL connection string. |

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATASET_PATH` | Auto-resolved | Dataset path for `seed.py`. |
| `EMBEDDING_DELAY_SECONDS` | `0.75` | Delay between seeding embedding calls. |
| `EMBEDDING_MAX_RETRIES` | `8` | Max retries for embedding quota errors. |
| `PORT` | `8000` | Uvicorn port in Docker. |

Model constants:

| Constant | Value |
| --- | --- |
| Generation model | `gemini-2.5-flash` |
| Embedding model | `gemini-embedding-001` |
| Embedding dimensions | `768` |

## Deployment

The RAG service is containerized by `rag/Dockerfile`.

Docker Compose service:

- Service name: `rag`
- Container name: `ta_rag`
- Port: `8000:8000`
- Depends on: healthy `postgres`
- Dataset path in container: `/app/dataset.csv`

Typical local commands:

```bash
docker compose up -d --build rag postgres
docker exec -it ta_rag python seed.py
```

## Operational Considerations

- Seeding calls the embedding API once per new dataset row, so large datasets may
  hit quota limits. `seed.py` includes retry and backoff behavior.
- Scenario rows are deduplicated by `scenario_hash`, which includes the embedding
  model name. Changing the embedding model intentionally creates new hashes.
- The current vector search query does not apply hard filters to
  `transport_scenarios`; filters are applied only in the fallback
  `transport_knowledge` path.
- The service creates schema directly at startup instead of using a migration
  tool.
- The response includes retrieved records to make recommendations easier to
  debug and evaluate.

## Known Limitations

- There is no authentication on the RAG endpoints.
- `top_k` is accepted directly from the request without an upper bound.
- Similarity search uses the full table scan unless pgvector indexes are added.
- The final answer is generated by an LLM and may vary across calls.
- The Go `AIClient` currently returns placeholder text and does not call
  `/rag/suggest`.

## Future Improvements

- Add an HNSW or IVFFlat pgvector index for larger datasets.
- Add request validation bounds for `top_k`.
- Add explicit evaluation tests using fixed inputs and expected transport modes.
- Integrate the Go API client with `POST /rag/suggest`.
- Move schema changes to versioned migrations.
- Add structured LLM output, for example `{ "mode": "...", "reason": "..." }`.
- Apply hard safety filters before scenario retrieval when the dataset grows.
