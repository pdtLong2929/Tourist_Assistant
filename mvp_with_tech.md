# Vietnam Tourism Recommendation System: Minimum Viable Product

---

## Abstract

Tourism in Vietnam, particularly in Ho Chi Minh City and Hanoi, involves complex decisions across destination selection and transportation. This paper presents the Minimum Viable Product (MVP) of a backend system focused on three core data domains: destination management, public transit integration via GTFS, and a vehicle rental marketplace. The system is built on a PostgreSQL schema (`trip_db`) and supported by an ETL pipeline that ingests data from web scrapers, official transit feeds, and curated rental datasets. The MVP covers 12 rental shops, approximately 40,000 vehicle records, GTFS data for two cities totaling over 11,000 stops and 695 routes, forming a stable data foundation for future recommendation and routing features.

---

## 1. Introduction

Planning travel in Vietnam requires consulting multiple disconnected sources: review platforms for destination information, transit agency websites for bus and metro schedules, and separate rental services for motorbikes and cars. This project aims to unify these data domains into a single backend system.

This document defines the MVP scope — the minimum set of data structures and pipeline components needed to establish and populate the three core domains:

1. **Destinations** — structured POI data.
2. **GTFS transit data** — public transit routes, stops, and schedules for Hanoi and Ho Chi Minh City.
3. **Vehicle rental** — shop locations, vehicle inventory, and daily pricing.

Features beyond these three domains (user accounts, trip planning, route calculation, scoring) are out of scope for the MVP and are noted where relevant.

---

## 2. System Overview

### 2.1 Architecture

```
[External Sources]
  Google Maps Destinations Scraper (gosom)
  GTFS Agency Feeds Scraper from Overpass API (Hanoi, HCMC)
  Vehicle / Rental CSVs generated
        |
        v
[ETL Layer]
  gtfs_loader.py
  CSV import scripts
        |
        v
[PostgreSQL — trip_db schema]
  destinations
  gtfs_* tables (FEED000001, FEED000002, HCMCNOBUS, HANOINOBUS)
  transport_modes
```

Rental service data is not stored in the main PostgreSQL database. It is instead served via API, as the system is designed as a bridge to existing third-party rental solutions rather than a standalone rental platform.

### 2.2 Technology Stack

| component | technology |
|---|---|
| database | PostgreSQL 13+, `trip_db` schema |
| loaders | Python 3.8+ |
| transit data | GTFS standard format |
| rental data | CSV flat files served via API |

---

## 3. Data Model

### 3.1 Users and Preferences

User and preference data are included in the MVP to support personalized rental recommendations. Destination-level personalization (aspect-based scoring) is out of scope for the MVP.

| table | key fields |
|---|---|
| `users` | user_id, name, email, password/googleId, tokens, timestamps |
| `user_preferences` | user_id (PK), preferred transport modes, preferred destination tags, avoid tags, budget min/max |

Preference fields are stored as JSONB to allow flexible filtering without schema changes. In the MVP, these preferences are used exclusively to filter and rank rental options by vehicle category, budget range, and transport mode.

### 3.2 Destinations

The destinations domain stores point-of-interest data for tourism venues across Vietnam, primarily Ho Chi Minh City. The current seed data contains 1,847 destination records covering tourist attractions, parks, markets, historical landmarks, museums, religious sites, and food-related points of interest.

| table | key fields |
|---|---|
| `destinations` | destination_id, name, category, address, lat/lng, rating_avg, description, is_active, timestamps |

### 3.3 GTFS Transit Data

Public transit data follows the standard GTFS schema [1], with a `feed_id` column on every table to support multiple city feeds within the same database. Four feeds are seeded:

| feed ID | city | agency |
|---|---|---|
| `FEED000001` | Hanoi | Transerco |
| `FEED000002` | Ho Chi Minh City | HCMC Bus |
| `HCMCNOBUS` | Ho Chi Minh City | HURC |
| `HANOINOBUS` | Hanoi | HPC |

| table | description |
|---|---|
| `gtfs_feeds` | feed registry with metadata, city, active flag, and timestamps |
| `gtfs_agency` | transit agency records per feed |
| `gtfs_routes` | route definitions (line name, type, color) |
| `gtfs_stops` | stop locations with lat/lng |
| `gtfs_trips` | individual trip records linked to routes and calendar |
| `gtfs_stop_times` | arrival/departure times per stop per trip |
| `gtfs_calendar` | service day patterns |

Current generated GTFS output contains:

| file | rows (excl. header) |
|---|---|
| HCMC stops | 5,961 |
| Hanoi stops | 5,302 |
| HCMC routes | 319 |
| Hanoi routes | 374 |

