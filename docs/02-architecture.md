# 02 — Architecture & decisions

```
Internet
   |
 [Caddy :80/:443]  (auto HTTPS)
   |-- /api/*  --> [backend NestJS :3001] --> [Postgres :5432]
   |                      |
   |                      +--> [Redis :6379] <-- [worker BullMQ]
   |                                                |
   |                                                +--> [Postgres]
   +-- /*      --> [frontend Next.js :3000]

All inside one Docker network on ONE AWS EC2 instance.
Only Caddy publishes ports (80, 443). Postgres and Redis are NOT exposed.
```

## Decisions and why (know these for the interview)
| Decision | Why |
|---|---|
| Single EC2 + Docker Compose | Assignment allows it, K8s not required, cheapest, easiest to debug and explain |
| Postgres/Redis as containers | Free-tier friendly; named volume gives persistence. README notes RDS/ElastiCache as the production upgrade |
| Caddy reverse proxy | One public entry point, automatic Let's Encrypt HTTPS, tiny config. Frontend calls relative `/api`, so no build-time API URL and no CORS |
| GHCR for images | Free, integrated with GitHub Actions via `GITHUB_TOKEN` |
| Tag = commit SHA | Traceable; rollback = redeploy an older SHA |
| Build in CI, not on EC2 | Server stays small; deploy only pulls images |
| Deploy over SSH | Simple, no extra AWS services or AWS keys in CI |
| Deploy job `needs` test + build | Failed builds never get deployed |
| `restart: unless-stopped` + healthchecks | Crash recovery and dependency ordering |
| Multi-stage, non-root images | Smaller images, smaller attack surface |
| Trivy scan in CI | Small DevSecOps touch, easy to explain |

## AWS resources
EC2 t3.small (Ubuntu 24.04, 20-30 GB gp3), Security Group (22 from my IP only, 80/443 public), SSH key pair, Elastic IP, free hostname (`<ip-with-dashes>.nip.io` or DuckDNS), budget alert. Default VPC. Nothing else.
