import os
import threading

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from app.services.tsp_logic import load_resources, state
from app.routers import tsp_router

load_dotenv()

app = FastAPI(
    title="TSP Optimization API",
    description="Deep Learning service for real-world delivery route optimization (GPS-enabled).",
    version="1.0.0"
)
worker_thread = None

@app.on_event("startup")
async def startup_event():
    global worker_thread

    # Load the .pt model weights into memory when the server starts.
    load_resources()

    if os.getenv("ENABLE_PUBSUB_WORKER", "false").lower() == "true":
        from app.handler import run_worker

        worker_thread = threading.Thread(target=run_worker, daemon=True)
        worker_thread.start()

# Mount the TSP prediction router
app.include_router(tsp_router.router)

@app.get("/")
async def root():
    return {
        "system_name": "AI Routing Optimization Service",
        "description": "An API that takes GPS coordinates and uses AI to find the shortest delivery path (open-tour).",
        "status": "Running",
        "pubsub_worker_enabled": worker_thread is not None and worker_thread.is_alive(),
    }

@app.get("/health")
async def health_check():
    if state["MODEL_READY"]:
        return {"status": "ok", "model_state": "loaded and ready"}
    else:
        raise HTTPException(status_code=503, detail="Service Unavailable: Model weights not yet loaded.")
