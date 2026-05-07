-- =============================================================
-- schema_v2.sql
-- Travel planning app — trip_db schema
--
-- UNCHANGED:  users, user_preferences, destinations, reviews
-- REPLACED:   transport_modes, transport_providers,
--             route_comparisons, route_options, trips,
--             trip_destinations
-- ADDED:      gtfs_feeds, trip_scores
-- =============================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA IF NOT EXISTS trip_db;

SET default_tablespace = '';
SET default_table_access_method = heap;


-- =============================================================
-- UNCHANGED TABLES
-- =============================================================

CREATE TABLE trip_db.users (
    user_id         character(10)               NOT NULL,
    full_name       character varying(120)      NOT NULL,
    email           character varying(150)      NOT NULL,
    phone           character varying(100),
    password_hash   text,
    auth_provider   character varying(30)       DEFAULT 'local' NOT NULL,
    created_at      timestamp with time zone    DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone    DEFAULT now() NOT NULL
);

ALTER TABLE ONLY trip_db.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY trip_db.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY trip_db.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);

CREATE INDEX idx_users_email ON trip_db.users USING btree (email);
CREATE INDEX idx_users_phone ON trip_db.users USING btree (phone);


-- ------------------------------------------------------------

CREATE TABLE trip_db.user_preferences (
    user_id                     character(10)           NOT NULL,
    preferred_transport_modes   jsonb,
    budget_min                  numeric(12,2),
    budget_max                  numeric(12,2),
    preferred_food_tags         jsonb,
    preferred_destination_tags  jsonb,
    avoid_tags                  jsonb,
    created_at                  timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at             timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_user_preferences_budget_max   CHECK (budget_max IS NULL OR budget_max >= 0),
    CONSTRAINT chk_user_preferences_budget_min   CHECK (budget_min IS NULL OR budget_min >= 0),
    CONSTRAINT chk_user_preferences_budget_range CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min)
);

ALTER TABLE ONLY trip_db.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY trip_db.user_preferences
    ADD CONSTRAINT fk_user_preferences_user
        FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE CASCADE;


-- ------------------------------------------------------------

CREATE TABLE trip_db.destinations (
    destination_id  character(10)               NOT NULL,
    name            character varying(150)      NOT NULL,
    category        character varying(50),
    address         text,
    latitude        numeric(10,7),
    longitude       numeric(10,7),
    description     text,
    rating_avg      numeric(3,2),
    is_active       boolean                     DEFAULT true NOT NULL,
    created_at      timestamp with time zone    DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone    DEFAULT now() NOT NULL,
    CONSTRAINT chk_destinations_rating_avg
        CHECK (rating_avg IS NULL OR (rating_avg >= 0 AND rating_avg <= 5))
);

ALTER TABLE ONLY trip_db.destinations
    ADD CONSTRAINT destinations_pkey PRIMARY KEY (destination_id);

CREATE INDEX idx_destinations_category ON trip_db.destinations USING btree (category);
CREATE INDEX idx_destinations_name     ON trip_db.destinations USING btree (name);


-- ------------------------------------------------------------

CREATE TABLE trip_db.reviews (
    user_id         character(10)               NOT NULL,
    destination_id  character(10)               NOT NULL,
    rating          integer                     NOT NULL,
    comment         text,
    created_at      timestamp with time zone    DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone    DEFAULT now() NOT NULL,
    CONSTRAINT chk_reviews_rating CHECK (rating >= 1 AND rating <= 5)
);

ALTER TABLE ONLY trip_db.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (user_id, destination_id);
ALTER TABLE ONLY trip_db.reviews
    ADD CONSTRAINT fk_reviews_user
        FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE CASCADE;
ALTER TABLE ONLY trip_db.reviews
    ADD CONSTRAINT fk_reviews_destination
        FOREIGN KEY (destination_id) REFERENCES trip_db.destinations(destination_id) ON DELETE CASCADE;

