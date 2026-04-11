ROLLBACK;
CREATE SCHEMA IF NOT EXISTS trip_db;
SET search_path TO trip_db;

BEGIN;

-- =========================================
-- 1. USERS
-- =========================================
CREATE TABLE IF NOT EXISTS users (
	user_id CHAR(10) PRIMARY KEY,
	full_name VARCHAR(120) NOT NULL,
	email VARCHAR(150) NOT NULL UNIQUE,
	phone VARCHAR(20) UNIQUE,
	password_hash TEXT,
	auth_provider VARCHAR(30) NOT NULL DEFAULT 'local',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================
-- 2. USER PREFERENCES
-- one-to-one with users
-- =========================================
CREATE TABLE IF NOT EXISTS user_preferences (
	user_id CHAR(10) PRIMARY KEY,
	preferred_transport_modes JSONB,
	budget_min NUMERIC(12,2),
	budget_max NUMERIC(12,2),
	preferred_food_tags JSONB,
	preferred_destination_tags JSONB,
	avoid_tags JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_user_preferences_user
		FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
	CONSTRAINT chk_user_preferences_budget_min
		CHECK (budget_min IS NULL OR budget_min >= 0),
	CONSTRAINT chk_user_preferences_budget_max
		CHECK (budget_max IS NULL OR budget_max >= 0),
	CONSTRAINT chk_user_preferences_budget_range
		CHECK (
			budget_min IS NULL OR
			budget_max IS NULL OR
			budget_max >= budget_min
		)
);

-- =========================================
-- 3. DESTINATIONS
-- =========================================
CREATE TABLE IF NOT EXISTS destinations (
	destination_id CHAR(10) PRIMARY KEY,
	name VARCHAR(150) NOT NULL,
	category VARCHAR(50),
	address TEXT,
	latitude NUMERIC(10,7),
	longitude NUMERIC(10,7),
	description TEXT,
	rating_avg NUMERIC(3,2),
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT chk_destinations_rating_avg
		CHECK (rating_avg IS NULL OR (rating_avg >= 0 AND rating_avg <= 5))
);

-- =========================================
-- 4. TRIPS / ITINERARIES
-- =========================================
CREATE TABLE IF NOT EXISTS trips (
	trip_id CHAR(10) PRIMARY KEY,
	user_id CHAR(10) NOT NULL,
	title VARCHAR(150),
	origin_name VARCHAR(150),
	destination_name VARCHAR(150),
	start_time TIMESTAMPTZ,
	end_time TIMESTAMPTZ,
	total_estimated_budget NUMERIC(12,2),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_trips_user
		FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
	CONSTRAINT chk_trips_time
		CHECK (
			start_time IS NULL OR
			end_time IS NULL OR
			end_time > start_time
		),
	CONSTRAINT chk_trips_budget
		CHECK (total_estimated_budget IS NULL OR total_estimated_budget >= 0)
);

CREATE TABLE IF NOT EXISTS trip_destinations (
	trip_id CHAR(10) NOT NULL,
	destination_id CHAR(10) NOT NULL,
	visit_order INT NOT NULL,
	arrival_time TIMESTAMPTZ,
	departure_time TIMESTAMPTZ,
	note TEXT,
	PRIMARY KEY (trip_id, destination_id),
	CONSTRAINT fk_trip_destinations_trip
		FOREIGN KEY (trip_id) REFERENCES trips(trip_id) ON DELETE CASCADE,
	CONSTRAINT fk_trip_destinations_destination
		FOREIGN KEY (destination_id) REFERENCES destinations(destination_id) ON DELETE CASCADE,
	CONSTRAINT uq_trip_destinations_order UNIQUE (trip_id, visit_order),
	CONSTRAINT chk_trip_destinations_order CHECK (visit_order > 0),
	CONSTRAINT chk_trip_destinations_time
		CHECK (
			arrival_time IS NULL OR
			departure_time IS NULL OR
			departure_time >= arrival_time
		)
);

-- =========================================
-- 5. REVIEWS
-- one user reviews one destination once
-- =========================================
CREATE TABLE IF NOT EXISTS reviews (
	user_id CHAR(10) NOT NULL,
	destination_id CHAR(10) NOT NULL,
	rating INT NOT NULL,
	comment TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (user_id, destination_id),
	CONSTRAINT fk_reviews_user
		FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
	CONSTRAINT fk_reviews_destination
		FOREIGN KEY (destination_id) REFERENCES destinations(destination_id) ON DELETE CASCADE,
	CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

-- =========================================
-- 6. TRANSPORT PROVIDERS
-- For public transport / ride hailing comparison
-- =========================================
CREATE TABLE IF NOT EXISTS transport_providers (
	provider_id CHAR(10) PRIMARY KEY,
	name VARCHAR(100) NOT NULL UNIQUE,
	provider_type VARCHAR(30) NOT NULL,
	api_supported BOOLEAN NOT NULL DEFAULT FALSE,
	website_url TEXT,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT chk_transport_providers_type
		CHECK (provider_type IN ('PUBLIC_TRANSPORT', 'RIDE_HAILING', 'PARTNER_RENTAL'))
);

CREATE TABLE IF NOT EXISTS transport_modes (
	mode_id CHAR(10) PRIMARY KEY,
	code VARCHAR(30) NOT NULL UNIQUE,
	name VARCHAR(100) NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT chk_transport_modes_code
		CHECK (code IN ('BUS', 'METRO', 'TRAIN', 'WALK', 'BIKE', 'CAR', 'RIDE_HAILING'))
);

-- =========================================
-- 7. ROUTE COMPARISON REQUESTS
-- One request from user, many compared options
-- =========================================
CREATE TABLE IF NOT EXISTS route_comparisons (
	comparison_id CHAR(10) PRIMARY KEY,
	user_id CHAR(10),
	trip_id CHAR(10),
	origin_name VARCHAR(150) NOT NULL,
	destination_name VARCHAR(150) NOT NULL,
	origin_latitude NUMERIC(10,7),
	origin_longitude NUMERIC(10,7),
	destination_latitude NUMERIC(10,7),
	destination_longitude NUMERIC(10,7),
	requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_route_comparisons_user
		FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
	CONSTRAINT fk_route_comparisons_trip
		FOREIGN KEY (trip_id) REFERENCES trips(trip_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS route_options (
	option_id CHAR(10) PRIMARY KEY,
	comparison_id CHAR(10) NOT NULL,
	provider_id CHAR(10),
	mode_id CHAR(10) NOT NULL,
	option_name VARCHAR(150),
	estimated_cost NUMERIC(12,2),
	currency VARCHAR(10) NOT NULL DEFAULT 'VND',
	estimated_duration_min INT,
	distance_km NUMERIC(10,2),
	transfer_count INT,
	retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_route_options_comparison
		FOREIGN KEY (comparison_id) REFERENCES route_comparisons(comparison_id) ON DELETE CASCADE,
	CONSTRAINT fk_route_options_provider
		FOREIGN KEY (provider_id) REFERENCES transport_providers(provider_id) ON DELETE SET NULL,
	CONSTRAINT fk_route_options_mode
		FOREIGN KEY (mode_id) REFERENCES transport_modes(mode_id),
	CONSTRAINT chk_route_options_cost
		CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
	CONSTRAINT chk_route_options_duration
		CHECK (estimated_duration_min IS NULL OR estimated_duration_min >= 0),
	CONSTRAINT chk_route_options_distance
		CHECK (distance_km IS NULL OR distance_km >= 0),
	CONSTRAINT chk_route_options_transfer
		CHECK (transfer_count IS NULL OR transfer_count >= 0)
);

-- =========================================
-- 8. INDEXES
-- =========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

CREATE INDEX IF NOT EXISTS idx_destinations_name ON destinations(name);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);

CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);

CREATE INDEX IF NOT EXISTS idx_trip_destinations_destination ON trip_destinations(destination_id);

CREATE INDEX IF NOT EXISTS idx_reviews_destination ON reviews(destination_id);

CREATE INDEX IF NOT EXISTS idx_route_comparisons_user ON route_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_route_comparisons_trip ON route_comparisons(trip_id);

CREATE INDEX IF NOT EXISTS idx_route_options_comparison ON route_options(comparison_id);
CREATE INDEX IF NOT EXISTS idx_route_options_provider ON route_options(provider_id);
CREATE INDEX IF NOT EXISTS idx_route_options_mode ON route_options(mode_id);

COMMIT;