# Vietnam Tourism Recommendation System - Design Document

## Overview

This repository contains the backend infrastructure for a tourism recommendation system focused on Vietnam, particularly Ho Chi Minh City and Hanoi. The system provides personalized trip planning, destination recommendations, and multi-modal transportation options including public transit (GTFS), ride hailing, and other services.

### Key Features

- **User Management**: Authentication with local and OAuth providers
- **Trip Planning**: Create and manage multi-destination trips with transportation routing
- **Destination Discovery**: POI database with reviews and aspect-based recommendations
- **Transportation Integration**: GTFS data for public transit, ride hailing APIs, and custom providers
- **Recommendation Engine**: Aspect-based scoring using review text analysis (triples)
- **Real-time Routing**: Route options with cost, duration, and scoring factors

## Architecture

### High-Level Architecture

```
[External Data Sources]
    ↓
[Scrapers & Loaders] → [PostgreSQL Database] ← [Recommendation Service]
    ↓
[API Layer] → [Frontend/Client Apps]
```

### Components

#### 1. Database Layer
- **Technology**: PostgreSQL with pgvector extension
- **Schema**: trip_db schema with core tables and GTFS tables
- **Key Tables**:
  - User management: `users`, `user_preferences`
  - Content: `destinations`, `reviews`, `destination_triples`, `destination_aspects`
  - Trip planning: `trips`, `trip_destinations`
  - Routing: `route_requests`, `route_options`, `trip_scores`
  - Transportation: `transport_modes`, `transport_providers`, `gtfs_*` tables

#### 2. Data Ingestion Layer
- **GTFS Loader** (`gtfs_loader.py`): Imports GTFS feeds for public transit data
- **Triples Loader** (`triples_loader.py`): Loads aspect-based triples from review analysis
- **Scrapers**:
  - Google Maps scraper (external repo)
  - Google Reviews scraper (external repo)
  - Overpass API scraper for OSM data
  - Ride hailing API integrations

#### 3. Core Services
- **Recommendation Service**: Uses destination triples for aspect-based matching
- **Routing Service**: Combines GTFS, ride hailing, and other transport modes
- **Scoring Service**: Applies weather, traffic, cost, and comfort factors

#### 4. API Layer
- RESTful APIs for trip management, routing, and recommendations
- Authentication endpoints
- Data export/import endpoints

## Database Schema

### Core Entities

#### Users & Preferences
```sql

users (
    id SERIAL PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password VARCHAR(255),

    "googleId" VARCHAR(255) UNIQUE,

    "resetPasswordToken" VARCHAR(255),

    "resetPasswordExpires" TIMESTAMP,

    "refreshToken" TEXT,

    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

user_preferences (
    user_id char(10) PRIMARY KEY REFERENCES users,
    preferred_transport_modes jsonb,
    preferred_destination_tags jsonb,
    preferred_food_tags jsonb,
    avoid_tags jsonb,
    budget_min numeric(12,2),
    budget_max numeric(12,2)
)
```

#### Destinations & Reviews
```sql
destinations (
    destination_id char(10) PRIMARY KEY,
    name varchar(150),
    category varchar(50),
    address text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    rating_avg numeric(3,2),
    is_active boolean DEFAULT true
)

reviews (
    user_id char(10) REFERENCES users,
    destination_id char(10) REFERENCES destinations,
    rating integer CHECK (rating >=1 AND rating <=5),
    comment text,
    PRIMARY KEY (user_id, destination_id)
)
```

#### Trip Planning
```sql
trips (
    trip_id char(10) PRIMARY KEY,
    user_id char(10) REFERENCES users,
    title varchar(150),
    origin_name varchar(150),
    origin_latitude numeric(10,7),
    origin_longitude numeric(10,7),
    start_time timestamptz,
    end_time timestamptz,
    total_estimated_budget numeric(12,2),
    status varchar(20)
)

trip_destinations (
    trip_id char(10) REFERENCES trips,
    destination_id char(10) REFERENCES destinations,
    visit_order integer,
    arrival_time timestamptz,
    departure_time timestamptz,
    note text,
    PRIMARY KEY (trip_id, destination_id)
)
```

