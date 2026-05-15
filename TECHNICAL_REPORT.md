# Smart Travel App Technical Report

## Executive Summary

This repository is a database and data-pipeline branch for a smart travelling
application in Vietnam. It combines a PostgreSQL relational model, destination
and review enrichment data, GTFS public transport feeds, rental and ride-hailing
catalogs, and a RAG transportation recommendation service.

The current implementation is best understood as a backend data foundation. It
does not yet provide one integrated production application API, but it contains
the schema and data assets needed to support destination discovery,
personalized trip planning, route option comparison, rental recommendation, and
contextual transport advice.

Key implemented assets:

- PostgreSQL `trip_db` schema with users, preferences, destinations, reviews,
  GTFS transit tables, trips, route requests/options, providers, and route
  scores.
- Seed and generated datasets for destinations, GTFS, rentals, ride-hailing,
  user preferences, and destination triples.
- Python ETL loaders for GTFS feeds, destination triples, user preferences, and
  RAG scenario embeddings.
- FastAPI RAG service using Gemini, `pgvector`, PostgreSQL, and optional Redis.
- Documentation for the MVP in English and Vietnamese.

## System Context

The smart travel app targets users planning travel in Vietnamese cities. The app
needs to combine several decision surfaces that are usually separate:

- Where should the user go?
- What destinations match the user's preferences and budget?
- Which transport modes are available between two points?
- Which option is best under current distance, weather, traffic, and time?
- Should the user take public transport, ride-hailing, rent a vehicle, walk, or
  use another mode?

This branch focuses on the data model and backend data preparation required to
answer those questions.

## Architecture Overview

```text
                         +----------------------+
                         | External Data Sources |
                         +----------------------+
                           | Google Maps / reviews
                           | OSM / Overpass
                           | rental CSVs
                           | ride-hailing metadata
                           | RAG scenario labels
                           v
                         +----------------------+
                         | ETL / Dataset Layer  |
                         +----------------------+
                           | SQL seed files
                           | Python loaders
                           | GTFS builders
                           | RAG embedding seeder
                           v
          +--------------------------------+    +------------------+
          | PostgreSQL trip_db            |    | RAG PostgreSQL   |
          | relational travel data        |    | pgvector tables  |
          +--------------------------------+    +------------------+
                           |                         |
                           |                         v
                           |                  +--------------+
                           |                  | RAG FastAPI  |
                           |                  +--------------+
                           |                         |
                           v                         v
                    Future application API and client experiences
```

The repository has two storage patterns:

1. Stable domain data is modeled relationally in `trip_db`.
2. Experimental or catalog-style data is stored as CSV/JSON until the API
   contract is ready.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Main database | PostgreSQL, schema `trip_db` |
| Vector search | PostgreSQL with `pgvector` in the RAG service |
| RAG API | FastAPI, Uvicorn, Pydantic |
| LLM and embeddings | Google Gemini SDK |
| RAG cache | Redis, optional |
| ETL scripts | Python |
| Transit format | GTFS static feeds |
| Scraping inputs | Google Maps/review scrapers, OSM Overpass API |
| Rental and ride-hailing datasets | CSV and JSON |

## Database Model

### Identity and Personalization

`users` stores identity fields such as name, email, phone, password hash, and
authentication provider. `user_preferences` stores flexible JSONB preference
payloads for transport modes, destination tags, avoid tags, and budget bounds.

This design keeps the preference model extensible while the product learns which
preference dimensions matter.

### Destination Domain

`destinations` stores point-of-interest records:

- stable ID
- name
- category
- address
- latitude and longitude
- description
- average rating
- active flag
- timestamps

`reviews` stores user ratings and comments. `destination_triples` stores
recommendation-oriented triples as JSONB for each destination. The triples are
loaded by `destinations & reviews/triples_loader.py`.

The current triple dataset has 481 destination triple records. The user
preference dataset has 1,000 records.

### Transit Domain

GTFS tables follow the core GTFS static model and are all keyed by `feed_id`:

- `gtfs_feeds`
- `gtfs_agency`
- `gtfs_routes`
- `gtfs_stops`
- `gtfs_trips`
- `gtfs_stop_times`
- `gtfs_calendar`

This multi-feed design allows Hanoi and Ho Chi Minh City bus, metro, and rail
feeds to coexist in one database.

