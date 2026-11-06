# VEGAH Screening Questions & Answers Reference

---

### Question 1: USA CST Schedule & Impromptu Syncs
**Prompt:** Must be available to work during USA CST business hours. Are you available for this schedule and comfortable with impromptu meetings and quick syncs?

**Answer:**
```text
Yes, I am fully available and committed to working during USA CST business hours. I have a dedicated, distraction-free home office setup with high-speed internet and power backup. I am completely comfortable with impromptu syncs, quick troubleshooting huddles, and active communication via Slack/Teams and Google Meet. Working across time zones with rapid collaboration is something I actively embrace.
```

---

### Question 2: Linux & Troubleshooting — Dockerized FastAPI 502 & 95% CPU
**Prompt:** Your Dockerized FastAPI application running on an Ubuntu VPS suddenly starts returning 502 errors. CPU utilization is at 95%, and the container keeps restarting. How would you systematically identify the root cause? How would you go about this situation?

**Answer:**
```text
A 502 Bad Gateway means the reverse proxy (Nginx/Caddy) cannot reach the upstream FastAPI container because it is dead, restarting, or unresponsive due to CPU starvation. I would follow a systematic triage process:

1. Immediate Inspection: Check container status and exit codes using `docker ps -a`. Inspect healthcheck logs and restart counts with `docker inspect --format '{{json .State}}' <container>`. Look for exit code 137 (OOM killed) or crash loop backoff.
2. Logs Triage: Run `docker logs --tail=200 -f <container>` and `journalctl -u docker -n 100` to inspect application stack traces right before restarts (e.g. unhandled async exceptions, synchronous CPU-blocking loops, or database connection pool exhaustion).
3. Host Resource Analysis:
   - Check CPU and memory consumption with `htop` and `docker stats`. Identify whether the CPU spike is in user space (infinite loop, unoptimized regex, crypto) or kernel space (I/O wait, memory swapping).
   - Run `vmstat 1` and `free -h` to see if swap thrashing is causing CPU spikes.
   - Run `df -h` and `df -i` to verify disk space and inode availability.
4. Network & Dependencies: Test database and cache reachability using `curl -Iv` or `nc -zv <db-host> <port>`. A hanging connection pool where requests queue up indefinitely can cause thread exhaustion and runaway CPU.
5. Profiling & Isolation: Attach to the container with `docker exec -it <container> sh` (or spin up a temporary debug container). Take a thread dump or process profile (`py-spy top --pid <pid>`) to find the exact FastAPI endpoint or function hogging the CPU.
6. Mitigation & Fix:
   - Short term: Apply Docker resource limits (`cpus: "1.5"`, `mem_limit: 1g`) in docker-compose so it cannot starve the host OS.
   - Long term: Move heavy blocking computations out of FastAPI endpoints into background Celery/BullMQ workers, optimize database queries/indexes, configure Gunicorn/Uvicorn worker concurrency (`--workers 4 --timeout 60`), and add a readiness probe.
```

---

### Question 3: Git & CI/CD — GitHub Actions Pipeline, GHCR, Deploy, & Rollback
**Prompt:** Explain how you would build a CI/CD pipeline using GitHub Actions to automatically build a Docker image, push it to GHCR, and deploy it to an Ubuntu VPS whenever code is merged into the main branch. How would you handle failed deployments and rollbacks?

**Answer:**
```text
I design CI/CD pipelines following least-privilege security, immutable artifacts, and automated rollback gates:

1. Trigger & Test Gate: The pipeline triggers on push/merge to `main`. A mandatory `test` job runs first: checks out code, caches dependencies, and executes unit tests, linting, and build verification. If any test fails, the pipeline terminates before touching Docker or the server.
2. Docker Buildx & Security Scanning:
   - Authenticates to GHCR using `GITHUB_TOKEN` (`permissions: packages: write`).
   - Uses `docker/build-push-action` with GitHub Actions layer cache (`type=gha`) to eliminate redundant rebuilds.
   - Tags images with both the immutable Git commit SHA (`:${{ github.sha }}`) and `:latest`.
   - Runs Aqua Security's Trivy vulnerability scanner to fail the build on critical, unpatched CVEs.
   - Pushes verified images to GHCR.
3. Continuous Deployment over SSH:
   - Uses native OpenSSH with an ephemeral GitHub Actions secret (`EC2_SSH_KEY`) stored with `chmod 600`.
   - Securely copies `docker-compose.yml` to the VPS.
   - SSHs into the server, sets `export TAG=${{ github.sha }}`, runs `docker compose pull`, executes `docker compose up -d` for rolling container updates, and runs `docker image prune -f` to clean up dangling layers.
   - Validates deployment health: executes `curl -f http://localhost/api/health` within a 15-second loop.
