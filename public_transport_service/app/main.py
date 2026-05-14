from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

from fastapi import FastAPI
from app.routers.public_transport_router import router as transit_router  
from app.db import init_pool, close_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    try:
        yield
    finally:
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
