# App Database Setup

This folder contains DBeaver-friendly PostgreSQL setup scripts.

The platform database is still a single setup file:

- `create-platform-database.sql`

Each school database is now split by service/module under:

- `school/00-core-settings.sql`
- `school/01-auth.sql`
- `school/02-ledger.sql`
- `school/03-groups-timetable.sql`
- `school/04-rewards.sql`
- `school/05-sso.sql`
- `school/06-api-clients.sql`
- `school/99-grants.sql`

All files are plain SQL. They do not use `psql` backslash commands, so they can be run from DBeaver.

Normal SQL cannot create a database and then switch into it inside the same script. Create the empty database first, connect to that database, then run the relevant setup files.

## Setup Order

1. Create and set up the platform database once.
2. Create one database per school.
3. Connect to the school database.
4. Run the required core school setup scripts.
5. Run only the optional module scripts that organisation needs.
6. Run `school/99-grants.sql` last.
7. Put the platform database connection in the app `.env.local`.
8. Put each school database connection in the platform database `organisations` table.

## Platform Database

The platform database is the one database the web app connects to directly from environment variables. It stores the lookup records that tell the app which school database to use for each domain/subdomain.

Run:

```txt
database/create-platform-database.sql
```

In DBeaver:

1. Create a database, for example `app_platform`.
2. Connect to `app_platform` as a PostgreSQL admin or database owner.
3. Open `create-platform-database.sql`.
4. Change the seeded organisation values if needed.
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
PLATFORM_POSTGRES_DATABASE=app_platform
PLATFORM_POSTGRES_USER=platform_app_user
PLATFORM_POSTGRES_PASSWORD=
APP_ROOT_DOMAIN=app.example.com
LOCAL_ORGANISATION_SLUG=local
```

## School Database

Each school gets its own separate database. The platform database points to it through an `organisations` row.

Minimum app setup:

```txt
database/school/00-core-settings.sql
database/school/01-auth.sql
database/school/02-ledger.sql
database/school/99-grants.sql
```

Optional modules:

```txt
database/school/03-groups-timetable.sql
database/school/04-rewards.sql
database/school/05-sso.sql
database/school/06-api-clients.sql
```

Current full app setup:

```txt
database/school/00-core-settings.sql
database/school/01-auth.sql
database/school/02-ledger.sql
database/school/03-groups-timetable.sql
database/school/04-rewards.sql
database/school/05-sso.sql
database/school/06-api-clients.sql
database/school/99-grants.sql
```

In DBeaver:

1. Create a database, for example `app_dev`.
2. Connect to `app_dev` as a PostgreSQL admin or database owner.
3. Open each required school script.
4. Run them in numbered order.
5. Change `school_app_user` and `school_app_password` in `99-grants.sql` if needed.
6. Run `99-grants.sql` last.

Initial admin login from `01-auth.sql`:

```txt
username: admin
password: admin
```

Default school database login created by `99-grants.sql`:

```txt
username: dev_app_user
password: gB6eYM688eR
```

The seeded `local` organisation in `create-platform-database.sql` points to this default login. If you change the school database login, update the matching `organisations` row in the platform database as well.

Use a different database login per school when you move beyond local development, for example:

```txt
school_app_user_dev
school_app_user_springfield
school_app_user_riverside
```

Then add that username and password to the matching `organisations` row in the platform database.

## Module Notes

The current app still expects the enabled UI features to have their matching database tables.

For example:

- If rewards are visible in the app, run `04-rewards.sql`.
- If groups or timetables are visible in the app, run `03-groups-timetable.sql`.
- If SSO is enabled, run `05-sso.sql`.
- If external API clients are enabled, run `06-api-clients.sql`.

Do not run optional module scripts for organisations that will not use those modules.

## Useful Checks

Platform database:

```sql
select slug, name, primary_domain, database_name, database_user, is_active
from organisations
order by slug;
```

School database:

```sql
select name, address, currency_name, logo_url
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
npm run create-api-client -- --name "Rewards app" --scopes balances:read,ledger:hold,ledger:void
```

The command prints the raw key once, then prints SQL you can run against the school database in DBeaver. Store the raw key in the external app, not in this app.

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
