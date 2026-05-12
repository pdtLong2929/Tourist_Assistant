from app.services.utils.difficulty_score import compute_route_difficulty
from app.services.utils.vehicle_score import ranking_car, ranking_bike
from app.services.route import  getroute
from app.schema.schema import Coordinate, user_item
from app.services.user_orientation.user_orie import recommend_vehicles_user
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[2]



def recommend(origin: Coordinate, destination: Coordinate, date, item:user_item):

    route, distance = getroute(origin.lat, origin.lon, destination.lat, destination.lon)

    difficulty,weather_score = compute_route_difficulty(route, date)

    car_list = pd.read_csv(BASE_DIR/"./data/vehicle/car.csv")
    bike_list = pd.read_csv(BASE_DIR/"./data/vehicle/motorbike.csv")
    print(car_list)
    car_rank = ranking_car(car_list, difficulty)
    bike_rank = ranking_bike(bike_list, difficulty)
    print(car_rank)
    bike_id = pd.read_csv(BASE_DIR/"./data/vehicle/motorbike_id.csv")
    car_id = pd.read_csv(BASE_DIR/"./data/vehicle/car_id.csv")
    car_rent = pd.read_csv(BASE_DIR/"./data/vehicle/car_rent.csv")
    bike_rent = pd.read_csv(BASE_DIR/"./data/vehicle/motorbike_rent.csv")

    bike_rank = bike_rank[0:20]
    car_rank = car_rank[0:20]

    bike_rank['model'] = (
        bike_rank['make_model']
        .str.split(' ', n=1)
        .str[1]
        .str.lower()
        .str.strip()
    )

    bike_id['model'] = (
        bike_id['model']
        .str.lower()
        .str.strip()
    )

    car_rank['model'] = (
        car_rank['Cars Names']
        .str.lower()
        .str.strip()
    )

    car_id['model'] = (
        car_id['model']
        .str.lower()
        .str.strip()
    )



    bike_id = bike_id.rename(
        columns={
            'vehicle_id': 'veh_id'
        }
    )

    car_id = car_id.rename(
        columns={
            'vehicle_id': 'veh_id'
        }
    )



    merged_bike = pd.merge(
        bike_id,
        bike_rank,
        on='model',
        how='inner'
    )

    merged_car = pd.merge(
        car_id,
        car_rank,
        on='model',
        how='inner'
    )
    print(merged_car)


    bike_selected = bike_rent[
        bike_rent['veh_id'].isin(
            merged_bike['veh_id']
        )
    ]

    car_selected = car_rent[
        car_rent['veh_id'].isin(
            merged_car['veh_id']
        )
    ]
    print(car_selected)


    car_final = recommend_vehicles_user(
        car_selected,
        item.user_id,
        destination.lon,
        destination.lat,
        distance,
        item.budget,
        weather_score
    )

    bike_final = recommend_vehicles_user(
        bike_selected,
        item.user_id,
        destination.lon,
        destination.lat,
        distance,
        item.budget,
        weather_score
    )



    car_final = pd.merge(
        car_final,
        merged_car,
        on='veh_id',
        how='inner'
    )

    bike_final = pd.merge(
        bike_final,
        merged_bike,
        on='veh_id',
        how='inner'
    )



    car_final['final_score'] = (
            car_final['rating'] * 0.6
            +
            car_final['compatibility'] * 0.4
    )

    bike_final['final_score'] = (
            bike_final['rating'] * 0.6
            +
            bike_final['compatibility'] * 0.4
    )


    car_final = (
        car_final
        .sort_values(
            by='final_score',
            ascending=False
        )
        .head(10)
    )

    bike_final = (
        bike_final
        .sort_values(
            by='final_score',
            ascending=False
        )
        .head(10)
    )



    return {
        "cars": car_final['veh_id'].tolist(),
        "bikes": bike_final['veh_id'].tolist()
    }

