# Workshop Registry Client

## Run locally

Start PostgreSQL, configure the API using `server/.env`, then start the API:

```bash
cd server
npm install
npm run db:generate
npm run db:migrate:dev
npm run db:seed
npm run dev
```

In a second terminal, configure and start the client:

```bash
cd client
cp .env.example .env.local
npm install
npm run dev
```

The Vite server proxies `/api` to `http://localhost:3000`. Set `VITE_API_PROXY_TARGET` in `client/.env.local` if the API listens elsewhere. `VITE_API_BASE_URL` can be set at build time when the deployed frontend uses a separately hosted API; that API must allow the frontend origin.

## Role smoke tests

Use the seeded Admin credentials from `server/.env` to sign in. As Admin, create Manager and Staff accounts under Users. Sign in separately as Manager and Staff to check role-specific actions.

- Manager: create and edit a workshop; register and cancel attendees.
- Staff: filter workshops, register attendees, cancel active registrations, and view retained history. Workshop create/edit controls are unavailable.
- Admin: list workshops and history and create accounts. Workshop and registration mutations remain restricted by backend policy.

The API tests require a configured `DATABASE_URL` and can be run with `cd server && npm test`.
