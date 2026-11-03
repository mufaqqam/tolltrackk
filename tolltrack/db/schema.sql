-- TollTrack MVP — database schema (PostgreSQL 15+, e.g. Supabase)
-- Run this once in the Supabase SQL Editor, then run seed.sql.
-- Safe to re-run: it drops and recreates the TollTrack tables.

drop table if exists audit_log, statement_charges, statement_uploads, trips, runsheets,
  toll_points, toll_roads, sessions, users, geocode_cache cascade;

-- People who use the app. One table, two roles.
create table users (
  id              bigint generated always as identity primary key,
  role            text not null check (role in ('driver', 'admin')),
  full_name       text not null check (length(full_name) between 1 and 80),
  driver_no       text unique,                     -- drivers sign in with this
  email           text unique,                     -- office admins sign in with this
  secret_hash     text not null,                   -- bcrypt hash of the PIN or password, never the PIN itself
  truck_rego      text,                            -- driver's usual truck (matches the toll statement plate)
  toll_account    text,                            -- default toll authority / account number for the runsheet
  failed_logins   int not null default 0,
  locked_until    timestamptz,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  check ((role = 'driver' and driver_no is not null) or (role = 'admin' and email is not null))
);

-- Signed-in sessions. Only a SHA-256 hash of the cookie token is stored.
create table sessions (
  token_hash  text primary key,
  user_id     bigint not null references users(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index on sessions (user_id);

-- Reference data: Melbourne toll roads and their official entry/exit points.
create table toll_roads (
  id    smallint primary key,
  name  text not null unique
);

create table toll_points (
  id          int primary key,
  road_id     smallint not null references toll_roads(id),
  name        text not null,
  km          numeric(5,1) not null,               -- position along the road, used to work out direction
  lat         double precision not null,
  lng         double precision not null,
  entry_dirs  text[] not null default '{}',        -- directions you can ENTER here: 'inc' and/or 'dec'
  exit_dirs   text[] not null default '{}',        -- directions you can EXIT here
  unique (road_id, name)
);

-- One submitted runsheet per driver per day.
create table runsheets (
  id            bigint generated always as identity primary key,
  driver_id     bigint not null references users(id),
  sheet_date    date not null,
  trip_count    int not null,
  submitted_at  timestamptz not null default now(),
  unique (driver_id, sheet_date)
);

-- The core record: one toll trip for one job.
create table trips (
  id                  bigint generated always as identity primary key,
  driver_id           bigint not null references users(id),
  trip_date           date not null,
  job_number          text not null check (length(job_number) between 1 and 30),
  toll_account        text not null check (length(toll_account) between 1 and 30),
  truck_rego          text not null,                -- plate at the time of the trip (matches the toll statement)
  pickup_address      text not null check (length(pickup_address) <= 200),
  dropoff_address     text not null check (length(dropoff_address) <= 200),
  pickup_lat          double precision,
  pickup_lng          double precision,
  dropoff_lat         double precision,
  dropoff_lng         double precision,
  entry_point_id      int not null references toll_points(id),
  exit_point_id       int not null references toll_points(id),
  suggested_entry_id  int references toll_points(id),  -- what the engine suggested (kept for accuracy tracking)
  suggested_exit_id   int references toll_points(id),
  confidence          smallint check (confidence between 0 and 100),
  suggestion_reason   text,
  needs_check         boolean not null default false,
  runsheet_id         bigint references runsheets(id), -- set when the day is submitted; trip is then locked
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on trips (driver_id, trip_date);
create index on trips (runsheet_id);

-- Office uploads of the Linkt toll statement (CSV), and each charge line in it.
create table statement_uploads (
  id           bigint generated always as identity primary key,
  uploaded_by  bigint not null references users(id),
  filename     text not null,
  row_count    int not null,
  uploaded_at  timestamptz not null default now()
);

create table statement_charges (
  id               bigint generated always as identity primary key,
  upload_id        bigint not null references statement_uploads(id) on delete cascade,
  charge_date      date not null,
  charge_time      text,
  plate            text not null,
  road_name        text not null,
  entry_name       text not null,
  exit_name        text not null,
  amount_cents     int not null check (amount_cents >= 0),
  match_status     text not null check (match_status in ('matched', 'check', 'unmatched')),
  matched_trip_id  bigint references trips(id),
  match_note       text
);
create index on statement_charges (upload_id);

-- Who did what, for accountability (sign-ins, edits, submissions, uploads).
create table audit_log (
  id          bigint generated always as identity primary key,
  user_id     bigint references users(id),
  action      text not null,
  entity      text,
  entity_id   bigint,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index on audit_log (created_at desc);

-- Saves address lookups so the free map service is called once per address.
create table geocode_cache (
  query       text primary key,
  lat         double precision,
  lng         double precision,
  label       text,
  source      text not null,
  created_at  timestamptz not null default now()
);

-- The app connects with the database owner role over a server-side connection string.
-- Turn on Row Level Security with no policies so Supabase's public API keys cannot read these tables.
alter table users enable row level security;
alter table sessions enable row level security;
alter table toll_roads enable row level security;
alter table toll_points enable row level security;
alter table runsheets enable row level security;
alter table trips enable row level security;
alter table statement_uploads enable row level security;
alter table statement_charges enable row level security;
alter table audit_log enable row level security;
alter table geocode_cache enable row level security;
