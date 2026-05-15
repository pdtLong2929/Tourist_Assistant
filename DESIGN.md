# Smart Travel App Repository Design

## Purpose

This repository documents and prototypes the data layer for a smart travelling
application focused on Vietnam, especially Ho Chi Minh City and Hanoi. The branch
is primarily a database documentation branch: it contains the PostgreSQL schema,
seed data, ETL scripts, generated data artifacts, and a standalone RAG service
for transportation recommendation.

The system is designed to support these product capabilities:

- Destination discovery from scraped POI and review data.
- User preference storage for personalized recommendations.
- Public transport lookup through GTFS feeds.
- Ride-hailing and rental option discovery.
- Trip planning with route requests, route options, and scoring.
- RAG-assisted transportation advice using weather, traffic, distance, and time
  context.

## Repository Map

| Path | Role |
| --- | --- |
| `schema.sql` | PostgreSQL dump defining the main `trip_db` schema. |
| `data.sql` | Seed snapshot for destinations, transport modes, providers, and feed metadata. |
| `DATA_MODEL_ETL_REPORT.md` | Existing summary of data model and ETL design. |
| `mvp_with_tech.md` | English MVP writeup for the database-backed smart travel app. |
| `mvp_with_tech_vn.md` | Vietnamese MVP writeup. |
| `rag/` | FastAPI RAG service for transportation recommendations. |
| `public transport/vietnam-gtfs/` | Python scraper/builder/loader for OSM-derived GTFS bus data. |
| `vn-train-metro-scraper/` | Python scraper/builder for OSM-derived metro and urban rail GTFS data. |
| `public transport/referenced datasets/` | Example/reference GTFS datasets and routing artifacts. |
| `destinations & reviews/` | Destination/review scraping references and loaders for triples/preferences. |
| `renting service/` | CSV datasets for rental shops, vehicles, inventory, and flat recommendations. |
| `ride hailing/` | JSON fare/service metadata and Grab farefeed reference notes. |

Generated caches such as `__pycache__/` and generated GTFS output directories
are implementation artifacts, not design sources.

## Logical Architecture

```text
External / Generated Sources
  |
  | Google Maps destination data
  | Google review data
  | OpenStreetMap / Overpass transit data
  | Rental CSV datasets
  | Ride-hailing service metadata
  | RAG scenario dataset
  v
ETL and Loaders
  |
  | schema.sql / data.sql
  | gtfs_loader.py
  | triples_loader.py
  | importnewusrpref.py
  | rag/seed.py
  v
Storage
  |
  | PostgreSQL trip_db schema
  | PostgreSQL + pgvector RAG tables
  | CSV / JSON file-backed datasets
  | Optional Redis RAG response cache
  v
Application Capabilities
  |
  | destination discovery
  | public transport lookup
  | rental and ride-hailing option discovery
  | route option persistence
  | route scoring
  | RAG transport recommendation
```

## Main Data Store

The main database schema is `trip_db` in PostgreSQL. It is defined by
`schema.sql` and organized into five domains.

### Identity and Preferences

| Table | Responsibility |
| --- | --- |
| `users` | Stores user identity, email, phone, authentication provider, and password hash. |
| `user_preferences` | Stores JSONB preference payloads, budget range, destination tags, and avoid tags. |

`user_preferences.user_id` is currently `text`, while `users.user_id` is
`character(10)`. PostgreSQL allows the FK in the dump, but application code
should normalize IDs before insert to avoid padding surprises.

### Destinations and Reviews

| Table | Responsibility |
| --- | --- |
| `destinations` | Stores POIs with category, address, coordinates, description, and average rating. |
| `reviews` | Stores per-user destination ratings and comments. |
| `destination_triples` | Stores aspect/recommendation triples as JSONB per destination. |

Destination data is loaded from scraped Google Maps style data. Review-derived
triples are loaded from `destinations & reviews/final_destination_triples.json`
through `triples_loader.py`.

### Public Transport

| Table | Responsibility |
| --- | --- |
| `gtfs_feeds` | Registry for each imported feed. |
| `gtfs_agency` | GTFS agency records per feed. |
| `gtfs_routes` | Route definitions. |
| `gtfs_stops` | Stop/station coordinates. |
| `gtfs_trips` | Trip instances per route and service calendar. |
| `gtfs_stop_times` | Stop sequence and arrival/departure intervals. |
| `gtfs_calendar` | Service-day calendars. |

Two helper query surfaces are provided:

- `v_route_stops` flattens route, trip, stop time, and stop data into route-stop
  rows.
- `nearest_stops(lat, lon, feed_id, limit)` returns closest stops using a
  spherical distance formula without requiring PostGIS.

### Transport Providers and Route Planning

| Table | Responsibility |
| --- | --- |
| `transport_modes` | Canonical mode list: bus, metro, train, ferry, walk, ride-hailing, rental modes. |
| `transport_providers` | Provider metadata linked to a transport mode. |
| `route_requests` | Origin/destination requests created during planning. |
| `route_options` | Candidate options with cost, duration, distance, mode, provider, and GTFS references. |
| `trip_scores` | Weather, traffic, cost, comfort, and overall scoring for route options. |

Route options are intentionally generic so they can represent GTFS options,
ride-hailing estimates, walking segments, or rentals.

### Trips

| Table | Responsibility |
| --- | --- |
| `trips` | User trip shell with origin, time window, budget, and status. |
| `trip_destinations` | Ordered destination visits inside a trip. |

