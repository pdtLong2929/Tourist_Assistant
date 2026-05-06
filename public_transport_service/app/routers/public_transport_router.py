from fastapi import APIRouter, HTTPException, Query, Path
from typing import List

from ..schemas.public_transport_schema import (
    TransitRequest, TransitResponse, RouteCombo, RouteSegment, NearbyStop, LegInfo, CityCode
)
from ..services.public_transport_logic import TransitService

router = APIRouter(prefix="/transit")

_services = {
    "hn": TransitService(folder_name="gtfs_hn"),
    "hcmc": TransitService(folder_name="gtfs-hcmc")
}

@router.post("/suggest", response_model=TransitResponse, tags=["Transit Suggestion"])
def suggest_routes(request: TransitRequest):
    if len(request.locations) < 2:
        raise HTTPException(status_code=400, detail="At least 2 locations required.")
    if request.city.value not in _services:
         raise HTTPException(status_code=400, detail="City not supported.")
    
    current_service = _services[request.city.value]
    locs = [loc.dict() for loc in request.locations]

    raw_results = current_service.recommend(
        locations=locs,
        top_k=request.top_k,
        max_walk_meters=request.max_walk_meters,
        combine_routes=request.combine_routes,
    )

    if not raw_results:
        return TransitResponse(
            locations_count=len(locs),
            top_k=request.top_k,
            recommendations=[],
            message="No suitable sequential routes found. Try increasing max_walk_meters."
        )

    recommendations = []
    for combo in raw_results:
        legs_data = []
        for leg in combo["legs"]:
            segments = [
                RouteSegment(
                    route_id=seg["route_id"],
                    route_short_name=seg["route_short_name"],
                    route_long_name=seg["route_long_name"],
                    board_stop=NearbyStop(**seg["board_stop"]),
                    alight_stop=NearbyStop(**seg["alight_stop"]),
                    stops_on_route=seg["stops_on_route"],
                    covered_location_indices=seg["covered_location_indices"], 
                    estimated_distance_km=seg["estimated_distance_km"],
                    estimated_duration_min=seg["estimated_duration_min"],
                ) for seg in leg["segments"]
            ]
            legs_data.append(LegInfo(
                from_index=leg["from_index"],
                to_index=leg["to_index"],
                segments=segments,
                walk_to_target_m=leg["walk_to_target_m"],
                instruction=leg["instruction"]
            ))
            
        recommendations.append(RouteCombo(
            rank=combo["rank"],
            legs=legs_data,
            total_distance_km=combo["total_distance_km"],
            total_duration_min=combo["total_duration_min"],
            locations_total=combo["locations_total"]
        ))

    return TransitResponse(
        locations_count=len(locs),
        top_k=request.top_k,
        recommendations=recommendations,
        message=f"Found {len(recommendations)} suitable route suggestions."
    )

@router.get("/{city}/routes", tags=["Routes & Stops"])
def get_all_routes(city: CityCode):
    """Retrieve a list of all bus routes in the city."""
    if city.value not in _services:
        raise HTTPException(status_code=400, detail="City not supported.")
    
    return _services[city.value].get_all_routes()

@router.get("/{city}/routes/{route_id}", tags=["Routes & Stops"])
def get_route_details(
    city: CityCode, 
    route_id: str = Path(..., description="The ID of the bus route")
):
    """Retrieve detailed information about a specific bus route."""
    if city.value not in _services:
        raise HTTPException(status_code=400, detail="City not supported.")
    
    route = _services[city.value].get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found.")
    return route

@router.get("/{city}/routes/{route_id}/stops", tags=["Routes & Stops"])
def get_stops_of_route(
    city: CityCode, 
    route_id: str = Path(..., description="The ID of the bus route")
):
    """Retrieve a list of stops that a specific bus route passes through."""
    if city.value not in _services:
        raise HTTPException(status_code=400, detail="City not supported.")
    
    stops = _services[city.value].get_stops_by_route(route_id)
    if not stops:
        raise HTTPException(status_code=404, detail="Route not found or has no stops.")
    return stops

@router.get("/{city}/stops", tags=["Routes & Stops"])
def get_all_stops(
    city: CityCode,
    skip: int = Query(0, description="Skip the first N results (used for pagination)"),
    limit: int = Query(100, description="Maximum number of stops to return in one call")
):
    """Retrieve a list of all bus stops (Paginated to avoid overloading)."""
    if city.value not in _services:
        raise HTTPException(status_code=400, detail="City not supported.")
    
    all_stops = _services[city.value].get_all_stops()
    
    # Slicing the array for pagination
    paginated_stops = all_stops[skip : skip + limit]
    
    return {
        "total_stops": len(all_stops),
        "showing": len(paginated_stops),
        "skip": skip,
        "limit": limit,
        "stops": paginated_stops
    }

@router.get("/{city}/stops/{stop_id}", tags=["Routes & Stops"])
def get_stop_details(
    city: CityCode, 
    stop_id: str = Path(..., description="The ID of the bus stop")
):
    """Retrieve detailed information about a specific bus stop."""
    if city.value not in _services:
        raise HTTPException(status_code=400, detail="City not supported.")
    
    stop = _services[city.value].get_stop_by_id(stop_id)
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found.")
    return stop