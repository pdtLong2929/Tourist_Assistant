from fastapi import APIRouter, Path
from app.schemas.ride_hailing_schema import (
    RideEstimateRequest, 
    RideEstimateResponse,
    SingleLegEstimateRequest,
    SingleLegResponse
)
from app.services.ride_hailing_logic import RideService

router = APIRouter(prefix="/ride", tags=["Ride Hailing"])
ride_service = RideService()

@router.post("/estimate", response_model=RideEstimateResponse)
def estimate_multi_leg_fare(request: RideEstimateRequest):
    """
    Calculates estimated fares for a journey with multiple legs.
    Auto-applies the best promo combinations and filters by vehicle category if specified.
    """
    data = ride_service.estimate_per_leg(
        legs=request.legs,
        top_k=request.top_k
    )
    return {"status": "success", "data": data}

@router.post("/estimate/{leg_id}", response_model=SingleLegResponse)
def estimate_single_leg_fare(
    request: SingleLegEstimateRequest,
    leg_id: str = Path(..., description="Unique identifier for the leg (e.g., leg_01)")
):
    """
    Calculates the fare for a single leg and returns ALL available ride options.
    Pre-filters the result if 'vehicle_category' is provided.
    """
    data = ride_service.estimate_single_leg(
        distance_km=request.distance_km,
        location_type=request.location_type,
        vehicle_category=request.vehicle_category
    )
    return {"status": "success", "leg_id": leg_id, "data": data}