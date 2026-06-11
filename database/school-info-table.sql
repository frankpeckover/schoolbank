do $$
begin
  if current_database() <> 'schoolbank' then
    raise exception 'Wrong database: %. Connect to database "schoolbank" before running 05-add-shop.sql.', current_database();
  end if;
end
$$;

begin;

create table school_info (
  id integer primary key default 1 check (id = 1),
  name text not null default 'SchoolBank School',
  address text not null default '',
  plan_type text not null default 'trial',
  currency_name text not null default 'credits',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into school_info (id, name, currency_name)
values (1, 'Demo Primary School', 'credits')
on conflict (id) do nothing;

commit;
