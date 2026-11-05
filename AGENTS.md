# AGENTS.md — Rules for the coding agent

Project: VEGAH DevOps / Cloud Engineering Intern assessment.
Owner: Dipak. He must be able to explain EVERY line in an interview.

## Read first
Read `01-requirements.md` through `07-interview-prep.md` before writing any code.

## Hard rules
1. **Build ONLY what is listed in `01-requirements.md`.** No extras.
2. **Forbidden (not required, adds risk):** Kubernetes, Helm, Terraform, ArgoCD, Prometheus/Grafana, RDS, ElastiCache, ECS/EKS, ALB, auth/login, user accounts, ORMs beyond TypeORM, extra microservices, extra UI pages.
3. **Fixed stack:** Next.js (frontend), NestJS (backend), PostgreSQL, Redis + BullMQ (worker), Docker + Docker Compose, GitHub Actions, GHCR, AWS EC2, Caddy (reverse proxy + HTTPS).
4. **Keep it simple.** Minimal app, small files, plain readable code. Prefer boring over clever.
5. **Comment the "why"** on every infra decision (Dockerfile stages, healthchecks, restart policy, volumes, workflow gates).
6. **Secrets:** never commit secrets. Only `.env.example` with fake values. `.env` is in `.gitignore`. CI uses GitHub Secrets.
7. **Docker:** multi-stage builds, pinned base images (`node:20-alpine`), non-root user, `.dockerignore` per service.
8. **Work phase by phase** following `03-phases.md`. At the end of each phase: check the "Done when" list, then give a 5-line summary of what was built and why.
9. If something is needed that is NOT in the docs, **stop and ask** instead of adding it.
10. Commits: small, conventional (`feat:`, `fix:`, `ci:`, `docs:`).
11. Document any limitation honestly in the README.
