# Database Design — Travel Planning App

## Overview

Single PostgreSQL database, all tables under the `trip_db` schema. Data is split into four logical groups:

- **App tables** — core user-facing data (trips, destinations, reviews)
- **Transport tables** — modes and providers (ride hailing, rentals)
- **GTFS tables** — imported public transit data (bus, metro, train)
- **Scoring tables** — route recommendation scores

---

## Setup Order

Use the bootloader — it handles everything automatically:

```bash
python bootloader.py \
  --dsn         "postgresql://user:pass@localhost:5432/mydb" \
  --hanoi-gtfs  ./hanoi_gtfs \
  --hcmc-gtfs   ./hcmc_gtfs \
  --triples     ./final_destination_triples.json
```

Or run manually in this order:

```
1. schema_v2.sql       — app + transport tables
2. gtfs_schema.sql     — GTFS tables + views + nearest_stops()
3. triples_schema.sql  — destination_triples + destination_aspects
4. seed.sql            — transport modes + providers + top 30 aspects
5. gtfs_loader.py      — import GTFS feed(s) per city
6. triples_loader.py   — import destination triples JSON
```

**Skip flags** (bootloader only):
```bash
--skip-schema    # skip SQL schema files (already applied)
--skip-seed      # skip seed.sql
--skip-gtfs      # skip GTFS loading
--skip-triples   # skip triples loading
```

---

## Tables

### `users`
Core user accounts. Supports both local auth (email + password) and OAuth providers.

| Column | Type | Notes |
|---|---|---|
| `user_id` | char(10) | PK |
| `full_name` | varchar(120) | |
| `email` | varchar(150) | unique |
| `phone` | varchar(100) | unique, nullable |
| `password_hash` | text | null if OAuth |
| `auth_provider` | varchar(30) | `local`, `google`, etc. |

---

### `user_preferences`
One row per user. Stores soft preferences as JSONB — not behavioral history, just explicit settings the user configures.

| Column | Type | Notes |
|---|---|---|
| `user_id` | char(10) | PK, FK → users |
| `preferred_transport_modes` | jsonb | e.g. `["BUS","WALK"]` |
| `preferred_destination_tags` | jsonb | e.g. `["food","nature"]` |
| `preferred_food_tags` | jsonb | |
| `avoid_tags` | jsonb | e.g. `["crowded"]` |
| `budget_min` | numeric(12,2) | VND |
| `budget_max` | numeric(12,2) | VND |

---

### `destinations`
Points of interest users can add to trips and review. Seeded manually or via scraper.

| Column | Type | Notes |
|---|---|---|
| `destination_id` | char(10) | PK |
| `name` | varchar(150) | |
| `category` | varchar(50) | e.g. `restaurant`, `museum` |
| `address` | text | |
| `latitude` / `longitude` | numeric(10,7) | |
| `rating_avg` | numeric(3,2) | 0–5, updated by trigger or service |
| `is_active` | boolean | false = hidden from app |

---

### `reviews`
User reviews of destinations. Composite PK `(user_id, destination_id)` — one review per user per destination.

| Column | Type | Notes |
|---|---|---|
| `user_id` | char(10) | PK, FK → users |
| `destination_id` | char(10) | PK, FK → destinations |
| `rating` | integer | 1–5 |
| `comment` | text | nullable |

---

### `transport_modes`
Fixed lookup table for transport types. Seeded once, rarely changes.

| Column | Type | Notes |
|---|---|---|
| `mode_id` | char(10) | PK |
| `code` | varchar(30) | unique — see allowed values below |
| `name` | varchar(100) | display name |
| `is_gtfs` | boolean | true = backed by GTFS data |
| `gtfs_route_type` | smallint | GTFS spec int (3=bus, 1=metro, 2=train, 4=ferry) |

**Allowed codes:**

