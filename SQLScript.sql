ROLLBACK;
CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;

BEGIN;
-- =========================================
-- 1. USERS
-- =========================================

CREATE TABLE IF NOT EXISTS users (
	id BIGSERIAL PRIMARY KEY,
	full_name VARCHAR(120) NOT NULL,
	email VARCHAR(150) NOT NULL UNIQUE,
	phone VARCHAR(20) UNIQUE,
	password_hash TEXT,
	auth_provider VARCHAR(30) NOT NULL DEFAULT 'local',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================
-- 2. USER PREFERENCES
-- For AI personalization / recommendation
-- =========================================

CREATE TABLE IF NOT EXISTS user_preferences (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL UNIQUE,
	preferred_transport_modes JSONB,
	budget_min NUMERIC(12,2),
	budget_max NUMERIC(12,2),
	preferred_food_tags JSONB,
	preferred_destination_tags JSONB,
	avoid_tags JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_user_preferences_user
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
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
	id BIGSERIAL PRIMARY KEY,
	name VARCHAR(150) NOT NULL,
	category VARCHAR(50),
	address TEXT,
	province VARCHAR(100),
	district VARCHAR(100),
	latitude NUMERIC(10,7),
	longitude NUMERIC(10,7),
	description TEXT,
	avg_price_level NUMERIC(12,2),
	rating_avg NUMERIC(3,2),
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT chk_destinations_avg_price
		CHECK (avg_price_level IS NULL OR avg_price_level >= 0),
	CONSTRAINT chk_destinations_rating_avg
		CHECK (rating_avg IS NULL OR (rating_avg >= 0 AND rating_avg <= 5))
);

-- =========================================
-- 4. TRIPS / ITINERARIES
-- =========================================

CREATE TABLE IF NOT EXISTS trips (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL,
	title VARCHAR(150),
	origin_name VARCHAR(150),
	destination_name VARCHAR(150),
	start_time TIMESTAMPTZ,
	end_time TIMESTAMPTZ,
	total_estimated_budget NUMERIC(12,2),
	notes TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_trips_user
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
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
	id BIGSERIAL PRIMARY KEY,
	trip_id BIGINT NOT NULL,
	destination_id BIGINT NOT NULL,
	visit_order INT NOT NULL,
	arrival_time TIMESTAMPTZ,
	departure_time TIMESTAMPTZ,
	note TEXT,
	CONSTRAINT fk_trip_destinations_trip
		FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
	CONSTRAINT fk_trip_destinations_destination
		FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
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
-- =========================================

CREATE TABLE IF NOT EXISTS reviews (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL,
	trip_id BIGINT,
	destination_id BIGINT,
	rating INT NOT NULL,
	comment TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_reviews_user
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	CONSTRAINT fk_reviews_trip
		FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL,
	CONSTRAINT fk_reviews_destination
		FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL,
	CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
	CONSTRAINT chk_reviews_target
		CHECK (trip_id IS NOT NULL OR destination_id IS NOT NULL)
);

-- =========================================
-- 6. TRANSPORT PROVIDERS
-- For public transport / Grab / Uber comparison
-- =========================================

CREATE TABLE IF NOT EXISTS transport_providers (
	id BIGSERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL UNIQUE,
	provider_type VARCHAR(30) NOT NULL,
	api_supported BOOLEAN NOT NULL DEFAULT FALSE,
	website_url TEXT,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	CONSTRAINT chk_transport_providers_type
		CHECK (provider_type IN ('PUBLIC_TRANSPORT', 'RIDE_HAILING', 'PARTNER_RENTAL'))
);

CREATE TABLE IF NOT EXISTS transport_modes (
	id BIGSERIAL PRIMARY KEY,
	code VARCHAR(30) NOT NULL UNIQUE,
	name VARCHAR(100) NOT NULL,
	CONSTRAINT chk_transport_modes_code
		CHECK (code IN ('BUS', 'METRO', 'TRAIN', 'WALK', 'BIKE', 'CAR', 'RIDE_HAILING'))
);

-- =========================================
-- 7. ROUTE COMPARISON REQUESTS
-- One request from user, many compared options
-- =========================================

CREATE TABLE IF NOT EXISTS route_comparisons (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT,
	trip_id BIGINT,
	origin_name VARCHAR(150) NOT NULL,
	destination_name VARCHAR(150) NOT NULL,
	origin_latitude NUMERIC(10,7),
	origin_longitude NUMERIC(10,7),
	destination_latitude NUMERIC(10,7),
	destination_longitude NUMERIC(10,7),
	requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_route_comparisons_user
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
	CONSTRAINT fk_route_comparisons_trip
		FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS route_options (
	id BIGSERIAL PRIMARY KEY,
	comparison_id BIGINT NOT NULL,
	provider_id BIGINT,
	mode_id BIGINT NOT NULL,
	option_name VARCHAR(150),
	estimated_cost NUMERIC(12,2),
	currency VARCHAR(10) NOT NULL DEFAULT 'VND',
	estimated_duration_min INT,
	distance_km NUMERIC(10,2),
	transfer_count INT,
	carbon_estimate NUMERIC(10,2),
	raw_data JSONB,
	retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_route_options_comparison
		FOREIGN KEY (comparison_id) REFERENCES route_comparisons(id) ON DELETE CASCADE,
	CONSTRAINT fk_route_options_provider
		FOREIGN KEY (provider_id) REFERENCES transport_providers(id) ON DELETE SET NULL,
	CONSTRAINT fk_route_options_mode
		FOREIGN KEY (mode_id) REFERENCES transport_modes(id),
	CONSTRAINT chk_route_options_cost
		CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
	CONSTRAINT chk_route_options_duration
		CHECK (estimated_duration_min IS NULL OR estimated_duration_min >= 0),
	CONSTRAINT chk_route_options_distance
		CHECK (distance_km IS NULL OR distance_km >= 0),
	CONSTRAINT chk_route_options_transfer
		CHECK (transfer_count IS NULL OR transfer_count >= 0),
	CONSTRAINT chk_route_options_carbon
		CHECK (carbon_estimate IS NULL OR carbon_estimate >= 0)
);

-- =========================================
-- 8. AI RECOMMENDATION LOGS
-- Useful for backend + model evaluation
-- =========================================

CREATE TABLE IF NOT EXISTS recommendation_logs (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT,
	trip_id BIGINT,
	context_data JSONB,
	model_name VARCHAR(100),
	model_version VARCHAR(50),
	recommendation_type VARCHAR(50) NOT NULL,
	input_data JSONB,
	output_data JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_recommendation_logs_user
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
	CONSTRAINT fk_recommendation_logs_trip
		FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL,
	CONSTRAINT chk_recommendation_logs_type
		CHECK (recommendation_type IN ('DESTINATION', 'TRANSPORT', 'ITINERARY', 'FOOD'))
);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
	id BIGSERIAL PRIMARY KEY,
	recommendation_log_id BIGINT NOT NULL,
	user_id BIGINT,
	selected BOOLEAN,
	rating INT,
	note TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_recommendation_feedback_log
		FOREIGN KEY (recommendation_log_id) REFERENCES recommendation_logs(id) ON DELETE CASCADE,
	CONSTRAINT fk_recommendation_feedback_user
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
	CONSTRAINT chk_recommendation_feedback_rating
		CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);

-- =========================================
-- 9. INDEXES
-- =========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_destinations_name ON destinations(name);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_province_district ON destinations(province, district);

CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_destinations_trip ON trip_destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_destinations_destination ON trip_destinations(destination_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_trip ON reviews(trip_id);
CREATE INDEX IF NOT EXISTS idx_reviews_destination ON reviews(destination_id);

CREATE INDEX IF NOT EXISTS idx_route_comparisons_user ON route_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_route_comparisons_trip ON route_comparisons(trip_id);
CREATE INDEX IF NOT EXISTS idx_route_options_comparison ON route_options(comparison_id);
CREATE INDEX IF NOT EXISTS idx_route_options_provider ON route_options(provider_id);
CREATE INDEX IF NOT EXISTS idx_route_options_mode ON route_options(mode_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_logs_user ON recommendation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_logs_trip ON recommendation_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_logs_type ON recommendation_logs(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_log ON recommendation_feedback(recommendation_log_id);

-- =========================================
-- 10. UPDATED_AT TRIGGER
-- =========================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_preferences_set_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_set_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_trips_set_updated_at ON trips;
CREATE TRIGGER trg_trips_set_updated_at
BEFORE UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;