from pydantic import BaseModel, Field
from typing import List, Optional

# --- INPUT SCHEMAS ---

class LegRequest(BaseModel):
    # No indices needed! The order in the array determines the sequence.
    distance_km: float = Field(..., gt=0, description="Distance of this leg in kilometers")
    location_type: str = Field("normal", description="Context of the location (e.g., normal, university, airport)")
    vehicle_category: Optional[str] = Field(None, description="Filter by vehicle type (e.g., 'bike', 'car')")

class RideEstimateRequest(BaseModel):
    legs: List[LegRequest] = Field(..., description="Ordered list of journey legs to estimate")
    top_k: int = Field(3, description="Number of top ride options to return per leg")

    model_config = {
        "json_schema_extra": {
            "example": {
                "legs": [
                    {"distance_km": 15.0, "location_type": "airport", "vehicle_category": "car"},
                    {"distance_km": 5.0, "location_type": "university", "vehicle_category": "car"}
                ],
                "top_k": 2  
            }
        }
    }

# --- OUTPUT SCHEMAS ---

class RideOption(BaseModel):
    service: str
    category: str
    base_fare: int
    final_fare: int
    applied_promos: List[str] = Field(default_factory=list, description="List of auto-applied promos")
    status: str

class LegResponse(BaseModel):
    leg_id: str = Field(..., description="Auto-generated unique ID for this leg (e.g., leg_0_1)")
    from_index: int = Field(..., description="Auto-generated start index based on array position")
    to_index: int = Field(..., description="Auto-generated end index based on array position")
    distance_km: float
    options: List[RideOption]

class RideEstimateResponse(BaseModel):
    status: str
    data: List[LegResponse]

# --- SINGLE LEG SCHEMAS (Giữ nguyên như đã chốt) ---
class SingleLegEstimateRequest(BaseModel):
    distance_km: float = Field(..., gt=0)
    location_type: str = Field("normal")
    vehicle_category: Optional[str] = Field(None, description="Filter by vehicle type")

class SingleLegResponse(BaseModel):
    status: str
    data: List[RideOption]