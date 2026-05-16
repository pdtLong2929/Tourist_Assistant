import joblib
import re
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent

le_user = joblib.load(BASE_DIR/"encode/le_user.pkl")
le_veh = joblib.load(BASE_DIR/"encode/le_veh.pkl")
le_color = joblib.load(BASE_DIR/"encode/le_color.pkl")
model = joblib.load(BASE_DIR/"../../../data/model/model_lgbm.pkl")



def recommend_vehicles_user(temp, user_id, dest_lon, dest_lat, distance_km, budget, weather_score):
    df = temp.copy()

    weather_difficulty = {
        1000: 0.0, 1003: 0.1, 1006: 0.1, 1009: 0.15,
        1030: 0.3, 1150: 0.25, 1153: 0.3, 1180: 0.3, 1183: 0.35, 1240: 0.35,
        1063: 0.4, 1186: 0.5, 1189: 0.55, 1243: 0.55, 1087: 0.6, 1273: 0.55,
        1192: 0.65, 1195: 0.7, 1246: 0.75, 1135: 0.65, 1276: 0.75,
        1066: 0.7, 1210: 0.75, 1213: 0.8, 1216: 0.85, 1219: 0.9, 1222: 0.95, 1225: 1.0,
        1072: 0.9, 1168: 0.95, 1171: 1.0, 1198: 0.95, 1201: 1.0, 1147: 1.0,
        1237: 1.0, 1261: 0.95, 1264: 1.0,
        1069: 0.7, 1204: 0.75, 1207: 0.85, 1249: 0.75, 1252: 0.85,
        1279: 0.9
    }

    category_map = {
        'user_id_encoded': list(range(len(le_user.classes_))),
        'veh_id_encoded': list(range(len(le_veh.classes_))),
        'color_encoded': list(range(len(le_color.classes_)))
    }

    df['weather_score'] = df['weather_id'].map(weather_difficulty)

    dest_split = df['destination'].astype(str).str.split(',', expand=True)

    df['dest_lon'] = pd.to_numeric(
        dest_split[0],
        errors='coerce'
    )

    df['dest_lat'] = pd.to_numeric(
        dest_split[1],
        errors='coerce'
    )
    df['distance_km'] = df['length'].apply(lambda x: int(re.findall(r'\d+', str(x))[0]))

    df['user_id_encoded'] = le_user.fit_transform(df['user_id'])
    df['veh_id_encoded'] = le_veh.fit_transform(df['veh_id'])
    df['color_encoded'] = le_color.fit_transform(df['color'])
    features = ['user_id_encoded', 'dest_lon', 'dest_lat', 'distance_km',
                'veh_id_encoded', 'price', 'weather_score', 'color_encoded']

    categorical_features = ['user_id_encoded', 'veh_id_encoded', 'color_encoded']

    unique_vehicles = df[['veh_id', 'veh_id_encoded', 'color_encoded', 'price']].drop_duplicates('veh_id')

    candidates = unique_vehicles[unique_vehicles['price'] <= budget * 1.2].copy()


    try:
        u_encoded = le_user.transform([user_id])[0]
    except ValueError:
        u_encoded = 0

    candidates['user_id_encoded'] = u_encoded
    candidates['dest_lon'] = dest_lon
    candidates['dest_lat'] = dest_lat
    candidates['distance_km'] = distance_km
    candidates['weather_score'] = weather_score

    X_inference = candidates[features].copy()

    for col in categorical_features:
        X_inference[col] = pd.Categorical(
            X_inference[col],
            categories=category_map[col]
        )
    candidates['rating'] = model.predict(X_inference)

    top_recommendations = candidates.sort_values(by='rating', ascending=False)


    return top_recommendations[['veh_id', 'price', 'rating']].reset_index(drop=True)

