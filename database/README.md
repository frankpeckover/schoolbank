# SchoolBank Database Setup

This folder has two DBeaver-friendly setup scripts:

- `create-school-database.sql`
- `create-platform-database.sql`
- `provision-school-database-user.sql`

Both scripts are normal SQL. They do not use `psql` backslash commands, so they
can be run from DBeaver.

Normal SQL cannot create a database and then switch into it inside the same
script. Create the database/user first in DBeaver, connect to the target
database, then run the relevant file.

## School Database

Creates one school database with:

- the current app tables
- default roles and permissions
- one `school_info` row
- the initial admin user

```bash
database/create-school-database.sql
```

In DBeaver:

1. Create a database, for example `schoolbank`.
2. Create or choose the app user, for example `schoolbank_app`.
3. Connect to the `schoolbank` database.
4. Run `create-school-database.sql`.
5. Run `provision-school-database-user.sql` if this school needs its own
   dedicated database login.

To change the seeded school name or currency, edit the `insert into school_info`
statement near the bottom of the file.

Initial admin login:

```txt
username: admin
password: admin
```

## School Database User

Creates or updates the PostgreSQL login used by the app for one school database,
then grants it access to the current database's tables and sequences.

```bash
database/provision-school-database-user.sql
```

In DBeaver:

1. Connect to the target school database, for example `schoolbank_dev`.
2. Open `provision-school-database-user.sql`.
3. Change `school_db_user` and `school_db_password` near the top.
4. Run the whole file as a PostgreSQL admin or database owner.

Use a different database login per school, for example:

```txt
schoolbank_user_dev
schoolbank_user_springfield
schoolbank_user_riverside
```

After this, add the same username and password to the matching organisation row
in the platform database.

## Platform Database

Creates the shared platform database with:

- the `organisations` table
- one first development organisation row

```bash
database/create-platform-database.sql
```

In DBeaver:

1. Create a database, for example `schoolbank_platform`.
2. Create or choose the app user, for example `schoolbank_app`.
3. Connect to the `schoolbank_platform` database.
4. Run `create-platform-database.sql`.

To change the first seeded organisation, edit the `insert into organisations`
statement near the bottom of the file.

The app looks up an organisation by `primary_domain`. For local testing, create
a local DNS or hosts-file entry that points your dev domain at the app server IP,
then set that same domain as `primary_domain`.

The platform database stores each organisation's school database connection
details. The browser never sees these credentials. Add one row to
`organisations` for each future school.

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
