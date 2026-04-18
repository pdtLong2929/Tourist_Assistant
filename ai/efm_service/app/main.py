from fastapi import FastAPI
from app.services.efm_logic import load_resources
from app.routers import efm_router

app = FastAPI(title="Tourist Assistant AI - EFM Service", version="1.1")

@app.on_event("startup")
async def startup_event():
    load_resources()

# Gắn router vào hệ thống chính
app.include_router(efm_router.router)

@app.get("/")
def health_check():
    return {"status": "online", "service": "EFM Recommender"}