A view `v_route_stops` assembles route and stop data for transit queries. A utility function `nearest_stops(lat, lon, feed_id, limit)` returns the closest stops to a given coordinate using haversine distance.

### 3.4 Vehicle Rental

The rental domain defines transport mode classifications within the database. Detailed shop and vehicle data is managed as CSV datasets and served via API.

| table | key fields |
|---|---|
| `transport_modes` | mode_id, code (enum), name, is_gtfs |

Supported rental mode codes: `MOTORBIKE_RENTAL`, `CAR_RENTAL`. The seed data also defines `BUS`, `METRO`, `WALK`, `RIDE_HAILING`, `TRAIN`, and `FERRY` modes for future use. Active ride-hailing providers seeded include Grab, Be, and Xanh SM.

| file | rows (excl. header) | description |
|---|---|---|
| `rental_shops.csv` | 12 | shop ID, name, city, district, lat/lng, tier, vehicle types offered |
| `vehicles_cars.csv` | 1,768 | brand, model, engine, hp, top speed, fuel, seats, price, category |
| `vehicles_motorbikes.csv` | 38,772 | brand, model, power, mileage, fuel, gear, offer type, price, category, year |
| `shop_inventory.csv` | 18,133 | vehicle–shop mapping with daily rental price (USD), units available, condition |
| `rental_recommendations_flat.csv` | 18,133 | denormalized join of all above for fast recommendation queries |

**Rental tiers:** Budget · Mid-Range · Premium · Luxury · Ultra-Luxury · High-End

**Cities covered:** Ho Chi Minh City (Districts 1, 3, 7, Binh Thanh, Tan Binh, Go Vap), Hanoi (Hoan Kiem, Ba Dinh, Dong Da, Cau Giay, Long Bien, Tay Ho).

---

## 4. Technical Implementation

### 4.1 Schema Design

The `trip_db` schema is implemented in PostgreSQL and organized around the three MVP domains. All primary keys use fixed-width `character(10)` identifiers (e.g., `DST0000001` for destinations, `FEED000001` for GTFS feeds) to ensure stable cross-table references. GTFS child tables cascade deletions from `gtfs_feeds`, so removing a feed entry cleans up all associated agency, route, stop, trip, and stop time records automatically.

The schema defines two notable objects beyond the core tables:

- **`v_route_stops`** — a view that joins `gtfs_routes`, `gtfs_trips`, `gtfs_stop_times`, and `gtfs_stops` to produce a flat representation of which stops belong to which routes. This is the primary query surface for transit stop lookup.
- **`nearest_stops(lat, lon, p_feed, lim)`** — a SQL helper function that computes approximate distances using the spherical law of cosines and returns the `lim` closest stops within a given feed. This avoids the need for a PostGIS extension in the MVP.

### 4.2 Schema Constraints

Domain rules enforced at the database level for MVP tables:

| rule | constraint |
|---|---|
| destination rating avg | `0 ≤ rating_avg ≤ 5` |
| transport mode code | enum of allowed values |
| GTFS referential integrity | stop times reference valid trips and stops; trips reference valid routes |

### 4.3 Indexes

Key indexes defined in `schema.sql` for MVP query performance:

| index target | purpose |
|---|---|
| `destinations(category)`, `destinations(name)` | category browsing and name search |
| `gtfs_stops(stop_lat, stop_lon)` | coordinate-based nearest-stop queries |
| `gtfs_stop_times(trip_id)`, `gtfs_stop_times(stop_id)` | stop time joins for route reconstruction |
| `gtfs_trips(route_id)` | route-to-trip lookups |

### 4.4 GTFS Feed Generation

The GTFS data is not downloaded from official agency sources but generated from OpenStreetMap data via the `public transport/vietnam-gtfs/` package, which queries the Overpass API. The expected output per city is:

```
agency.txt
routes.txt
stops.txt
trips.txt
stop_times.txt
calendar.txt
shapes.txt
feed_info.txt
```

These are packaged as `gtfs.zip` and loaded into the `gtfs_*` tables via `gtfs_loader.py` with a city-specific `feed_id`. The multi-feed design means Hanoi and HCMC bus, metro, and train data can coexist in the same schema without table duplication.

### 4.5 Rental Data Pipeline

The rental CSV pipeline produces a denormalized `rental_recommendations_flat.csv` by joining vehicle attributes (brand, model, specs, category) with shop metadata (location, tier) and inventory records (daily price, availability, condition). This flat file is suitable for direct API serving or analytical filtering without requiring SQL joins at query time.

---

## 5. ETL Pipeline

### 5.1 Extract

- **Destinations:** scraped via the gosom Google Maps scraper [2].
- **GTFS feeds:** generated from OpenStreetMap Overpass API data via the `public transport/vietnam-gtfs/` package, as Vietnam's GTFS data are not publicly available to the best of our knowledge.
- **Rental data:** curated CSV datasets for shops, cars, and motorbikes, served via API.

