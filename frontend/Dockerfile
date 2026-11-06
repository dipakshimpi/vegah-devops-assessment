# ── Stage 1: build ────────────────────────────────────────────────────────────
# node:20-alpine is a minimal base image — small size, reduced attack surface.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first so Docker caches the dependency install layer.
COPY package*.json ./
RUN npm install

# Copy config and source files, then run the Next.js production build.
# 'output: standalone' in next.config.js generates a self-contained server
# in .next/standalone that does NOT need node_modules at runtime.
COPY tsconfig.json next.config.js ./
COPY app/ ./app/
RUN npm run build

# ── Stage 2: production runner ────────────────────────────────────────────────
# Start fresh from the same base image — no compiler, no devDependencies, no source.
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Copy the standalone server bundle from the builder stage.
# This is a self-contained Next.js server — no node_modules needed.
COPY --from=builder /app/.next/standalone ./

# Copy static assets (.next/static) separately — standalone does not include them.
# These are the CSS chunks, JS bundles, and images the browser downloads.
COPY --from=builder /app/.next/static ./.next/static

# Health check: use 127.0.0.1 (IPv4) to avoid IPv6 resolution issues on Alpine.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["wget", "-qO-", "http://127.0.0.1:3000/"]

# Run as non-root user 'node' — built-in to node:alpine images.
# If the container is compromised, the attacker has no root privileges on the host.
USER node

EXPOSE 3000

# Start the standalone Next.js server.
CMD ["node", "server.js"]
