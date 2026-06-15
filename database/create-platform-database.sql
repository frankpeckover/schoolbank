-- SchoolBank platform database setup.
-- Run with psql from an administrative database:
--
--   psql -U postgres -f database/create-platform-database.sql
--
-- This creates the shared platform database used to map domains/subdomains to
-- school databases. Change the variables below before using this anywhere real.

\set app_role 'schoolbank_app'
\set app_password 'change_me_before_running_in_production'
\set platform_database 'schoolbank_platform'
\set default_org_slug 'springfield'
\set default_org_name 'Springfield School'
\set default_org_domain 'springfield.schoolbank.com'
\set default_school_database 'schoolbank'
\set default_school_database_host 'localhost'
\set default_school_database_port '5432'
\set default_school_database_user 'schoolbank_app'
\set default_school_database_password 'change_me_to_match_the_schoolbank_app_password'

select format(
  'create role %I with login password %L',
  :'app_role',
  :'app_password'
)
where not exists (
  select 1
  from pg_roles
  where rolname = :'app_role'
)
\gexec

select format(
  'create database %I with owner %I encoding %L template template0',
  :'platform_database',
  :'app_role',
  'UTF8'
)
where not exists (
  select 1
  from pg_database
  where datname = :'platform_database'
)
\gexec

\connect :platform_database

set role :app_role;

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
  :'default_org_slug',
  :'default_org_name',
  :'default_org_domain',
  :'default_school_database_host',
  :'default_school_database_port',
  :'default_school_database',
  :'default_school_database_user',
  :'default_school_database_password'
)
on conflict (slug) do update
set name = excluded.name,
    primary_domain = excluded.primary_domain,
    database_host = excluded.database_host,
    database_port = excluded.database_port,
    database_name = excluded.database_name,
    database_user = excluded.database_user,
    database_password = excluded.database_password,
    updated_at = now();

commit;
