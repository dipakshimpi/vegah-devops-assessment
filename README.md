# VEGAH DevOps & Cloud Assessment — Job Processing System

[![CI/CD Pipeline](https://github.com/dipakshimpi/vegah-devops-assessment/actions/workflows/deploy.yml/badge.svg)](https://github.com/dipakshimpi/vegah-devops-assessment/actions/workflows/deploy.yml)
[![Live URL](https://img.shields.io/badge/Live_URL-https%3A%2F%2F16--176--48--154.nip.io-success)](https://16-176-48-154.nip.io)
[![AWS](https://img.shields.io/badge/AWS-EC2%20t3.small-orange)](https://aws.amazon.com/ec2/)
[![Terraform](https://img.shields.io/badge/IaC-Terraform-blueviolet)](https://www.terraform.io/)
[![Docker](https://img.shields.io/badge/Containers-Docker%20Compose-2496ED)](https://www.docker.com/)

A containerized, 3-tier background job processing system featuring **Next.js**, **NestJS**, **BullMQ**, **Redis**, **PostgreSQL**, and **Caddy**, automated with **GitHub Actions CI/CD**, provisioned with **Terraform**, and deployed to **AWS EC2** with automated **Let's Encrypt HTTPS**.

---

## 🌐 Live Deployment

* **Production URL:** [https://16-176-48-154.nip.io](https://16-176-48-154.nip.io)
* **Health Check API:** [https://16-176-48-154.nip.io/api/health](https://16-176-48-154.nip.io/api/health)
* **GitHub Repository:** [https://github.com/dipakshimpi/vegah-devops-assessment](https://github.com/dipakshimpi/vegah-devops-assessment)

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Internet ["Public Internet"]
        User["User Browser / Client"]
    end

    subgraph AWS ["AWS Cloud (Region: ap-southeast-2)"]
        subgraph EC2 ["AWS EC2 Instance (t3.small - Ubuntu 24.04 - Elastic IP: 16.176.48.154)"]
            
            subgraph Edge ["Edge Layer (Public Ports: 80, 443)"]
                Caddy["Caddy Reverse Proxy<br/>(Auto Let's Encrypt TLS)"]
            end

            subgraph PrivateNet ["Isolated Docker Bridge Network"]
                Frontend["Frontend Container<br/>(Next.js Standalone :3000)"]
                Backend["Backend API Container<br/>(NestJS :3001)"]
                Worker["Worker Daemon Container<br/>(BullMQ + Node.js TS)"]
                Redis[("Redis 7 In-Memory Queue<br/>Port: 6379 (Internal)")]
                Postgres[("PostgreSQL 16 DB<br/>Port: 5432 (Internal)")]
            end

            subgraph Storage ["Persistent Storage"]
                Volume["Docker Named Volume<br/>(pgdata)"]
                CaddyData["Caddy TLS Certificates<br/>(caddy_data)"]
            end
        end
    end

    User -->|"HTTPS (:443)"| Caddy
    Caddy -->|"/*"| Frontend
    Caddy -->|"/api/*"| Backend

    Frontend -.->|"Polls GET /api/jobs (2s)"| Backend
    Backend -->|"POST /api/jobs (save row)"| Postgres
    Backend -->|"Enqueues {jobId}"| Redis

    Worker -->|"Pulls job from 'jobs' queue"| Redis
    Worker -->|"Updates status & result"| Postgres

    Postgres --- Volume
    Caddy --- CaddyData
```

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | Next.js (App Router) + React | 14.2 / 18.3 | Single-page UI with live status polling and submission form |
| **Backend API** | NestJS + TypeORM | 11.0 / 0.3 | RESTful API producer, DTO validation, and dual-dependency healthcheck |
| **Queue / Broker**| Redis | 7-alpine | In-memory message broker for BullMQ job queue |
| **Worker Daemon**| Node.js + TypeScript + BullMQ | 20-alpine / 5.41 | Consumes jobs, simulates 5s workload, transforms text, records heartbeats |
| **Database** | PostgreSQL | 16-alpine | Relational persistence for jobs, statuses, results, and timestamps |
| **Reverse Proxy** | Caddy Server | 2-alpine | Single public gateway, zero-config Let's Encrypt TLS termination, routing |
| **Infrastructure**| Terraform | 1.14+ | Infrastructure as Code provisioning EC2, Security Groups, and Elastic IP |
| **CI/CD** | GitHub Actions + GHCR | Native | Build verification, Docker Buildx caching, Trivy security scan, SSH deploy |

---

## ⚡ Key Architectural Decisions & Trade-Offs

1. **Single EC2 + Docker Compose vs. Kubernetes/ECS:**
   - *Decision:* Deployed using Docker Compose on an AWS EC2 `t3.small` instance.
   - *Why:* Keeps operational complexity low, avoids multi-hundred-dollar managed cluster costs, and gives 100% environment parity between local development and cloud production.
2. **Caddy Reverse Proxy vs. NGINX + Certbot:**
   - *Decision:* Used Caddy with automatic Let's Encrypt HTTPS.
   - *Why:* Automatically manages certificate issuance and renewal with zero external scripts, and routes relative `/api/*` requests so frontend needs no build-time environment variables or CORS configuration.
3. **Decoupled Producer-Consumer Architecture (BullMQ + Redis):**
   - *Decision:* Asynchronous background queue separating the NestJS HTTP API from the computing worker.
   - *Why:* Heavy 5-second computations never block the Node.js event loop; web requests return in ~10 ms with `201 Created`, while worker capacity can scale horizontally.
4. **Multi-Stage Non-Root Docker Builds:**
   - *Decision:* Built all images using `node:20-alpine` with builder/runner stages and `USER node`.
   - *Why:* Strips build tools, TypeScript compilers, and devDependencies from production images; minimizes image size and reduces attack surface.
5. **Traceable Git SHA Tagging:**
   - *Decision:* Every image is published with the commit SHA (`:${{ github.sha }}`) in addition to `:latest`.
   - *Why:* Guarantees full auditability and enables instant rollbacks to any prior commit by redeploying that SHA.

---

## 🚀 Running Locally

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker 24+, Compose v2+)

### Step-by-Step
```bash
# 1. Clone repository
git clone https://github.com/dipakshimpi/vegah-devops-assessment.git
cd vegah-devops-assessment

# 2. Setup local environment file
cp .env.example .env

# 3. Start entire system with a single command
docker compose up -d --build

# 4. Verify all services are healthy
docker compose ps
```

* Open your browser at **`http://localhost`**
* Test the health check endpoint: **`http://localhost/api/health`**

---

## 📋 Environment Variables Reference

| Variable | Description | Local Example | Production Example |
|---|---|---|---|
| `POSTGRES_USER` | Database master username | `postgres` | `postgres` |
| `POSTGRES_PASSWORD` | Database user password | `postgres_password_example` | *(Strong generated secret)* |
| `POSTGRES_DB` | Database schema name | `vegah_db` | `vegah_db` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres_password_example@postgres:5432/vegah_db` | `postgresql://...` |
| `REDIS_HOST` | Redis container hostname | `redis` | `redis` |
| `REDIS_PORT` | Redis TCP port | `6379` | `6379` |
| `BACKEND_PORT` | NestJS HTTP listener port | `3001` | `3001` |
| `SITE_ADDRESS` | Caddy listen address / public domain | `:80` | `16-176-48-154.nip.io` |
| `REGISTRY` | GitHub Container Registry namespace | `ghcr.io/dipakshimpi/vegah-devops-assessment` | `ghcr.io/dipakshimpi/vegah-devops-assessment` |
| `TAG` | Image tag deployed by Compose | `latest` | Commit SHA (e.g. `acd0247`) |

---

## 🔄 CI/CD Pipeline & Deployment Flow

```mermaid
flowchart LR
    Push["Git Push to main"] --> Test["1. Test & Build Gate<br/>(npm install & build x3)"]
    Test --> Matrix["2. Parallel Matrix Build<br/>(frontend, backend, worker)"]
    Matrix --> Trivy["3. DevSecOps Scan<br/>(Aqua Trivy Scanner)"]
    Trivy --> GHCR["4. Publish to GHCR<br/>(:SHA & :latest)"]
    GHCR --> Deploy["5. CD Deploy via SSH<br/>(EC2 16.176.48.154)"]
    Deploy --> Verify["6. Healthcheck Gate<br/>(curl /api/health)"]
```

1. **Test Gate:** Verifies TypeScript compilation for `frontend`, `backend`, and `worker`. If any build fails, the pipeline aborts immediately.
2. **Matrix Build:** Builds all 3 containers in parallel with Docker Buildx and GitHub Actions layer caching (`cache-from/to: type=gha`).
3. **DevSecOps Security Scan:** Scans built images using Aqua Security's **Trivy** for High and Critical vulnerabilities before publishing.
4. **Publish to GHCR:** Verified images are pushed to GitHub Container Registry tagged with the commit SHA and `:latest`.
5. **Continuous Deployment over OpenSSH:** GitHub Actions connects to the EC2 server, delivers `docker-compose.yml` and `Caddyfile`, runs `docker compose pull && docker compose up -d`, and prunes stale dangling images.
6. **Health Verification:** Executes `curl -f http://localhost/api/health` after deployment. If the healthcheck fails, the workflow reports an error.

---

## 🛡️ Task 5: Reliability, Security, & Operational Runbook

### 1. Application Crashes
- **Automatic Container Restart:** All services are configured with `restart: unless-stopped`. If a process crashes (e.g. unhandled exception or OOM), Docker Engine automatically restarts the container.
- **Dependency Health Gating:** `backend` and `worker` configure `depends_on` conditions (`condition: service_healthy`) waiting for PostgreSQL and Redis to be fully healthy before booting.
- **Worker Stall Recovery:** BullMQ maintains lock timers. If a worker dies mid-job, BullMQ detects the stalled lock and re-assigns the job to an active worker.
- **Host Reboot Recovery:** The `docker` systemd service is enabled on Ubuntu boot; if the EC2 VM restarts, Docker restarts all containers and mounts the `pgdata` volume automatically.

### 2. Secrets Management & Blast Radius Reduction
- **Zero Secrets in Git:** Real `.env` files are in `.gitignore`. Only `.env.example` with dummy values is committed.
- **Host-Level File Permissions:** On the EC2 host, `/opt/app/.env` is set to `chmod 600` (read/write only by owner `ubuntu`).
- **No Cloud API Keys in CI:** GitHub Actions uses an ephemeral SSH private key secret (`EC2_SSH_KEY`) to deploy; no AWS IAM access keys or root credentials exist in the CI runner.
- **Network Isolation:** PostgreSQL (port 5432) and Redis (port 6379) publish **NO host ports**. They are only reachable by backend and worker inside the private Docker bridge network.

### 3. Database Persistence & Backup Strategy
- **Named Docker Volume:** PostgreSQL data is stored in the `pgdata` named volume (`/var/lib/postgresql/data`). Container restarts, rebuilds, and deployments preserve all historical data.
- **Backup Procedure:** Scheduled database dumps can be taken non-disruptively using:
  ```bash
  docker compose exec -T postgres pg_dump -U postgres vegah_db > backup_$(date +%F).sql
  ```
- **Production Roadmap:** Migrate to AWS RDS PostgreSQL with automated Multi-AZ replication and automated daily snapshots.

### 4. Rollback Strategy
Every image built in CI is tagged with its Git commit SHA. If a bad release passes into production:
1. **Option A (GitHub Actions):** Go to Actions ➔ `CI/CD Pipeline` ➔ **Run workflow** ➔ enter the previous commit SHA in `rollback_tag`.
2. **Option B (SSH Terminal):**
   ```bash
   ssh -i terraform/vegah-key.pem ubuntu@16.176.48.154
   cd /opt/app
   export TAG=<PREVIOUS_COMMIT_SHA>
   docker compose pull
   docker compose up -d
   ```

### 5. Step-by-Step Triage Runbook (Investigating a Failing Container)
If a service is reported unhealthy:
```bash
# Step 1: Check status and exit codes of all containers
docker compose ps

# Step 2: Stream recent logs of the failing service
docker compose logs --tail=100 -f <service_name>

# Step 3: Inspect container healthcheck error details and exit code
docker inspect --format "{{json .State.Health}}" <container_name>

# Step 4: Check host memory, disk space, and swap usage
free -h
df -h

# Step 5: Verify environment variables and database connectivity
docker compose exec backend wget -qO- http://localhost:3001/api/health
```

### 6. Health Monitoring
- **Dual-Dependency API Health:** `GET /api/health` actively validates both PostgreSQL (`SELECT 1`) and Redis (`PING`). Returns HTTP 200 when healthy or HTTP 503 if any dependency degrades.
- **Worker Heartbeat Healthcheck:** The worker writes a timestamp to `/tmp/heartbeat` every 10 seconds. Docker evaluates `find /tmp/heartbeat -mmin -1` to confirm the worker event loop is active.
- **External Uptime Monitoring:** UptimeRobot / AWS CloudWatch pinging `https://16-176-48-154.nip.io/api/health` with notification alerts on failure.

---

## 🔮 Production Roadmap & Limitations

While this architecture fulfills 100% of the assignment requirements on AWS within the free-tier budget, the following enhancements represent the production upgrade path:

1. **Managed Data Services:** Replace containerized Postgres and Redis with **AWS RDS PostgreSQL (Multi-AZ)** and **AWS ElastiCache for Redis** for managed backups, automated failover, and high availability.
2. **Database Migrations:** Transition from TypeORM `synchronize: true` to explicit, version-controlled migrations (`typeorm migration:run`) to eliminate schema drift risks.
3. **Real-Time Push Notifications:** Replace 2-second short polling with **WebSockets** or **Server-Sent Events (SSE)** via Redis Pub/Sub for immediate UI updates with zero polling overhead.
4. **AWS Secrets Manager:** Inject runtime environment variables dynamically using AWS SSM Parameter Store or AWS Secrets Manager rather than a host-level `.env` file.
5. **Horizontal Auto-Scaling:** Move from a single EC2 host to an AWS Application Load Balancer (ALB) with **AWS ECS Fargate** or **EKS** to scale worker and backend tasks based on CPU and queue depth metrics.

---

## 👤 Author

**Dipak Shimpi**
* GitHub: [@dipakshimpi](https://github.com/dipakshimpi)
* Assessment: VEGAH Cloud / DevOps Engineering Intern
