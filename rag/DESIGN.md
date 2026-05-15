# RAG Service Design

## Scope

This document describes the Retrieval-Augmented Generation service in `rag/`.
The service turns travel context into ranked transportation recommendations by
combining:

- labeled scenario examples from `dataset.csv`
- Gemini embeddings
- PostgreSQL vector search through `pgvector`
- Gemini JSON generation
- optional Redis response caching

Out of scope:

- Frontend UI behavior.
- Route, weather, and traffic provider integration.
- User accounts, bookings, payments, or trip persistence.
- Non-RAG backend services and API gateway routing.

## Goals

- Return structured transport ratings for the current trip context.
- Ground generation in similar labeled scenarios when the dataset has been
  seeded.
- Keep retrieval inspectable by returning the selected records and vector
  distances.
- Support local and container deployment with PostgreSQL and `pgvector`.
- Avoid repeated model calls for identical requests when Redis is available.
- Keep a manual knowledge ingestion path as a fallback when scenario data is not
  loaded.

## Non-Goals

- The service does not calculate route distance, ETA, traffic, or weather.
- The service does not train or fine-tune a model.
- The service does not persist user queries or final recommendations in
  PostgreSQL.
- The service does not guarantee an optimal route choice; it recommends based on
  retrieved examples, prompt instructions, and model output.

## Architecture

```text
Client
  |
  | POST /rag/suggest
  v
FastAPI app (main.py)
  |
  | normalize request into query text
  | check Redis cache, when configured
  | embed query with Gemini
  v
PostgreSQL + pgvector
  |
  | balanced nearest-neighbor retrieval by chosen_mode
  v
Prompt builder
  |
  | retrieved scenarios or fallback knowledge
  v
Gemini generation
  |
  | JSON array rating transport modes
  v
Client response + retrieved debug records
```

## Components

### FastAPI Application

File: `main.py`

Responsibilities:

- Starts the FastAPI service titled `RAG Transportation Service`.
- Initializes the Gemini client when credentials are available.
- Initializes an optional Redis client from `REDIS_ADDR`.
- Creates required PostgreSQL tables on startup.
- Exposes health, ingestion, and suggestion endpoints.
- Serializes incoming travel context into embedding query text.
- Retrieves balanced scenario examples from `transport_scenarios`.
- Falls back to `transport_knowledge` only when scenario retrieval returns no
  rows.
- Builds compact prompts and requests JSON output from Gemini.
- Returns the generated suggestion, retrieval records, and applied filter flags.

### Dataset Seeder

File: `seed.py`

Responsibilities:

- Resolves the dataset path from `DATASET_PATH`, local `dataset.csv`, or nearby
  fallback paths.
- Validates the required CSV columns.
- Waits for PostgreSQL before loading data.
- Creates and migrates the `transport_scenarios` table.
- Deduplicates rows by `scenario_hash`.
- Generates 768-dimensional Gemini embeddings for `serialized_with_label`.
- Inserts or updates scenario rows in batches.
- Retries transient embedding failures such as quota, network, and service
  availability errors.

### Dataset

File: `dataset.csv`

The service expects these columns:

| Column | Purpose |
| --- | --- |
| `weather_condition` | Weather label used by retrieval and debug output. |
| `temperature` | Temperature description, for example `30 C hot`. |
| `distance` | Route distance description, for example `5 km`. |
| `traffic_condition` | Traffic label used by retrieval. |
| `time_of_day` | Trip start context. |
| `chosen_mode` | Labeled transport mode for the scenario. |
| `reasoning` | One-sentence rationale for the label. |
| `serialized_query` | Natural-language trip context without the label. |
| `serialized_with_label` | Natural-language trip context plus labeled mode. |

The seeder embeds `serialized_with_label`, which lets retrieval consider both
trip conditions and the target label. Runtime query embedding uses only the
request context.

### Test Dataset Generator

File: `testing/test_bed.py`

This script generates synthetic labeled scenarios by calling an OpenAI-compatible
chat completions endpoint. It is a dataset creation utility, not part of the
runtime service. Its default output path is `testing/dataset.csv`.

## Runtime Flow

### Startup

