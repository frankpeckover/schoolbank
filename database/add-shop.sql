-- Target database: schoolbank
-- Run this script only while connected to the `schoolbank` database.

do $$
begin
  if current_database() <> 'schoolbank' then
    raise exception 'Wrong database: %. Connect to database "schoolbank".', current_database();
  end if;
end
$$;

begin;

create table if not exists shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price integer not null,
  quantity integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name),
  constraint shop_items_price_not_negative check (price >= 0),
  constraint shop_items_quantity_not_negative check (quantity >= 0)
);

create table if not exists shop_purchases (
  id uuid primary key default gen_random_uuid(),
  shop_item_id uuid not null references shop_items(id) on delete restrict,
  purchased_by_user_id uuid not null references users(id) on delete restrict,
  price_at_purchase integer not null,
  purchased_at timestamptz not null default now()
);

create index if not exists shop_items_active_idx on shop_items(is_active);
create index if not exists shop_purchases_user_idx on shop_purchases(purchased_by_user_id);

insert into shop_items (name, description, price, quantity)
select items.name, items.description, items.price, items.quantity
from (
  values
    ('Homework pass', 'Skip one homework task with staff approval.', 100, 10),
    ('Lunch queue priority', 'Move near the front of the lunch line once.', 250, 5)
) as items(name, description, price, quantity)
where not exists (
  select 1
  from shop_items
  where shop_items.name = items.name
);

commit;
