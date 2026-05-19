from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class CityCode(str, Enum):
    HN = "hn"
    HCMC = "hcmc"

class Location(BaseModel):
    lat: float = Field(..., description="Latitude of the location")
    lon: float = Field(..., description="Longitude of the location")

class TransitRequest(BaseModel):
    city: CityCode = Field(..., description="Target city code (e.g., hcmc or hn)")
    locations: List[Location] = Field(..., min_length=2, description="List of waypoints for the journey")
    top_k: int = Field(5, description="Maximum number of route suggestions to return")
    max_walk_meters: float = Field(1000.0, description="Maximum acceptable walking distance in meters")
    combine_routes: bool = Field(True, description="Enable 1-transfer route combinations")

class NearbyStop(BaseModel):
    stop_id: str
    stop_name: str
    lat: float
    lon: float
    distance_m: float
    type: str = Field(..., description="Transit type of the stop (e.g., 'bus' or 'metro')")

class RouteSegment(BaseModel):
    route_id: str
    route_short_name: str
    route_long_name: str
    transit_type: str = Field(..., description="Vehicle type: 'bus' or 'metro'")
    board_stop: NearbyStop        
    alight_stop: NearbyStop       
    stops_on_route: int           
    covered_location_indices: List[int]
    estimated_distance_km: float  
    estimated_duration_min: int   

class LegInfo(BaseModel):
    """A step-by-step leg between two requested locations"""
    from_index: int
    to_index: int
    segments: List[RouteSegment]
    walk_to_target_m: float
    instruction: str

class RouteCombo(BaseModel):
    """A full journey grouping all legs"""
    rank: int
    score: float
    legs: List[LegInfo]
    total_distance_km: float      
    total_duration_min: int       
    locations_total: int

class TransitResponse(BaseModel):
    locations_count: int
    top_k: int
    recommendations: List[RouteCombo]
    message: str
