-- School database app-user grants.
--
-- Run this after whichever service/module setup scripts are enabled.
--
-- Change these two values for each school database:
--   school_app_user
--   school_app_password
--   target_schema
begin;

do $$
declare
  school_app_user text := 'dev_app_user';
  school_app_password text := 'gB6eYM688eR';
  target_schema text := 'public';
begin
  if target_schema !~ '^[a-z][a-z0-9_]*$' or target_schema ~ '^pg_' then
    raise exception 'Invalid target_schema: %', target_schema;
  end if;

  execute format('create schema if not exists %I', target_schema);

  if exists (
    select 1
    from pg_roles
    where rolname = school_app_user
  ) then
    execute format(
      'alter role %I with login password %L nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls',
      school_app_user,
      school_app_password
    );
  else
    execute format(
      'create role %I with login password %L nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls',
      school_app_user,
      school_app_password
    );
  end if;

  execute format('grant connect on database %I to %I', current_database(), school_app_user);
  execute format('grant usage on schema %I to %I', target_schema, school_app_user);
  execute format('grant select, insert, update, delete on all tables in schema %I to %I', target_schema, school_app_user);
  execute format('grant usage, select, update on all sequences in schema %I to %I', target_schema, school_app_user);
  execute format('alter default privileges in schema %I grant select, insert, update, delete on tables to %I', target_schema, school_app_user);
  execute format('alter default privileges in schema %I grant usage, select, update on sequences to %I', target_schema, school_app_user);
end $$;

commit;