Trip statuses are constrained to `DRAFT`, `PLANNED`, `COMPLETED`, or
`CANCELLED`.


## File-Backed Data Domains

### Rental Service

The `renting service/` folder stores rental data as CSV:

| File | Rows excluding header | Purpose |
| --- | ---: | --- |
| `rental_shops.csv` | 12 | Shop identity, city, district, coordinates, tier, and supported vehicle types. |
| `vehicles_cars.csv` | 1,768 | Car catalog. |
| `vehicles_motorbikes.csv` | 38,772 | Motorbike catalog. |
| `shop_inventory.csv` | 18,133 | Vehicle-shop availability and daily rental price. |
| `rental_recommendations_flat.csv` | 18,133 | Denormalized recommendation-ready join. |

This data is not normalized into `trip_db` in the current branch. The intended
MVP boundary is to serve or query the flat CSV directly, then promote it to
relational tables only if transactional inventory management becomes necessary.

### Ride-Hailing

The `ride hailing/` folder contains:

- `services.json`: 28 active service definitions with provider, city, vehicle
  category, base fare, base distance, and per-kilometer fare.
- `promo_codes.json`: 20 promotional code definitions.
- `reference.md`: notes for Grab's farefeed estimate API shape.

The main schema also has `transport_providers`, so the JSON files act as service
catalog inputs for a future ride-hailing estimator or provider API adapter.

## ETL Design

### Destination and Review ETL

```text
Google Maps / review scraping
  -> normalized destination records in data.sql
  -> review/aspect processing
  -> final_destination_triples.json
  -> triples_loader.py
  -> trip_db.destination_triples
```

Current supporting files:

- `destinations & reviews/where_scrape.md` records scraper sources.
- `destinations & reviews/triples_loader.py` upserts triples in chunks.
- `destinations & reviews/importnewusrpref.py` imports user preference JSON.
- `destinations & reviews/updated_user_preferences.json` contains 1,000
  preference records.
- `destinations & reviews/final_destination_triples.json` contains 481
  destination triple records.

### GTFS ETL

```text
OpenStreetMap / Overpass
  -> scraper route and stop extraction
  -> GTFS builder
  -> output/<city>/gtfs/*.txt
  -> gtfs_loader.py
  -> trip_db.gtfs_* tables
```

There are two related GTFS generators:

- `public transport/vietnam-gtfs/`: bus-focused GTFS generation and loader.
- `vn-train-metro-scraper/`: metro and urban rail GTFS generation.

Both are OSM/Overpass based. Timetable completeness depends on available source
data or generated assumptions.

## Cross-Domain Design

The long-term route recommendation flow is:

1. The user selects or enters trip origin, destination, budget, and time.
2. The system creates a `route_requests` row.
3. Candidate options are assembled from:
   - GTFS public transport tables.
   - Ride-hailing JSON/API estimates.
   - Rental flat data.
   - Walking or other local rules.
4. Candidates are persisted in `route_options`.
5. Scores are persisted in `trip_scores`.
6. The RAG service can provide contextual recommendation language or structured
   mode ratings using weather, traffic, distance, and time.
7. The selected option can be attached to trip planning UI or downstream
   itinerary generation.

## Quality and Integrity

Implemented database safeguards:

- Primary keys on core entities.
- Unique constraints on user email, user phone, transport mode code, provider
  name, and trip visit order.
- Foreign keys across users, trips, route requests/options, GTFS children, and
  destinations.
- Check constraints for rating ranges, score ranges, non-negative route values,
  trip status, trip time ordering, and transport mode/provider enums.
- Indexes for common lookup paths such as destination category/name, GTFS route
  and stop lookup, route option filtering, and user/trip access.

Current gaps:

- Some file-backed datasets have no database constraints.
- RAG schema is created by service code rather than shared migrations.
- `importnewusrpref.py` includes a hardcoded local database password and should
  be converted to environment-based configuration before sharing or deployment.
- Generated files and Python caches are present in the repository.

## Deployment View

The repository does not define one unified production deployment. It currently
contains deployable or runnable units:

- PostgreSQL schema and seed scripts for the main `trip_db` database.
- Python GTFS loaders and scrapers.
- Python destination/review JSON loaders.
- FastAPI RAG service with Dockerfile.
- Go/Python scraper subprojects that are useful as data acquisition tools.

## Design Decisions

- PostgreSQL is the source of truth for stable relational travel data.
- GTFS keeps standard transit semantics instead of inventing custom route
  tables.
- JSONB is used where data is recommendation-oriented and schema may evolve:
  preferences, route references, external snapshots, and destination triples.
- Rental and ride-hailing data remain file-backed while the MVP validates query
  behavior.
- RAG is isolated from the main schema so model/provider experimentation does
  not destabilize core trip data.
- The nearest-stop utility avoids PostGIS for MVP simplicity, accepting lower
  geospatial precision and fewer spatial indexing features.

## Open Issues

- Decide whether rental and ride-hailing catalogs should be normalized into
  `trip_db`.
- Reconcile RAG output modes (`walk`, `bus`, `metro`) with the current scenario
  dataset labels (`bike`, `motorbike`, `car`, `transit`).
- Replace service-created RAG tables with versioned migrations.
- Move local credentials out of scripts.
- Add repository-level setup scripts and CI checks.
- Add validation for generated GTFS quality and route completeness before load.
