# Technical Report: Vietnam Tourism Recommendation Data Platform

## Executive Summary

This repository implements the data foundation for a Vietnam tourism recommendation and trip-planning platform. The system centers on a PostgreSQL `trip_db` schema, seed data for destinations and transport providers, GTFS transit feeds for Hanoi and Ho Chi Minh City, review-derived recommendation artifacts, and CSV datasets for a vehicle rental marketplace.

The current implementation is best understood as a backend/data platform rather than a full user-facing application. It provides normalized storage for users, destinations, reviews, trips, routing requests, route options, trip scores, transport modes, transport providers, and GTFS transit data. It also includes source and output artifacts for public transport scraping, Google Maps/reviews scraping references, and denormalized rental recommendation files.

## Repository Scope

The repository contains five major data areas:

| Area | Main files/directories | Purpose |
| --- | --- | --- |
| Database schema | `schema.sql` | PostgreSQL DDL for the `trip_db` schema, constraints, indexes, views, and helper functions |
| Seed data | `data.sql` | Initial destination records, GTFS records, transport modes, and transport providers |
| Public transport | `public transport/vietnam-gtfs/`, `vn-train-metro-scraper/` | Scrapers/builders for Hanoi and HCMC GTFS feeds |
| Destinations and reviews | `destinations & reviews/` | Google Maps/reviews scraping notes, loaders, and recommendation triples |
| Rental service | `renting service/*.csv` | Rental shops, vehicle inventory, shop inventory, and flattened rental recommendation data |

## System Architecture

The platform follows a data-ingestion-first architecture:

```text
External sources
  Google Maps / reviews
  OpenStreetMap Overpass transit data
  Curated vehicle rental datasets
        |
        v
ETL and scraper layer
  GTFS builders/loaders
  Destination and review loaders
  Triples loader
  CSV preprocessing
        |
        v
PostgreSQL trip_db schema
  destinations, reviews, trips
  route_requests, route_options, trip_scores
  transport_modes, transport_providers
  gtfs_* tables
        |
        v
Recommendation and routing services
  Destination matching
  Transit stop lookup
  Multimodal option scoring
```

The schema is designed to support later API services for personalized destination discovery, itinerary planning, route selection, and transport recommendation.

## Database Implementation

### Core Domain Model

The implemented schema in `schema.sql` defines the following main entities:

| Table | Role |
| --- | --- |
| `users` | Stores user identity, contact details, local/OAuth provider metadata, and timestamps |
| `user_preferences` | Stores explicit user preferences such as transport modes, destination tags, avoid tags, and budget range |
| `destinations` | Stores points of interest with category, address, coordinates, description, rating, active flag, and timestamps |
| `reviews` | Stores one review per user/destination pair with rating and comment |
| `destination_triples` | Stores JSONB aspect triples generated from review analysis |
| `trips` | Stores planned user trips with origin, time range, budget, and status |
| `trip_destinations` | Stores ordered destinations inside a trip |
| `route_requests` | Stores origin/destination routing queries |
| `route_options` | Stores candidate transport options with mode, provider, GTFS references, cost, duration, distance, transfers, and score |
| `trip_scores` | Stores route scoring factors such as weather, traffic, cost, comfort, and overall score |
| `transport_modes` | Defines mode categories including bus, metro, train, ferry, walk, ride hailing, motorbike rental, and car rental |
| `transport_providers` | Defines named external providers such as ride-hailing and rental providers |

### GTFS Model

The public transport model uses standard GTFS concepts with a `feed_id` prefix so multiple city feeds can coexist in one schema:

| Table | Role |
| --- | --- |
| `gtfs_feeds` | Feed registry with city, agency, URLs, active flag, and timestamps |
| `gtfs_agency` | Transit agency metadata |
| `gtfs_routes` | Route definitions and GTFS route types |
| `gtfs_stops` | Stop locations and metadata |
| `gtfs_trips` | Scheduled trips linked to routes and service calendars |
| `gtfs_stop_times` | Stop sequence and arrival/departure intervals per trip |
| `gtfs_calendar` | Weekly service availability and date ranges |

The schema also defines:

