from fastapi import FastAPI, HTTPException
from app.services.tsp_logic import load_resources, state
from app.routers import tsp_router

app = FastAPI(
    title="TSP Optimization API",
    description="Deep Learning service for real-world delivery route optimization (GPS-enabled).",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    # Load the .pt model weights into memory when the server starts.
    load_resources()

# Mount the TSP prediction router
app.include_router(tsp_router.router)

@app.get("/")
async def root():
    return {
        "system_name": "AI Routing Optimization Service",
        "description": "An API that takes GPS coordinates and uses AI to find the shortest delivery path (open-tour).",
        "status": "Running"
    }

@app.get("/health")
async def health_check():
    if state["MODEL_READY"]:
        return {"status": "ok", "model_state": "loaded and ready"}
    else:
        raise HTTPException(status_code=503, detail="Service Unavailable: Model weights not yet loaded.")