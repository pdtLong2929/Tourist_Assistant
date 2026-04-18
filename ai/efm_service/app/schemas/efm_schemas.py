from pydantic import BaseModel
from typing import List

class PredictionRequest(BaseModel):
    user_id: str
    item_ids: List[str]

class RecommendRequest(BaseModel):
    user_id: str
    top_k: int = 5