-- SchoolBank platform database setup for DBeaver or any normal SQL editor.
--
-- Before running this file:
--   1. Create the platform database, for example schoolbank_platform.
--   2. Connect DBeaver to that platform database as a PostgreSQL admin or owner.
--   3. Change the setup values near the bottom of this file.
--   4. Run this whole file.
--
-- This creates the platform lookup table and seeds one development organisation.
--
-- First seeded organisation:
--   slug: local
--   domain: dev.schoolbank.local
--   school database: schoolbank
--
-- The platform_app_user/password values are the one database login the web app
-- needs in .env.local to find all school database connection details.
begin;

create extension if not exists pgcrypto;

create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  primary_domain text not null unique,
  database_host text not null,
  database_port integer not null default 5432,
  database_name text not null,
  database_user text not null,
  database_password text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organisations_primary_domain_idx
  on organisations(primary_domain);

insert into organisations (
  slug,
  name,
  primary_domain,
  database_host,
  database_port,
  database_name,
  database_user,
  database_password
)
values (
  'local',
  'Development School',
  'dev.schoolbank.local',
  'localhost',
  5432,
  'schoolbank',
  'schoolbank_app',
  'change_me_to_match_school_database_password'
)
on conflict (slug) do update
set name = excluded.name,
    primary_domain = excluded.primary_domain,
    database_host = excluded.database_host,
    database_port = excluded.database_port,
    database_name = excluded.database_name,
    database_user = excluded.database_user,
    database_password = excluded.database_password,
    is_active = true,
    updated_at = now();

do $$
declare
  platform_app_user text := 'schoolbank_platform_app';
  platform_app_password text := 'change_this_password';
begin
  if exists (
    select 1
    from pg_roles
    where rolname = platform_app_user
  ) then
    execute format(
      'alter role %I with login password %L nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls',
      platform_app_user,
      platform_app_password
    );
  else
    execute format(
      'create role %I with login password %L nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls',
      platform_app_user,
      platform_app_password
    );
  end if;

  execute format('grant connect on database %I to %I', current_database(), platform_app_user);
  execute format('grant usage on schema public to %I', platform_app_user);
  execute format('grant select, insert, update, delete on all tables in schema public to %I', platform_app_user);
  execute format('grant usage, select, update on all sequences in schema public to %I', platform_app_user);
  execute format('alter default privileges in schema public grant select, insert, update, delete on tables to %I', platform_app_user);
  execute format('alter default privileges in schema public grant usage, select, update on sequences to %I', platform_app_user);
end $$;

commit;

