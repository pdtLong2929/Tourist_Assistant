--
-- PostgreSQL database dump
--

\restrict UdNiwztzb4O8NAcMs7a0dcPEXvaEvbjIBSdnhUgVXKI6pQtfV5EHwZLGfsp0py8

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
-- Name: trip_db; Type: SCHEMA; Schema: -; Owner: admin
--

CREATE SCHEMA trip_db;


ALTER SCHEMA trip_db OWNER TO admin;

--
-- Name: nearest_stops(numeric, numeric, character, integer); Type: FUNCTION; Schema: trip_db; Owner: admin
--

CREATE FUNCTION trip_db.nearest_stops(lat numeric, lon numeric, p_feed character, lim integer DEFAULT 5) RETURNS TABLE(stop_id character varying, stop_name character varying, stop_lat numeric, stop_lon numeric, dist_m numeric)
    LANGUAGE sql STABLE
    AS $$
    SELECT
        stop_id,
        stop_name,
        stop_lat,
        stop_lon,
        round(
            6371000 * acos(
                cos(radians(lat)) * cos(radians(stop_lat))
                * cos(radians(stop_lon) - radians(lon))
                + sin(radians(lat)) * sin(radians(stop_lat))
            )::numeric, 1
        ) AS dist_m
    FROM trip_db.gtfs_stops
    WHERE feed_id = p_feed
    ORDER BY dist_m
    LIMIT lim;
$$;


