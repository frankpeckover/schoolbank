# SchoolBank Database Setup

This folder now has two runnable setup scripts:

- `create-school-database.sql`
- `create-platform-database.sql`

Both scripts are intended to be run with `psql` because they create a database
and then use `\connect` to switch into it.

## School Database

Creates one school database, all school tables, and the initial admin user.

```bash
psql -U postgres -f database/create-school-database.sql
```

Before running it for a real school, edit the variables at the top of the file:

```sql
\set app_password 'change_me_before_running_in_production'
\set school_database 'schoolbank'
\set school_name 'SchoolBank School'
\set currency_name 'credits'
```

Initial admin login:

```txt
username: admin
password: demo123
```

## Platform Database

Creates the shared platform database and the `organisations` table used to map
domains/subdomains to school databases.

```bash
psql -U postgres -f database/create-platform-database.sql
```

Before running it for real, edit the variables at the top of the file,
especially:

```sql
\set app_password 'change_me_before_running_in_production'
\set default_school_database_password 'change_me_to_match_the_schoolbank_app_password'
```

The platform database stores each organisation's school database connection
details. The browser never sees these credentials.

## Useful Checks

School database:

```sql
select name, address, plan_type, currency_name, logo_url from school_info;
select username, first_name, last_name, role from users;
select name, price, quantity, is_active from shop_items;
```

Platform database:

```sql
select slug, primary_domain, database_name, is_active from organisations;
```
