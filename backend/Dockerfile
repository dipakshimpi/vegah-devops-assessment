# ── Stage 1: build ────────────────────────────────────────────────────────────
# We use node:20-alpine because alpine is a minimal Linux distro (~5 MB base),
# which keeps the final image small and reduces the attack surface.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only package files first so Docker can cache the dependency installation layer.
# If source code changes but package.json does not, this layer is reused (faster rebuilds).
COPY package*.json ./

# Install dependencies (works consistently across different npm versions)
RUN npm install

# Copy source code and compile TypeScript → dist/
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/
RUN npm run build

# ── Stage 2: production runner ────────────────────────────────────────────────
# Start fresh from the same base image — no build tools, no devDependencies.
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install PRODUCTION deps only (no devDependencies).
COPY package*.json ./
RUN npm install --omit=dev --no-audit

# Copy the compiled JavaScript output from the builder stage.
COPY --from=builder /app/dist ./dist

# Run as non-root user 'node' (pre-created in node:alpine images).
# Why: if the container is ever compromised, the attacker has no root privileges.
USER node

EXPOSE 3001

# Start the compiled NestJS application.
CMD ["node", "dist/main.js"]