The schema also includes:

- `v_route_stops`: a flattened route-stop view for lookup.
- `nearest_stops(lat, lon, p_feed, lim)`: a SQL function returning nearest stops
  without PostGIS.

### Transport and Routing Domain

`transport_modes` defines canonical mode codes:

- `BUS`
- `METRO`
- `TRAIN`
- `FERRY`
- `WALK`
- `RIDE_HAILING`
- `MOTORBIKE_RENTAL`
- `CAR_RENTAL`

`transport_providers` maps providers to modes. `route_requests` stores
origin/destination requests. `route_options` stores candidate options with cost,
duration, distance, transfer count, mode, provider, GTFS feed, and route/stop
references. `trip_scores` stores computed factors and overall route scores.

This route model is intentionally provider-neutral. A route option can come from
GTFS, ride-hailing, rental, walking rules, or future routing engines.

### Trip Domain

`trips` stores user trips with title, origin, time range, budget, and status.
`trip_destinations` stores ordered destination visits and optional arrival or
departure windows.

This supports itinerary construction without forcing route calculation to be
completed at trip creation time.

## ETL and Data Pipelines

### Schema and Seed Pipeline

`schema.sql` creates:

- `trip_db` schema
- relational tables
- constraints
- indexes
- foreign keys
- `v_route_stops`
- `nearest_stops`

`data.sql` is the seed snapshot for destination data, transport mode/provider
metadata, and GTFS feed metadata.

### Destination and Review Pipeline

Data source notes are in `destinations & reviews/where_scrape.md`. The current
flow is:

```text
Google Maps / review scrape
  -> normalized destination seed data
  -> aspect/triple generation
  -> final_destination_triples.json
  -> triples_loader.py
  -> trip_db.destination_triples
```

`triples_loader.py` is safe to rerun because it uses `ON CONFLICT DO UPDATE`.

`importnewusrpref.py` loads `updated_user_preferences.json` into
`trip_db.user_preferences`, also using upsert behavior. This script should be
changed to use environment variables because it currently contains local
database credentials.

### Public Transport Pipeline

The repository has two GTFS generation paths:

- `public transport/vietnam-gtfs/` for bus-oriented Hanoi and HCMC feeds.
- `vn-train-metro-scraper/` for metro and urban rail feeds.

Both use OpenStreetMap data via Overpass API. The expected GTFS artifacts are:

- `agency.txt`
- `routes.txt`
- `stops.txt`
- `trips.txt`
- `stop_times.txt`
- `calendar.txt`
- `shapes.txt`
- `feed_info.txt`

`public transport/vietnam-gtfs/gtfs_loader.py` imports a GTFS directory into
`trip_db` and upserts rows in foreign-key-safe order:

1. feed metadata
2. agency
3. calendar
4. routes
5. stops
6. trips
7. stop times

The loader supports repeated imports and updates `last_fetched_at`.

### Rental Pipeline

Rental data is file-backed in `renting service/`.

| Dataset | Size | Use |
| --- | ---: | --- |
| Shops | 12 | Rental shop location and tier metadata. |
| Cars | 1,768 | Car catalog. |
| Motorbikes | 38,772 | Motorbike catalog. |
| Inventory | 18,133 | Availability and price by shop and vehicle. |
| Flat recommendations | 18,133 | API-ready denormalized recommendation rows. |

The current design favors simple API serving and analytical filtering over
transactional inventory updates.

### Ride-Hailing Pipeline

Ride-hailing data is file-backed in `ride hailing/`.

- `services.json`: 28 provider service records.
- `promo_codes.json`: 20 promo records.
- `reference.md`: Grab farefeed API reference notes.

The JSON data can be used to compute simple fare estimates from base fare,
included distance, and per-kilometer fare while the provider API integration is
not yet implemented.

### RAG Pipeline

The RAG service is documented in detail in `rag/DESIGN.md`. Its pipeline is:

```text
rag/dataset.csv
  -> rag/seed.py
  -> Gemini embedding
  -> PostgreSQL transport_scenarios vector table
  -> /rag/suggest
  -> Gemini JSON recommendation response
```

Runtime request handling:

1. Normalize request fields into query text.
2. Check Redis cache if configured.
3. Embed the query text.
4. Retrieve similar labeled scenarios from `transport_scenarios`.
5. Fall back to `transport_knowledge` if no scenario rows exist.
6. Generate JSON mode ratings.
7. Return the suggestion plus retrieved records.

