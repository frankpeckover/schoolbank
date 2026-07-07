-- SchoolBank school database setup for DBeaver or any normal SQL editor.
--
-- Before running this file:
--   1. Create the school database, for example schoolbank.
--   2. Connect DBeaver to that school database as a PostgreSQL admin or owner.
--   3. Change the setup values noted below.
--   4. Run this whole file.
--
-- This creates the app tables, default roles/permissions, one school_info row,
-- and the initial admin user.
--
-- Initial login after setup:
--   username: admin
--   password: admin
--
-- Setup values:
--   Change these before running for a real school.
--   school_app_user/password are the database login the web app will use.
--
--   Search in this file for:
--     school_app_user text := 'schoolbank_app';
--     school_app_password text := 'change_this_password';
--     seeded_school_name text := 'SchoolBank School';
--     seeded_currency_name text := 'credits';
--
-- Defaults seeded by this file:
--   school name: SchoolBank School
--   currency name: credits
--
-- The script is safe to run again during development. Existing operational
-- data is left in place, while seeded lookup/config rows may be refreshed.
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

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete restrict,
  username text not null unique,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  profile_image_url text not null default '',
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete restrict,
  account_name text not null default 'Primary account',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references student_groups(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists timetable_entries (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references users(id) on delete restrict,
  group_id uuid not null references student_groups(id) on delete restrict,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_entries_day_check check (day_of_week between 0 and 6),
  constraint timetable_entries_time_check check (start_time < end_time)
);

create table if not exists shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  image_url text not null default '',
  price integer not null,
  quantity integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_items_price_not_negative check (price >= 0),
  constraint shop_items_quantity_not_negative check (quantity >= 0)
);

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
      'credit',
      'debit',
      'hold',
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

create table if not exists student_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  title text not null default 'Savings goal',
  target_amount integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_goals_target_positive check (target_amount > 0)
);

create table if not exists transaction_presets (
  id uuid primary key default gen_random_uuid(),
  preset_type text not null,
  amount integer,
  reason text,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (preset_type, sort_order),
  constraint transaction_presets_type_check check (
    preset_type in ('amount', 'reason')
  ),
  constraint transaction_presets_amount_check check (
    preset_type <> 'amount' or (amount is not null and amount > 0)
  ),
  constraint transaction_presets_reason_check check (
    preset_type <> 'reason' or (reason is not null and length(trim(reason)) > 0)
  )
);

create table if not exists api_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  key_prefix text not null,
  key_hash text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists api_client_scopes (
  client_id uuid not null references api_clients(id) on delete cascade,
  scope text not null,
  created_at timestamptz not null default now(),
  primary key (client_id, scope),
  constraint api_client_scopes_scope_check check (
    scope in (
      'balances:read',
      'ledger:credit',
      'ledger:debit',
      'ledger:hold',
      'ledger:void'
    )
  )
);

create table if not exists api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references api_clients(id) on delete cascade,
  idempotency_key text not null,
  request_hash text not null,
  response_body jsonb not null,
  status_code integer not null,
  created_at timestamptz not null default now(),
  unique (client_id, idempotency_key)
);

