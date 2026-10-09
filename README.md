# Workshop Registry

Workshop registration app with a React/Vite client and an Express API backed by PostgreSQL.

## Requirements

- Node.js 20 or newer and npm.
- PostgreSQL 14 or newer running on this computer.
- `psql` on your PATH, or pgAdmin to create the local database.

## 1. Create a local database

From the repository root, create a database called `workshop_registry`. In PowerShell or a terminal with PostgreSQL's command-line tools installed:

```powershell
psql -U postgres -c "CREATE DATABASE workshop_registry;"
```

Enter the password for your local PostgreSQL `postgres` user when prompted. If the database already exists, keep it and continue. Alternatively, create a database named `workshop_registry` in pgAdmin.

## 2. Configure and start the backend

Open a terminal at the repository root and run:

```powershell
Set-Location server
Copy-Item .env.example .env
```

Edit `server/.env` and set it to use the local database. These are development-only example values; use your local PostgreSQL password in `DATABASE_URL`:

```dotenv
DATABASE_URL="postgresql://postgres:YOUR_LOCAL_POSTGRES_PASSWORD@localhost:5432/workshop_registry?schema=public"
PORT=3000
JWT_SECRET="local-only-change-this-before-deployment"
SEED_ADMIN_EMAIL="admin@demo.com"
SEED_ADMIN_PASSWORD="WorkshopAdmin123!"
SEED_SAMPLE_WORKSHOPS="true"
```

Then, from the `server` directory, install dependencies, create the Prisma client, apply the database migration, seed the Admin and sample workshops, and start the API:

```powershell
npm install
npm run db:generate
npm run db:migrate:dev
npm run db:seed
npm run dev
```

Leave this terminal running. The API listens at `http://localhost:3000`; check it at `http://localhost:3000/health`.

## 3. Configure and start the frontend

Open a second terminal at the repository root:

```powershell
Set-Location client
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`. The development server proxies `/api` requests to `http://localhost:3000`. If the API uses another address, change `VITE_API_PROXY_TARGET` in `client/.env.local` and restart Vite.

## Try the app

Sign in with this **local development-only** Admin account:

| Email | Password |
| --- | --- |
| `admin@demo.com` | `admin123` |

The seed creates these scheduled sample workshops, dated relative to the time you run the seed:

| Code | Workshop | Instructor | Capacity | Scheduled |
| --- | --- | --- | ---: | --- |
| `WS-INTRO-001` | Introduction to Workshop Safety | Alex Rivera | 20 | 7 days after seeding |
| `WS-ADV-002` | Advanced Facilitation Skills | Jordan Lee | 12 | 14 days after seeding |

As Admin, open **Users** and create a Manager and a Staff account to try the other roles. Managers can create/edit workshops and manage registrations; Staff can register/cancel attendees but cannot create or edit workshops. Admin can list workshops and registration history and create accounts. The API enforces permissions regardless of what the client displays.

Running `npm run db:seed` again resets the seeded Admin password to the values in `server/.env` and refreshes the sample workshops. These credentials and the example JWT secret are for local development only; never use or publish them in a deployed environment.

## Checks

With the backend database configured, run the API integration tests in a separate terminal:

```powershell
Set-Location server
npm test
```