1. The container runs `python seed.py`.
2. `seed.py` waits for PostgreSQL.
3. `seed.py` creates or migrates `transport_scenarios`.
4. New dataset rows are embedded and written to PostgreSQL.
5. Uvicorn starts `main:app`.
6. FastAPI startup creates `transport_scenarios` and `transport_knowledge` if
   needed.
7. Redis caching is enabled only if Redis is reachable.

### Suggestion Request

1. A client calls `POST /rag/suggest`.
2. If `query` is supplied, the service uses it directly. Otherwise, it builds a
   query from weather, temperature, distance, traffic, and time of day fields.
3. If Redis is configured, the service hashes the query text, retrieval mode,
   `top_k`, and filter flags. A cache hit returns immediately without embedding
   or generation calls.
4. The service embeds the query text with `gemini-embedding-2`.
5. PostgreSQL retrieves scenario rows with cosine distance using `<=>`.
6. Scenario retrieval is balanced by `chosen_mode`: up to `top_k` examples per
   mode are returned.
7. If there are no scenarios, the service retrieves from manually ingested
   `transport_knowledge` rows instead.
8. The prompt asks Gemini to rate the available transport modes and return only a
   JSON array.
9. The service stores the completed response in Redis for 24 hours when caching
   is enabled.
10. The response is returned with the generated JSON text and retrieved records.

## Data Model

### `transport_scenarios`

Primary table for scenario-based RAG.

| Column | Purpose |
| --- | --- |
| `id` | Internal primary key. |
| `scenario_hash` | Unique SHA-256 hash of `serialized_with_label`. |
| `weather_condition` | Dataset weather label. |
| `temperature` | Dataset temperature text. |
| `distance` | Dataset distance text. |
| `traffic_condition` | Dataset traffic label. |
| `time_of_day` | Dataset time context. |
| `chosen_mode` | Labeled scenario mode. |
| `reasoning` | Dataset rationale. |
| `serialized_query` | Query text without the answer label. |
| `serialized_with_label` | Text embedded by the seeder. |
| `embedding` | `vector(768)` embedding. |
| `embedding_model` | Embedding model identifier. |
| `created_at` | Insert timestamp. |
| `updated_at` | Last update timestamp. |

### `transport_knowledge`

Fallback table for manually ingested transport descriptions. This table is used
only when `transport_scenarios` retrieval returns no rows.

| Column | Purpose |
| --- | --- |
| `id` | Internal primary key. |
| `transport_type` | Unique transport option name. |
| `description` | Human-readable description. |
| `good_for` | Situations where this option works well. |
| `bad_for` | Situations where this option performs poorly. |
| `constraints` | Operational or safety constraints. |
| `weather_sensitivity` | Optional sensitivity marker. |
| `traffic_sensitivity` | Optional sensitivity marker. |
| `embedding` | `vector(768)` embedding. |
| `content_hash` | Reserved content hash field. |
| `embedding_model` | Embedding model identifier. |
| `created_at` | Insert timestamp. |
| `updated_at` | Last update timestamp. |

## Retrieval Strategy

Scenario retrieval uses a window function to avoid returning only the globally
nearest rows from one mode:

```sql
ROW_NUMBER() OVER (
    PARTITION BY chosen_mode
    ORDER BY embedding <=> query_embedding ASC
) AS mode_rank
```

Rows with `mode_rank <= top_k` are returned and ordered by rank, distance, and
mode. This gives the model examples across labels instead of overfitting the
prompt context to whichever label dominates the nearest neighbors.

The request filters `exclude_weather_sensitive` and `exclude_traffic_sensitive`
are applied only in the fallback `transport_knowledge` path. They do not filter
`transport_scenarios`.

## Prompting Strategy

The primary scenario prompt is compact:

```text
[SCENARIOS]
Q:<serialized_query>|M:<chosen_mode>|R:<reasoning>

[QUERY]
<runtime query text>
```

The system instruction tells Gemini to behave as a Southeast Asia transport
planner, rate all six modes, and return only a JSON array:

```json
[
  {
    "type": "metro",
    "rating": "90",
    "explanation": "Traffic-immune and practical for this distance."
  }
]
```

The current system instruction names these modes:

- `bike`
- `motorbike`
- `car`
- `walk`
- `bus`
- `metro`

