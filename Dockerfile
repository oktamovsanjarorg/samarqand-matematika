# syntax=docker/dockerfile:1
# Bitta build bosqichi va ikki runtime target: app (api va bot), web (Caddy: Mini App, admin, HTTPS)

FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12.16.1
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/bot/package.json apps/bot/
COPY apps/miniapp/package.json apps/miniapp/
COPY apps/admin/package.json apps/admin/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/math/package.json packages/math/
COPY packages/ui-tokens/package.json packages/ui-tokens/
RUN pnpm install --frozen-lockfile --ignore-scripts=false
COPY . .
RUN pnpm build

# --- api va bot uchun umumiy runtime ---
FROM node:22-bookworm-slim AS app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
RUN rm -rf apps/miniapp apps/admin
RUN mkdir -p /app/media && chown node:node /app/media
USER node

# --- Statik fayllar + HTTPS ---
FROM caddy:2.10-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/miniapp/dist /srv/miniapp
COPY --from=build /app/apps/admin/dist /srv/admin