4. Handling Failures & Rollback:
   - Deployment Gate: If `curl /api/health` returns non-200, the deployment job exits with code 1.
   - Automated Rollback: The script detects the non-zero exit code and immediately triggers `export TAG=${PREVIOUS_SHA} && docker compose up -d` to revert to the last healthy image.
   - Manual Rollback: Configured `workflow_dispatch` with a `rollback_tag` input allows any team member to redeploy any historical SHA in under 60 seconds directly from the GitHub UI without touching git branches.
```

---

### Question 4: MLOps & Model Deployment — FastAPI, Docker, MLflow, Drift
**Prompt:** A data science team provides you with a trained machine learning model (.pkl file). How would you deploy it as a scalable REST API using FastAPI and Docker? Explain how you would manage model versions, track experiments using MLflow, and monitor model drift.

**Answer:**
```text
Deploying a machine learning model (`.pkl`) into production requires strict separation of model artifacts, API runtime, and lifecycle observability:

1. Containerized REST API (FastAPI + Docker):
   - Load the model artifact on startup using FastAPI's `lifespan` context manager into memory once, rather than re-loading per request.
   - Use Pydantic schemas to validate incoming prediction requests and types strictly.
   - Package into a multi-stage `python:3.11-slim` Dockerfile running as a non-root user. Run with Uvicorn managed by Gunicorn (`-w 4 -k uvicorn.workers.UvicornWorker`) to handle concurrent inference requests.
   - Add health endpoints: `/health` (liveness) and `/model-info` (metadata, model version, signature).
2. Model Versioning & Experiment Tracking (MLflow):
   - Avoid baking `.pkl` files directly into Git or Docker images. Instead, log runs, parameters, metrics (F1, RMSE), and artifacts to an MLflow Tracking Server backed by AWS S3 (artifact store) and PostgreSQL (backend store).
   - Use MLflow Model Registry with explicit stages (`Staging`, `Production`, `Archived`).
   - The FastAPI container dynamically fetches the model artifact at boot using MLflow Model URI (`models:/CustomerChurnModel@champion` or version number) or during CI build.
3. Model Drift & Data Quality Monitoring:
   - Data Drift: Log incoming feature vectors asynchronously (via Kafka or a lightweight Redis queue to prevent inference latency) to an analytical database. Use tools like Evidently AI or Great Expectations to compute statistical drift (Kolmogorov-Smirnov test for numerical features, Population Stability Index (PSI) / Wasserstein distance) comparing production inputs against training baseline distributions.
   - Concept Drift: Correlate model predictions with ground-truth feedback as labels become available over time. If accuracy drops below an SLA threshold, alert on Slack/PagerDuty and trigger automated re-training pipelines.
```

---

### Question 5: LLM Infrastructure — Self-Hosting 7B Model, GPUs, vLLM/Ollama, Costs
**Prompt:** Your organization wants to self-host a 7-billion-parameter open-source LLM instead of using external APIs. What hardware requirements would you consider? Explain GPU memory, quantization, inference frameworks such as vLLM and Ollama, and how you would evaluate hosting costs.

**Answer:**
```text
Self-hosting a 7B parameter open-source LLM (such as Llama 3 7B or Mistral 7B) requires balancing GPU VRAM, quantization precision, and serving throughput:

