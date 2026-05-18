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
