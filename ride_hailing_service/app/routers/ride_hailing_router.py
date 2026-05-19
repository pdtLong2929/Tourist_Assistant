from fastapi import APIRouter, Path
from app.schemas.ride_hailing_schema import (
    RideEstimateRequest, 
    RideEstimateResponse,
    SingleLegEstimateRequest,
    SingleLegResponse,
    SmartCouponRequest,
    SmartCouponResponse,
    SmartCouponPreviewResponse
)
from app.services.ride_hailing_logic import RideService

router = APIRouter(prefix="/ride", tags=["Ride Hailing"])
ride_service = RideService()


@router.post("/estimate/drivers", response_model=RideEstimateResponse)
def estimate_multi_leg_drivers(request: RideEstimateRequest):
    """
    Calculates estimated fares for a journey with multiple legs and matches simulated drivers.
    Auto-applies the best promo combinations.
    """
    data = ride_service.estimate_per_leg(
        legs=request.legs,
        city=request.city,
        top_k=request.top_k,
        promo_code=request.promo_code
    )
    return {"status": "success", "data": data}


@router.post("/estimate", response_model=RideEstimateResponse)
def estimate_multi_leg_fare(request: RideEstimateRequest):
    """
    [Alias for backward compatibility]
    Calculates estimated fares and matches simulated drivers.
    """
    return estimate_multi_leg_drivers(request)


@router.post("/coupon/apply", response_model=SmartCouponResponse)
def apply_smart_coupons(request: SmartCouponRequest):
    """
    Evaluates optimal coupon combinations on multiple legs with custom input fares.
    Returns the dynamic promo outcomes and lists the direct cost saved.
    """
    res = ride_service.apply_smart_coupons(
        legs=request.legs,
        city=request.city,
        promo_code=request.promo_code
    )
    return res


@router.post("/estimate/{leg_id}", response_model=SingleLegResponse)
def estimate_single_leg_fare(
    request: SingleLegEstimateRequest,
    leg_id: str = Path(..., description="Unique identifier for the leg (e.g., leg_0_1)")
):
    """
    Calculates the fare for a single leg and returns ALL available ride options.
    Pre-filters the result if 'vehicle_category' is provided.
    """

    data = ride_service.estimate_single_leg(
        distance_km=request.distance_km,
        location_type=request.location_type,
        city=request.city,                 
        vehicle_category=request.vehicle_category,
        origin_lat=request.origin_lat,
        origin_lon=request.origin_lon
    )
    return {"status": "success", "leg_id": leg_id, "data": data}


@router.post("/coupon/preview", response_model=SmartCouponPreviewResponse)
def preview_all_coupon_savings(request: SmartCouponRequest):
    """
    Calculates dynamic savings preview for all active coupon codes in a single batch pass.
    """
    res = ride_service.preview_all_coupon_savings(
        legs=request.legs,
        city=request.city
    )
    return res