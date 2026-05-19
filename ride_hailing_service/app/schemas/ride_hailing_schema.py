from pydantic import BaseModel, Field
from typing import List, Optional

# --- INPUT SCHEMAS ---

class LegRequest(BaseModel):
    distance_km: float = Field(..., gt=0, description="Distance of this leg in kilometers")
    location_type: str = Field("normal", description="Context of the location (e.g., normal, university, airport)")
    vehicle_category: Optional[str] = Field(None, description="Filter by vehicle type (e.g., 'bike', 'car')")
    origin_lat: Optional[float] = Field(None, description="Latitude of the origin pickup point")
    origin_lon: Optional[float] = Field(None, description="Longitude of the origin pickup point")
    destination_lat: Optional[float] = Field(None, description="Latitude of the destination point")
    destination_lon: Optional[float] = Field(None, description="Longitude of the destination point")

class RideEstimateRequest(BaseModel):
    legs: List[LegRequest] = Field(..., description="Ordered list of journey legs to estimate")
    city: str = Field(..., description="City context (e.g., 'HCMC' or 'Hanoi')")
    top_k: int = Field(3, description="Number of top ride options to return per leg")
    promo_code: Optional[str] = Field(None, description="Manual promo code to apply override")

    model_config = {
        "json_schema_extra": {
            "example": {
                "city": "HCMC",
                "legs": [
                    {
                        "distance_km": 15.0, 
                        "location_type": "airport", 
                        "vehicle_category": "car",
                        "origin_lat": 10.8152,
                        "origin_lon": 106.6656,
                        "destination_lat": 10.7626,
                        "destination_lon": 106.6812
                    }
                ],
                "top_k": 2  
            }
        }
    }

# --- OUTPUT SCHEMAS ---

class MatchedDriver(BaseModel):
    driver_id: str = Field(..., description="Unique identifier for the driver")
    name: str = Field(..., description="Driver's full name")
    rating: float = Field(..., description="Driver's overall customer rating")
    phone: str = Field(..., description="Driver's contact phone number")
    plate_number: str = Field(..., description="Driver's vehicle license plate number")
    distance_to_pickup_km: float = Field(..., description="Distance from the driver's current position to the client's pickup location in kilometers")
    eta_minutes: float = Field(..., description="Estimated arrival time of the driver to the client's pickup location in minutes")

class RideOption(BaseModel):
    service: str
    category: str
    base_fare: int
    final_fare: int
    applied_promos: List[str] = Field(default_factory=list, description="List of auto-applied promos")
    status: str
    matched_driver: Optional[MatchedDriver] = Field(None, description="Simulated closest driver matched with the client")

class LegResponse(BaseModel):
    leg_id: str = Field(..., description="Auto-generated unique ID for this leg (e.g., leg_0_1)")
    from_index: int = Field(..., description="Auto-generated start index based on array position")
    to_index: int = Field(..., description="Auto-generated end index based on array position")
    distance_km: float
    options: List[RideOption]

class RideEstimateResponse(BaseModel):
    status: str
    data: List[LegResponse]

# --- SINGLE LEG SCHEMAS ---
class SingleLegEstimateRequest(BaseModel):
    distance_km: float = Field(..., gt=0)
    city: str = Field(..., description="City context (e.g., 'HCMC' or 'Hanoi')")
    location_type: str = Field("normal")
    vehicle_category: Optional[str] = Field(None, description="Filter by vehicle type")
    origin_lat: Optional[float] = Field(None)
    origin_lon: Optional[float] = Field(None)

class SingleLegResponse(BaseModel):
    status: str
    data: List[RideOption]

# --- SMART COUPON SCHEMAS ---

class CouponLegRequest(BaseModel):
    base_fare: int = Field(..., gt=0, description="Base fare of this leg in VND")
    location_type: str = Field("normal", description="Context of the location (e.g., normal, university, airport)")
    service_id: str = Field(..., description="Specific service ID to apply coupon (e.g., 'grab_car_hcmc')")

class SmartCouponRequest(BaseModel):
    city: str = Field(..., description="City context (e.g., 'HCMC' or 'Hanoi')")
    legs: List[CouponLegRequest] = Field(..., description="Ordered list of legs to apply coupon on")
    promo_code: Optional[str] = Field(None, description="Manual promo code override")

    model_config = {
        "json_schema_extra": {
            "example": {
                "city": "HCMC",
                "legs": [
                    {
                        "base_fare": 120000,
                        "location_type": "airport",
                        "service_id": "grab_car_hcmc"
                    },
                    {
                        "base_fare": 60000,
                        "location_type": "normal",
                        "service_id": "grab_bike_hcmc"
                    }
                ],
                "promo_code": None
            }
        }
    }

class CouponLegResponse(BaseModel):
    leg_index: int = Field(..., description="Zero-indexed position of the leg")
    service_id: str
    base_fare: int
    final_fare: int
    applied_promos: List[str] = Field(default_factory=list)
    cost_saved: int = Field(..., description="Amount of money saved by applying coupon")
    status: str

class SmartCouponResponse(BaseModel):
    status: str
    total_saved: int = Field(..., description="Sum of cost saved across all legs")
    data: List[CouponLegResponse]

class SmartCouponPreviewResponse(BaseModel):
    status: str
    savings: dict = Field(..., description="Map of promo_code to saved value in VND")