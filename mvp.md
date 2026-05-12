# Vietnam Tourism Recommendation System: Minimum Viable Product

---

## Abstract

Tourism in Vietnam, particularly in Ho Chi Minh City and Hanoi, involves complex decisions across destination selection and transportation. This paper presents the Minimum Viable Product (MVP) of a backend system focused on three core data domains: destination management, public transit integration via GTFS, and a vehicle rental marketplace. The system is built on a PostgreSQL schema (`trip_db`) and supported by an ETL pipeline that ingests data from web scrapers, official transit feeds, and curated rental datasets. The MVP covers 12 rental shops, approximately 40,000 vehicle records, and GTFS data for two cities, forming a stable data foundation for future recommendation and routing features.

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
  gtfs_* tables
  transport_modes, transport_providers
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

### 3.1 Destinations

The destinations domain stores point-of-interest data for tourism venues across Vietnam, primarily Ho Chi Minh City.

| table | key fields |
|---|---|
| `destinations` | destination_id, name, category, address, lat/lng, rating_avg, description, is_active, timestamps |

### 3.2 GTFS Transit Data

Public transit data follows the standard GTFS schema [1], with a `feed_id` column on every table to support multiple city feeds within the same database.

| table | description |
|---|---|
| `gtfs_feeds` | feed registry with metadata, city, active flag, and timestamps |
| `gtfs_agency` | transit agency records per feed |
| `gtfs_routes` | route definitions (line name, type, color) |
| `gtfs_stops` | stop locations with lat/lng |
| `gtfs_trips` | individual trip records linked to routes and calendar |
| `gtfs_stop_times` | arrival/departure times per stop per trip |
| `gtfs_calendar` | service day patterns |

A view `v_route_stops` assembles route and stop data for transit queries. A utility function `nearest_stops(lat, lon, feed_id, limit)` returns the closest stops to a given coordinate using haversine distance.

**Cities covered in MVP:** Ho Chi Minh City (HCMC Bus), Hanoi (Transerco).

### 3.3 Vehicle Rental

The rental domain defines transport mode classifications within the database. Detailed shop and vehicle data is managed as CSV datasets and served via API.

| table | key fields |
|---|---|
| `transport_modes` | mode_id, code (enum), name, is_gtfs |

Supported rental mode codes: `MOTORBIKE_RENTAL`, `CAR_RENTAL`.

| file | approx. rows | description |
|---|---|---|
| `rental_shops.csv` | 12 | shop ID, name, city, district, lat/lng, tier, vehicle types offered |
| `vehicles_cars.csv` | ~1,768 | brand, model, engine, hp, top speed, fuel, seats, price, category |
| `vehicles_motorbikes.csv` | ~38,772 | brand, model, power, mileage, fuel, gear, offer type, price, category, year |
| `shop_inventory.csv` | ~18,133 | vehicle–shop mapping with daily rental price (USD), units available, condition |
| `rental_recommendations_flat.csv` | — | denormalized join of all above for fast recommendation queries |

**Rental tiers:** Budget · Mid-Range · Premium · Luxury · Ultra-Luxury · High-End

**Cities covered:** Ho Chi Minh City (Districts 1, 3, 7, Binh Thanh, Tan Binh, Go Vap), Hanoi (Hoan Kiem, Ba Dinh, Dong Da, Cau Giay, Long Bien, Tay Ho).

---

## 4. Schema Constraints

Domain rules enforced at the database level for MVP tables:

| rule | constraint |
|---|---|
| destination rating avg | `0 ≤ rating_avg ≤ 5` |
| transport mode code | enum of allowed values |

---

## 5. ETL Pipeline

### 5.1 Extract

- **Destinations:** scraped via the gosom Google Maps scraper [2].
- **GTFS feeds:** scraped via Overpass API, as Vietnam's GTFS data are not publicly available to the best of our knowledge.
- **Rental data:** curated CSV datasets for shops, cars, and motorbikes, served via API.

### 5.2 Transform

- POI data is normalized into `destinations` with standardized category, coordinates, and rating fields.
- GTFS files are parsed and keyed by `feed_id` to support multiple cities in one schema.

### 5.3 Load

| artifact | purpose |
|---|---|
| `schema.sql` | creates all tables, constraints, views, and functions |
| `data.sql` | bulk loads initial destination records (HCMC focus) |
| `gtfs_loader.py` | upserts GTFS feeds into `gtfs_*` tables |

All loaders support repeated runs without data corruption via upsert logic.

---

## 6. Out-of-Scope Items

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

## 7. Conclusion

This MVP establishes a unified data foundation across three domains: structured destination data for Ho Chi Minh City and Hanoi, GTFS public transit for both cities, and a vehicle rental marketplace served via API. Together they form a coherent backend that can support recommendation and routing features in future system iterations.

---

## References

[1] Google Developers, "GTFS Reference," *General Transit Feed Specification*. [Online]. Available: https://gtfs.org. [Accessed: May 2026].

[2] Georgios Komninos, "google-maps-scraper," *GitHub*. [Online]. Available: https://github.com/gosom/google-maps-scraper. [Accessed: May 2026].


---

## Appendix A: Full MVP Table List

`destinations` · `transport_modes` · `gtfs_feeds` · `gtfs_agency` · `gtfs_routes` · `gtfs_stops` · `gtfs_trips` · `gtfs_stop_times` · `gtfs_calendar` · `v_route_stops` (view)

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