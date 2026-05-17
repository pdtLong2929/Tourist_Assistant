import joblib
from sklearn.preprocessing import MinMaxScaler
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).parent

model = joblib.load(BASE_DIR/"../../../data/model/car_regression.pkl")


def find_best_vehicle(df, difficulty_score):
    df = df.copy()

    df["compatibility"] = abs(
        df["score"] - difficulty_score
    )

    df = df.sort_values(
        by="compatibility",
        ascending=False
    )
    return df


def ranking_car(df, difficulty):
    df = df.copy()

    df['power_to_torque'] = df['HorsePower'] / df['Torque']

    feature_cols = [
        'CC/Battery Capacity',
        'HorsePower',
        'Total Speed',
        'Performance(0 - 100 )KM/H',
        'Torque',
        'power_to_torque'
    ]

    X = df[feature_cols]

    predictions = model.predict(X)

    df['score'] = predictions

    df.sort_values(
        by='score',
        ascending=False
    )

    return find_best_vehicle(df, difficulty)


def ranking_bike(df, difficulty):
    df = df.copy()
    df.dropna(inplace=True)
    df = df.drop_duplicates(subset=["Company Names"])

    scaler = MinMaxScaler()

    df['score'] = scaler.fit_transform(
        df[["power"]]
    )

    df.sort_values(
        by="score",
        ascending=False
    )

    return find_best_vehicle(df, difficulty)