## Data Integrity and Constraints

The database schema includes:

- Primary keys for all main tables.
- Unique constraints for user email, phone, transport mode code, provider name,
  and trip visit order.
- Foreign keys for users, preferences, trips, destinations, route requests,
  route options, GTFS tables, and scores.
- Check constraints for:
  - destination rating range
  - review rating range
  - trip status
  - trip time ordering
  - non-negative budget, cost, duration, distance, and transfers
  - route and trip score ranges
  - allowed transport mode and provider type values

Indexes are defined for common access paths:

- destination category and name
- GTFS route short name
- GTFS stop name, latitude, and longitude
- GTFS trip and stop-time joins
- route options by request, mode, and provider
- route requests by user and trip
- trips by user and status

## Recommendation Design

The repository supports two recommendation layers.

### Structured Recommendation

Structured recommendation uses relational data:

- user preferences
- destination tags and triples
- rental price/category/location fields
- GTFS availability
- route option costs and durations
- trip score factors

This path is auditable and suitable for deterministic filtering and ranking.

### RAG Recommendation

RAG recommendation uses labeled scenarios and LLM reasoning. It is suitable for
contextual transport advice, especially when weather, traffic, distance, and
time combine in ways that are hard to encode as fixed rules.

The recommended integration pattern is to use structured ranking first, then
use RAG for contextual explanation or mode-level rating. RAG should not be the
only source of route cost, distance, schedule, or availability truth.

## Operational Considerations

### Refresh Strategy

Suggested refresh cadence:

| Data | Refresh Pattern |
| --- | --- |
| Destinations | Batch refresh when scraper runs or source data changes. |
| Reviews/triples | Batch refresh after review scrape and NLP/triple generation. |
| GTFS | Scheduled rebuild/import, with validation before load. |
| Rental CSVs | Batch replacement or API-backed refresh. |
| Ride-hailing services | Manual or scheduled provider metadata refresh. |
| RAG scenarios | Seed on dataset change; cache suggestions for repeated requests. |

### Deployment Boundaries

The current repository should be split into these runtime units for production:

- PostgreSQL database.
- RAG API service.
- Redis cache for RAG.
- ETL runner or scheduled jobs.
- Application API that owns authentication, trip planning, destination lookup,
  and route orchestration.

### Observability

The branch currently relies mostly on script output and service logs. Production
work should add:

- ETL run logs with row counts and failure summaries.
- GTFS validation reports before import.
- RAG cache hit/miss metrics.
- API latency and error metrics.
- Data freshness timestamps surfaced in admin views.

## Security and Privacy Notes

- `destinations & reviews/importnewusrpref.py` contains a hardcoded local
  PostgreSQL password. This should be removed and replaced with environment
  variables or a secrets manager.
- User tables include password hashes and contact data, so backups and exports
  should be handled as sensitive data.
- Scraper subprojects may include third-party examples and documentation; check
  licenses and terms before production reuse.
- Provider API tokens, Gemini keys, and database credentials should never be
  committed.

## Known Limitations

- The repository is not yet a single runnable application.
- There is no root-level compose file or setup script that provisions every
  component end to end.
- Rental and ride-hailing catalogs are not enforced by database constraints.
- RAG tables are created by app startup and seeding code instead of versioned
  migrations.
- RAG output mode names do not fully match the current scenario label taxonomy.
- GTFS data from OSM may lack authoritative schedules, complete route geometry,
  or real-time status.
- The SQL nearest-stop function does not use PostGIS, so advanced geospatial
  indexing and routing are out of scope.
- Generated artifacts and caches are committed in the working tree.

## Recommended Next Steps

1. Add a root `README.md` with setup and data-loading instructions.
2. Move all credentials into environment variables.
3. Add versioned migrations for both `trip_db` and RAG vector tables.
4. Normalize rental and ride-hailing datasets if the app needs transactional
   inventory or provider joins.
5. Add validation tests for GTFS imports, schema constraints, and RAG mock mode.
6. Reconcile transport mode taxonomy across `transport_modes`, ride-hailing,
   rental files, GTFS feeds, and RAG output.
7. Define the future application API contract around destinations, trips,
   routing, and recommendations.
