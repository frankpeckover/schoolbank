# MeritBank

MeritBank is a seedling-stage school economy app. The first build focuses on a small, useful loop:

- teachers award or deduct fake currency
- students see balances, goals, and store options
- admins manage the economy rules and review the ledger

The current app is a minimal authenticated shell backed by PostgreSQL. The signed-in user controls which empty dashboard frame is shown, and each view currently has a skeleton navigation bar with Dashboard and Settings.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- ESLint

Planned next additions:

- Prisma
- PostgreSQL connection
- Real sessions

## Getting Started

Install Node.js 22 LTS or newer. Next.js also supports Node 20.9+, but the local machine should be upgraded from Node 20.7 before regular development.

Create `.env.local` from `.env.example` and adjust the platform database credentials:

```txt
PLATFORM_POSTGRES_HOST=localhost
PLATFORM_POSTGRES_PORT=5432
PLATFORM_POSTGRES_DATABASE=app_platform
PLATFORM_POSTGRES_USER=platform_app_user
PLATFORM_POSTGRES_PASSWORD=change_me

LOCAL_ORGANISATION_SLUG=dev
APP_ROOT_DOMAIN=app.local
```

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Initial admin login after running the school database setup script:

```txt
username: admin
password: admin
```

## Early Roadmap

1. Rebuild the teacher dashboard one workflow at a time.
2. Rebuild the student dashboard with student-only data.
3. Rebuild the admin dashboard around setup and audit tools.
4. Add database tables only when the matching feature is built.
5. Add proper password hashing after the basic login flow is stable.