#### Transportation & Routing
```sql
transport_modes (
    mode_id char(10) PRIMARY KEY,
    code varchar(30) UNIQUE,
    name varchar(100),
    is_gtfs boolean,
    gtfs_route_type smallint
)

transport_providers (
    provider_id char(10) PRIMARY KEY,
    mode_id char(10) REFERENCES transport_modes,
    name varchar(100) UNIQUE,
    provider_type varchar(30),
    website_url text,
    app_deep_link text,
    is_active boolean
)

route_requests (
    request_id char(10) PRIMARY KEY,
    user_id char(10) REFERENCES users,
    trip_id char(10) REFERENCES trips,
    origin_name varchar(150),
    origin_latitude numeric(10,7) NOT NULL,
    origin_longitude numeric(10,7) NOT NULL,
    destination_name varchar(150),
    destination_latitude numeric(10,7) NOT NULL,
    destination_longitude numeric(10,7) NOT NULL,
    requested_at timestamptz
)

route_options (
    option_id char(10) PRIMARY KEY,
    request_id char(10) REFERENCES route_requests,
    mode_id char(10) REFERENCES transport_modes,
    provider_id char(10) REFERENCES transport_providers,
    gtfs_feed_id char(10),
    gtfs_route_ids jsonb,
    gtfs_stop_ids jsonb,
    option_name varchar(150),
    estimated_cost numeric(12,2),
    estimated_duration_min integer,
    distance_km numeric(10,2),
    transfer_count integer,
    score numeric(4,2)
)
```

#### Recommendation Data
```sql
destination_triples (
    destination_id char(10) PRIMARY KEY REFERENCES destinations,
    triples jsonb,
    generated_at timestamptz
)

destination_aspects (
    aspect_id serial PRIMARY KEY,
    aspect_key varchar(50) UNIQUE,
    display_name varchar(100),
    popularity_rank smallint
)
```

### GTFS Tables
Standard GTFS schema with feed_id prefixing for multi-city support:
- `gtfs_feeds`
- `gtfs_agency`
- `gtfs_calendar`
- `gtfs_routes`
- `gtfs_stops`
- `gtfs_trips`
- `gtfs_stop_times`

## Data Flow

### Trip Planning Flow
1. User creates trip with origin and destinations
2. System generates route requests between consecutive points
3. For each request, routing service queries:
   - GTFS data for public transit options
   - External APIs for ride hailing estimates
   - Custom providers for rentals
4. Scoring service applies factors (weather, traffic, cost, comfort)
5. User selects preferred options

### Recommendation Flow
1. User specifies preferences (budget, transport modes, aspects)
2. System queries destination_triples for aspect matching
3. Destinations ranked by triple scores and user preferences
4. Results filtered by budget and transport feasibility

## Data Ingestion

### GTFS Data
- **Source**: Official transit agency feeds and OSM-derived GTFS
- **Loader**: `gtfs_loader.py` with upsert logic
- **Cities**: Hanoi (Transerco), Ho Chi Minh City (HCMC Bus)
- **Update Frequency**: Manual re-run on feed updates

### Destination Data
- **Source**: Google Maps scraper (external)
- **Processing**: Review text analysis for aspect triples
- **Loader**: `triples_loader.py`
- **Format**: JSON with aspect-based sentiment scores

### Transportation Providers
- **Ride Hailing**: Grab API integration
- **Rentals**: Placeholder for bike/car rental providers
- **Public Transit**: GTFS feeds

## APIs & Integrations

### External APIs
- **Grab Fare Feed**: Ride hailing estimates
- **OpenStreetMap Overpass**: Transit infrastructure data
- **Google Maps/Reviews**: POI and review data (via scrapers)

### Internal APIs
- Trip CRUD operations
- Route calculation
- Recommendation queries
- User management

## Deployment & Operations

### Environment Setup
- Python 3.8+ for loaders and scrapers
- PostgreSQL 13+ with pgvector
- Virtual environment recommended

### Data Loading
```bash
# Load GTFS data
python gtfs_loader.py --feed-id FEED000001 --gtfs-dir ./hanoi_gtfs --city "Hanoi" --dsn "postgresql://..."

# Load destination triples
python triples_loader.py --file ./final_destination_triples.json --dsn "postgresql://..."
```

### Monitoring
- Database performance on complex queries
- External API rate limits
- GTFS feed freshness
- Triple generation recency

## Future Enhancements

### Short Term
- Real-time GTFS-RT integration
- Enhanced scoring with ML models
- Mobile app deep linking

### Long Term
- Multi-city expansion
- Advanced recommendation algorithms
- Real-time traffic integration
- Social features (trip sharing, reviews)

## Development Guidelines

### Code Organization
- Loaders in root directory
- Scrapers in dedicated subfolders
- Database schema in `schema.sql`
- Mock data in `data.sql`

### Data Quality
- Referential integrity enforced
- JSONB for flexible preferences
- GIN indexes on searchable fields
- Validation triggers for data consistency

### Security
- Password hashing for local auth
- API key management for external services
- Input validation on all endpoints
- Audit logging for sensitive operations</content>
<parameter name="filePath">/home/baothieu1661/Documents/DB_Docs/DESIGN.md