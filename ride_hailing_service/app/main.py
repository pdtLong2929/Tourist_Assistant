from fastapi import FastAPI
from app.routers.ride_hailing_router import router as ride_router

app = FastAPI(
    title="Ride Hailing Service API",
    description="Microservice for estimating ride fares with multi-leg support and promo application logic",
    version="1.0.0"
)

app.include_router(ride_router)

@app.get("/", tags=["Health Check"])
def root():
    return {"message": "Ride Hailing Service is up and running!"}