ALTER FUNCTION trip_db.nearest_stops(lat numeric, lon numeric, p_feed character, lim integer) OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: destination_triples; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.destination_triples (
    destination_id character(10) NOT NULL,
    triples jsonb NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE trip_db.destination_triples OWNER TO admin;

--
-- Name: destinations; Type: TABLE; Schema: trip_db; Owner: admin
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


ALTER TABLE trip_db.destinations OWNER TO admin;

--
-- Name: gtfs_agency; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.gtfs_agency (
    feed_id character(10) NOT NULL,
    agency_id character varying(50) NOT NULL,
    agency_name character varying(200) NOT NULL,
    agency_url text,
    agency_timezone character varying(50) NOT NULL,
    agency_lang character varying(10)
);


ALTER TABLE trip_db.gtfs_agency OWNER TO admin;

--
-- Name: gtfs_calendar; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.gtfs_calendar (
    feed_id character(10) NOT NULL,
    service_id character varying(50) NOT NULL,
    monday boolean NOT NULL,
    tuesday boolean NOT NULL,
    wednesday boolean NOT NULL,
    thursday boolean NOT NULL,
    friday boolean NOT NULL,
    saturday boolean NOT NULL,
    sunday boolean NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL
);


ALTER TABLE trip_db.gtfs_calendar OWNER TO admin;

--
-- Name: gtfs_feeds; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.gtfs_feeds (
    feed_id character(10) NOT NULL,
    city character varying(100) NOT NULL,
    agency_name character varying(150),
    feed_url text,
    realtime_url text,
    is_active boolean DEFAULT true NOT NULL,
    last_fetched_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE trip_db.gtfs_feeds OWNER TO admin;

--
-- Name: gtfs_routes; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.gtfs_routes (
    feed_id character(10) NOT NULL,
    route_id character varying(50) NOT NULL,
    agency_id character varying(50),
    route_short_name character varying(50),
    route_long_name character varying(300),
    route_type smallint NOT NULL,
    route_color character varying(6),
    route_text_color character varying(6),
    route_url text,
    route_desc text
);


ALTER TABLE trip_db.gtfs_routes OWNER TO admin;

--
-- Name: gtfs_stop_times; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.gtfs_stop_times (
    feed_id character(10) NOT NULL,
    trip_id character varying(100) NOT NULL,
    stop_id character varying(100) NOT NULL,
    stop_sequence integer NOT NULL,
    arrival_time interval,
    departure_time interval,
    shape_dist_traveled numeric(10,4),
    pickup_type smallint DEFAULT 0,
    drop_off_type smallint DEFAULT 0
);


ALTER TABLE trip_db.gtfs_stop_times OWNER TO admin;

--
-- Name: gtfs_stops; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.gtfs_stops (
    feed_id character(10) NOT NULL,
    stop_id character varying(100) NOT NULL,
    stop_name character varying(300) NOT NULL,
    stop_desc text,
    stop_lat numeric(10,7) NOT NULL,
    stop_lon numeric(10,7) NOT NULL,
    zone_id character varying(50),
    stop_url text
);


ALTER TABLE trip_db.gtfs_stops OWNER TO admin;

--
-- Name: gtfs_trips; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.gtfs_trips (
    feed_id character(10) NOT NULL,
    trip_id character varying(100) NOT NULL,
    route_id character varying(50) NOT NULL,
    service_id character varying(50) NOT NULL,
    trip_headsign character varying(300),
    direction_id smallint,
    shape_id character varying(100)
);


ALTER TABLE trip_db.gtfs_trips OWNER TO admin;

--
-- Name: reviews; Type: TABLE; Schema: trip_db; Owner: admin
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


ALTER TABLE trip_db.reviews OWNER TO admin;

--
-- Name: route_options; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.route_options (
    option_id character(10) NOT NULL,
    request_id character(10) NOT NULL,
    mode_id character(10) NOT NULL,
    provider_id character(10),
    gtfs_feed_id character(10),
    gtfs_route_ids jsonb,
    gtfs_stop_ids jsonb,
    option_name character varying(150),
    estimated_cost numeric(12,2),
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    estimated_duration_min integer,
    distance_km numeric(10,2),
    transfer_count integer DEFAULT 0,
    score numeric(4,2),
    retrieved_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_route_options_cost CHECK (((estimated_cost IS NULL) OR (estimated_cost >= (0)::numeric))),
    CONSTRAINT chk_route_options_distance CHECK (((distance_km IS NULL) OR (distance_km >= (0)::numeric))),
    CONSTRAINT chk_route_options_duration CHECK (((estimated_duration_min IS NULL) OR (estimated_duration_min >= 0))),
    CONSTRAINT chk_route_options_score CHECK (((score IS NULL) OR ((score >= (0)::numeric) AND (score <= (10)::numeric)))),
    CONSTRAINT chk_route_options_transfer CHECK (((transfer_count IS NULL) OR (transfer_count >= 0)))
);


ALTER TABLE trip_db.route_options OWNER TO admin;

--
-- Name: route_requests; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.route_requests (
    request_id character(10) NOT NULL,
    user_id character(10),
    trip_id character(10),
    origin_name character varying(150) NOT NULL,
    origin_latitude numeric(10,7) NOT NULL,
    origin_longitude numeric(10,7) NOT NULL,
    destination_name character varying(150) NOT NULL,
    destination_latitude numeric(10,7) NOT NULL,
    destination_longitude numeric(10,7) NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE trip_db.route_requests OWNER TO admin;

--
-- Name: transport_modes; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.transport_modes (
    mode_id character(10) NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(100) NOT NULL,
    is_gtfs boolean DEFAULT false NOT NULL,
    gtfs_route_type smallint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_transport_modes_code CHECK (((code)::text = ANY (ARRAY['BUS'::text, 'METRO'::text, 'TRAIN'::text, 'FERRY'::text, 'WALK'::text, 'RIDE_HAILING'::text, 'MOTORBIKE_RENTAL'::text, 'CAR_RENTAL'::text])))
);


ALTER TABLE trip_db.transport_modes OWNER TO admin;

--
-- Name: transport_providers; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.transport_providers (
    provider_id character(10) NOT NULL,
    mode_id character(10) NOT NULL,
    name character varying(100) NOT NULL,
    provider_type character varying(30) NOT NULL,
    website_url text,
    app_deep_link text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_transport_providers_type CHECK (((provider_type)::text = ANY (ARRAY['RIDE_HAILING'::text, 'MOTORBIKE_RENTAL'::text, 'CAR_RENTAL'::text])))
);


ALTER TABLE trip_db.transport_providers OWNER TO admin;

--
-- Name: trip_destinations; Type: TABLE; Schema: trip_db; Owner: admin
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


ALTER TABLE trip_db.trip_destinations OWNER TO admin;

--
-- Name: trip_scores; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.trip_scores (
    score_id character(10) NOT NULL,
    option_id character(10) NOT NULL,
    weather_factor numeric(4,2),
    traffic_factor numeric(4,2),
    cost_factor numeric(4,2),
    comfort_factor numeric(4,2),
    overall_score numeric(4,2) NOT NULL,
    external_data_snapshot jsonb,
    scored_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_trip_scores_comfort CHECK (((comfort_factor IS NULL) OR ((comfort_factor >= (0)::numeric) AND (comfort_factor <= (10)::numeric)))),
    CONSTRAINT chk_trip_scores_cost CHECK (((cost_factor IS NULL) OR ((cost_factor >= (0)::numeric) AND (cost_factor <= (10)::numeric)))),
    CONSTRAINT chk_trip_scores_overall CHECK (((overall_score >= (0)::numeric) AND (overall_score <= (10)::numeric))),
    CONSTRAINT chk_trip_scores_traffic CHECK (((traffic_factor IS NULL) OR ((traffic_factor >= (0)::numeric) AND (traffic_factor <= (10)::numeric)))),
    CONSTRAINT chk_trip_scores_weather CHECK (((weather_factor IS NULL) OR ((weather_factor >= (0)::numeric) AND (weather_factor <= (10)::numeric))))
);


ALTER TABLE trip_db.trip_scores OWNER TO admin;

--
-- Name: trips; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.trips (
    trip_id character(10) NOT NULL,
    user_id character(10) NOT NULL,
    title character varying(150),
    origin_name character varying(150),
    origin_latitude numeric(10,7),
    origin_longitude numeric(10,7),
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    total_estimated_budget numeric(12,2),
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_trips_budget CHECK (((total_estimated_budget IS NULL) OR (total_estimated_budget >= (0)::numeric))),
    CONSTRAINT chk_trips_status CHECK (((status)::text = ANY (ARRAY['DRAFT'::text, 'PLANNED'::text, 'COMPLETED'::text, 'CANCELLED'::text]))),
    CONSTRAINT chk_trips_time CHECK (((start_time IS NULL) OR (end_time IS NULL) OR (end_time > start_time)))
);


ALTER TABLE trip_db.trips OWNER TO admin;

--
-- Name: user_preferences; Type: TABLE; Schema: trip_db; Owner: admin
--

CREATE TABLE trip_db.user_preferences (
    user_id text NOT NULL,
    preferred_transport_modes jsonb,
    budget_min numeric,
    budget_max numeric,
    preferred_destination_tags jsonb,
    avoid_tags jsonb,
    created_at timestamp with time zone,
    last_updated_at timestamp with time zone
);


ALTER TABLE trip_db.user_preferences OWNER TO admin;

--
-- Name: users; Type: TABLE; Schema: trip_db; Owner: admin
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


ALTER TABLE trip_db.users OWNER TO admin;

--
-- Name: v_route_stops; Type: VIEW; Schema: trip_db; Owner: admin
--

CREATE VIEW trip_db.v_route_stops AS
 SELECT r.feed_id,
    r.route_id,
    r.route_short_name,
    r.route_long_name,
    r.route_color,
    st.stop_sequence,
    s.stop_id,
    s.stop_name,
    s.stop_lat,
    s.stop_lon
   FROM (((trip_db.gtfs_routes r
     JOIN trip_db.gtfs_trips t ON (((t.feed_id = r.feed_id) AND ((t.route_id)::text = (r.route_id)::text) AND (t.direction_id = 0))))
     JOIN trip_db.gtfs_stop_times st ON (((st.feed_id = t.feed_id) AND ((st.trip_id)::text = (t.trip_id)::text))))
     JOIN trip_db.gtfs_stops s ON (((s.feed_id = st.feed_id) AND ((s.stop_id)::text = (st.stop_id)::text))))
  WHERE ((t.trip_id)::text = ( SELECT min((gtfs_trips.trip_id)::text) AS min
           FROM trip_db.gtfs_trips
          WHERE ((gtfs_trips.feed_id = r.feed_id) AND ((gtfs_trips.route_id)::text = (r.route_id)::text) AND (gtfs_trips.direction_id = 0))))
  ORDER BY r.route_short_name, st.stop_sequence;


ALTER VIEW trip_db.v_route_stops OWNER TO admin;

--
-- Name: destination_triples destination_triples_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.destination_triples
    ADD CONSTRAINT destination_triples_pkey PRIMARY KEY (destination_id);


--
-- Name: destinations destinations_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.destinations
    ADD CONSTRAINT destinations_pkey PRIMARY KEY (destination_id);


--
-- Name: gtfs_agency gtfs_agency_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_agency
    ADD CONSTRAINT gtfs_agency_pkey PRIMARY KEY (feed_id, agency_id);


--
-- Name: gtfs_calendar gtfs_calendar_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_calendar
    ADD CONSTRAINT gtfs_calendar_pkey PRIMARY KEY (feed_id, service_id);


--
-- Name: gtfs_feeds gtfs_feeds_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_feeds
    ADD CONSTRAINT gtfs_feeds_pkey PRIMARY KEY (feed_id);


--
-- Name: gtfs_routes gtfs_routes_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_routes
    ADD CONSTRAINT gtfs_routes_pkey PRIMARY KEY (feed_id, route_id);


--
-- Name: gtfs_stop_times gtfs_stop_times_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_stop_times
    ADD CONSTRAINT gtfs_stop_times_pkey PRIMARY KEY (feed_id, trip_id, stop_sequence);


--
-- Name: gtfs_stops gtfs_stops_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_stops
    ADD CONSTRAINT gtfs_stops_pkey PRIMARY KEY (feed_id, stop_id);


--
-- Name: gtfs_trips gtfs_trips_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_trips
    ADD CONSTRAINT gtfs_trips_pkey PRIMARY KEY (feed_id, trip_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (user_id, destination_id);


--
-- Name: route_options route_options_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT route_options_pkey PRIMARY KEY (option_id);


--
-- Name: route_requests route_requests_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.route_requests
    ADD CONSTRAINT route_requests_pkey PRIMARY KEY (request_id);


--
-- Name: transport_modes transport_modes_code_key; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.transport_modes
    ADD CONSTRAINT transport_modes_code_key UNIQUE (code);


--
-- Name: transport_modes transport_modes_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.transport_modes
    ADD CONSTRAINT transport_modes_pkey PRIMARY KEY (mode_id);


--
-- Name: transport_providers transport_providers_name_key; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.transport_providers
    ADD CONSTRAINT transport_providers_name_key UNIQUE (name);


--
-- Name: transport_providers transport_providers_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.transport_providers
    ADD CONSTRAINT transport_providers_pkey PRIMARY KEY (provider_id);


--
-- Name: trip_destinations trip_destinations_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT trip_destinations_pkey PRIMARY KEY (trip_id, destination_id);


--
-- Name: trip_scores trip_scores_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.trip_scores
    ADD CONSTRAINT trip_scores_pkey PRIMARY KEY (score_id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (trip_id);


--
-- Name: trip_destinations uq_trip_destinations_order; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT uq_trip_destinations_order UNIQUE (trip_id, visit_order);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_destinations_category; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_destinations_category ON trip_db.destinations USING btree (category);


--
-- Name: idx_destinations_name; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_destinations_name ON trip_db.destinations USING btree (name);


--
-- Name: idx_gtfs_routes_short_name; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_gtfs_routes_short_name ON trip_db.gtfs_routes USING btree (route_short_name);


--
-- Name: idx_gtfs_stop_times_stop; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_gtfs_stop_times_stop ON trip_db.gtfs_stop_times USING btree (feed_id, stop_id);


--
-- Name: idx_gtfs_stop_times_trip_seq; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_gtfs_stop_times_trip_seq ON trip_db.gtfs_stop_times USING btree (feed_id, trip_id, stop_sequence);


--
-- Name: idx_gtfs_stops_lat; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_gtfs_stops_lat ON trip_db.gtfs_stops USING btree (stop_lat);


--
-- Name: idx_gtfs_stops_lon; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_gtfs_stops_lon ON trip_db.gtfs_stops USING btree (stop_lon);


--
-- Name: idx_gtfs_stops_name; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_gtfs_stops_name ON trip_db.gtfs_stops USING btree (stop_name);


--
-- Name: idx_gtfs_trips_route; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_gtfs_trips_route ON trip_db.gtfs_trips USING btree (feed_id, route_id);


--
-- Name: idx_reviews_destination; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_reviews_destination ON trip_db.reviews USING btree (destination_id);


--
-- Name: idx_route_options_mode; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_route_options_mode ON trip_db.route_options USING btree (mode_id);


--
-- Name: idx_route_options_provider; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_route_options_provider ON trip_db.route_options USING btree (provider_id);


--
-- Name: idx_route_options_request; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_route_options_request ON trip_db.route_options USING btree (request_id);


--
-- Name: idx_route_requests_trip; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_route_requests_trip ON trip_db.route_requests USING btree (trip_id);


--
-- Name: idx_route_requests_user; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_route_requests_user ON trip_db.route_requests USING btree (user_id);


--
-- Name: idx_transport_providers_mode; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_transport_providers_mode ON trip_db.transport_providers USING btree (mode_id);


--
-- Name: idx_trip_destinations_destination; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_trip_destinations_destination ON trip_db.trip_destinations USING btree (destination_id);


--
-- Name: idx_trip_scores_option; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_trip_scores_option ON trip_db.trip_scores USING btree (option_id);


--
-- Name: idx_trips_status; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_trips_status ON trip_db.trips USING btree (status);


--
-- Name: idx_trips_user; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_trips_user ON trip_db.trips USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_users_email ON trip_db.users USING btree (email);


--
-- Name: idx_users_phone; Type: INDEX; Schema: trip_db; Owner: admin
--

CREATE INDEX idx_users_phone ON trip_db.users USING btree (phone);


--
-- Name: destination_triples fk_destination_triples_destination; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.destination_triples
    ADD CONSTRAINT fk_destination_triples_destination FOREIGN KEY (destination_id) REFERENCES trip_db.destinations(destination_id) ON DELETE CASCADE;


--
-- Name: gtfs_agency fk_gtfs_agency_feed; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_agency
    ADD CONSTRAINT fk_gtfs_agency_feed FOREIGN KEY (feed_id) REFERENCES trip_db.gtfs_feeds(feed_id) ON DELETE CASCADE;


--
-- Name: gtfs_calendar fk_gtfs_calendar_feed; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_calendar
    ADD CONSTRAINT fk_gtfs_calendar_feed FOREIGN KEY (feed_id) REFERENCES trip_db.gtfs_feeds(feed_id) ON DELETE CASCADE;


--
-- Name: gtfs_routes fk_gtfs_routes_feed; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_routes
    ADD CONSTRAINT fk_gtfs_routes_feed FOREIGN KEY (feed_id) REFERENCES trip_db.gtfs_feeds(feed_id) ON DELETE CASCADE;


--
-- Name: gtfs_stop_times fk_gtfs_stop_times_stop; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_stop_times
    ADD CONSTRAINT fk_gtfs_stop_times_stop FOREIGN KEY (feed_id, stop_id) REFERENCES trip_db.gtfs_stops(feed_id, stop_id) ON DELETE CASCADE;


--
-- Name: gtfs_stop_times fk_gtfs_stop_times_trip; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_stop_times
    ADD CONSTRAINT fk_gtfs_stop_times_trip FOREIGN KEY (feed_id, trip_id) REFERENCES trip_db.gtfs_trips(feed_id, trip_id) ON DELETE CASCADE;


--
-- Name: gtfs_stops fk_gtfs_stops_feed; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_stops
    ADD CONSTRAINT fk_gtfs_stops_feed FOREIGN KEY (feed_id) REFERENCES trip_db.gtfs_feeds(feed_id) ON DELETE CASCADE;


--
-- Name: gtfs_trips fk_gtfs_trips_feed; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_trips
    ADD CONSTRAINT fk_gtfs_trips_feed FOREIGN KEY (feed_id) REFERENCES trip_db.gtfs_feeds(feed_id) ON DELETE CASCADE;


--
-- Name: gtfs_trips fk_gtfs_trips_route; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.gtfs_trips
    ADD CONSTRAINT fk_gtfs_trips_route FOREIGN KEY (feed_id, route_id) REFERENCES trip_db.gtfs_routes(feed_id, route_id) ON DELETE CASCADE;


--
-- Name: reviews fk_reviews_destination; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.reviews
    ADD CONSTRAINT fk_reviews_destination FOREIGN KEY (destination_id) REFERENCES trip_db.destinations(destination_id) ON DELETE CASCADE;


--
-- Name: reviews fk_reviews_user; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.reviews
    ADD CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE CASCADE;


--
-- Name: route_options fk_route_options_gtfs_feed; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT fk_route_options_gtfs_feed FOREIGN KEY (gtfs_feed_id) REFERENCES trip_db.gtfs_feeds(feed_id) ON DELETE SET NULL;


--
-- Name: route_options fk_route_options_mode; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT fk_route_options_mode FOREIGN KEY (mode_id) REFERENCES trip_db.transport_modes(mode_id);


--
-- Name: route_options fk_route_options_provider; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT fk_route_options_provider FOREIGN KEY (provider_id) REFERENCES trip_db.transport_providers(provider_id) ON DELETE SET NULL;


--
-- Name: route_options fk_route_options_request; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.route_options
    ADD CONSTRAINT fk_route_options_request FOREIGN KEY (request_id) REFERENCES trip_db.route_requests(request_id) ON DELETE CASCADE;


--
-- Name: route_requests fk_route_requests_trip; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.route_requests
    ADD CONSTRAINT fk_route_requests_trip FOREIGN KEY (trip_id) REFERENCES trip_db.trips(trip_id) ON DELETE SET NULL;


--
-- Name: route_requests fk_route_requests_user; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.route_requests
    ADD CONSTRAINT fk_route_requests_user FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE SET NULL;


--
-- Name: transport_providers fk_transport_providers_mode; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.transport_providers
    ADD CONSTRAINT fk_transport_providers_mode FOREIGN KEY (mode_id) REFERENCES trip_db.transport_modes(mode_id);


--
-- Name: trip_destinations fk_trip_destinations_destination; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT fk_trip_destinations_destination FOREIGN KEY (destination_id) REFERENCES trip_db.destinations(destination_id) ON DELETE CASCADE;


--
-- Name: trip_destinations fk_trip_destinations_trip; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.trip_destinations
    ADD CONSTRAINT fk_trip_destinations_trip FOREIGN KEY (trip_id) REFERENCES trip_db.trips(trip_id) ON DELETE CASCADE;


--
-- Name: trip_scores fk_trip_scores_option; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.trip_scores
    ADD CONSTRAINT fk_trip_scores_option FOREIGN KEY (option_id) REFERENCES trip_db.route_options(option_id) ON DELETE CASCADE;


--
-- Name: trips fk_trips_user; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.trips
    ADD CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE CASCADE;


--
-- Name: user_preferences fk_user_preferences_user; Type: FK CONSTRAINT; Schema: trip_db; Owner: admin
--

ALTER TABLE ONLY trip_db.user_preferences
    ADD CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES trip_db.users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict UdNiwztzb4O8NAcMs7a0dcPEXvaEvbjIBSdnhUgVXKI6pQtfV5EHwZLGfsp0py8

