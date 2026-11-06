# 04 — App spec (keep minimal)

## Repo layout
```
/
├── AGENTS.md, 01-07 *.md
├── README.md
├── docker-compose.yml
├── Caddyfile
├── .env.example
├── .gitignore
├── .github/workflows/deploy.yml
├── frontend/   (Next.js, Dockerfile, .dockerignore)
├── backend/    (NestJS, Dockerfile, .dockerignore)
└── worker/     (Node + TypeScript + BullMQ, Dockerfile, .dockerignore)
```

## Job flow
1. UI: text input + "Submit" button + list of recent jobs with status.
2. `POST /api/jobs {message}` -> backend inserts a row (status `queued`) and adds a BullMQ job (queue name `jobs`, data `{jobId}`) -> returns `{id, status}`.
3. Worker takes the job, sets `processing`, waits ~5 s (simulated work), computes result (uppercase + word count), sets `completed` + result. On error sets `failed`.
4. `GET /api/jobs/:id` returns the job. `GET /api/jobs` returns the latest 10.
5. UI polls every 2 s and shows the status/result.

## Backend (NestJS)
- Global prefix `api`
- Endpoints: `POST /api/jobs`, `GET /api/jobs/:id`, `GET /api/jobs`, `GET /api/health` (checks Postgres + Redis, returns 200/503)
- TypeORM + Postgres, entity `Job(id uuid, message text, status text, result text null, createdAt, updatedAt)`; `synchronize: true` (README limitation: use migrations in production)
- `@nestjs/bullmq` producer. DTO validation with `class-validator`.

## Worker
- Standalone Node/TS process (no HTTP server). Reads same env (DB + Redis). Graceful shutdown on SIGTERM.
- Healthcheck: write a heartbeat timestamp file every 10 s; Docker healthcheck checks that it is fresh (`find /tmp/heartbeat -mmin -1`).

## Frontend (Next.js)
- Single page. Calls relative `/api/...` (Caddy routes to backend). No auth, no other pages.

## Env vars (see `.env.example`)
`POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DATABASE_URL, REDIS_HOST, REDIS_PORT, BACKEND_PORT, SITE_ADDRESS, REGISTRY, TAG`
