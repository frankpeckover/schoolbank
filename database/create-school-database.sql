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

create table if not exists permissions (
  key text primary key,
  name text not null,
  description text not null default '',
  category text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique,
  name text not null,
  description text not null default '',
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_role_key_format check (role_key ~ '^[a-z0-9_]+$')
);

insert into roles (role_key, name, description, is_system)
values
  ('student', 'Student', 'Default student role.', true),
  ('teacher', 'Staff', 'Default staff role for teachers and school staff.', true),
  ('admin', 'Admin', 'Default administrator role.', true)
on conflict (role_key) do update
set name = excluded.name,
    description = excluded.description,
    is_system = excluded.is_system,
    updated_at = now();

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete restrict,
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

alter table users
  add column if not exists role_id uuid references roles(id) on delete restrict;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'users'
      and column_name = 'role'
  ) then
    update users
    set role_id = roles.id
    from roles
    where users.role::text = roles.role_key
      and users.role_id is null;
  end if;
end
$$;

alter table users
  alter column role_id set not null;

alter table users
  drop column if exists role;

drop type if exists user_role;

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

create table if not exists server_error_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  message text not null,
  stack text not null default '',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists users_role_id_idx on users(role_id);
create index if not exists roles_active_idx on roles(is_active);
create index if not exists permissions_category_idx on permissions(category);
create index if not exists role_permissions_permission_idx
  on role_permissions(permission_key);
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
create index if not exists server_error_log_created_at_idx on server_error_log(created_at);
create index if not exists server_error_log_source_idx on server_error_log(source);
create index if not exists password_reset_tokens_user_idx
  on password_reset_tokens(user_id);
create index if not exists password_reset_tokens_expires_idx
  on password_reset_tokens(expires_at);
create index if not exists user_sessions_user_idx on user_sessions(user_id);
create index if not exists user_sessions_expires_idx on user_sessions(expires_at);

drop index if exists ledger_entries_source_unique_idx;

create unique index ledger_entries_source_unique_idx
  on ledger_entries(related_entity_type, related_entity_id, entry_type)
  where reversal_of_ledger_entry_id is null
    and related_entity_type = 'shop_purchase';

insert into school_info (id, name, currency_name)
values (1, :'school_name', :'currency_name')
on conflict (id) do nothing;

insert into permissions (key, name, description, category)
values
  ('users.manage', 'Manage users', 'Create, edit, disable, and import users.', 'users'),
  ('passwords.reset_users', 'Reset user passwords', 'Reset passwords for other users.', 'users'),
  ('groups.manage', 'Manage groups', 'Create, archive, and manage student groups.', 'groups'),
  ('school_settings.manage', 'Manage school settings', 'Update organisation profile and app settings.', 'settings'),
  ('audit.view', 'View audit log', 'View recent administrative and system changes.', 'audit'),
  ('balances.view_own', 'View own balance', 'View personal account balance.', 'balances'),
  ('balances.view_all', 'View all balances', 'View student balances across the school.', 'balances'),
  ('transactions.view_own', 'View own transactions', 'View personal transaction history.', 'transactions'),
  ('transactions.view_all', 'View all transactions', 'View transaction history across the school.', 'transactions'),
  ('transactions.create_adjustment', 'Create adjustments', 'Add or remove currency for students and groups.', 'transactions'),
  ('transactions.void', 'Void transactions', 'Void and reverse ledger transactions.', 'transactions'),
  ('shop.items.manage', 'Manage shop items', 'Create, edit, archive, and restock shop items.', 'shop'),
  ('shop.items.request', 'Request shop items', 'Request available shop rewards.', 'shop'),
  ('shop.requests.approve', 'Approve shop requests', 'Approve or deny pending shop requests.', 'shop'),
  ('password.change_own', 'Change own password', 'Change personal account password.', 'account')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    updated_at = now();

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in (
  'balances.view_own',
  'password.change_own',
  'shop.items.request',
  'transactions.view_own'
)
where roles.role_key = 'student'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in (
  'balances.view_all',
  'password.change_own',
  'shop.items.manage',
  'shop.requests.approve',
  'transactions.create_adjustment',
  'transactions.view_all'
)
where roles.role_key = 'teacher'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in (
  'audit.view',
  'balances.view_all',
  'groups.manage',
  'password.change_own',
  'passwords.reset_users',
  'school_settings.manage',
  'shop.items.manage',
  'transactions.view_all',
  'transactions.void',
  'users.manage'
)
where roles.role_key = 'admin'
on conflict do nothing;

insert into users (
  role_id,
  username,
  first_name,
  last_name,
  email,
  password_hash
)
values (
  (select id from roles where role_key = 'admin'),
  'admin',
  'Admin',
  'User',
  'admin@demo.school',
  'scrypt:v1:7363686f6f6c62616e6b2d61646d696e2d64656d6f2d73616c74:90802341de7e4dfe35b48e0c3fd75cd143b638ef136880570dc44b87d014665aa5ba56eb0c053b781c9ed8b7d77ddb10fd272b66ed541779aded9317c3f7978b'
)
on conflict (username) do nothing;

commit;
