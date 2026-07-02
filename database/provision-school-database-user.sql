-- SchoolBank school database user provisioning.
--
-- Run this file while connected to the new school's database as a PostgreSQL
-- admin, database owner, or another role allowed to create roles and grant
-- privileges.
--
-- Change the values in the variables block before running it for each school.

do $$
declare
  school_db_user text := 'schoolbank_user_dev';
  school_db_password text := 'change_this_password';
begin
  if exists (
    select 1
    from pg_roles
    where rolname = school_db_user
  ) then
    execute format(
      'alter role %I with login password %L nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls',
      school_db_user,
      school_db_password
    );
  else
    execute format(
      'create role %I with login password %L nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls',
      school_db_user,
      school_db_password
    );
  end if;

  execute format(
    'grant connect on database %I to %I',
    current_database(),
    school_db_user
  );

  execute format(
    'grant usage on schema public to %I',
    school_db_user
  );

  execute format(
    'grant select, insert, update, delete on all tables in schema public to %I',
    school_db_user
  );

  execute format(
    'grant usage, select, update on all sequences in schema public to %I',
    school_db_user
  );

  execute format(
    'alter default privileges in schema public grant select, insert, update, delete on tables to %I',
    school_db_user
  );

  execute format(
    'alter default privileges in schema public grant usage, select, update on sequences to %I',
    school_db_user
  );
end $$;

