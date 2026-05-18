from dataclasses import Field
from enum import Enum
from pydantic import BaseModel
from typing import List

class CityName(str, Enum):
    HCMC = "HCMC"
    HANOI = "Hanoi"
    DANANG = "Danang"

class CityRegion(Enum):
    HCMC = {
        "tag": "hcmc",
        "min_lat": 10.35, "max_lat": 11.00,
        "min_lon": 106.35, "max_lon": 107.02
    }
    HANOI = {
        "tag": "hanoi",
        "min_lat": 20.55, "max_lat": 21.40,
        "min_lon": 105.28, "max_lon": 106.03
    }
    DANANG = {
        "tag": "danang",
        "min_lat": 15.90, "max_lat": 16.20,
        "min_lon": 107.80, "max_lon": 108.50
    }

class PredictionRequest(BaseModel):
    user_id: str
    item_ids: List[str]

class RecommendRequest(BaseModel):
    user_id: str
    city: CityName
    top_k: int = 5
