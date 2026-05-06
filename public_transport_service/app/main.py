from fastapi import FastAPI
from app.routers.public_transport_router import router as transit_router

app = FastAPI(
    title="Transit Suggestion Service",
    description=(
        "Suggests optimal public transit routes tailored to a list of tourist destinations. "
        "Input: Ordered list of locations (from TSP service) + top_k. "
        "Output: Top-k single routes or combinations ranked by an aggregated score."
    ),
    version="1.0.0",
)

app.include_router(transit_router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "transit_suggestion"}