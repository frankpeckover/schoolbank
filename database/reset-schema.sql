-- Local development only.
-- This drops the current minimal SchoolBank schema from the selected database.
-- Target database: schoolbank
-- Run this script only while connected to the `schoolbank` database.

do $$
begin
  if current_database() <> 'schoolbank' then
    raise exception 'Wrong database: %. Connect to database "schoolbank" before running 99-reset-schema.sql.', current_database();
  end if;
end
$$;

begin;

drop table if exists shop_purchases;
drop table if exists point_transactions;
drop table if exists shop_items;
drop table if exists users;
drop table if exists school_info;

drop type if exists user_role;

commit;
