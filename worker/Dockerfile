# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Cache npm install layer separately from source code.
COPY package*.json ./
RUN npm install

# Copy source and compile TypeScript.
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Stage 2: production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only.
COPY package*.json ./
RUN npm install --omit=dev --no-audit

# Copy compiled output from builder stage.
COPY --from=builder /app/dist ./dist

# The worker writes a heartbeat file to /tmp/heartbeat every 10 seconds.
# Docker healthcheck reads that file to verify the process is still alive.
# 'find' command checks the file was modified within the last 1 minute.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD find /tmp/heartbeat -mmin -1 || exit 1

# Run as non-root user for security.
USER node

# Worker is a background daemon — no HTTP port to expose.
CMD ["node", "dist/index.js"]
