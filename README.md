# Workshop Registry

Monorepo with a React client (`client/`) and Node.js API (`server/`).

## Backend quick start

See [server/README.md](server/README.md) for PostgreSQL setup, migrations, seed admin, and API tests.

```bash
cd server && cp .env.example .env && npm install && npm run db:generate && npm run db:migrate:dev && npm run db:seed && npm run dev
```
