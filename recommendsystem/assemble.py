from list_vehicle import find_vehicle, find_best_vehicle
from difficulty_score import compute_route_difficulty
from vehicle_score import ranking_car, ranking_bike
from route import getroute
from schema import Coordinate


def recommend(origin: Coordinate, destination: Coordinate, vehicles, date):

    route = getroute(origin.lat, origin.lon, destination.lat, destination.lon)

    difficulty = compute_route_difficulty(route, date)

    car_list, bike_list = find_vehicle(vehicles)

    car_rank = find_best_vehicle(ranking_car(car_list), difficulty)
    bike_rank = find_best_vehicle(ranking_bike(bike_list), difficulty)

    bike_rank = bike_rank[:10]
    car_rank = car_rank[:10]
    return {
        "cars": car_rank["Cars Names"],
        "bikes": bike_rank["make_model"]
    }




