# Hanoi Bus Data (JSON Format)

Cleaned and structured GTFS (General Transit Feed Specification) data for Hanoi buses.

## Files

- **routes.json** - 224 bus routes with IDs, names, and types
- **stops.json** - 7,670 bus stops with coordinates, names, and descriptions
- **trips.json** - 6,713 scheduled trips with route and calendar info
- **stop_times.json** - Trip schedules grouped by trip_id with arrival/departure times
- **calendar.json** - Service calendar information
- **index.json** - Summary statistics and sample records

## Data Structure

### routes.json
```json
{
  "route_id": "01_1",
  "route_short_name": "n/a-01_1",
  "route_long_name": "Route_01_1",
  "route_type": "3"
}
```

### stops.json
```json
{
  "stop_id": "01_1_S1",
  "stop_name": "STOP_01_1_S1",
  "latitude": 21.048408,
  "longitude": 105.878335,
  "description": ""
}
```

### trips.json
```json
{
  "trip_id": "01_1_MD_1",
  "route_id": "01_1",
  "service_id": "...",
  "shape_id": "..."
}
```

### stop_times.json
Keyed by trip_id, sorted by stop sequence:
```json
{
  "01_1_MD_1": [
    {
      "stop_id": "01_1_S1",
      "arrival_time": "09:30:00",
      "departure_time": "09:30:00",
      "stop_sequence": 1
    },
    ...
  ]
}
```

## Quick Start

Load routes:
```python
import json
with open('routes.json') as f:
    routes = json.load(f)
```

Find stops near a coordinate:
```python
import math
stops = json.load(open('stops.json'))
lat, lon = 21.0, 105.9
nearby = [s for s in stops if abs(s['latitude']-lat)<0.01 and abs(s['longitude']-lon)<0.01]
```

Get schedule for a trip:
```python
schedules = json.load(open('stop_times.json'))
trip_schedule = schedules['01_1_MD_1']
```

## Dataset Info

- **Routes**: 224 total
- **Stops**: 7,670 total
- **Trips**: 6,713 scheduled trips
- **Coverage**: Hanoi metropolitan area
- **Format**: GTFS standard, converted to JSON
