import requests as rq
from dotenv import load_dotenv
import os

load_dotenv()

api_key = os.getenv('api')
def weather_difficulty(lat, lon, date):
    API_KEY = api_key
    if not API_KEY:
        print("Warning: Weather API key not set. Returning default weather score 0.0")
        return 0.0

    url = "https://api.weatherapi.com/v1/forecast.json"

    params = {
        "key": API_KEY,
        "q": str(lat) + "," + str(lon),
        "days": date,
        "alerts": "no",
        "aqi": "no",
        "polen": "no",
        "et0": "no"
    }

    try:
        response = rq.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        daily_conditions = [
            day["day"]["condition"]["code"]
            for day in data["forecast"]["forecastday"]
        ]

        weather_difficulty_map = {
            1000: 0.0, 1003: 0.1, 1006: 0.1, 1009: 0.15,
            1030: 0.3, 1150: 0.25, 1153: 0.3, 1180: 0.3, 1183: 0.35, 1240: 0.35,
            1063: 0.4, 1186: 0.5, 1189: 0.55, 1243: 0.55, 1087: 0.6, 1273: 0.55,
            1192: 0.65, 1195: 0.7, 1246: 0.75, 1135: 0.65, 1276: 0.75,
            1066: 0.7, 1210: 0.75, 1213: 0.8, 1216: 0.85, 1219: 0.9, 1222: 0.95, 1225: 1.0,
            1072: 0.9, 1168: 0.95, 1171: 1.0, 1198: 0.95, 1201: 1.0, 1147: 1.0,
            1237: 1.0, 1261: 0.95, 1264: 1.0,
            1066: 0.7, 1210: 0.75, 1213: 0.8, 1216: 0.85, 1219: 0.9, 1222: 0.95, 1225: 1.0, # Duplicate entries in original
            1069: 0.7, 1204: 0.75, 1207: 0.85, 1249: 0.75, 1252: 0.85,
            1279: 0.9
        }

        weather_score = 0.0
        for day in daily_conditions:
            score = weather_difficulty_map.get(day, 0.0)
            if score > weather_score:
                weather_score = score
        return weather_score
    except Exception as e:
        print(f"Warning: Failed to fetch weather data: {e}. Returning default score 0.0")
        return 0.0

