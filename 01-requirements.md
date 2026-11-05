# 01 — Requirements (from the VEGAH assignment)

Goal: containerize a Next.js + NestJS + PostgreSQL + Redis worker app, automate CI/CD, deploy to AWS. We are graded on a WORKING solution and on explaining WHY.

## Task 1 — Containerization (20%)
- [ ] Separate Dockerfiles: frontend (Next.js), backend (NestJS), worker
- [ ] Docker Compose orchestrates everything
- [ ] PostgreSQL and Redis as supporting services
- [ ] Service-to-service communication works
- [ ] Config and credentials via environment variables
- [ ] Docker healthchecks where appropriate
- [ ] Multi-stage builds
- [ ] Postgres data persisted via a Docker volume
- [ ] **Single command starts everything** (`docker compose up -d`)

## Task 2 — CI/CD (25%) — GitHub Actions
- [ ] Triggers on push to `main`
- [ ] Install deps + build checks
- [ ] Build Docker images: frontend, backend, worker
- [ ] Push images to GHCR
- [ ] Deploy latest successful build to the cloud
- [ ] Secrets via GitHub Secrets
- [ ] Image tags = commit SHA (traceable)
- [ ] Avoid unnecessary rebuilds (layer cache)
- [ ] Failed builds are NOT deployed
- [ ] Deployment process documented

## Task 3 — Cloud deployment (20%) — AWS
- [ ] Frontend, backend, worker deployed
- [ ] Postgres + Redis (managed OR configured containers)
- [ ] Frontend -> backend works
- [ ] Backend -> Postgres and Redis works
- [ ] Networking, env vars, access permissions configured
- [ ] Public URL
- Kubernetes NOT required.

## Task 4 — Background jobs (15%)
Flow: user submits in frontend -> NestJS receives -> adds job to Redis queue (BullMQ) -> worker processes -> status/result available via API -> frontend shows status/result.

## Task 5 — Reliability + docs (10% + 10%)
Answer: crashes, secrets exposure, DB persistence, rollback, investigating a failing container, health monitoring. Short README: architecture, deploy steps, env vars, key decisions, limitations.

## Deliverables
1. GitHub repo (code, Dockerfiles, compose, workflows)
2. Public deployment URL
3. Architecture diagram
4. README
5. Walkthrough video **UNDER 3:00 (target 2:30)** — real screen recording, not slides

Video timeline: 0:00-0:30 architecture + cloud services | 0:30-1:00 Dockerfiles + compose | 1:00-1:40 pipeline run + image push | 1:40-2:20 live app: frontend + backend + worker | 2:20-2:50 secrets, storage, failures, rollback.

## Rules
- Do the work independently; AI tools allowed but Dipak must explain everything.
- No credentials in the repo.
- Free-tier / own cloud account; avoid unnecessary cost.
- Document anything not implemented.
- Repo + URL must stay accessible during evaluation.
- Submit via the Google Form (repo URL, app URL, diagram, video link).
