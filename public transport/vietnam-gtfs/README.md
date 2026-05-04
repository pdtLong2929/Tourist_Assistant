# vietnam-gtfs

Scrape and build GTFS feeds for **Hanoi** and **Ho Chi Minh City** from public Vietnamese transit data sources.

## Data Sources

| Source | City | Data |
|--------|------|------|
| [OpenStreetMap (Overpass)](https://overpass-api.de) | Both | Routes, stops, coordinates |

## Output

Valid GTFS `.zip` feeds in `output/hanoi/` and `output/hcmc/`, containing:
- `agency.txt`
- `routes.txt`
- `stops.txt`
- `trips.txt`
- `stop_times.txt`
- `calendar.txt`
- `shapes.txt`
- `feed_info.txt`

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt`
```

## Usage

```bash
# Scrape both cities
python main.py --city all

# Scrape one city
python main.py --city hcmc
python main.py --city hanoi

# Only fetch routes (skip timetables — faster, partial GTFS)
python main.py --city all --no-timetables

# Validate output with MobilityData validator
python main.py --city all --validate
```

Output zips will be written to `output/hanoi/gtfs.zip` and `output/hcmc/gtfs.zip`.

## Architecture

```
main.py                    ← CLI entry point
scrapers/
  overpass.py             ← OpenStreetMap Overpass API (routes & stops)
gtfs/
  builder.py              ← Assembles GTFS files from scraped data
  validator.py            ← Runs MobilityData GTFS validator
utils/
  http.py                 ← Session, retry, rate-limiting
  geo.py                  ← Shape interpolation helpers
  log.py                  ← Logging setup
config.py                 ← City configs, endpoints, constants
```

## Notes & Caveats

- **Rate limiting**: All scrapers throttle to ≤1 req/sec by default. Do not remove this.
- **Terms of Service**: This tool is for research/urban planning. BusMap data is © BusMap / Phenikaa MaaS Technology JSC. Always credit your source.
- **Timetables**: No schedule data from OSM. GTFS will not include stop times or frequencies.
- **Shapes**: No shape data from OSM. Routes will not have polylines.
- **Updates**: OSM data may not be as up-to-date as official sources.
