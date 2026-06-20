-- SchoolBank school database setup.
-- Run with psql from an administrative database:
--
--   psql -U postgres -f database/create-school-database.sql
--
-- This script creates one school database, all school tables, and the initial
-- admin user. Change the variables below before using this anywhere real.

\set app_role 'schoolbank_app'
\set app_password 'change_me_before_running_in_production'
\set school_database 'schoolbank'
\set school_name 'SchoolBank School'
\set currency_name 'credits'

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
  :'school_database',
  :'app_role',
  'UTF8'
)
where not exists (
  select 1
  from pg_database
  where datname = :'school_database'
)
\gexec

\connect :school_database

set role :app_role;

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'teacher', 'student');
  end if;
end
$$;

create table if not exists school_info (
  id integer primary key default 1 check (id = 1),
  name text not null default 'SchoolBank School',
  address text not null default '',
  contact_email text not null default '',
  phone text not null default '',
  website text not null default '',
  timezone text not null default '',
  plan_type text not null default 'trial',
  currency_name text not null default 'credits',
  logo_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table school_info
  add column if not exists contact_email text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists website text not null default '',
  add column if not exists timezone text not null default '';

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role user_role not null,
  username text not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (username),
  unique (email)
);

create table if not exists shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text not null default '',
  price integer not null,
  quantity integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name),
  constraint shop_items_price_not_negative check (price >= 0),
  constraint shop_items_quantity_not_negative check (quantity >= 0)
);

alter table shop_items
  add column if not exists image_url text not null default '';

create table if not exists shop_purchases (
  id uuid primary key default gen_random_uuid(),
  shop_item_id uuid not null references shop_items(id) on delete restrict,
  purchased_by_user_id uuid not null references users(id) on delete restrict,
  price_at_purchase integer not null,
  status text not null default 'pending',
  decided_by_user_id uuid references users(id) on delete restrict,
  decided_at timestamptz,
  decision_note text not null default '',
  is_voided boolean not null default false,
  voided_at timestamptz,
  purchased_at timestamptz not null default now(),
  constraint shop_purchases_status_check check (
    status in ('pending', 'approved', 'denied')
  )
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete restrict,
  account_name text not null default 'Student account',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table if not exists student_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references student_groups(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  amount integer not null,
  entry_type text not null,
  status text not null,
  description text not null,
  related_entity_type text,
  related_entity_id uuid,
  created_by_user_id uuid references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  is_voided boolean not null default false,
  voided_by_user_id uuid references users(id) on delete restrict,
  voided_at timestamptz,
  void_reason text not null default '',
  reversal_of_ledger_entry_id uuid references ledger_entries(id) on delete restrict,
  constraint ledger_entries_amount_not_zero check (amount <> 0),
  constraint ledger_entries_type_check check (
    entry_type in (
      'reward',
      'penalty',
      'shop_hold',
      'shop_purchase',
      'shop_refund',
      'manual_adjustment',
      'void_reversal'
    )
  ),
  constraint ledger_entries_status_check check (
    status in ('pending', 'posted', 'voided')
  )
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists users_role_idx on users(role);
create index if not exists shop_items_active_idx on shop_items(is_active);
create index if not exists shop_purchases_user_idx
  on shop_purchases(purchased_by_user_id);
create index if not exists shop_purchases_status_idx on shop_purchases(status);
create index if not exists shop_purchases_voided_idx on shop_purchases(is_voided);
create index if not exists accounts_user_idx on accounts(user_id);
create index if not exists student_groups_active_idx on student_groups(is_active);
create index if not exists student_group_memberships_group_idx
  on student_group_memberships(group_id);
create index if not exists student_group_memberships_user_idx
  on student_group_memberships(user_id);
create index if not exists ledger_entries_account_idx on ledger_entries(account_id);
create index if not exists ledger_entries_created_at_idx on ledger_entries(created_at);
create index if not exists ledger_entries_status_idx on ledger_entries(status);
create index if not exists ledger_entries_type_idx on ledger_entries(entry_type);
create index if not exists ledger_entries_related_entity_idx
  on ledger_entries(related_entity_type, related_entity_id);
create index if not exists audit_log_created_at_idx on audit_log(created_at);
create index if not exists audit_log_actor_idx on audit_log(actor_user_id);
create index if not exists audit_log_entity_idx on audit_log(entity_type, entity_id);

create unique index if not exists ledger_entries_source_unique_idx
  on ledger_entries(related_entity_type, related_entity_id, entry_type)
  where reversal_of_ledger_entry_id is null
    and related_entity_type is not null
    and related_entity_id is not null;

insert into school_info (id, name, currency_name)
values (1, :'school_name', :'currency_name')
on conflict (id) do nothing;

insert into users (
  role,
  username,
  first_name,
  last_name,
  email,
  password_hash
)
values (
  'admin',
  'admin',
  'Admin',
  'User',
  'admin@demo.school',
  'scrypt:v1:7363686f6f6c62616e6b2d61646d696e2d64656d6f2d73616c74:90802341de7e4dfe35b48e0c3fd75cd143b638ef136880570dc44b87d014665aa5ba56eb0c053b781c9ed8b7d77ddb10fd272b66ed541779aded9317c3f7978b'
)
on conflict (username) do nothing;

commit;