| Code | GTFS? | Description |
|---|---|---|
| `BUS` | ✅ | City bus |
| `METRO` | ✅ | Metro / subway |
| `TRAIN` | ✅ | Intercity train |
| `FERRY` | ✅ | Ferry |
| `WALK` | ❌ | Walking leg |
| `RIDE_HAILING` | ❌ | Grab, Be, Xanh SM |
| `MOTORBIKE_RENTAL` | ❌ | Motorbike rental companies |
| `CAR_RENTAL` | ❌ | Car rental companies |

---

### `transport_providers`
Specific brands for non-GTFS modes. Public transit has no provider rows — it's represented by `gtfs_feeds` instead.

| Column | Type | Notes |
|---|---|---|
| `provider_id` | char(10) | PK |
| `mode_id` | char(10) | FK → transport_modes |
| `name` | varchar(100) | unique, e.g. `Grab` |
| `provider_type` | varchar(30) | `RIDE_HAILING`, `MOTORBIKE_RENTAL`, `CAR_RENTAL` |
| `website_url` | text | nullable |
| `app_deep_link` | text | e.g. `grab://` for UX linking |
| `is_active` | boolean | false = excluded from recommendations |

**Seeded providers:**

| ID | Name | Type | Active |
|---|---|---|---|
| PROV000001 | Grab | RIDE_HAILING | ✅ |
| PROV000002 | Be | RIDE_HAILING | ✅ |
| PROV000003 | Xanh SM | RIDE_HAILING | ✅ |
| PROV000004 | MyGo | RIDE_HAILING | ✅ |
| PROV000010–11 | Motorbike Rental TBD | MOTORBIKE_RENTAL | ❌ |
| PROV000020–22 | Car Rental TBD | CAR_RENTAL | ❌ |

> Car rental providers are placeholders (`is_active = false`). Update them when the dataset is ready.

---

### `trips`
A user's saved trip plan. The origin is stored here; stops are in `trip_destinations`.

| Column | Type | Notes |
|---|---|---|
| `trip_id` | char(10) | PK |
| `user_id` | char(10) | FK → users |
| `title` | varchar(150) | user-given name |
| `origin_name` | varchar(150) | free-text origin |
| `origin_latitude` / `origin_longitude` | numeric(10,7) | |
| `start_time` / `end_time` | timestamptz | nullable |
| `total_estimated_budget` | numeric(12,2) | VND |
| `status` | varchar(20) | `DRAFT`, `PLANNED`, `COMPLETED`, `CANCELLED` |

---

### `trip_destinations`
Ordered stops within a trip. Composite PK `(trip_id, destination_id)`. `visit_order` is unique per trip to enforce ordering.

| Column | Type | Notes |
|---|---|---|
| `trip_id` | char(10) | PK, FK → trips |
| `destination_id` | char(10) | PK, FK → destinations |
| `visit_order` | integer | unique per trip, > 0 |
| `arrival_time` / `departure_time` | timestamptz | nullable |
| `note` | text | user note for this stop |

---

### `route_requests`
One row per "find me routes from A to B" call. Created by the backend when the user asks for transport recommendations. Linked optionally to a trip.

| Column | Type | Notes |
|---|---|---|
| `request_id` | char(10) | PK |
| `user_id` | char(10) | FK → users, nullable (anonymous allowed) |
| `trip_id` | char(10) | FK → trips, nullable |
| `origin_name` | varchar(150) | |
| `origin_latitude` / `origin_longitude` | numeric(10,7) | NOT NULL |
| `destination_name` | varchar(150) | |
| `destination_latitude` / `destination_longitude` | numeric(10,7) | NOT NULL |
| `requested_at` | timestamptz | |

---

### `route_options`
Each transport option returned for a `route_request`. One request → multiple options (one per viable mode/provider combo).

| Column | Type | Notes |
|---|---|---|
| `option_id` | char(10) | PK |
| `request_id` | char(10) | FK → route_requests |
| `mode_id` | char(10) | FK → transport_modes |
| `provider_id` | char(10) | FK → transport_providers, **NULL for GTFS modes** |
| `gtfs_feed_id` | char(10) | FK → gtfs_feeds, NULL for non-GTFS modes |
| `gtfs_route_ids` | jsonb | e.g. `["Q02", "19"]` — GTFS route_ids used |
| `gtfs_stop_ids` | jsonb | key stops along the route |
| `option_name` | varchar(150) | display name |
| `estimated_cost` | numeric(12,2) | VND |
| `estimated_duration_min` | integer | |
| `distance_km` | numeric(10,2) | |
| `transfer_count` | integer | legs for public transit |
| `score` | numeric(4,2) | 0–10, set by scoring service |

