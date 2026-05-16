from fastapi import APIRouter, HTTPException
from app.schema.schema import RecommendRequest, RecomResponse
from app.services.assemble import recommend


router = APIRouter()

@router.post("/recommend", response_model=RecomResponse)
def recommend_endpoint(req: RecommendRequest):
    try:
        result = recommend(req.origin, req.destination, req.date, req.user)
        formatted_cars = [{"veh_id": car} for car in result["cars"]]
        formatted_bikes = [{"veh_id": bike} for bike in result["bikes"]]
        return {"cars": formatted_cars, "bikes": formatted_bikes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))