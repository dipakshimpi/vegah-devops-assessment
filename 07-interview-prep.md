# 07 — Interview prep + video script

## Likely questions (one-line answers)
- **Why Compose on EC2, not ECS/K8s?** Not required, simplest to operate and debug for this scope; I know the trade-offs and would move to ECS/EKS for scale.
- **Why containers for Postgres/Redis?** Free-tier friendly and fine for a demo; production should use RDS/ElastiCache for backups, failover, patching.
- **Why Caddy?** One public entry point with automatic HTTPS; frontend calls `/api`, so no CORS and no build-time URLs.
- **Why SHA tags?** Traceability and easy rollback; `latest` is only a convenience.
- **How do you stop bad builds deploying?** Job dependencies: deploy `needs` test + build-push; plus a health check after deploy.
- **How do you avoid rebuilding?** Buildx layer cache (GHA cache), `npm ci` layer before copying source.
- **Why multi-stage and non-root?** Smaller images, no build tools or dev deps in runtime, reduced blast radius.
- **What happens if Redis goes down?** Backend health returns 503, jobs can't be queued; Docker restarts Redis; queued jobs persist only if Redis persistence is on (limitation; mention AOF).
- **What happens if the worker dies mid-job?** BullMQ detects the stalled job and retries it.
- **Biggest risks?** Single point of failure (one EC2), `synchronize: true`, secrets in a `.env` file.
- **Why a Trivy scan?** Catch known CVEs in images before deploy (shift-left, from my DevSecOps work).

## Video script (target 2:30, hard cap under 3:00)
| Time | Do |
|---|---|
| 0:00-0:30 | Show the diagram. "One EC2 in AWS, Docker Compose, Caddy for HTTPS, Postgres and Redis in a private Docker network, images from GHCR." |
| 0:30-1:00 | Open a Dockerfile (multi-stage, non-root) and the compose file (healthchecks, volume, depends_on). |
| 1:00-1:40 | GitHub Actions: show a green run, the SHA tags in GHCR, the Trivy step, deploy `needs`. |
| 1:40-2:20 | Public URL: submit a job, watch queued -> processing -> completed; show `docker compose ps` / worker logs on the server. |
| 2:20-2:50 | Secrets (GitHub Secrets, `.env` 600), volume persistence, restart policy, rollback by SHA. Stop at 2:50. |

Tips: keep tabs pre-opened, rehearse twice with a timer, no slides, a clean terminal with a big font.