create table if not exists sso_identity_providers (
  id uuid primary key default gen_random_uuid(),
  provider_type text not null unique,
  display_name text not null,
  tenant_id text not null default '',
  client_id text not null default '',
  client_secret_encrypted text not null default '',
  issuer_url text not null default '',
  allowed_domain text not null default '',
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sso_identity_providers_type_check check (
    provider_type in ('google', 'microsoft_entra')
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
create index if not exists role_permissions_permission_idx on role_permissions(permission_key);
create index if not exists accounts_user_idx on accounts(user_id);
create index if not exists student_groups_active_idx on student_groups(is_active);
create index if not exists student_group_memberships_group_idx on student_group_memberships(group_id);
create index if not exists student_group_memberships_user_idx on student_group_memberships(user_id);
create index if not exists timetable_entries_teacher_time_idx
  on timetable_entries(teacher_user_id, day_of_week, start_time, end_time)
  where is_active = true;
create index if not exists timetable_entries_group_idx on timetable_entries(group_id);
create unique index if not exists timetable_entries_active_unique_idx
  on timetable_entries(teacher_user_id, group_id, day_of_week, start_time, end_time)
  where is_active = true;
create index if not exists shop_items_active_idx on shop_items(is_active);
create index if not exists shop_purchases_user_idx on shop_purchases(purchased_by_user_id);
create index if not exists shop_purchases_status_idx on shop_purchases(status);
create index if not exists shop_purchases_voided_idx on shop_purchases(is_voided);
create index if not exists ledger_entries_account_idx on ledger_entries(account_id);
create index if not exists ledger_entries_created_at_idx on ledger_entries(created_at);
create index if not exists ledger_entries_status_idx on ledger_entries(status);
create index if not exists ledger_entries_type_idx on ledger_entries(entry_type);
create index if not exists ledger_entries_related_entity_idx
  on ledger_entries(related_entity_type, related_entity_id);
create index if not exists transaction_presets_type_idx on transaction_presets(preset_type, sort_order);
create index if not exists api_clients_active_idx on api_clients(is_active);
create index if not exists api_client_scopes_scope_idx on api_client_scopes(scope);
create index if not exists api_idempotency_keys_client_idx on api_idempotency_keys(client_id);
create index if not exists sso_identity_providers_enabled_idx on sso_identity_providers(is_enabled);
create unique index if not exists ledger_entries_source_unique_idx
  on ledger_entries(related_entity_type, related_entity_id, entry_type)
  where reversal_of_ledger_entry_id is null
    and related_entity_type = 'shop_purchase';
create index if not exists student_goals_user_idx on student_goals(user_id);
create index if not exists audit_log_created_at_idx on audit_log(created_at);
create index if not exists audit_log_actor_idx on audit_log(actor_user_id);
create index if not exists audit_log_entity_idx on audit_log(entity_type, entity_id);
create index if not exists server_error_log_created_at_idx on server_error_log(created_at);
create index if not exists server_error_log_source_idx on server_error_log(source);
create index if not exists password_reset_tokens_user_idx on password_reset_tokens(user_id);
create index if not exists password_reset_tokens_expires_idx on password_reset_tokens(expires_at);
create index if not exists user_sessions_user_idx on user_sessions(user_id);
create index if not exists user_sessions_expires_idx on user_sessions(expires_at);
create index if not exists user_sessions_last_seen_idx on user_sessions(last_seen_at);

insert into school_info (id, name, currency_name)
select 1, setup.seeded_school_name, setup.seeded_currency_name
from (
  select
    'SchoolBank School'::text as seeded_school_name,
    'credits'::text as seeded_currency_name
) setup
on conflict (id) do update
set name = excluded.name,
    currency_name = excluded.currency_name,
    updated_at = now();

insert into transaction_presets (preset_type, amount, reason, sort_order)
values
  ('amount', 1, null, 1),
  ('amount', 5, null, 2),
  ('amount', 10, null, 3),
  ('amount', 25, null, 4),
  ('amount', 50, null, 5),
  ('reason', null, 'Great effort', 1),
  ('reason', null, 'Helping others', 2),
  ('reason', null, 'Homework complete', 3),
  ('reason', null, 'Positive participation', 4),
  ('reason', null, 'Late work', 5),
  ('reason', null, 'Class disruption', 6)
on conflict (preset_type, sort_order) do nothing;

insert into sso_identity_providers (
  provider_type,
  display_name,
  issuer_url,
  is_enabled
)
values
  ('google', 'Google', 'https://accounts.google.com', false),
  ('microsoft_entra', 'Microsoft', 'https://login.microsoftonline.com', false)
on conflict (provider_type) do nothing;

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

insert into permissions (key, name, description, category)
values
  ('users.manage', 'Manage users', 'Create, edit, disable, and import users.', 'users'),
  ('passwords.reset_users', 'Reset user passwords', 'Reset passwords for other users.', 'users'),
  ('groups.manage', 'Manage groups', 'Create, archive, and manage student groups.', 'groups'),
  ('timetable.manage', 'Manage timetable', 'Assign teachers to groups by day and time.', 'timetable'),
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
  'timetable.manage',
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
  'scrypt:v1:7363686f6f6c62616e6b2d61646d696e:6ae5e6009523abd6d721a2cd383d621fa57471cd3614fac43f8cb74d328a6590597f91511dedb2fa3c41159bfa93ae05fafb2ad058c815432e339a82683e2cd1'
)
on conflict (username) do nothing;

do $$
declare
  school_app_user text := 'schoolbank_app';
  school_app_password text := 'change_this_password';
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
