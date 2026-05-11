from sklearn.preprocessing import StandardScaler
import numpy as np
import joblib
from weather_score import weather_difficulty
import pandas as pd

df = pd.read_csv("data/gmted.csv")
coord_scaler = StandardScaler()
knn = joblib.load("knn_model.pkl")
coord_scaler.fit(df[["lat", "lon"]])

def predict_features(lat, lon):
    X_new = coord_scaler.transform(
        pd.DataFrame({
            "lat": [lat],
            "lon": [lon]
        })
    )
    pred = knn.predict(X_new)[0]

    return {
        "elevation": pred[0],
        "slope": pred[1],
        "roughness": pred[2]
    }

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)

    a = np.sin(dphi/2)**2 + np.cos(phi1)*np.cos(phi2)*np.sin(dlambda/2)**2
    return 2 * R * np.arcsin(np.sqrt(a))


def compute_route_difficulty(route, date):

    lat = route[-1][0]
    lon = route[-1][1]

    weather_score = weather_difficulty(lat, lon, date)
    elevations = []
    slopes = []
    roughnesses = []

    for lat, lon in route:
        f = predict_features(lat, lon)
        elevations.append(f['elevation'])
        slopes.append(f['slope'])
        roughnesses.append(f['roughness'])

    elevations = np.array(elevations)
    slopes = np.array(slopes)
    roughnesses = np.array(roughnesses)

    distances = []
    for i in range(len(route) - 1):
        d = haversine(route[i][0], route[i][1],
                      route[i+1][0], route[i+1][1])
        distances.append(max(d, 1.0))

    distances = np.array(distances)

    dz = np.diff(elevations)
    segment_slope = np.abs(dz / distances)

    mean_slope = np.mean(segment_slope)
    p95_slope = np.percentile(segment_slope, 95)
    max_slope = np.max(segment_slope)

    mean_roughness = np.mean(roughnesses)
    mean_elevation = np.mean(elevations)

    def normalize(x, xmin, xmax):
        return (x - xmin) / (xmax - xmin + 1e-9)

    s_mean_n = normalize(mean_slope, 0, 0.3)
    s_p95_n  = normalize(p95_slope, 0, 0.35)
    r_n      = normalize(mean_roughness, 0, 30)
    z_n      = normalize(mean_elevation, 0, 3000)

    w1, w2, w3, w4 = 0.3, 0.3, 0.3, 0.1

    difficulty = (
        w1 * s_mean_n +
        w2 * s_p95_n +
        w3 * r_n +
        w4 * z_n
    )

    difficulty_final = (difficulty * 0.4) + (0.6 * weather_score)

    return  difficulty_final