1. Hardware & VRAM Sizing:
   - FP16 (16-bit): A 7B model requires 2 bytes per parameter = ~14 GB VRAM just for weights, plus 4–6 GB for KV cache context (4k–8k tokens) = ~20–24 GB VRAM. Recommended: 1x NVIDIA A10G (24 GB) on AWS `g5.xlarge` or RTX 3090/4090.
   - Quantized INT4 / AWQ (4-bit): Model weights compress to ~4–5 GB, needing only 8–10 GB VRAM total. Runs comfortably on a cheap NVIDIA T4 (16 GB) on AWS `g4dn.xlarge` or even consumer GPUs (RTX 4060).
2. Quantization Techniques:
   - AWQ / GPTQ: Best for GPU inference; preserves high perplexity/accuracy while cutting memory bandwidth requirements by ~60%, drastically boosting token generation speed.
   - GGUF: Best for CPU/hybrid inference (e.g. edge devices or laptops via llama.cpp).
3. Inference Framework Selection:
   - vLLM (Production Scale): The enterprise standard for production serving. Implements PagedAttention (eliminating KV cache fragmentation), continuous batching, and chunked prefill. Yields 5x–10x higher throughput under multi-user concurrency and exposes an OpenAI-compatible API.
   - Ollama (Dev & Local Prototyping): Built on llama.cpp; ultra-simple CLI and zero-config runner. Great for local developer environments or single-user internal tools, but lacks continuous batching efficiency for high-traffic production workloads.
4. Cost Evaluation (Self-Hosted vs. External APIs):
   - An AWS `g5.xlarge` (A10G 24GB) costs ~$1.00/hour on-demand (~$730/month) or ~$0.45/hour reserved/spot (~$320/month).
   - External APIs (e.g., Claude/OpenAI/Gemini) cost ~$0.15–$0.50 per million tokens.
   - Decision Threshold: Self-hosting becomes cost-effective when monthly token throughput exceeds ~1.5–2 billion tokens, or when strict data privacy / HIPAA / on-premise compliance forbids third-party APIs.
```

---

### Question 6: AI-Assisted Full-Stack Development & AI Code Security
**Prompt:** You are asked to build a dashboard using an AI coding assistant such as Cursor or Claude Code, with a React frontend, FastAPI backend and PostgreSQL database. How would you architect, develop, test and deploy it? How would you identify and fix security vulnerabilities or incorrect implementations in AI-generated code?

**Answer:**
```text
Building a dashboard using AI coding assistants (Cursor, Claude Code) with React, FastAPI, and PostgreSQL requires treating AI as a junior velocity multiplier while maintaining strict human-in-the-loop architectural control:

1. Architecture & Specification First:
   - Write clear specification documents before prompting: data schemas, API contracts (OpenAPI), and folder structure.
   - Decouple layers: React (Vite/Next.js) for state and UI, FastAPI for validated REST endpoints with SQLAlchemy/SQLModel, and PostgreSQL with Alembic migrations.
2. Iterative Development & Prompt Guardrails:
   - Provide system context files (`.cursorrules` or `AGENTS.md`) enforcing coding standards, type hints, Pydantic DTOs, and error handling.
   - Build modularly: generate database models first, then testable service logic, then controllers, and finally UI components. Never ask AI to generate full-stack code in a single prompt.
3. Testing & Quality Assurance:
   - Use AI to generate test suites: Pytest for backend endpoints, Jest/React Testing Library for frontend components, and Playwright for E2E user flows.
   - Require 100% test pass rates and linters (Ruff for Python, ESLint/Prettier for React) before accepting changes.
4. Identifying & Fixing Security Vulnerabilities in AI Code:
   - SQL Injection: AI often concatenates raw SQL queries. I enforce ORMs with parameterized queries (`db.execute(select(...))` or parameterized SQLAlchemy) and forbid raw string f-strings in queries.
   - Over-Permissive APIs & Broken Access Control: AI frequently leaves endpoints unauthenticated or forgets tenant isolation (`WHERE user_id = current_user.id`). I mandate dependency-injected JWT authentication (`Depends(get_current_user)`).
   - Hallucinated / Insecure Dependencies: Run automated dependency scanners (`pip-audit`, `npm audit`, Snyk) in CI to catch packages that don't exist or carry CVEs.
   - Hardcoded Secrets: Enforce pre-commit hooks using `detect-secrets` and GitLeaks to prevent AI from writing placeholder keys directly into code.
```

