do $$
begin
  if current_database() <> 'schoolbank' then
    raise exception 'Wrong database: %. Connect to database "schoolbank".', current_database();
  end if;
end
$$;

begin;

create extension if not exists pgcrypto;

create type user_role as enum ('admin', 'teacher', 'student');

create table users (
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

create index users_role_idx on users(role);

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
);
