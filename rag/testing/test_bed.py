import csv
import json
import random
import time
import requests
from collections import Counter

# ---------------------------------------------------------------------------
# CONFIG — paste your Pinggy URL here, or use localhost if running locally
# ---------------------------------------------------------------------------
API_BASE = "https://mocdx-35-199-166-135.run.pinggy-free.link"          # local Colab
# API_BASE = "https://xxxx.a.free.pinggy.link"  # remote via Pinggy

CHAT_URL = f"{API_BASE}/v1/chat/completions"

# ---------------------------------------------------------------------------
# Parameter space
# ---------------------------------------------------------------------------
WEATHER_CONDITIONS = [
    "clear sky", "light rain", "heavy rain", "storm",
    "strong wind", "overcast", "light drizzle", "fog",
]
TEMPERATURES = [
    "12°C cold", "18°C mild", "24°C warm",
    "30°C hot", "35°C very hot", "38°C extreme heat",
]
DISTANCES = [
    "0.5 km", "1 km", "2 km", "3 km", "5 km",
    "8 km", "10 km", "15 km", "20 km", "30 km",
]
TRAFFIC_CONDITIONS = [
    "no traffic", "light traffic", "moderate traffic",
    "heavy traffic", "gridlock",
]
TIMES_OF_DAY = [
    "07:00 rush hour", "09:00 morning", "12:00 midday",
    "15:00 afternoon", "18:00 evening rush", "21:00 night", "00:00 late night",
]
TRANSPORT_MODES = ["bike", "motorbike", "car", "transit"]
VALID_MODES = set(TRANSPORT_MODES)

# ---------------------------------------------------------------------------
# Scenario profiles — biased subspaces per mode
# ---------------------------------------------------------------------------
PROFILES = {
    "bike": {
        "weather_condition": ["clear sky", "overcast", "fog", "strong wind"],
        "temperature":       ["12°C cold", "18°C mild", "24°C warm", "30°C hot", "35°C very hot"],
        "distance":          ["0.5 km", "1 km", "2 km", "3 km"],
        "traffic_condition": TRAFFIC_CONDITIONS,
        "time_of_day":       TIMES_OF_DAY,
    },
    "motorbike": {
        "weather_condition": ["clear sky", "overcast", "fog", "strong wind", "light drizzle", "light rain"],
        "temperature":       TEMPERATURES,
        "distance":          ["3 km", "5 km", "8 km", "10 km", "15 km", "20 km"],
        "traffic_condition": ["light traffic", "moderate traffic", "heavy traffic", "gridlock"],
        "time_of_day":       TIMES_OF_DAY,
    },
    "car": {
        "weather_condition": ["heavy rain", "storm"],
        "temperature":       TEMPERATURES,
        "distance":          ["5 km", "8 km", "10 km", "15 km", "20 km", "30 km"],
        "traffic_condition": ["no traffic", "light traffic", "moderate traffic"],
        "time_of_day":       ["09:00 morning", "12:00 midday", "15:00 afternoon", "21:00 night", "00:00 late night"],
    },
    "transit": {
        "weather_condition": ["clear sky", "overcast", "fog", "light drizzle", "strong wind"],
        "temperature":       ["12°C cold", "18°C mild", "24°C warm", "30°C hot", "35°C very hot"],
        "distance":          ["8 km", "10 km", "15 km", "20 km", "30 km"],
        "traffic_condition": ["heavy traffic", "gridlock"],
        "time_of_day":       ["07:00 rush hour", "09:00 morning", "18:00 evening rush"],
    },
}

MIN_PER_MODE = {
    "bike":      40,
    "motorbike": 100,
    "car":       60,
    "transit":   60,
}

SYSTEM_PROMPT = """You are a transport planning expert for a Southeast Asian city (like Ho Chi Minh City).
For each trip scenario, choose the single most practical transport mode.

Available modes: bike, motorbike, car, transit

Rules:
- Bike: Only suggest for distances STRICTLY UNDER 5km. Exclude in any rain (light rain, heavy rain, light drizzle), storms, or extreme heat (38°C+).
- Motorbike: Suitable up to 30km. Exclude in heavy rain or storms. Fine in light rain or light drizzle.
- Car: Best for heavy rain or storms regardless of distance. Deprioritize during urban peak hours (07:00 rush hour, 18:00 evening rush). Prefer for long distances (20km+) in poor weather.
- Transit: Prefer for distances 8km+ in heavy traffic or gridlock during peak hours (07:00 rush hour, 18:00 evening rush), when weather is acceptable (no extreme heat, no storm).

When multiple modes are valid, prefer the most practical for a Southeast Asian city context.

Respond ONLY with a JSON array. Each element must have:
  "index": (1-based integer),
  "chosen_mode": (one of: bike, motorbike, car, transit),
  "reasoning": (one sentence max)

JSON array only, no markdown, no preamble."""


