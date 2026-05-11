from fastapi import FastAPI, HTTPException
from schema import RouteRequest, RouteResponse, RecomResponse, RecommendRequest
from assemble import recommend
from difficulty_score import compute_route_difficulty
from route import getroute


app = FastAPI()

@app.post("/route", response_model=RouteResponse)
def route_endpoint(req: RouteRequest):

    coords = getroute(
        req.origin.lat,
        req.origin.lon,
        req.destination.lat,
        req.destination.lon
    )

    if not coords:
        raise HTTPException(status_code=404, detail="No route found between these points")

    return {
        "route": [{"lat": lat, "lon": lon} for lat, lon in coords],
        "difficulty_score": float(compute_route_difficulty(coords, 5)[1])
    }

@app.post("/recommend", response_model=RecomResponse)
def recommend_endpoint(req: RecommendRequest):
    try:
        result = recommend(req.origin, req.destination, req.vehicle, req.date)
        formatted_cars = [{"name": car} for car in result["cars"]]
        formatted_bikes = [{"name": bike} for bike in result["bikes"]]
        return {"cars": formatted_cars, "bikes": formatted_bikes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))