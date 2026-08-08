-- School database app-user grants.
--
-- Run this after whichever service/module setup scripts are enabled.
--
-- Change these two values for each school database:
--   school_app_user
--   school_app_password
begin;

do $$
declare
  school_app_user text := 'dev_app_user';
  school_app_password text := 'gB6eYM688eR';
begin
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
  execute format('grant usage on schema public to %I', school_app_user);
  execute format('grant select, insert, update, delete on all tables in schema public to %I', school_app_user);
  execute format('grant usage, select, update on all sequences in schema public to %I', school_app_user);
  execute format('alter default privileges in schema public grant select, insert, update, delete on tables to %I', school_app_user);
  execute format('alter default privileges in schema public grant usage, select, update on sequences to %I', school_app_user);
end $$;

commit;