| Object | Purpose |
| --- | --- |
| `v_route_stops` | View that joins routes, trips, stop times, and stops for representative route-stop queries |
| `nearest_stops(lat, lon, p_feed, lim)` | SQL helper function that returns nearby stops using a spherical distance calculation |

### Constraints and Indexes

The schema includes primary keys, foreign keys, unique constraints, checks, and query indexes. Important examples include:

| Constraint/index area | Implementation detail |
| --- | --- |
| Ratings | Destination average ratings must be 0 to 5; review ratings must be 1 to 5 |
| Trip status | Trips are limited to `DRAFT`, `PLANNED`, `COMPLETED`, or `CANCELLED` |
| Trip ordering | `(trip_id, visit_order)` is unique and `visit_order > 0` |
| Route metrics | Cost, duration, distance, transfers, and option scores are constrained to valid non-negative ranges |
| Score factors | Weather, traffic, cost, comfort, and overall score values are constrained to 0 to 10 |
| GTFS integrity | GTFS child rows cascade from `gtfs_feeds`; trips reference routes; stop times reference trips and stops |
| Lookup speed | Indexes exist on emails, phones, destination category/name, trip user/status, route request user/trip, route option request/mode/provider, GTFS stop names/coordinates, and GTFS trip/stop-time keys |

## Current Data Assets

### Destination Dataset

`data.sql` contains 1,847 destination rows, focused heavily on Ho Chi Minh City tourist attractions, parks, markets, historical landmarks, museums, religious sites, and food-related points of interest. Each destination includes a stable `DST...` identifier, name, category, address, latitude, longitude, optional description, rating average, and timestamp metadata.

### Public Transport Dataset

The GTFS layer includes feeds for Hanoi and Ho Chi Minh City. `data.sql` seeds active feed records for:

| Feed ID | City | Agency |
| --- | --- | --- |
| `FEED000001` | Hanoi | Transerco |
| `FEED000002` | Ho Chi Minh City | HCMC Bus |
| `HCMCNOBUS` | Ho Chi Minh City | HURC |
| `HANOINOBUS` | Hanoi | HPC |

The generated GTFS artifacts include `gtfs.zip` outputs for both Hanoi and HCMC under `public transport/vietnam-gtfs/output/`. The main generated stop and route files currently contain:

| File | Rows including header |
| --- | ---: |
| `public transport/vietnam-gtfs/output/hcmc/gtfs/stops.txt` | 5,962 |
| `public transport/vietnam-gtfs/output/hanoi/gtfs/stops.txt` | 5,303 |
| `public transport/vietnam-gtfs/output/hcmc/gtfs/routes.txt` | 320 |
| `public transport/vietnam-gtfs/output/hanoi/gtfs/routes.txt` | 375 |

### Transport Modes and Providers

The seed data defines eight transport modes:

| Code | GTFS-backed | GTFS route type |
| --- | --- | --- |
| `BUS` | Yes | 3 |
| `METRO` | Yes | 1 |
| `WALK` | No | N/A |
| `RIDE_HAILING` | No | N/A |
| `MOTORBIKE_RENTAL` | No | N/A |
| `CAR_RENTAL` | No | N/A |
| `TRAIN` | Yes | 2 |
| `FERRY` | Yes | 4 |

Eight providers are seeded, including active ride-hailing brands (`Grab`, `Be`, `Xanh SM`) and inactive placeholder rental providers.

### Rental Dataset

The rental service is represented as flat CSV data rather than normalized PostgreSQL tables. Current file sizes are:

| File | Rows including header | Purpose |
| --- | ---: | --- |
| `rental_shops.csv` | 13 | 12 rental shops plus header |
| `vehicles_cars.csv` | 1,769 | Car catalog plus header |
| `vehicles_motorbikes.csv` | 38,773 | Motorbike catalog plus header |
| `shop_inventory.csv` | 18,134 | Shop-vehicle availability and price records plus header |
| `rental_recommendations_flat.csv` | 18,134 | Denormalized recommendation-ready rental records plus header |

The flattened recommendation file joins vehicle attributes with shop location, shop tier, rental price, unit availability, and condition. This is suitable for fast filtering by city, district, vehicle type, category, and daily rental price.

## ETL and Data Flow

### Destination and Review Ingestion

Destination and review data are sourced from Google Maps frontend scraping workflows documented in `destinations & reviews/where_scrape.md`. The repository references:

