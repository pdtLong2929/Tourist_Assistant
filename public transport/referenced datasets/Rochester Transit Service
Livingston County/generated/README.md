# Generated Routing Dataset

This directory contains routing-friendly artifacts built from the GTFS files in the repository.

## Files

- `routing_dataset.json`: Complete normalized dataset for AI routing. Includes metadata, routes, stops, service calendars, trip patterns, trips with scheduled stop times, and shape polylines.
- `routing_core.json`: Smaller routing dataset without shape polylines, plus an `edges` array for direct graph use.
- `route_edges.csv`: Directed scheduled edges between consecutive stops. Useful for graph search, transfer modeling, or embedding route segments.
- `stops.json`: Stop lookup with stop id, name, latitude, longitude, and zone.
- `summary.json`: Counts for quick validation.

## Main JSON Structure

- `routes`: Bus route metadata plus the trips and stops connected to each route.
- `stops`: Stop id, name, and coordinates.
- `services`: Weekly service calendars and added/removed date exceptions.
- `patterns`: Unique stop sequences. Multiple trips can share one pattern.
- `trips`: Scheduled runs. Each trip has service id, headsign, shape id, pattern id, and ordered stop times.
- `shapes`: GTFS route geometry keyed by `shape_id`.

Times are stored both as GTFS strings such as `08:26:30` and as seconds after midnight for easier computation.

## Rebuild

Run this from the repository root:

```bash
python3 build_routing_dataset.py
```
