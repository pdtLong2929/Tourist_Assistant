# 🚇 Vietnam Rail GTFS Scraper

Scrapes metro and urban rail data from **OpenStreetMap via the Overpass API** for:

- 🏙️ **Hanoi** — Metro lines 1, 2, 2A, 3, 3.2 (Cat Linh–Ha Dong operational)
- 🌆 **Ho Chi Minh City** — Metro Line 1 (Ben Thanh–Suoi Tien operational), Lines 2, 3A, 5

Outputs valid **GTFS (General Transit Feed Specification)** CSV files ready for use in trip planners (OpenTripPlanner, Transitland, Google Maps, etc.).

---

## 📦 Project Structure

```
vn-gtfs-scraper/
├── src/
│   ├── overpass.py       # Strict Overpass API client
│   ├── gtfs_builder.py   # OSM → GTFS conversion
│   ├── cities.py         # City / route configs
│   └── main.py           # Entry point
├── output/
│   ├── hanoi/            # GTFS feed for Hanoi
│   └── hcmc/             # GTFS feed for HCMC
├── tests/
│   └── test_gtfs.py      # Validation tests
├── requirements.txt
└── README.md
```

---

## 🚀 Quickstart

```bash
# Install dependencies
pip install -r requirements.txt

# Scrape both cities and build GTFS
python src/main.py

# Scrape only one city
python src/main.py --city hanoi
python src/main.py --city hcmc

# Validate output
python -m pytest tests/
```

---

## 📤 GTFS Output

Each city folder contains:

| File | Description |
|------|-------------|
| `agency.txt` | Transit agency info |
| `routes.txt` | Metro/rail lines |
| `stops.txt` | All stations with lat/lon |
| `trips.txt` | Trip instances per route |
| `stop_times.txt` | Arrival/departure sequence |
| `calendar.txt` | Service days |
| `shapes.txt` | Route geometry (polyline) |

---

## 🔎 Data Source

All data comes **strictly from OpenStreetMap** via the [Overpass API](https://overpass-api.de/).  
Queries use `relation` tags: `type=route`, `route=subway|railway`, `network=*`.

No proprietary sources. No scraping of operator websites.

---

## ⚠️ Caveats

- OSM data quality varies. Hanoi Cat Linh–Ha Dong and HCMC Line 1 are well-mapped; other lines may be incomplete.
- Stop times / frequencies are **estimated** from operator schedules (OSM doesn't carry timetables).
- Shapes are derived from OSM way geometry.

---

## 📄 License

MIT
