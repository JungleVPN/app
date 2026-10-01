FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.13.2 --activate
WORKDIR /app

# One image per deployable: nest (all Nest services), web and tma. Each has its
# own filtered install, so a target only carries the dependencies it needs, and
# BuildKit builds them in parallel from the same Dockerfile:
#   docker build --target web .
#
# Every package.json goes in before any install so each install layer is keyed
# on manifests and the lockfile alone.
FROM base AS manifests
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

# ── nest ─────────────────────────────────────────────────────────────
FROM manifests AS deps-nest
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter='!@jungle/web' --filter='!@jungle/tma' --filter='!@workspace/core'

FROM deps-nest AS build-nest
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
# .turbo cache mount speeds up repeat builds on the same host when no remote cache is set.
RUN --mount=type=cache,id=turbo-cache,target=/app/.turbo \
    pnpm turbo build --concurrency=${TURBO_CONCURRENCY} --filter='!@jungle/web' --filter='!@jungle/tma' --filter='!@workspace/core'
RUN for p in apps/analytics apps/bot apps/broadcasts apps/payments apps/referrals apps/remnawave apps/webhook packages/database packages/types; do \
      mkdir -p /out/$p && cp -r $p/dist /out/$p/dist; \
    done

FROM manifests AS prod-deps-nest
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter='!@jungle/web' --filter='!@jungle/tma' --filter='!@workspace/core'

# ── web ──────────────────────────────────────────────────────────────
FROM manifests AS deps-web
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter='@jungle/web...'

# ── web: build ────────────────────────────────────────────────────
FROM deps-web AS build-web
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
RUN mkdir -p /out/apps/web && cp -r apps/web/dist /out/apps/web/dist \
 && cp apps/web/server.js /out/apps/web/server.js \
 && mkdir -p /out/packages/types && cp -r packages/types/dist /out/packages/types/dist

FROM manifests AS prod-deps-web
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter='@jungle/web'

# ── tma ──────────────────────────────────────────────────────────────
FROM manifests AS deps-tma
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter='@jungle/tma...'

# ── tma: build ────────────────────────────────────────────────────
FROM deps-tma AS build-tma
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

FROM manifests AS prod-deps-tma
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter='@jungle/tma'

# ── Runtime images ───────────────────────────────────────────────────
# Dependencies first, build output last: a deploy that does not touch the
# lockfile only pulls the small dist layers.
FROM node:20-alpine AS web
WORKDIR /app
COPY --from=prod-deps-web /app ./
COPY --from=build-web /out/ ./

FROM node:20-alpine AS tma
WORKDIR /app
COPY --from=prod-deps-tma /app ./
COPY --from=build-tma /out/ ./

# Last stage, so a plain `docker build .` produces the Nest image.
FROM node:20-alpine AS nest
WORKDIR /app
COPY --from=prod-deps-nest /app ./
COPY --from=build-nest /out/ ./