CREATE INDEX idx_reviews_destination ON trip_db.reviews USING btree (destination_id);


-- =============================================================
-- TRANSPORT MODES
-- Extended with 'MOTORBIKE_RENTAL' and 'CAR_RENTAL'.
-- GTFS covers BUS / METRO / TRAIN / FERRY natively.
-- WALK, RIDE_HAILING, *_RENTAL are app-managed.
-- =============================================================

CREATE TABLE trip_db.transport_modes (
    mode_id         character(10)               NOT NULL,
    code            character varying(30)       NOT NULL,
    name            character varying(100)      NOT NULL,
    is_gtfs         boolean                     DEFAULT false NOT NULL,
    -- gtfs_route_type: GTFS spec value (0=tram,1=subway,2=rail,3=bus,4=ferry…)
    -- NULL for non-GTFS modes
    gtfs_route_type smallint,
    created_at      timestamp with time zone    DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone    DEFAULT now() NOT NULL,
    CONSTRAINT chk_transport_modes_code CHECK (
        code = ANY (ARRAY[
            'BUS', 'METRO', 'TRAIN', 'FERRY',
            'WALK',
            'RIDE_HAILING',
            'MOTORBIKE_RENTAL', 'CAR_RENTAL'
        ])
    )
);

ALTER TABLE ONLY trip_db.transport_modes
    ADD CONSTRAINT transport_modes_pkey PRIMARY KEY (mode_id);
ALTER TABLE ONLY trip_db.transport_modes
    ADD CONSTRAINT transport_modes_code_key UNIQUE (code);

-- Seed data for reference
-- INSERT INTO trip_db.transport_modes (mode_id, code, name, is_gtfs, gtfs_route_type) VALUES
--   ('MODE000001', 'BUS',              'Bus',              true,  3),
--   ('MODE000002', 'METRO',            'Metro / Subway',   true,  1),
--   ('MODE000003', 'TRAIN',            'Train',            true,  2),
--   ('MODE000004', 'FERRY',            'Ferry',            true,  4),
--   ('MODE000005', 'WALK',             'Walking',          false, NULL),
--   ('MODE000006', 'RIDE_HAILING',     'Ride hailing',     false, NULL),
--   ('MODE000007', 'MOTORBIKE_RENTAL', 'Motorbike rental', false, NULL),
--   ('MODE000008', 'CAR_RENTAL',       'Car rental',       false, NULL);


-- =============================================================
-- GTFS FEEDS
-- One row per city / operator GTFS feed your backend consumes.
-- Your backend resolves stop_id / route_id lookups against the
-- feed referenced here — you don't import full GTFS tables.
-- =============================================================

CREATE TABLE trip_db.gtfs_feeds (
    feed_id         character(10)               NOT NULL,
    city            character varying(100)      NOT NULL,
    agency_name     character varying(150),
    feed_url        text,                       -- static GTFS zip URL
    realtime_url    text,                       -- GTFS-RT endpoint (optional)
    is_active       boolean                     DEFAULT true NOT NULL,
    last_fetched_at timestamp with time zone,
    created_at      timestamp with time zone    DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone    DEFAULT now() NOT NULL
);

ALTER TABLE ONLY trip_db.gtfs_feeds
    ADD CONSTRAINT gtfs_feeds_pkey PRIMARY KEY (feed_id);

-- Example: Ho Chi Minh City bus feed
-- INSERT INTO trip_db.gtfs_feeds (feed_id, city, agency_name, feed_url) VALUES
--   ('FEED000001', 'Ho Chi Minh City', 'Trung tâm Quản lý Giao thông', 'https://...gtfs.zip');


-- =============================================================
-- TRANSPORT PROVIDERS
-- Ride hailing brands (Grab, Be, Xanh SM) and rental partners.
-- Public transport operators are represented via gtfs_feeds.
-- mode_id links a provider to the transport mode it offers.
-- =============================================================

