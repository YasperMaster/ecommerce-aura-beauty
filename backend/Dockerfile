# ── Stage 1: install production deps only ──────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
# ci = reproducible install; --omit=dev skips devDependencies (cross-env, etc.)
RUN npm ci --omit=dev

# ── Stage 2: final runtime image ───────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./

# server.js looks for ../.env relative to the source file.
# In production we supply env vars via Kubernetes Secrets/ConfigMaps,
# so no .env file is needed — dotenv will silently skip the missing file
# and read everything from process.env.

USER appuser
EXPOSE 3001

# Use node directly — NODE_ENV is set by Kubernetes, not cross-env
CMD ["node", "src/server.js"]
