# Workshop Registry

Monorepo with a React client (`client/`) and Node.js API (`server/`).

## Backend quick start

See [server/README.md](server/README.md) for PostgreSQL setup, migrations, seed admin, and API tests.

```bash
cd server && cp .env.example .env && npm install && npm run db:generate && npm run db:migrate:dev && npm run db:seed && npm run dev
```

## Frontend quick start

In another terminal, run:

```bash
cd client && cp .env.example .env.local && npm install && npm run dev
```

The Vite development server forwards `/api` requests to `http://localhost:3000` by default. Set `VITE_API_PROXY_TARGET` in `client/.env.local` if the backend uses a different address.
