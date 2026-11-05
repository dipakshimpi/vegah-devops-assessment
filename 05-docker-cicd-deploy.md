# 05 — Docker, CI/CD, deployment

## Dockerfiles (each service)
- Stage 1 `deps`/`build`: `node:20-alpine`, `npm ci`, build.
- Stage 2 `runner`: `node:20-alpine`, copy only build output + prod deps, `USER node`, `NODE_ENV=production`.
- Next.js: use `output: 'standalone'`.
- `.dockerignore`: node_modules, .git, .env, dist, .next.

## docker-compose.yml
Services: `caddy, frontend, backend, worker, postgres, redis`.
- `image: ${REGISTRY}/<name>:${TAG:-latest}` plus a `build:` section so local `docker compose up --build` works.
- `postgres:16-alpine`, volume `pgdata:/var/lib/postgresql/data`, healthcheck `pg_isready`.
- `redis:7-alpine`, healthcheck `redis-cli ping`.
- `backend` healthcheck on `/api/health`; `depends_on` with `condition: service_healthy` for postgres and redis.
- `worker` depends on postgres and redis healthy; heartbeat healthcheck.
- `frontend` healthcheck on `/`.
- `restart: unless-stopped` on all.
- Config from `.env` (`env_file`). No hardcoded credentials.
- Only `caddy` has `ports: ["80:80","443:443"]`. Caddy volumes: `caddy_data`, `caddy_config`.

## Caddyfile
```
{$SITE_ADDRESS::80} {
  handle /api/* { reverse_proxy backend:3001 }
  handle { reverse_proxy frontend:3000 }
}
```
Local: `SITE_ADDRESS=:80`. Production: `SITE_ADDRESS=<hostname>` (Caddy gets HTTPS automatically).

## GitHub Actions `.github/workflows/deploy.yml`
Trigger: `push` to `main`.
- **test job:** checkout, setup-node 20 with npm cache, for each service `npm ci` + `npm run build` (+ lint/tests if present).
- **build-push job** (`needs: test`): matrix `[frontend, backend, worker]`; login to GHCR with `GITHUB_TOKEN` (`permissions: packages: write`); `docker/build-push-action` with tags `ghcr.io/<owner lowercase>/<repo>-<service>:<sha>` and `:latest`, `cache-from/to: type=gha` (avoids unnecessary rebuilds); Trivy scan (fail on CRITICAL, fixed only).
- **deploy job** (`needs: build-push`, only on `main`): `scp` the `docker-compose.yml` and `Caddyfile` to the server, then SSH and run:
  `cd /opt/app && export TAG=<sha> && docker compose pull && docker compose up -d && docker image prune -f`
  then check `curl -f https://<host>/api/health`.
- `concurrency` group so two deploys don't overlap.

## GitHub Secrets
`EC2_HOST, EC2_USER, EC2_SSH_KEY`, optional `GHCR_PULL_TOKEN` (only if packages are private; otherwise make packages public).

## Server bootstrap (one time, via SSH)
1. Install Docker Engine + compose plugin; add user to the `docker` group.
2. `sudo mkdir -p /opt/app && sudo chown $USER /opt/app`
3. Create `/opt/app/.env` (real values, `chmod 600`). Set `REGISTRY=ghcr.io/<owner>/<repo>` and `SITE_ADDRESS`.
4. Make sure the security group allows 80/443 and only my IP on 22.
5. Optional: 2 GB swap if RAM is tight.

## Rollback
Re-run the deploy with an older SHA: `TAG=<old-sha> docker compose up -d` (also available as a manual `workflow_dispatch` input).
