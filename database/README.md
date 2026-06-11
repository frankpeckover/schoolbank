# SchoolBank Database

This folder contains the minimal PostgreSQL setup for the current app shell.
Each school gets its own database, so app tables do not include a `school_id`
scope column.

Right now it only supports:

- school info
- users
- assigned roles: admin, teacher, student
- shop items
- shop purchases

Feature tables for student wallets, accounts, and transactions will be added only when the app needs them.

## Requirements

- PostgreSQL 15 or newer
- `psql` command-line client

## Quick Start

Run these commands from the project root after installing PostgreSQL:

```bash
psql -U postgres -f database/create-database.sql
psql -U schoolbank_app -d schoolbank -f database/schema.sql
psql -U schoolbank_app -d schoolbank -f database/seed-demo.sql
```

The app connects using `.env.local`. Make sure it matches your container
credentials, for example:

```txt
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=schoolbank
POSTGRES_USER=schoolbank_app
POSTGRES_PASSWORD=your_password
```

## DBeaver Quick Start

Pay close attention to the database shown in the SQL editor toolbar. The schema,
seed, and reset scripts will now stop with an error unless the active database is
exactly `schoolbank`.

1. Connect to your temporary PostgreSQL server in DBeaver.
2. Open a SQL editor against the default `postgres` database.
3. Run `create-database.sql` if you want the dedicated `schoolbank_app` role.
4. Create a database named `schoolbank`:
   - right-click `Databases`
   - choose `Create New Database`
   - name it `schoolbank`
   - set owner to `schoolbank_app` if you created that role
5. Open a new SQL editor connected to the `schoolbank` database.
6. Run `schema.sql`.
7. Run `seed-demo.sql`.

Script targets:

```txt
create-database.sql     -> postgres or another admin database
schema.sql              -> schoolbank only
seed-demo.sql           -> schoolbank only
03-restore-password-hashes.sql -> schoolbank only
04-randomize-demo-school-id.sql -> schoolbank only
05-add-shop.sql         -> schoolbank only
06-remove-school-scope.sql -> schoolbank only
99-reset-schema.sql     -> schoolbank only
```

If DBeaver shows another database in the SQL editor toolbar, stop and open a new
SQL editor from the `schoolbank` database before running the script.

The schema creates one primitive school info row and one admin user.

The optional demo seed creates teacher and student users.

Demo usernames:

```txt
admin
teacher
ava.patel
```

Seeded users use a hashed `demo123` password.

## Reset A User Password

To reset a user to the demo password `demo123`, run this in DBeaver while
connected to `schoolbank`:

```sql
update users
set password_hash = 'scrypt:v1:7363686f6f6c62616e6b2d61646d696e2d64656d6f2d73616c74:90802341de7e4dfe35b48e0c3fd75cd143b638ef136880570dc44b87d014665aa5ba56eb0c053b781c9ed8b7d77ddb10fd272b66ed541779aded9317c3f7978b'
where username = 'teacher';
```

Change `teacher` to the username you want to reset.

## Useful Checks

```sql
select name, address, plan_type, currency_name from school_info;
select username, first_name, last_name, role from users;
select name, price, quantity, is_active from shop_items;
```

## Reset

For local development only:

Run these while connected to the `schoolbank` database:

```bash
psql -U schoolbank_app -d schoolbank -f database/reset-schema.sql
psql -U schoolbank_app -d schoolbank -f database/schema.sql
psql -U schoolbank_app -d schoolbank -f database/seed-demo.sql
```
