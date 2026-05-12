# Vietnam Tourism Recommendation System

## Purpose
This report documents the current data modeling, SQL schema, and ETL/data pipeline for the Vietnam tourism recommendation system in this branch.

## Data Modeling
The system uses a relational PostgreSQL database under the `trip_db` schema to represent users, destinations, trips, routing options, and transportation data.

### Core domain entities
- `users`: stores authenticated users with local or external provider credentials.
- `user_preferences`: stores user preference metadata, including transport mode preferences, budget bounds, destination tags, and avoid tags.
- `destinations`: stores POI details, geographic coordinates, category, address, textual description, and average rating.
- `reviews`: stores destination reviews and ratings, linked to users and destinations.
- `destination_triples`: stores aspect-based recommendation triples in `jsonb` form for destination ranking.
- `destination_aspects`: defines available recommendation aspects and display metadata.

### Trip planning entities
- `trips`: stores trip metadata, including origin location, start/end time, budget, and status.
- `trip_destinations`: stores ordered destinations inside a trip, with arrival/departure windows and planning notes.
- `route_requests`: stores routing queries issued during trip planning, with origin/destination points.
- `route_options`: stores computed transportation options for each route request, including provider, mode, GTFS references, cost, duration, distance, transfer count, and score.
- `trip_scores`: stores scoring factors for selected route options, including weather, traffic, cost, comfort, and overall score.

### Transportation and GTFS
The model integrates transit data and external provider models:
- `transport_modes`: defines transport categories such as BUS, METRO, TRAIN, FERRY, WALK, RIDE_HAILING, MOTORBIKE_RENTAL, and CAR_RENTAL.
- `transport_providers`: maps outward providers to transport modes and supports ride-hailing / rental metadata.
- `gtfs_feeds`, `gtfs_agency`, `gtfs_routes`, `gtfs_stops`, `gtfs_trips`, `gtfs_stop_times`, and `gtfs_calendar`: store normalized GTFS transit feed content, using `feed_id` to support multiple city feeds.
- `v_route_stops`: a view that assembles route and stop information for route selection and transit analysis.

## SQL Schema Highlights
The SQL schema uses strong relational constraints and domain checks:
- Primary keys on all main entity tables, e.g. `destination_id`, `trip_id`, `user_id`, `request_id`, `option_id`.
- Foreign key relationships exist implicitly through design and are expressed in the conceptual model.
- Validation constraints enforce business rules such as ratings between 1 and 5, non-negative budget/cost/duration values, transfer counts, and allowed trip statuses (`DRAFT`, `PLANNED`, `COMPLETED`, `CANCELLED`).
- Timestamp fields capture creation and last update times on most tables.
- JSONB fields are used for flexible user preferences, GTFS route/stop identifiers, and recommendation triples.

## Data Pipeline and ETL Process
The repository structure and design indicate a multi-stage ingestion pipeline:

### Source data
- Destination and review data are mainly sourced from scrapers and loaders in the `destinations & reviews/` folder and external repositories such as the Google Maps scraper and Google Reviews scraper.
- GTFS transit feeds are imported from official / OSM-derived transit sources to populate the `gtfs_*` tables.
- Recommendation data uses extracted aspect-based triples loaded via `triples_loader.py`.

### ETL stages
1. **Extract**
   - Scrapers fetch POI and review data, GTFS transit from map sources.
   - GTFS loader extracts transit files into structured file records.
   - External ride-hailing and provider metadata may be extracted through API connectors.

2. **Transform**
   - POI data is normalized into `destinations` with category, coordinates, address, and rating fields.
   - Review text is transformed into `destination_triples` and aspect metadata for personalized recommendation.
   - GTFS files are transformed into normalized tables keyed by `feed_id`, preserving route, stop, trip, and schedule information.
   - User preference payloads are stored as JSONB for flexible filtering.

3. **Load**
   - `data.sql` contains a bulk load snapshot for `destinations`, showing many Ho Chi Minh City POIs by category, location, and rating.
   - SQL table definitions in `schema.sql` establish the production schema.
   - Loader scripts likely perform upserts into `trip_db` tables.

### Ingestion and update flow
- GTFS feeds are kept in `gtfs_feeds` with metadata, timestamps, and active flags to support periodic updates.
- Routing requests and options are created dynamically during trip planning, then stored for later user selection and scoring.
- Recommendation triples are regenerated and stored with a `generated_at` timestamp to support freshness.
- The schema is designed to support incremental updates and repeated import runs without changing the core model.

## Summary
This branch implements a structured tourism recommendation system with:
- A normalized PostgreSQL data model for users, destinations, trips, routing, transport modes, and GTFS transit data.
- A recommendation layer built on aspect-based triples and user preferences.
- An ETL process that loads destination records from scrapers, GTFS feeds from transit sources, and ranking metadata from review analyses.
- A schema that enforces domain constraints for budget, rating, distances, and scores while keeping flexible JSONB fields for unstructured preference and recommendation data.

## Notes
- The `data.sql` file demonstrates an initial dataset rich in HCMC attractions, parks, markets, and tourist venues.
- The system is ready for multi-modal route planning and personalized destination filtering, with strong schema discipline and extensible ETL staging.