CREATE TABLE trip_db.transport_providers (
    provider_id     character(10)               NOT NULL,
    mode_id         character(10)               NOT NULL,   -- FK → transport_modes
    name            character varying(100)      NOT NULL,
    provider_type   character varying(30)       NOT NULL,
    website_url     text,
    app_deep_link   text,                       -- e.g. grab:// deep link for UX
    is_active       boolean                     DEFAULT true NOT NULL,
    created_at      timestamp with time zone    DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone    DEFAULT now() NOT NULL,
    CONSTRAINT chk_transport_providers_type CHECK (
        provider_type = ANY (ARRAY['RIDE_HAILING', 'MOTORBIKE_RENTAL', 'CAR_RENTAL'])
    )
);

ALTER TABLE ONLY trip_db.transport_providers
    ADD CONSTRAINT transport_providers_pkey PRIMARY KEY (provider_id);
ALTER TABLE ONLY trip_db.transport_providers
    ADD CONSTRAINT transport_providers_name_key UNIQUE (name);
ALTER TABLE ONLY trip_db.transport_providers
    ADD CONSTRAINT fk_transport_providers_mode
        FOREIGN KEY (mode_id) REFERENCES trip_db.transport_modes(mode_id);

CREATE INDEX idx_transport_providers_mode ON trip_db.transport_providers USING btree (mode_id);

-- Example seed
-- INSERT INTO trip_db.transport_providers (provider_id, mode_id, name, provider_type, website_url) VALUES
--   ('PROV000001', 'MODE000006', 'Grab',       'RIDE_HAILING',     'https://grab.com'),
--   ('PROV000002', 'MODE000006', 'Be',          'RIDE_HAILING',     'https://be.com.vn'),
--   ('PROV000003', 'MODE000006', 'Xanh SM',     'RIDE_HAILING',     'https://xanhsm.com'),
--   ('PROV000004', 'MODE000007', 'XeMayThue.vn','MOTORBIKE_RENTAL',  'https://xemaythue.vn');


-- =============================================================
-- TRIPS
-- A user's saved trip plan. Origin is stored here; destinations
-- are the ordered stops in trip_destinations.
-- status: DRAFT | PLANNED | COMPLETED | CANCELLED
-- =============================================================

CREATE TABLE trip_db.trips (
    trip_id                 character(10)               NOT NULL,
    user_id                 character(10)               NOT NULL,
    title                   character varying(150),
    origin_name             character varying(150),
    origin_latitude         numeric(10,7),
    origin_longitude        numeric(10,7),
    start_time              timestamp with time zone,
    end_time                timestamp with time zone,
    total_estimated_budget  numeric(12,2),
    status                  character varying(20)       DEFAULT 'DRAFT' NOT NULL,
    created_at              timestamp with time zone    DEFAULT now() NOT NULL,
    last_updated_at         timestamp with time zone    DEFAULT now() NOT NULL,
    CONSTRAINT chk_trips_budget CHECK (total_estimated_budget IS NULL OR total_estimated_budget >= 0),
    CONSTRAINT chk_trips_time   CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time),
    CONSTRAINT chk_trips_status CHECK (status = ANY (ARRAY['DRAFT','PLANNED','COMPLETED','CANCELLED']))
);

ALTER TABLE ONLY trip_db.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (trip_id);
ALTER TABLE ONLY trip_db.trips
    ADD CONSTRAINT fk_trips_user
        FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE CASCADE;

CREATE INDEX idx_trips_user   ON trip_db.trips USING btree (user_id);
CREATE INDEX idx_trips_status ON trip_db.trips USING btree (status);


-- =============================================================
-- TRIP DESTINATIONS
-- Ordered stops within a trip. Unchanged from original.
-- =============================================================

