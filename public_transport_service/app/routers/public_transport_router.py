from fastapi import APIRouter, HTTPException, Query, Path
from typing import List, Dict

from ..schemas.public_transport_schema import (
    TransitRequest, TransitResponse, RouteCombo, RouteSegment, NearbyStop, LegInfo, CityCode
)
from ..services.public_transport_logic import TransitService

router = APIRouter(prefix="/transit")

print("Pre-loading GTFS data into memory...")
_services: Dict[str, TransitService] = {
    "hcmc": TransitService("hcmc"),
    "hn": TransitService("hn")
}

@router.post("/suggest", response_model=TransitResponse, tags=["Transit Suggestion"])
def suggest_routes(request: TransitRequest):
    if len(request.locations) < 2:
        raise HTTPException(status_code=400, detail="At least 2 locations are required.")
    
    city_code = request.city.value
    if city_code not in _services:
         raise HTTPException(status_code=400, detail="Requested city is not supported or missing data.")
    
    current_service = _services[city_code]
    locs = [loc.model_dump() for loc in request.locations]

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
                    transit_type=seg["transit_type"],
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
    """Retrieve a list of all transit routes (Bus and Metro) in the city."""
    if city.value not in _services:
        raise HTTPException(status_code=400, detail="City not supported.")
    return _services[city.value].get_all_routes()

@router.get("/{city}/routes/{route_id}", tags=["Routes & Stops"])
def get_route_details(
    city: CityCode, 
    route_id: str = Path(..., description="The ID of the transit route")
):
    """Retrieve detailed information about a specific transit route."""
    if city.value not in _services:
        raise HTTPException(status_code=400, detail="City not supported.")
    
    route = _services[city.value].get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found.")
    return route

@router.get("/{city}/routes/{route_id}/stops", tags=["Routes & Stops"])
def get_stops_of_route(
    city: CityCode, 
    route_id: str = Path(..., description="The ID of the transit route")
):
    """Retrieve an ordered list of stops that a specific route passes through."""
    if city.value not in _services:
        raise HTTPException(status_code=400, detail="City not supported.")
    
    stops = _services[city.value].get_stops_by_route(route_id)
    if not stops:
        raise HTTPException(status_code=404, detail="Route not found or has no stops associated.")
    return stops

@router.get("/{city}/stops", tags=["Routes & Stops"])
def get_all_stops(
    city: CityCode,
    skip: int = Query(0, description="Skip the first N results (used for pagination)"),
    limit: int = Query(100, description="Maximum number of stops to return in one call")
):
    """Retrieve a paginated list of all transit stops/stations."""
    if city.value not in _services:
        raise HTTPException(status_code=400, detail="City not supported.")
    
    all_stops = _services[city.value].get_all_stops()
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
    stop_id: str = Path(..., description="The ID of the transit stop/station")
):
    """Retrieve detailed information about a specific stop or station."""
    if city.value not in _services:
        raise HTTPException(status_code=400, detail="City not supported.")
    
    stop = _services[city.value].get_stop_by_id(stop_id)
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found.")
    return stop