This is broader than the dataset label space, which currently uses:

- `bike`
- `motorbike`
- `car`
- `transit`

The dataset label space and output mode taxonomy should be reconciled if strict
mode consistency becomes required.

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
  "top_k": 2
}
```

Alternative unstructured request:

```json
{
  "query": "Weather is clear sky. Route distance is 8 km and traffic is gridlock."
}
```

Response:

```json
{
  "suggestion": "[{\"type\":\"metro\",\"rating\":\"90\",\"explanation\":\"Traffic-immune and practical for this distance.\"}]",
  "retrieved": [
    {
      "weather_condition": "clear sky",
      "temperature": "24 C warm",
      "distance": "10 km",
      "traffic_condition": "gridlock",
      "time_of_day": "18:00 evening rush",
      "chosen_mode": "transit",
      "similarity_distance": 0.1234,
      "balanced_rank": 1
    }
  ],
  "filters_applied": {
    "exclude_weather_sensitive": false,
    "exclude_traffic_sensitive": false
  }
}
```

Failure cases:

- `500` when the Gemini client is not initialized and mock mode is disabled.
- `404` when no scenario or fallback knowledge records exist.
- `500` for database, embedding, generation, or unexpected runtime errors.

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
| `REDIS_ADDR` | `localhost:6379` | Redis address or Redis URL for response caching. |
| `REDIS_PASSWORD` | unset | Optional Redis password. |
| `MOCK_EMBEDDING` | `false` | Uses deterministic mock embeddings and mock generation. |
| `EMBEDDING_DELAY_SECONDS` | `0.75` | Delay after each seeding batch. |
| `EMBEDDING_MAX_RETRIES` | `8` | Max retries for transient embedding failures. |
| `PORT` | `8000` | Uvicorn port used by the Docker command. |

Model constants:

| Constant | Value |
| --- | --- |
| Generation model | `gemini-3.1-flash-lite` |
| Embedding model | `gemini-embedding-2` |
| Embedding dimensions | `768` |

## Deployment

The service is containerized by `rag/Dockerfile`.

Container behavior:

1. Install `requirements.txt`.
2. Copy the `rag/` source into `/app`.
3. Run `python seed.py`.
4. Start Uvicorn on `${PORT:-8000}`.

Typical local commands:

```bash
docker compose up -d --build rag postgres
docker exec -it ta_rag python seed.py
```

## Operational Considerations

- Seeding embeds every new dataset row, so large dataset changes can hit Gemini
  quota limits. Retries and backoff are implemented, but failed batches are
  skipped to avoid container crash loops.
- `generate_embeddings_batch` uses `ThreadPoolExecutor(max_workers=8)`, so the
  seeder favors speed over strict sequential rate limiting.
- `scenario_hash` is based only on `serialized_with_label`; changing the
  embedding model does not automatically create a new hash for the same text.
- Redis is optional. If it is unavailable, requests still work but every cache
  miss requires embedding and generation calls.
- Cache entries live for 24 hours.
- The service creates schema directly at startup instead of using versioned
  migrations.
- `top_k` means examples per mode for scenario retrieval, not total examples.
- The `suggestion` field is a JSON string returned by Gemini, not parsed into a
  native JSON array by the service.

## Known Limitations

- There is no authentication on the RAG endpoints.
- `top_k` is accepted directly from the request without validation bounds.
- Similarity search performs a table scan unless pgvector indexes are added.
- The scenario path ignores `exclude_weather_sensitive` and
  `exclude_traffic_sensitive`.
- The output mode taxonomy differs from the current dataset labels.
- `@app.on_event("startup")` is deprecated in newer FastAPI versions; lifespan
  handlers are preferred for future maintenance.
- Generated output can still vary across model versions despite low
  temperature.

## Future Improvements

- Add request validation bounds for `top_k`.
- Parse and validate Gemini JSON before returning it to clients.
- Add an HNSW or IVFFlat index when the scenario table grows.
- Reconcile `transit` with `bus` and `metro`, or update the dataset to match the
  six-mode output taxonomy.
- Move schema changes into versioned migrations.
- Apply hard safety filters before scenario retrieval when those filters become
  part of the product contract.
- Add regression tests with fixed mock embeddings and expected JSON output.