def _sample_profile(mode: str) -> dict:
    p = PROFILES[mode]
    return {k: random.choice(v) for k, v in p.items()}


def serialize_trip(record: dict, include_label: bool = False) -> str:
    text = (
        f"Weather is {record['weather_condition']} with a temperature of {record['temperature']}. "
        f"Route distance is {record['distance']} and traffic is {record['traffic_condition']}. "
        f"Trip starts at {record['time_of_day']}."
    )
    if include_label and record.get("chosen_mode"):
        text += f" Transport mode is {record['chosen_mode']}."
    return text


def label_batch(scenarios: list[dict]) -> list[dict]:
    batch_text = "\n".join(
        f"{i+1}. {serialize_trip(s)}" for i, s in enumerate(scenarios)
    )

    payload = {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": f"Scenarios:\n{batch_text}"},
        ],
        "max_new_tokens": 2048,   # ~50 tokens per scenario + headroom
        "temperature": 0.2,
        "top_p": 0.9,
        "do_sample": True,
    }

    resp = requests.post(CHAT_URL, json=payload, timeout=180)
    resp.raise_for_status()

    raw = resp.json()["choices"][0]["message"]["content"].strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

    # Parse with fallbacks for truncated or wrapped output
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        cut = raw.rfind("}")
        if cut != -1:
            salvaged = raw[: cut + 1] + "]"
            salvaged = salvaged.replace(",]", "]")
            parsed = json.loads(salvaged)
        else:
            print(f"  [debug] raw: {raw[:300]!r}")
            raise

    # Unwrap {"results": [...]} or any dict wrapper the model may add
    if isinstance(parsed, dict):
        parsed = next((v for v in parsed.values() if isinstance(v, list)), [])

    labels = parsed if isinstance(parsed, list) else []
    label_map = {item["index"]: item for item in labels if isinstance(item, dict)}

    for i, scenario in enumerate(scenarios):
        label = label_map.get(i + 1, {})
        chosen = label.get("chosen_mode", "unknown").strip().lower()
        if chosen not in VALID_MODES:
            chosen = "transit" if "transit" in chosen else "unknown"
        scenario["chosen_mode"] = chosen
        scenario["reasoning"] = label.get("reasoning", "")
        scenario["serialized_with_label"] = serialize_trip(scenario, include_label=True)
        scenario["serialized_query"] = serialize_trip(scenario, include_label=False)

    return scenarios


def generate_dataset(n_samples: int = 300, batch_size: int = 10) -> list[dict]:
    """
    Smaller default batch_size=10 vs Gemini's 20 — Qwen 1.5B handles
    shorter contexts more reliably. Increase if output quality is good.
    """
    print(f"Generating {n_samples} scenarios (stratified) via {CHAT_URL} ...")

    scenarios = []

    # Stratified pool
    for mode, count in MIN_PER_MODE.items():
        for _ in range(count):
            scenarios.append(_sample_profile(mode))

    # Random fill
    while len(scenarios) < n_samples:
        scenarios.append({
            "weather_condition": random.choice(WEATHER_CONDITIONS),
            "temperature":       random.choice(TEMPERATURES),
            "distance":          random.choice(DISTANCES),
            "traffic_condition": random.choice(TRAFFIC_CONDITIONS),
            "time_of_day":       random.choice(TIMES_OF_DAY),
        })

    scenarios = scenarios[:n_samples]
    random.shuffle(scenarios)

    labeled = []
    n_batches = (n_samples + batch_size - 1) // batch_size
    for i in range(0, len(scenarios), batch_size):
        batch = scenarios[i:i + batch_size]
        print(f"  Batch {i // batch_size + 1}/{n_batches} ...")
        try:
            labeled.extend(label_batch(batch))
        except Exception as e:
            print(f"  Failed: {e} — retrying once...")
            time.sleep(3)
            try:
                labeled.extend(label_batch(batch))
            except Exception as e2:
                print(f"  Retry failed: {e2} — skipping batch.")
        time.sleep(0.3)

    return labeled


def save_dataset(records: list[dict], path: str = "dataset.csv"):
    fields = [
        "weather_condition", "temperature", "distance", "traffic_condition",
        "time_of_day", "chosen_mode", "reasoning",
        "serialized_query", "serialized_with_label",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)
    print(f"\nSaved {len(records)} records to {path}")

    dist = Counter(r["chosen_mode"] for r in records)
    print("\nMode distribution:")
    for mode, count in sorted(dist.items(), key=lambda x: -x[1]):
        print(f"  {mode:12s} {count:4d}  ({count/len(records)*100:.1f}%)")


if __name__ == "__main__":
    dataset = generate_dataset(n_samples=300, batch_size=10)
    save_dataset(dataset, "dataset.csv")