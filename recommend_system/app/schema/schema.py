from pydantic import BaseModel
from typing import List

class Coordinate(BaseModel):
    lat: float
    lon: float

class RouteRequest(BaseModel):
    origin: Coordinate
    destination: Coordinate
    date: int

class Vehicle(BaseModel):
    veh_id: str

class RecomResponse(BaseModel):
    cars: List[Vehicle]
    bikes: List[Vehicle]


class RouteResponse(BaseModel):
    route: List[Coordinate]
    difficulty_score: float

class user_item(BaseModel):
    user_id: str
    budget: float

class RecommendRequest(BaseModel):
    origin: Coordinate
    destination: Coordinate
    date: int
    user: user_item
