import pandas as pd


def find_vehicle(df):

    brand_set = set(df.Brand)
    car = pd.read_csv("data/car.csv", encoding="latin1")
    bike_score = pd.read_csv("data/bike_score.csv")
    df_car = car[car["Company Names"].isin(brand_set)].copy()
    df_bike = bike_score[bike_score["Company Names"].isin(brand_set)].copy()

    return df_car, df_bike



def find_best_vehicle(df, difficulty_score):
    df = df.copy()

    df["compatibility"] = abs(
        df["score"] - difficulty_score
    )

    df = df.sort_values(
        by="compatibility",
        ascending=True
    )
    return df