CREATE TABLE trip_db.trip_destinations (
    trip_id         character(10)               NOT NULL,
    destination_id  character(10)               NOT NULL,
    visit_order     integer                     NOT NULL,
    arrival_time    timestamp with time zone,
    departure_time  timestamp with time zone,
    note            text,
    CONSTRAINT chk_trip_destinations_order CHECK (visit_order > 0),
    CONSTRAINT chk_trip_destinations_time
        CHECK (arrival_time IS NULL OR departure_time IS NULL OR departure_time >= arrival_time)
);

ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT trip_destinations_pkey PRIMARY KEY (trip_id, destination_id);
ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT uq_trip_destinations_order UNIQUE (trip_id, visit_order);
ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT fk_trip_destinations_trip
        FOREIGN KEY (trip_id) REFERENCES trip_db.trips(trip_id) ON DELETE CASCADE;
ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT fk_trip_destinations_destination
        FOREIGN KEY (destination_id) REFERENCES trip_db.destinations(destination_id) ON DELETE CASCADE;

CREATE INDEX idx_trip_destinations_destination ON trip_db.trip_destinations USING btree (destination_id);


-- =============================================================
-- ROUTE REQUESTS
-- Replaces route_comparisons. One row per "find me routes from
-- A to B" call. Stores the raw coordinates so the backend can
-- re-query if needed. Linked to a trip optionally.
-- =============================================================

CREATE TABLE trip_db.route_requests (
    request_id          character(10)               NOT NULL,
    user_id             character(10),
    trip_id             character(10),
    origin_name         character varying(150)      NOT NULL,
    origin_latitude     numeric(10,7)               NOT NULL,
    origin_longitude    numeric(10,7)               NOT NULL,
    destination_name    character varying(150)      NOT NULL,
    destination_latitude  numeric(10,7)             NOT NULL,
    destination_longitude numeric(10,7)             NOT NULL,
    requested_at        timestamp with time zone    DEFAULT now() NOT NULL,
    last_updated_at     timestamp with time zone    DEFAULT now() NOT NULL
);

ALTER TABLE ONLY trip_db.route_requests
    ADD CONSTRAINT route_requests_pkey PRIMARY KEY (request_id);
ALTER TABLE ONLY trip_db.route_requests
    ADD CONSTRAINT fk_route_requests_user
        FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE SET NULL;
ALTER TABLE ONLY trip_db.route_requests
    ADD CONSTRAINT fk_route_requests_trip
        FOREIGN KEY (trip_id) REFERENCES trip_db.trips(trip_id) ON DELETE SET NULL;

CREATE INDEX idx_route_requests_user ON trip_db.route_requests USING btree (user_id);
CREATE INDEX idx_route_requests_trip ON trip_db.route_requests USING btree (trip_id);


-- =============================================================
-- ROUTE OPTIONS
-- Each recommended option returned for a route_request.
--
-- For GTFS modes (bus/metro/train):
--   - provider_id is NULL (operator is the city, not a brand)
--   - gtfs_feed_id references the feed used to build this route
--   - gtfs_route_ids stores the GTFS route_id(s) involved as
--     a jsonb array, e.g. ["Q02", "19"] — your backend resolves
--     human-readable names from the GTFS feed at display time
--   - transfer_count is meaningful here (multi-leg journeys)
--
-- For RIDE_HAILING / RENTAL modes:
--   - provider_id references the brand (Grab, Be, etc.)
--   - gtfs_feed_id and gtfs_route_ids are NULL
--   - transfer_count is typically 0
-- =============================================================

