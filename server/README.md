# Workshop Registration API

Express + PostgreSQL backend for the workshop registration assessment.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Setup

```bash
cd server
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, SEED_ADMIN_* values

npm install
npm run db:generate
npm run db:migrate:dev   # or: npm run db:migrate in CI/production
npm run db:seed
npm run dev
```

The API listens on `PORT` (default `3000`).

### Bootstrap admin (no public signup)

The first admin is created only via `npm run db:seed`, using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env`. Re-running the seed updates that admin's password hash if the email already exists.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with file watch |
| `npm start` | Start API |
| `npm run db:migrate:dev` | Apply migrations (development) |
| `npm run db:migrate` | Apply migrations (deploy) |
| `npm run db:seed` | Seed admin + optional sample workshops |
| `npm test` | Run API integration tests (requires `DATABASE_URL`) |

## Assumptions

- **Duplicate active registrations:** At most one `ACTIVE` registration per workshop and normalized attendee email (case-insensitive). Enforced with a PostgreSQL partial unique index and `SELECT … FOR UPDATE` on the workshop row during registration.
- **Workshop status values:** `SCHEDULED`, `COMPLETED`, `CANCELLED`. Only `SCHEDULED` workshops accept new registrations.
- **Cancellation:** Soft cancel only; idempotent second cancel returns the existing record without changing timestamps or freeing extra seats.

## API overview

See assessment brief. Base path `/api`. Authenticated routes use `Authorization: Bearer <token>` from `POST /api/auth/login`.
