# 03 — Phases (target: finish Friday, Saturday = buffer)

## P0 — Setup (Thu night, max 1 hr)
- Own AWS account (or IAM user where I launch everything myself), MFA, budget alert
- EC2 t3.small + security group + key pair + Elastic IP
- GitHub repo created (monorepo), agent pointed at these MD files
Done when: I can `ssh` into the EC2 box and Docker is installed (`docker --version`, `docker compose version`).

## P1 — Minimal app (Fri 9:00-12:00)
Build per `04-app-spec.md`.
Done when: locally, submit a message in the UI, see status go `queued -> processing -> completed` with a result.

## P2 — Docker (Fri 12:00-2:30)
Dockerfiles x3, `docker-compose.yml`, Caddyfile, `.env.example`, healthchecks, volume.
Done when: `docker compose up -d --build` from a clean clone works; all services healthy; data survives `docker compose down && up`.

## P3 — CI/CD (Fri 3:30-5:30)
`.github/workflows/deploy.yml` per `05-docker-cicd-deploy.md`.
Done when: a push to `main` runs green, pushes 3 images tagged with the SHA to GHCR; a deliberately broken build does NOT deploy.

## P4 — Cloud (Fri 5:30-8:30)
Server bootstrap, `.env` on server, first deploy, HTTPS hostname.
Done when: public URL works from my phone and the job flow works end to end; a push to `main` auto-updates the site.

## P5 — Docs (Fri 8:30-10:00)
README, architecture diagram (Mermaid or draw.io export), reliability answers (`06-...`).
Done when: README has architecture, steps, env vars, decisions, limitations.

## P6 — Video + submit (Sat morning)
Rehearse twice with a timer, record (under 3:00), upload (unlisted YouTube/Drive), submit the form, test everything from another device.

## Fallbacks
- Cloud slips: deploy manually with `docker compose pull && up -d`, finish the CI deploy step afterwards.
- HTTPS slips: ship HTTP on the IP first, add the hostname later.
