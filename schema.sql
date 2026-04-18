--
-- PostgreSQL database dump
--

\restrict 63t1VK2O6wbpaqxHdzT6XE4EsxrdQnoP1FwgcxF7ijcLpqiZbqlCZzjoUZhcBBk

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: trip_db; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA trip_db;


ALTER SCHEMA trip_db OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: destinations; Type: TABLE; Schema: trip_db; Owner: postgres
--

CREATE TABLE trip_db.destinations (
    destination_id character(10) NOT NULL,
    name character varying(150) NOT NULL,
    category character varying(50),
    address text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    description text,
    rating_avg numeric(3,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_destinations_rating_avg CHECK (((rating_avg IS NULL) OR ((rating_avg >= (0)::numeric) AND (rating_avg <= (5)::numeric))))
);


ALTER TABLE trip_db.destinations OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: trip_db; Owner: postgres
--

CREATE TABLE trip_db.reviews (
    user_id character(10) NOT NULL,
    destination_id character(10) NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_reviews_rating CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE trip_db.reviews OWNER TO postgres;

--
-- Name: route_comparisons; Type: TABLE; Schema: trip_db; Owner: postgres
--

CREATE TABLE trip_db.route_comparisons (
    comparison_id character(10) NOT NULL,
    user_id character(10),
    trip_id character(10),
    origin_name character varying(150) NOT NULL,
    destination_name character varying(150) NOT NULL,
    origin_latitude numeric(10,7),
    origin_longitude numeric(10,7),
    destination_latitude numeric(10,7),
    destination_longitude numeric(10,7),
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE trip_db.route_comparisons OWNER TO postgres;

--
-- Name: route_options; Type: TABLE; Schema: trip_db; Owner: postgres
--

CREATE TABLE trip_db.route_options (
    option_id character(10) NOT NULL,
    comparison_id character(10) NOT NULL,
    provider_id character(10),
    mode_id character(10) NOT NULL,
    option_name character varying(150),
    estimated_cost numeric(12,2),
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    estimated_duration_min integer,
    distance_km numeric(10,2),
    transfer_count integer,
    retrieved_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_route_options_cost CHECK (((estimated_cost IS NULL) OR (estimated_cost >= (0)::numeric))),
    CONSTRAINT chk_route_options_distance CHECK (((distance_km IS NULL) OR (distance_km >= (0)::numeric))),
    CONSTRAINT chk_route_options_duration CHECK (((estimated_duration_min IS NULL) OR (estimated_duration_min >= 0))),
    CONSTRAINT chk_route_options_transfer CHECK (((transfer_count IS NULL) OR (transfer_count >= 0)))
);


ALTER TABLE trip_db.route_options OWNER TO postgres;

--
-- Name: transport_modes; Type: TABLE; Schema: trip_db; Owner: postgres
--

CREATE TABLE trip_db.transport_modes (
    mode_id character(10) NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_transport_modes_code CHECK (((code)::text = ANY ((ARRAY['BUS'::character varying, 'METRO'::character varying, 'TRAIN'::character varying, 'WALK'::character varying, 'BIKE'::character varying, 'CAR'::character varying, 'RIDE_HAILING'::character varying])::text[])))
);


ALTER TABLE trip_db.transport_modes OWNER TO postgres;

--
-- Name: transport_providers; Type: TABLE; Schema: trip_db; Owner: postgres
--

CREATE TABLE trip_db.transport_providers (
    provider_id character(10) NOT NULL,
    name character varying(100) NOT NULL,
    provider_type character varying(30) NOT NULL,
    api_supported boolean DEFAULT false NOT NULL,
    website_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_transport_providers_type CHECK (((provider_type)::text = ANY ((ARRAY['PUBLIC_TRANSPORT'::character varying, 'RIDE_HAILING'::character varying, 'PARTNER_RENTAL'::character varying])::text[])))
);


ALTER TABLE trip_db.transport_providers OWNER TO postgres;

--
-- Name: trip_destinations; Type: TABLE; Schema: trip_db; Owner: postgres
--

CREATE TABLE trip_db.trip_destinations (
    trip_id character(10) NOT NULL,
    destination_id character(10) NOT NULL,
    visit_order integer NOT NULL,
    arrival_time timestamp with time zone,
    departure_time timestamp with time zone,
    note text,
    CONSTRAINT chk_trip_destinations_order CHECK ((visit_order > 0)),
    CONSTRAINT chk_trip_destinations_time CHECK (((arrival_time IS NULL) OR (departure_time IS NULL) OR (departure_time >= arrival_time)))
);


ALTER TABLE trip_db.trip_destinations OWNER TO postgres;

--
-- Name: trips; Type: TABLE; Schema: trip_db; Owner: postgres
--

CREATE TABLE trip_db.trips (
    trip_id character(10) NOT NULL,
    user_id character(10) NOT NULL,
    title character varying(150),
    origin_name character varying(150),
    destination_name character varying(150),
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    total_estimated_budget numeric(12,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_trips_budget CHECK (((total_estimated_budget IS NULL) OR (total_estimated_budget >= (0)::numeric))),
    CONSTRAINT chk_trips_time CHECK (((start_time IS NULL) OR (end_time IS NULL) OR (end_time > start_time)))
);


ALTER TABLE trip_db.trips OWNER TO postgres;

--
-- Name: user_preferences; Type: TABLE; Schema: trip_db; Owner: postgres
--

CREATE TABLE trip_db.user_preferences (
    user_id character(10) NOT NULL,
    preferred_transport_modes jsonb,
    budget_min numeric(12,2),
    budget_max numeric(12,2),
    preferred_food_tags jsonb,
    preferred_destination_tags jsonb,
    avoid_tags jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_user_preferences_budget_max CHECK (((budget_max IS NULL) OR (budget_max >= (0)::numeric))),
    CONSTRAINT chk_user_preferences_budget_min CHECK (((budget_min IS NULL) OR (budget_min >= (0)::numeric))),
    CONSTRAINT chk_user_preferences_budget_range CHECK (((budget_min IS NULL) OR (budget_max IS NULL) OR (budget_max >= budget_min)))
);


ALTER TABLE trip_db.user_preferences OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: trip_db; Owner: postgres
--

CREATE TABLE trip_db.users (
    user_id character(10) NOT NULL,
    full_name character varying(120) NOT NULL,
    email character varying(150) NOT NULL,
    phone character varying(100),
    password_hash text,
    auth_provider character varying(30) DEFAULT 'local'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE trip_db.users OWNER TO postgres;

--
-- Name: destinations destinations_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.destinations
    ADD CONSTRAINT destinations_pkey PRIMARY KEY (destination_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (user_id, destination_id);


--
-- Name: route_comparisons route_comparisons_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.route_comparisons
    ADD CONSTRAINT route_comparisons_pkey PRIMARY KEY (comparison_id);


--
-- Name: route_options route_options_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT route_options_pkey PRIMARY KEY (option_id);


--
-- Name: transport_modes transport_modes_code_key; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.transport_modes
    ADD CONSTRAINT transport_modes_code_key UNIQUE (code);


--
-- Name: transport_modes transport_modes_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.transport_modes
    ADD CONSTRAINT transport_modes_pkey PRIMARY KEY (mode_id);


--
-- Name: transport_providers transport_providers_name_key; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.transport_providers
    ADD CONSTRAINT transport_providers_name_key UNIQUE (name);


--
-- Name: transport_providers transport_providers_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.transport_providers
    ADD CONSTRAINT transport_providers_pkey PRIMARY KEY (provider_id);


--
-- Name: trip_destinations trip_destinations_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT trip_destinations_pkey PRIMARY KEY (trip_id, destination_id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (trip_id);


--
-- Name: trip_destinations uq_trip_destinations_order; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT uq_trip_destinations_order UNIQUE (trip_id, visit_order);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_destinations_category; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_destinations_category ON trip_db.destinations USING btree (category);


--
-- Name: idx_destinations_name; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_destinations_name ON trip_db.destinations USING btree (name);


--
-- Name: idx_reviews_destination; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_reviews_destination ON trip_db.reviews USING btree (destination_id);


--
-- Name: idx_route_comparisons_trip; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_route_comparisons_trip ON trip_db.route_comparisons USING btree (trip_id);


--
-- Name: idx_route_comparisons_user; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_route_comparisons_user ON trip_db.route_comparisons USING btree (user_id);


--
-- Name: idx_route_options_comparison; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_route_options_comparison ON trip_db.route_options USING btree (comparison_id);


--
-- Name: idx_route_options_mode; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_route_options_mode ON trip_db.route_options USING btree (mode_id);


--
-- Name: idx_route_options_provider; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_route_options_provider ON trip_db.route_options USING btree (provider_id);


--
-- Name: idx_trip_destinations_destination; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_trip_destinations_destination ON trip_db.trip_destinations USING btree (destination_id);


--
-- Name: idx_trips_user; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_trips_user ON trip_db.trips USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_users_email ON trip_db.users USING btree (email);


--
-- Name: idx_users_phone; Type: INDEX; Schema: trip_db; Owner: postgres
--

CREATE INDEX idx_users_phone ON trip_db.users USING btree (phone);


--
-- Name: reviews fk_reviews_destination; Type: FK CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.reviews
    ADD CONSTRAINT fk_reviews_destination FOREIGN KEY (destination_id) REFERENCES trip_db.destinations(destination_id) ON DELETE CASCADE;


--
-- Name: reviews fk_reviews_user; Type: FK CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.reviews
    ADD CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE CASCADE;


--
-- Name: route_comparisons fk_route_comparisons_trip; Type: FK CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.route_comparisons
    ADD CONSTRAINT fk_route_comparisons_trip FOREIGN KEY (trip_id) REFERENCES trip_db.trips(trip_id) ON DELETE SET NULL;


--
-- Name: route_comparisons fk_route_comparisons_user; Type: FK CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.route_comparisons
    ADD CONSTRAINT fk_route_comparisons_user FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE SET NULL;


--
-- Name: route_options fk_route_options_comparison; Type: FK CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT fk_route_options_comparison FOREIGN KEY (comparison_id) REFERENCES trip_db.route_comparisons(comparison_id) ON DELETE CASCADE;


--
-- Name: route_options fk_route_options_mode; Type: FK CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT fk_route_options_mode FOREIGN KEY (mode_id) REFERENCES trip_db.transport_modes(mode_id);


--
-- Name: route_options fk_route_options_provider; Type: FK CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT fk_route_options_provider FOREIGN KEY (provider_id) REFERENCES trip_db.transport_providers(provider_id) ON DELETE SET NULL;


--
-- Name: trip_destinations fk_trip_destinations_destination; Type: FK CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT fk_trip_destinations_destination FOREIGN KEY (destination_id) REFERENCES trip_db.destinations(destination_id) ON DELETE CASCADE;


--
-- Name: trip_destinations fk_trip_destinations_trip; Type: FK CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT fk_trip_destinations_trip FOREIGN KEY (trip_id) REFERENCES trip_db.trips(trip_id) ON DELETE CASCADE;


--
-- Name: trips fk_trips_user; Type: FK CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.trips
    ADD CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE CASCADE;


--
-- Name: user_preferences fk_user_preferences_user; Type: FK CONSTRAINT; Schema: trip_db; Owner: postgres
--

ALTER TABLE ONLY trip_db.user_preferences
    ADD CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 63t1VK2O6wbpaqxHdzT6XE4EsxrdQnoP1FwgcxF7ijcLpqiZbqlCZzjoUZhcBBk

