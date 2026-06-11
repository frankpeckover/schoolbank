-- Target database: postgres or another administrative database
--
-- Optional setup script for creating a dedicated app role.
-- This script does not create SchoolBank tables.
-- SchoolBank tables are created by 01-schema.sql, which must be run while
-- connected to the `schoolbank` database.
--
-- In DBeaver, run this while connected to the default `postgres` database
-- or any existing administrative database.
--
-- Change this password before using the database anywhere real.
--
-- Database creation is intentionally left as a separate step because PostgreSQL
-- does not support CREATE DATABASE inside a transaction or a DO block. In
-- DBeaver, create the `schoolbank` database from the UI, or run the CREATE
-- DATABASE statement at the bottom only if the database does not already exist.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'schoolbank_app') then
    create role schoolbank_app
      with login
      password 'change_me_before_running_in_production';
  end if;
end
$$;

-- Run this separately only if the `schoolbank` database does not exist:
-- create database schoolbank with owner schoolbank_app encoding 'UTF8' template template0;
