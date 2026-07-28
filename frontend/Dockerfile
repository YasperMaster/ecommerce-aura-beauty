# ── Stage 1: build the Vite app ────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_BACKEND_URL is a build-time variable — Vite bakes it into the JS
# bundle. Provide it as a Docker build argument.
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build
# Output lands in /app/dist

# ── Stage 2: serve with Nginx ──────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove the default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Nginx runs as root by default in the official image; that is fine for a
# reverse-proxy container but if your policy requires non-root, swap the
# nginx base image for nginxinc/nginx-unprivileged.
CMD ["nginx", "-g", "daemon off;"]
