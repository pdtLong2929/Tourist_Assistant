from pydantic import BaseModel, Field
from typing import List
from enum import Enum

class CityCode(str, Enum):
    HN = "hn"
    HCMC = "hcmc"

class Location(BaseModel):
    lat: float
    lon: float

class TransitRequest(BaseModel):
    city: CityCode
    locations: List[Location] = Field(..., min_items=2)
    top_k: int = 5
    max_walk_meters: float = 1000.0
    combine_routes: bool = True

class NearbyStop(BaseModel):
    stop_id: str
    stop_name: str
    lat: float
    lon: float
    distance_m: float

class RouteSegment(BaseModel):
    route_id: str
    route_short_name: str
    route_long_name: str
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
    legs: List[LegInfo]
    total_distance_km: float      
    total_duration_min: int       
    locations_total: int

class TransitResponse(BaseModel):
    locations_count: int
    top_k: int
    recommendations: List[RouteCombo]
    message: str