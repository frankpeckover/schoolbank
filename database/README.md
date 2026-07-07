# SchoolBank Database Setup

This folder has two DBeaver-friendly PostgreSQL setup scripts:

- `create-platform-database.sql`
- `create-school-database.sql`

Both files are plain SQL. They do not use `psql` backslash commands, so they can be run from DBeaver.

Normal SQL cannot create a database and then switch into it inside the same script. Create the empty database first, connect to that database, then run the relevant setup file.

## Setup Order

1. Create and set up the platform database once.
2. Create and set up one school database per school.
3. Put the platform database connection in the app `.env.local`.
4. Put each school database connection in the platform database `organisations` table.

## Platform Database

The platform database is the one database the web app connects to directly from environment variables. It stores the lookup records that tell the app which school database to use for each domain/subdomain.

Run:

```txt
database/create-platform-database.sql
```

In DBeaver:

1. Create a database, for example `schoolbank_platform`.
2. Connect to `schoolbank_platform` as a PostgreSQL admin or database owner.
3. Open `create-platform-database.sql`.
4. Change the seeded organisation and `platform_app_user` values near the bottom.
5. Run the whole file.

The script creates:

- `organisations`
- one seeded development organisation
- the platform app PostgreSQL login
- grants for that login

The app expects these environment variables for the platform database:

```txt
PLATFORM_POSTGRES_HOST=
PLATFORM_POSTGRES_PORT=5432
PLATFORM_POSTGRES_DATABASE=schoolbank_platform
PLATFORM_POSTGRES_USER=schoolbank_platform_app
PLATFORM_POSTGRES_PASSWORD=
SCHOOLBANK_ROOT_DOMAIN=schoolbank.com
LOCAL_ORGANISATION_SLUG=local
```

## School Database

Each school gets its own separate database. The platform database points to it through an `organisations` row.

Run:

```txt
database/create-school-database.sql
```

In DBeaver:

1. Create a database, for example `schoolbank_dev`.
2. Connect to `schoolbank_dev` as a PostgreSQL admin or database owner.
3. Open `create-school-database.sql`.
4. Change the seeded school values and `school_app_user` values near the bottom.
5. Run the whole file.

The script creates:

- all current app tables
- indexes and constraints
- default permissions
- default roles
- default role permissions
- one `school_info` row
- the initial admin user
- the school app PostgreSQL login
- grants for that login

Initial admin login:

```txt
username: admin
password: admin
```

Use a different database login per school when you move beyond local development, for example:

```txt
schoolbank_user_dev
schoolbank_user_springfield
schoolbank_user_riverside
```

Then add that username and password to the matching `organisations` row in the platform database.

## Useful Checks

Platform database:

```sql
select slug, name, primary_domain, database_name, database_user, is_active
from organisations
order by slug;
```

School database:

```sql
select name, address, plan_type, currency_name, logo_url
from school_info;

select
  users.username,
  users.first_name,
  users.last_name,
  roles.role_key,
  users.is_active
from users
join roles on roles.id = users.role_id
order by users.username;

select name, price, quantity, is_active
from shop_items
order by name;
```

## API Clients

External apps use API keys stored in the school database as hashed values. Generate a key and insert SQL from the app folder:

```txt
npm run create-api-client -- --name "Shop app" --scopes balances:read,ledger:hold,ledger:void
```

The command prints the raw key once, then prints SQL you can run against the school database in DBeaver. Store the raw key in the external app, not in SchoolBank.

Available scopes:

```txt
balances:read
ledger:credit
ledger:debit
ledger:hold
ledger:void
```

## Notes

- The browser never receives database credentials.
- The app only needs the platform database credentials in `.env.local`.
- School database credentials live in the platform database.
- The setup scripts can be rerun during development, but they are not a migration system. Once real schools are using the app, schema changes should become explicit migrations.
