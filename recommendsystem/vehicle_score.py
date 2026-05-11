import joblib
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

model = joblib.load("car_regression.pkl")


def clean_numeric(series):
    return (
        series.astype(str)
        .str.extract(r'(\d+\.?\d*)')[0]
        .astype(float)
    )



def ranking_car(df):
    df = df.copy()

    df['power_to_torque'] = (df['HorsePower'] / df['Torque'])
    df = df[
        [
            'CC/Battery Capacity',
            'HorsePower',
            'Total Speed',
            'Performance(0 - 100 )KM/H',
            'Torque',
            'power_to_torque'
        ]
    ]
    df['power_to_torque'] = (
            df['HorsePower'] / df['Torque']
    )


    predictions = model.predict(df)

    df['score'] = predictions

    return df.sort_values(
        by="score",
        ascending=False
    )

def ranking_bike(df):
    df = df.copy()
    df.dropna(inplace=True)
    df = df.drop_duplicates(subset=["make_model"])

    scaler = MinMaxScaler()

    df['score'] = scaler.fit_transform(
        df[["power"]]
    )

    return df.sort_values(
        by="score",
        ascending=False
    )