### 5.2 Transform

- POI data is normalized into `destinations` with standardized category, coordinates, and rating fields.
- GTFS files are parsed and keyed by `feed_id` to support multiple cities in one schema.
- Rental CSV data is denormalized into `rental_recommendations_flat.csv` for query efficiency.

### 5.3 Load

| artifact | purpose |
|---|---|
| `schema.sql` | creates all tables, constraints, views, and functions |
| `data.sql` | bulk loads 1,847 destination records and seeds transport modes and GTFS feed entries |
| `gtfs_loader.py` | upserts GTFS feeds into `gtfs_*` tables |

All loaders support repeated runs without data corruption via upsert logic.

---

## 6. Known Limitations

The following issues are identified in the current MVP implementation:

1. **`destination_aspects` table is missing.** Earlier design documents reference this table, but it is not defined in `schema.sql`. Either the schema should add it or aspects should be treated as derived metadata within the `destination_triples` JSONB structure. [TODO: decide and resolve before post-MVP development]

2. **GTFS feeds may have incomplete timetable data.** Because feeds are generated from OSM rather than official agency exports, some routes may lack complete stop time sequences or shape geometry. Route-planning behavior should account for partial feeds and distinguish schedule-backed routes from geometry-only data.

3. **Rental CSV data has no database-level constraints.** Shop inventory and vehicle records are stored as flat files without referential integrity, uniqueness enforcement, or currency validation. This is acceptable for MVP API serving but should be revisited if transactional updates or cross-domain joins are needed.

4. **Provider-to-mode seed data has incorrect references.** In `data.sql`, ride-hailing providers reference `MODE000006` (seeded as `CAR_RENTAL`) instead of the correct `RIDE_HAILING` mode. Motorbike and car rental placeholder providers similarly reference wrong mode IDs. This should be corrected before relying on provider-mode joins in post-MVP routing features.

---

## 7. Out-of-Scope Items

The following are explicitly deferred to post-MVP:

- user accounts and preference management
- trip planning and itinerary management
- route calculation and option scoring
- fully functional RAG model for recommending forms of transport
- destination rating and recommendations
- live GTFS-RT or real-time traffic feeds
- live ride-hailing API integration
- mobile application

---

## 8. Conclusion

This MVP establishes a unified data foundation across three domains: structured destination data for Ho Chi Minh City and Hanoi, GTFS public transit covering over 11,000 stops and 693 routes across both cities, and a vehicle rental marketplace served via API. Together they form a coherent backend that can support recommendation and routing features in future system iterations.

---

## References

[1] Google Developers, "GTFS Reference," *General Transit Feed Specification*. [Online]. Available: https://gtfs.org. [Accessed: May 2026].

[2] G. Kostopoulos, "google-maps-scraper," *GitHub*. [Online]. Available: https://github.com/gosom/google-maps-scraper. [Accessed: May 2026].

---

## Appendix A: Full MVP Table List

`users` · `user_preferences` · `destinations` · `transport_modes` · `gtfs_feeds` · `gtfs_agency` · `gtfs_routes` · `gtfs_stops` · `gtfs_trips` · `gtfs_stop_times` · `gtfs_calendar` · `v_route_stops` (view)

## Appendix B: Rental Shop Locations

| shop | city | district | vehicle types | tiers |
|---|---|---|---|---|
| Saigon Wheels Hub | HCMC | District 1 | car, motorbike | Budget, Mid-Range |
| DriveVN Premium | HCMC | Binh Thanh | car | Mid-Range, Luxury |
| Moto Saigon | HCMC | District 3 | motorbike | Budget – Premium |
| Airport Ride HCMC | HCMC | Tan Binh | car, motorbike | Mid-Range, Luxury |
| Luxe Drive Saigon | HCMC | District 7 | car | Luxury – Ultra-Luxury |
| Phuong Nam Rentals | HCMC | Go Vap | car, motorbike | Budget, Mid-Range |
| Hanoi Explorer Rentals | Hanoi | Hoan Kiem | car, motorbike | Budget, Mid-Range |
| Capital Drive VN | Hanoi | Ba Dinh | car | Mid-Range, Luxury |
| Thang Long Moto | Hanoi | Dong Da | motorbike | Budget – Premium |
| West Lake Wheels | Hanoi | Cau Giay | car, motorbike | Mid-Range, Luxury |
| Noi Bai Connect Rentals | Hanoi | Long Bien | car | Budget – Luxury |
| Tay Ho Premium Rides | Hanoi | Tay Ho | car, motorbike | Luxury – High-End |