-- Optional external API client setup.
--
-- Requires:
--   00-core-settings.sql
begin;

create extension if not exists pgcrypto;

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
  primary key (client_id, scope)
);

alter table api_client_scopes
  drop constraint if exists api_client_scopes_scope_check;

alter table api_client_scopes
  add constraint api_client_scopes_scope_check check (
    scope in (
      'balances:read',
      'ledger:credit',
      'ledger:debit',
      'ledger:hold',
      'ledger:void'
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

create index if not exists api_clients_active_idx on api_clients(is_active);
create index if not exists api_client_scopes_scope_idx on api_client_scopes(scope);
create index if not exists api_idempotency_keys_client_idx on api_idempotency_keys(client_id);

commit;
