from pydantic import BaseModel, Field
from typing import List

class Location(BaseModel):
    id: int
    x: float = Field(..., description="Tọa độ X hoặc Kinh độ thực tế")
    y: float = Field(..., description="Tọa độ Y hoặc Vĩ độ thực tế")

class PredictRequest(BaseModel):
    start_location: Location = Field(..., description="Vị trí bắt đầu của User")
    destinations: List[Location] = Field(..., min_items=1, description="Các điểm cần đi")