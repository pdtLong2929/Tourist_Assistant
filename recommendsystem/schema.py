from pydantic import BaseModel
from typing import List


class Coordinate(BaseModel):
    lat: float
    lon: float

class Vehicle(BaseModel):
    Brand: list[str]

class RouteRequest(BaseModel):
    origin: Coordinate
    destination: Coordinate
    date: int

class RecommendRequest(BaseModel):
    origin: Coordinate
    destination: Coordinate
    vehicle: Vehicle
    date: int

class Vehicle(BaseModel):
    name: str

class RecomResponse(BaseModel):
    cars: List[Vehicle]
    bikes: List[Vehicle]


class RouteResponse(BaseModel):
    route: List[Coordinate]
    difficulty_score: float