CREATE TABLE trip_db.route_options (
    option_id               character(10)               NOT NULL,
    request_id              character(10)               NOT NULL,
    mode_id                 character(10)               NOT NULL,
    provider_id             character(10),              -- NULL for public transport
    gtfs_feed_id            character(10),              -- NULL for non-GTFS modes
    gtfs_route_ids          jsonb,                      -- e.g. ["Q02","19"]
    gtfs_stop_ids           jsonb,                      -- key stops along the route
    option_name             character varying(150),
    estimated_cost          numeric(12,2),
    currency                character varying(10)       DEFAULT 'VND' NOT NULL,
    estimated_duration_min  integer,
    distance_km             numeric(10,2),
    transfer_count          integer                     DEFAULT 0,
    score                   numeric(4,2),               -- 0–10, set by scoring service
    retrieved_at            timestamp with time zone    DEFAULT now() NOT NULL,
    last_updated_at         timestamp with time zone    DEFAULT now() NOT NULL,
    CONSTRAINT chk_route_options_cost      CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    CONSTRAINT chk_route_options_distance  CHECK (distance_km IS NULL OR distance_km >= 0),
    CONSTRAINT chk_route_options_duration  CHECK (estimated_duration_min IS NULL OR estimated_duration_min >= 0),
    CONSTRAINT chk_route_options_transfer  CHECK (transfer_count IS NULL OR transfer_count >= 0),
    CONSTRAINT chk_route_options_score     CHECK (score IS NULL OR (score >= 0 AND score <= 10))
);

ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT route_options_pkey PRIMARY KEY (option_id);
ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT fk_route_options_request
        FOREIGN KEY (request_id) REFERENCES trip_db.route_requests(request_id) ON DELETE CASCADE;
ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT fk_route_options_mode
        FOREIGN KEY (mode_id) REFERENCES trip_db.transport_modes(mode_id);
ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT fk_route_options_provider
        FOREIGN KEY (provider_id) REFERENCES trip_db.transport_providers(provider_id) ON DELETE SET NULL;
ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT fk_route_options_gtfs_feed
        FOREIGN KEY (gtfs_feed_id) REFERENCES trip_db.gtfs_feeds(feed_id) ON DELETE SET NULL;

CREATE INDEX idx_route_options_request  ON trip_db.route_options USING btree (request_id);
CREATE INDEX idx_route_options_mode     ON trip_db.route_options USING btree (mode_id);
CREATE INDEX idx_route_options_provider ON trip_db.route_options USING btree (provider_id);


-- =============================================================
-- TRIP SCORES
-- Output of the scoring service for a given route_option.
-- Stores each factor separately so the UI can explain the score,
-- plus a snapshot of the raw external data used (weather, traffic)
-- for auditability / cache replay.
-- =============================================================

CREATE TABLE trip_db.trip_scores (
    score_id                character(10)               NOT NULL,
    option_id               character(10)               NOT NULL,   -- the scored route option
    weather_factor          numeric(4,2),               -- 0–10
    traffic_factor          numeric(4,2),               -- 0–10
    cost_factor             numeric(4,2),               -- 0–10
    comfort_factor          numeric(4,2),               -- 0–10
    overall_score           numeric(4,2)                NOT NULL,   -- 0–10
    external_data_snapshot  jsonb,                      -- raw API response cache
    scored_at               timestamp with time zone    DEFAULT now() NOT NULL,
    CONSTRAINT chk_trip_scores_weather   CHECK (weather_factor  IS NULL OR (weather_factor  >= 0 AND weather_factor  <= 10)),
    CONSTRAINT chk_trip_scores_traffic   CHECK (traffic_factor  IS NULL OR (traffic_factor  >= 0 AND traffic_factor  <= 10)),
    CONSTRAINT chk_trip_scores_cost      CHECK (cost_factor     IS NULL OR (cost_factor     >= 0 AND cost_factor     <= 10)),
    CONSTRAINT chk_trip_scores_comfort   CHECK (comfort_factor  IS NULL OR (comfort_factor  >= 0 AND comfort_factor  <= 10)),
    CONSTRAINT chk_trip_scores_overall   CHECK (overall_score >= 0 AND overall_score <= 10)
);

ALTER TABLE ONLY trip_db.trip_scores
    ADD CONSTRAINT trip_scores_pkey PRIMARY KEY (score_id);
ALTER TABLE ONLY trip_db.trip_scores
    ADD CONSTRAINT fk_trip_scores_option
        FOREIGN KEY (option_id) REFERENCES trip_db.route_options(option_id) ON DELETE CASCADE;

CREATE INDEX idx_trip_scores_option ON trip_db.trip_scores USING btree (option_id);
