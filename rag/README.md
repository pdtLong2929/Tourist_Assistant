# RAG Transportation Suggestion Service

Welcome to the Retrieval-Augmented Generation (RAG) service for the Tourist Assistant. This service acts as an intelligent travel agent, analyzing a user's current context (weather, distance, traffic) and cross-referencing it with a database of transportation knowledge to suggest the most optimal travel method.

## 🔄 System Flow

The system operates in two main flows:

### 1. Data Ingestion (Knowledge Base Population)
1. **Input:** `seed.py` reads the root `dataset.csv` file containing labeled travel scenarios.
2. **Embedding Generation:** Each `serialized_with_label` row is sent to the embedding model to generate a 768-dimensional vector representation.
3. **Storage:** The scenario, label, reasoning, serialized text, and vector are stored in PostgreSQL using the `pgvector` extension.
*Note: `/rag/ingest` still supports manual transport knowledge records, but `/rag/suggest` prefers the seeded scenario dataset.*

### 2. Inference (User Request & RAG Pipeline)
1. **Context Collection:** The user requests a route. The frontend collects external context, such as weather conditions, distance, and traffic.
2. **Query Embedding:** This context (e.g., "Weather is Heavy Rain with 28°C. Route distance is 5km and traffic is Heavy.") is converted into a vector embedding.
3. **Vector Search:** The database (`pgvector`) performs a similarity search to find the most relevant labeled scenarios based on the current context.
4. **Prompt Construction & LLM Generation:** The retrieved examples are injected into a prompt for the Large Language Model. The LLM acts as the reasoning engine and returns a context-aware recommendation to the user.

## 🧠 Models Used

* **Embedding Model:** `gemini-embedding-001` 
  * Configured with `output_dimensionality=768` to keep database storage efficient while maintaining accuracy.
* **Large Language Model (LLM):** `gemini-2.5-flash`
  * Chosen for its blazing fast inference speed and excellent reasoning capabilities.

## ⚙️ Environment Variables

To run the application, you must define the following in your `rag/.env` file:

```env
# Your Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Postgres database connection string (matches docker-compose.yml defaults)
DATABASE_URL=postgresql://tourist:tourist_secret@postgres:5432/tourist_assistant

# Optional; Docker Compose sets this automatically
DATASET_PATH=/app/dataset.csv
```

## 🛠️ Local Setup Instructions

1. **Configure Environment:** 
   Navigate to the `rag` directory and ensure your `.env` file is populated with the correct `GEMINI_API_KEY`.

2. **Start the Infrastructure:**
   Navigate back to the root of the project and start the `rag` and `postgres` services using Docker Compose:
   ```bash
   docker compose up -d --build rag postgres
   ```

3. **Seed the Database:**
   Once the containers are running, populate the scenario vector table from `dataset.csv`. Docker Compose mounts the root CSV at `/app/dataset.csv`, so run:
   ```bash
   docker exec -it ta_rag python seed.py
   ```
   *You should see output indicating that embeddings are being generated and upserted successfully.*

## 🧪 Testing with Postman

The RAG service exposes a REST API via FastAPI running on port `8000` locally. You can test it using Postman or cURL.

### 1. Get a Transportation Suggestion
* **Endpoint:** `POST http://localhost:8000/rag/suggest`
* **Content-Type:** `application/json`
* **Body:**
  ```json
  {
      "weather_condition": "heavy rain",
      "temperature": "28°C hot",
      "distance": "5 km",
      "traffic_condition": "heavy traffic",
      "time_of_day": "18:00 evening rush"
  }
  ```
* **Expected Response:** A JSON object containing the LLM's recommended transport method and reasoning.

### 2. Ingest New Knowledge (Optional)
* **Endpoint:** `POST http://localhost:8000/rag/ingest`
* **Content-Type:** `application/json`
* **Body:**
  ```json
  {
      "transport_type": "taxi",
      "description": "very comfortable, protected from weather, expensive, affected by heavy traffic."
  }
  ```
* **Expected Response:** `{"status": "success", "message": "Knowledge ingested."}`
