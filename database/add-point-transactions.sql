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

create table if not exists point_transactions (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references users(id) on delete restrict,
  created_by_user_id uuid not null references users(id) on delete restrict,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint point_transactions_amount_not_zero check (amount <> 0)
);

create index if not exists point_transactions_student_idx
  on point_transactions(student_user_id);

create index if not exists point_transactions_created_by_idx
  on point_transactions(created_by_user_id);

commit;