**GTFS vs non-GTFS options:**

| Field | Bus/Metro/Train | Grab/Rental |
|---|---|---|
| `provider_id` | NULL | PROV000001 etc. |
| `gtfs_feed_id` | FEED000001 etc. | NULL |
| `gtfs_route_ids` | `["hanoi_23"]` | NULL |
| `transfer_count` | meaningful | 0 |

---

### `trip_scores`
Scoring service output for a specific `route_option`. Stores each factor separately so the frontend can explain the score to users.

| Column | Type | Notes |
|---|---|---|
| `score_id` | char(10) | PK |
| `option_id` | char(10) | FK → route_options |
| `weather_factor` | numeric(4,2) | 0–10 |
| `traffic_factor` | numeric(4,2) | 0–10 |
| `cost_factor` | numeric(4,2) | 0–10 |
| `comfort_factor` | numeric(4,2) | 0–10 |
| `overall_score` | numeric(4,2) | 0–10, NOT NULL |
| `external_data_snapshot` | jsonb | raw weather/traffic API response |
| `scored_at` | timestamptz | |

> `external_data_snapshot` is the cache — if the same route is requested again within a short window, return this instead of hitting external APIs again.

---

### `destination_triples`
Cosimilarity triple data per destination, generated from review text. Kept separate from `destinations` so regular destination queries stay lean — only joined when running recommendations.

| Column | Type | Notes |
|---|---|---|
| `destination_id` | char(10) | PK, FK → destinations |
| `triples` | jsonb | keyed by aspect, e.g. `{"food": {"pos": ["fresh"], "neg": [], "score": 0.85}}` |
| `generated_at` | timestamptz | when the triples were last computed |

GIN index on `triples` enables fast aspect queries without full table scans.

> **Current dataset:** 481 destinations, 243 triple keys each. 16 of the top 30 aspects have direct matches in the data; the remaining 14 (e.g. `temple`, `church`, `tea`) simply had no review signal — they return no score rather than erroring.

---

### `destination_aspects`
The top 30 aspects shown in the user input form, ranked by popularity. The frontend reads this table to render filter options; the recommendation service uses `aspect_key` to look up the matching triple key.

| Column | Type | Notes |
|---|---|---|
| `aspect_id` | serial | PK |
| `aspect_key` | varchar(50) | unique — matches key in `destination_triples.triples` |
| `display_name` | varchar(100) | label shown in UI |
| `popularity_rank` | smallint | 1 = most popular |

**Top 30 aspects (seeded):**
`market`, `food`, `price`, `guide`, `service`, `staff`, `park`, `space`, `view`, `quality`, `temple`, `air`, `trees`, `church`, `shop`, `mall`, `floor`, `atmosphere`, `city`, `attitude`, `culture`, `location`, `markets`, `life`, `clothes`, `store`, `scenery`, `goods`, `tea`, `fun`

---

## GTFS Tables

These are populated by `gtfs_loader.py` and should be treated as **read-only** by the app — only the loader writes to them.

### `gtfs_feeds`
One row per city feed. The loader upserts this automatically.

| Column | Notes |
|---|---|
| `feed_id` | PK, char(10) |
| `city` | e.g. `Hanoi`, `Ho Chi Minh City` |
| `agency_name` | e.g. `Transerco` |
| `feed_url` | static GTFS zip URL |
| `realtime_url` | GTFS-RT endpoint (optional) |
| `last_fetched_at` | updated by loader on each run |

**Current feeds:**

| feed_id | City | Agency |
|---|---|---|
| FEED000001 | Hanoi | Transerco |
| FEED000002 | Ho Chi Minh City | HCMC Bus |

