FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.13.2 --activate
WORKDIR /app

# ── Install dependencies ─────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/payments/package.json ./apps/payments/package.json
COPY apps/webhook/package.json ./apps/webhook/package.json
COPY apps/remnawave/package.json ./apps/remnawave/package.json
COPY apps/referrals/package.json ./apps/referrals/package.json
COPY apps/broadcasts/package.json ./apps/broadcasts/package.json
COPY apps/analytics/package.json ./apps/analytics/package.json
COPY apps/bot/package.json ./apps/bot/package.json
COPY apps/tma/package.json ./apps/tma/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-config/package.json ./packages/shared-config/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/core/package.json ./packages/core/package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── Build the Nest apps and shared packages ──────────────────────────
FROM deps AS build-nest
COPY tsconfig.json turbo.json ./
COPY packages ./packages
COPY apps/analytics ./apps/analytics
COPY apps/bot ./apps/bot
COPY apps/broadcasts ./apps/broadcasts
COPY apps/payments ./apps/payments
COPY apps/referrals ./apps/referrals
COPY apps/remnawave ./apps/remnawave
COPY apps/webhook ./apps/webhook
# SWC builds use ~50-100 MB each (vs ~400 MB for tsc), so 6 concurrent is safe.
# Override if building on a very constrained host:
#   docker compose build --build-arg TURBO_CONCURRENCY=4
ARG TURBO_CONCURRENCY=7
# The Vite apps are built in their own stages, so they are filtered out here.
# .turbo cache mount speeds up repeat builds on the same host when no remote cache is set.
RUN --mount=type=cache,id=turbo-cache,target=/app/.turbo \
    pnpm turbo build --concurrency=${TURBO_CONCURRENCY} --filter='!@jungle/web' --filter='!@jungle/tma'
RUN for p in apps/analytics apps/bot apps/broadcasts apps/payments apps/referrals apps/remnawave apps/webhook packages/database packages/types; do \
      mkdir -p /out/$p && cp -r $p/dist /out/$p/dist; \
    done

# ── Build web (Vite) ──────────────────────────────────────────────
# Independent of the Nest stage, so BuildKit builds them in parallel and a
# change confined to another app leaves this stage cached.
FROM deps AS build-web
COPY tsconfig.json turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @workspace/types build
# .env files are mounted as BuildKit secrets — never written to any image layer.
# Secret contents are not part of the cache key, so CI passes a hash of the
# public vars to rebuild the frontends when one of them changes.
ARG PUBLIC_ENV_HASH
RUN --mount=type=secret,id=env,target=/app/.env \
    --mount=type=secret,id=env_public,target=/app/.env.public \
    --mount=type=secret,id=env_payments,target=/app/.env.payments \
    --mount=type=secret,id=env_secrets,target=/app/.env.secrets \
    WEB_BUILD_SOURCEMAP=false pnpm --filter @jungle/web run build:docker
RUN mkdir -p /out/apps/web && cp -r apps/web/dist /out/apps/web/dist && cp apps/web/server.js /out/apps/web/server.js

# ── Build tma (Vite) ──────────────────────────────────────────────
# Independent of the Nest stage, so BuildKit builds them in parallel and a
# change confined to another app leaves this stage cached.
FROM deps AS build-tma
COPY tsconfig.json turbo.json ./
COPY packages ./packages
COPY apps/tma ./apps/tma
RUN pnpm --filter @workspace/types build
# .env files are mounted as BuildKit secrets — never written to any image layer.
# Secret contents are not part of the cache key, so CI passes a hash of the
# public vars to rebuild the frontends when one of them changes.
ARG PUBLIC_ENV_HASH
RUN --mount=type=secret,id=env,target=/app/.env \
    --mount=type=secret,id=env_public,target=/app/.env.public \
    --mount=type=secret,id=env_payments,target=/app/.env.payments \
    --mount=type=secret,id=env_secrets,target=/app/.env.secrets \
    WEB_BUILD_SOURCEMAP=false pnpm --filter @jungle/tma run build:docker
RUN mkdir -p /out/apps/tma && cp -r apps/tma/dist /out/apps/tma/dist

# ── Production dependencies only ─────────────────────────────────────
# Pruned from the install stage, not the build output: it depends on the
# lockfile alone, so source changes never invalidate it.
FROM deps AS prod-deps
RUN pnpm prune --prod

# ── Production image ─────────────────────────────────────────────────
# Dependencies first, build output last: a deploy that does not touch the
# lockfile only pulls the small dist layers.
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=prod-deps /app ./
COPY --from=build-nest /out/ ./
COPY --from=build-web /out/ ./
COPY --from=build-tma /out/ ./
