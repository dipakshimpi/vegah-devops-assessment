# 06 — Reliability answers + README outline

## Answers (Task 5)
1. **Application crashes:** `restart: unless-stopped` restarts containers; healthchecks mark unhealthy ones; the worker uses BullMQ retries, so a job in flight is retried; Docker starts on boot, so a server reboot recovers everything.
2. **Secrets:** nothing in git (`.env` ignored, `.env.example` only fake values); CI uses GitHub Secrets; server `.env` is `chmod 600`; no AWS keys needed in CI (SSH key only); Postgres/Redis are not exposed publicly; Trivy scan in CI. Production upgrade: AWS Secrets Manager / SSM Parameter Store.
3. **DB persistence:** named volume `pgdata` survives container recreation and redeploys; `docker compose down` keeps it (never use `-v` in prod). Backup: scheduled `pg_dump` (documented, not automated). Production upgrade: RDS with automated backups.
4. **Rollback:** every image is tagged with the commit SHA; redeploy a previous SHA (`TAG=<old> docker compose up -d`), via manual workflow run or SSH. Failed builds never deploy because deploy `needs` test + build.
5. **Investigating a failing container:** `docker compose ps` (state/health) -> `docker compose logs --tail=100 -f <svc>` -> `docker inspect <id>` (health log, exit code) -> `docker exec -it <id> sh` -> `docker stats` / `df -h` / `free -m` for resources -> check `.env` and network reachability.
6. **Monitoring health:** `/api/health` (checks DB + Redis), Docker healthchecks, `docker compose ps`; external uptime check (UptimeRobot free) on the public URL; AWS CloudWatch basic EC2 metrics + budget alert. Production upgrade: Prometheus/Grafana.

## README outline
1. Overview + live URL
2. Architecture diagram + short explanation
3. Tech stack
4. Run locally (`cp .env.example .env && docker compose up -d --build`)
5. Environment variables table
6. CI/CD flow (test -> build -> scan -> push -> deploy) and how to roll back
7. AWS setup (resources list + security group rules)
8. Job flow explanation (Task 4)
9. Reliability answers (above, shortened)
10. Key decisions and trade-offs
11. Limitations / what I'd do next (RDS, ElastiCache, migrations, Secrets Manager, monitoring, blue-green)
12. Note on the AWS account used, stated honestly