### `gtfs_agency` / `gtfs_calendar` / `gtfs_routes` / `gtfs_stops` / `gtfs_trips` / `gtfs_stop_times`
Mirror the GTFS spec directly. All have `(feed_id, <gtfs_id>)` composite PKs so Hanoi and HCMC data coexist without ID collisions.

> **Known limitation:** Your current feed has all `stop_times` arrival/departure times as `00:00:00` (community scraper limitation). These are stored as `NULL`. Stop sequences and distances are intact — route previews work, but real-time schedules don't until the feed improves.

---

## Useful Queries

### Nearest bus stops to a coordinate
```sql
SELECT * FROM trip_db.nearest_stops(21.028, 105.854, 'FEED000001', 5);
-- Returns the 5 closest stops to that lat/lon with distance in metres
```

### All stops for a route in order
```sql
SELECT * FROM trip_db.v_route_stops
WHERE feed_id = 'FEED000001' AND route_short_name = '23';
```

### All active ride hailing providers
```sql
SELECT p.name, p.website_url, p.app_deep_link
FROM trip_db.transport_providers p
JOIN trip_db.transport_modes m ON m.mode_id = p.mode_id
WHERE m.code = 'RIDE_HAILING' AND p.is_active = true;
```

### Destinations scored by multiple user-selected aspects
```sql
-- Dynamically built by recommendation service based on user's selected aspects
SELECT d.destination_id, d.name,
    COALESCE((t.triples -> 'food'  ->> 'score')::numeric, 0) +
    COALESCE((t.triples -> 'view'  ->> 'score')::numeric, 0) +
    COALESCE((t.triples -> 'space' ->> 'score')::numeric, 0) AS relevance_score
FROM trip_db.destination_triples t
JOIN trip_db.destinations d ON d.destination_id = t.destination_id
WHERE d.is_active = true
ORDER BY relevance_score DESC
LIMIT 10;
```

### All aspects for the input form, in order
```sql
SELECT aspect_key, display_name
FROM trip_db.destination_aspects
ORDER BY popularity_rank;
```


```sql
SELECT
    ro.option_name,
    m.name        AS mode,
    p.name        AS provider,
    ro.estimated_cost,
    ro.estimated_duration_min,
    ts.overall_score,
    ts.weather_factor,
    ts.traffic_factor
FROM trip_db.route_options ro
JOIN trip_db.transport_modes m ON m.mode_id = ro.mode_id
LEFT JOIN trip_db.transport_providers p ON p.provider_id = ro.provider_id
LEFT JOIN trip_db.trip_scores ts ON ts.option_id = ro.option_id
WHERE ro.request_id = 'RQST000001'
ORDER BY ts.overall_score DESC NULLS LAST;
```

---

## Loading a New GTFS Feed

```bash
pip install psycopg2-binary

python gtfs_loader.py \
  --feed-id   FEED000001 \
  --gtfs-dir  ./hanoi_gtfs \
  --city      "Hanoi" \
  --agency    "Transerco" \
  --dsn       "postgresql://user:pass@localhost:5432/mydb"
```

The loader automatically upserts the `gtfs_feeds` parent row — no manual SQL needed. Re-running is safe; all inserts use `ON CONFLICT DO UPDATE`.

---

## Adding Car Rental Providers

When the car rental dataset is ready, update the placeholder rows:

```sql
UPDATE trip_db.transport_providers
SET
    name        = 'Actual Company Name',
    website_url = 'https://...',
    is_active   = true,
    last_updated_at = now()
WHERE provider_id = 'PROV000020';
```

Or insert new rows following the same pattern with `provider_type = 'CAR_RENTAL'` and `mode_id = 'MODE000008'`.

---

## What Fills Itself (App-Generated)

These tables don't need seeding — rows are created by your backend services as users interact with the app:

| Table | Created when |
|---|---|
| `trips` | User saves a trip plan |
| `trip_destinations` | User adds a stop to a trip |
| `route_requests` | User asks for transport recommendations |
| `route_options` | Recommendation service responds |
| `trip_scores` | Scoring service runs on a route option |
| `reviews` | User submits a destination review |
