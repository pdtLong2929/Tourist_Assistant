# RAG Transportation Suggestion Service

Welcome to the Retrieval-Augmented Generation (RAG) service for the Tourist Assistant. This service acts as an intelligent travel agent, analyzing a user's current context (weather, distance, traffic) and cross-referencing it with a database of transportation knowledge to suggest the most optimal travel method.

## 🔄 System Flow

The system operates in two main flows:

### 1. Data Ingestion (Knowledge Base Population)
1. **Input:** The system receives a descriptive text for a transportation type (e.g., "bike", "metro").
2. **Embedding Generation:** The text description is sent to the embedding model to generate a 768-dimensional vector representation.
3. **Storage:** The vector and original text are securely stored in a PostgreSQL database utilizing the `pgvector` extension.
*Note: We have provided a `seed.py` script to automatically populate this base knowledge.*

### 2. Inference (User Request & RAG Pipeline)
1. **Context Collection:** The user requests a route. The frontend collects external context, such as weather conditions, distance, and traffic.
2. **Query Embedding:** This context (e.g., "Weather is Heavy Rain with 28°C. Route distance is 5km and traffic is Heavy.") is converted into a vector embedding.
3. **Vector Search:** The database (`pgvector`) performs a similarity search to find the top 3 most relevant transportation methods based on the current context.
4. **Prompt Construction & LLM Generation:** The context and retrieved facts are injected into a prompt for the Large Language Model. The LLM acts as the reasoning engine and returns a context-aware recommendation to the user.

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
   Once the containers are running, you need to populate the database with the initial transportation knowledge. Run the `seed.py` script inside the `rag` container:
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
      "weather_condition": "Heavy Rain",
      "temperature": "28°C",
      "distance": "5km",
      "traffic_condition": "Heavy"
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
