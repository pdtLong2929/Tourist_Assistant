-- =============================================================
-- seed.sql
-- Static seed data for transport_modes and transport_providers.
--
-- Run this AFTER schema_v2.sql and gtfs_schema.sql.
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- =============================================================


-- =============================================================
-- TRANSPORT MODES
-- GTFS modes: BUS, METRO, TRAIN, FERRY (is_gtfs = true)
-- App-managed: WALK, RIDE_HAILING, MOTORBIKE_RENTAL, CAR_RENTAL
-- gtfs_route_type follows the GTFS spec integer:
--   0=tram, 1=subway/metro, 2=rail, 3=bus, 4=ferry
-- =============================================================

INSERT INTO trip_db.transport_modes
    (mode_id, code, name, is_gtfs, gtfs_route_type)
VALUES
    ('MODE000001', 'BUS',              'Bus',              true,  3),
    ('MODE000002', 'METRO',            'Metro / Subway',   true,  1),
    ('MODE000003', 'WALK',             'Walking',          false, NULL),
    ('MODE000004', 'RIDE_HAILING',     'Ride hailing',     false, NULL),
    ('MODE000005', 'MOTORBIKE_RENTAL', 'Motorbike rental', false, NULL),
    ('MODE000006', 'CAR_RENTAL',       'Car rental',       false, NULL),
    ('MODE000007', 'TRAIN',            'Train',            true,  2),
    ('MODE000008', 'FERRY',            'Ferry',            true,  4)
ON CONFLICT (mode_id) DO NOTHING;


-- =============================================================
-- TRANSPORT PROVIDERS — RIDE HAILING
-- Grab, Be, Xanh SM operate in both Hanoi and HCMC.
-- No API integration (per project scope) — used for display
-- and recommendation only.
-- =============================================================

INSERT INTO trip_db.transport_providers
    (provider_id, mode_id, name, provider_type, website_url, app_deep_link, is_active)
VALUES
    ('PROV000001', 'MODE000006', 'Grab',     'RIDE_HAILING', 'https://grab.com',        'grab://',     true),
    ('PROV000002', 'MODE000006', 'Be',        'RIDE_HAILING', 'https://be.com.vn',       'be://',        true),
    ('PROV000003', 'MODE000006', 'Xanh SM',  'RIDE_HAILING', 'https://xanhsm.com',      'xanhsm://',   true)
ON CONFLICT (provider_id) DO NOTHING;


-- =============================================================
-- TRANSPORT PROVIDERS — MOTORBIKE RENTAL
-- Placeholder rows — update name/url when you have real data.
-- =============================================================

INSERT INTO trip_db.transport_providers
    (provider_id, mode_id, name, provider_type, website_url, is_active)
VALUES
    ('PROV000010', 'MODE000007', 'Motorbike Rental (TBD 1)', 'MOTORBIKE_RENTAL', NULL, false),
    ('PROV000011', 'MODE000007', 'Motorbike Rental (TBD 2)', 'MOTORBIKE_RENTAL', NULL, false)
ON CONFLICT (provider_id) DO NOTHING;


-- =============================================================
-- TRANSPORT PROVIDERS — CAR RENTAL
-- Placeholders — fill in when your car rental dataset is ready.
-- is_active = false so they won't appear in recommendations yet.
-- =============================================================

INSERT INTO trip_db.transport_providers
    (provider_id, mode_id, name, provider_type, website_url, is_active)
VALUES
    ('PROV000020', 'MODE000008', 'Car Rental (TBD 1)', 'CAR_RENTAL', NULL, false),
    ('PROV000021', 'MODE000008', 'Car Rental (TBD 2)', 'CAR_RENTAL', NULL, false),
    ('PROV000022', 'MODE000008', 'Car Rental (TBD 3)', 'CAR_RENTAL', NULL, false)
ON CONFLICT (provider_id) DO NOTHING;

-- When your car rental dataset arrives, update like this:
-- UPDATE trip_db.transport_providers
-- SET name = 'Actual Company Name', website_url = 'https://...', is_active = true
-- WHERE provider_id = 'PROV000020';