| Source | Purpose |
| --- | --- |
| `gosom/google-maps-scraper` | Destination/place scraping |
| `georgekhananaev/google-reviews-scraper-pro` | Review scraping |

The transformed destination output is loaded into `trip_db.destinations`. Review text can then be transformed into JSONB triples and loaded into `destination_triples` through the project loader scripts.

### GTFS Ingestion

The `public transport/vietnam-gtfs/` package builds GTFS feeds from public transit data, primarily OpenStreetMap Overpass data according to its README. The expected output files are:

```text
agency.txt
routes.txt
stops.txt
trips.txt
stop_times.txt
calendar.txt
shapes.txt
feed_info.txt
```

These are loaded into the `gtfs_*` tables with a feed identifier. This design allows the same SQL schema to query Hanoi bus, HCMC bus, Hanoi metro/train, and HCMC metro feeds without table duplication.

### Rental Data Processing

The rental service data is currently handled outside the relational schema. CSV files provide:

1. Shop metadata and coordinates.
2. Car and motorbike catalogs.
3. Shop inventory mappings.
4. A flattened recommendation table for API-serving or direct analytical use.

This is pragmatic for an MVP because rental inventory can be refreshed independently from the core trip-planning schema.

## Recommendation and Routing Readiness

The implemented schema supports three recommendation surfaces:

| Surface | Existing support |
| --- | --- |
| Destination recommendation | `destinations`, `reviews`, `destination_triples`, `user_preferences` |
| Public transport recommendation | `gtfs_*`, `nearest_stops`, `v_route_stops`, `transport_modes` |
| Multimodal route option ranking | `route_requests`, `route_options`, `trip_scores`, `transport_providers` |

The current repository provides the storage and data-loading foundation. A production service layer would still need to implement ranking algorithms, API endpoints, route construction, live traffic/weather integration, and cache invalidation policies.

## Known Issues and Data Quality Risks

1. `transport_providers` seed rows appear to reference incorrect `mode_id` values. In `data.sql`, `Grab`, `Be`, and `Xanh SM` are typed as `RIDE_HAILING` but reference `MODE000006`, which is seeded as `CAR_RENTAL`. Motorbike rental placeholder providers reference `MODE000007`, which is `TRAIN`, and car rental placeholders reference `MODE000008`, which is `FERRY`. This should be corrected before relying on provider-mode joins.

2. `user_preferences.user_id` is defined as `text`, while `users.user_id` is `character(10)`. The conceptual design suggests this should be a foreign key to `users`, but the current dump does not show that foreign key. Aligning the data type and adding the FK would improve integrity.

3. The MVP document mentions `destination_aspects`, but `schema.sql` does not currently define that table. Either the schema should add it or the docs should treat aspects as derived metadata inside `destination_triples`.

4. The GTFS README notes that some OSM-derived outputs may lack complete timetable and shape data. Route-planning behavior should account for partial feeds and distinguish schedule-backed routes from geometry-only route data.

5. Rental service data is denormalized in CSV files. This is acceptable for API-serving experiments, but it lacks database-level constraints for referential integrity, currency consistency, and uniqueness.

## Recommended Next Steps

1. Fix provider-mode seed data so each provider references the correct row in `transport_modes`.
2. Normalize `user_preferences.user_id` to `character(10)` and add a foreign key to `users(user_id)`.
3. Decide whether `destination_aspects` is required as a physical table; if yes, add it to `schema.sql`.
4. Add repeatable loader scripts or Make targets for restoring `schema.sql`, loading `data.sql`, importing GTFS feeds, and validating row counts.
5. Add lightweight data quality checks for GTFS row counts, orphaned provider/mode mappings, invalid coordinates, duplicate rental inventory rows, and missing destination names.
6. Consider moving rental shop and inventory data into normalized database tables if the API needs transactional updates, filtering indexes, or cross-domain route/rental joins.

## Conclusion

The repository contains a coherent backend data platform for Vietnam tourism recommendation. The strongest implemented areas are the PostgreSQL schema, destination seed data, GTFS transit representation, and rental recommendation datasets. The system is ready for service-layer development, but several integrity fixes and ETL validation checks should be completed before treating the data as production-grade.
