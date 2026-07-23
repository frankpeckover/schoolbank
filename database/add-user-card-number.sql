-- Run against an existing school database to add optional card numbers.

alter table users
  add column if not exists card_number text not null default '';
