from dotenv import load_dotenv
load_dotenv()  # Must run before any module that reads env vars

from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db import init_pool, close_pool
from app.routers.public_transport_router import router as transit_router, init_services


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: .env is already loaded, so DATABASE_URL is available
    init_pool()
    init_services()
    
    # Start pubsub pull subscriber for async processing
    from app import handler
    if handler.should_start_pull_subscriber():
        handler.start_pull_subscriber()
        
    yield
    # Shutdown
    close_pool()


app = FastAPI(
    title="Transit Suggestion Service",
    description=(
        "Suggests optimal public transit routes tailored to a list of tourist destinations. "
        "Input: Ordered list of locations (from TSP service) + top_k. "
        "Output: Top-k single routes or combinations ranked by an aggregated score."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(transit_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "transit_suggestion"}


import base64
import json
from fastapi import Request, HTTPException

@app.post("/pubsub/push")
async def pubsub_push_endpoint(request: Request):
    """
    HTTP Push endpoint for Google Cloud Pub/Sub.
    Decodes the Pub/Sub base64 envelope and processes
    the payload via handle_pull_message.
    """
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON request body: {str(e)}")

    payload = body
    if isinstance(body, dict) and "message" in body and isinstance(body["message"], dict) and "data" in body["message"]:
        try:
            base64_data = body["message"]["data"]
            decoded_bytes = base64.b64decode(base64_data)
            decoded_str = decoded_bytes.decode("utf-8")
            payload = json.loads(decoded_str)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to decode base64 Pub/Sub data: {str(e)}")

    try:
        from app.handler import handle_pull_message
        handle_pull_message(payload)
        return {"status": "success", "message": "Transit job processed and published successfully."}
    except Exception as e:
        return {"status": "error", "message": f"Job processing encountered an error: {str(e)}"}
