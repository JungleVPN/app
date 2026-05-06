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
COPY apps/bot/package.json ./apps/bot/package.json
COPY apps/tma/package.json ./apps/tma/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-config/package.json ./packages/shared-config/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/core/package.json ./packages/core/package.json
RUN pnpm install --frozen-lockfile

# ── Build everything ─────────────────────────────────────────────────
FROM deps AS build
COPY . .
# Turbo defaults to high parallelism; several Nest/Vite/tsc processes at once
# exhaust RAM on small VPSes (swap → build looks "stuck"). Override when needed:
#   docker compose build --build-arg TURBO_CONCURRENCY=4
ARG TURBO_CONCURRENCY=2

# Vite bakes these into the JS bundle at build time — they must be available
# here, not at runtime. Pass them via docker compose build args so that .env
# never needs to be copied into the image.
ARG VITE_REMNAWAVE_URL
ARG VITE_PAYMENTS_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUBPAGE_CONFIG
ARG VITE_TRIAL_PERIOD_IN_DAYS
ARG VITE_ALLOWED_AMOUNTS
ARG VITE_ALLOWED_PERIODS
ARG VITE_SUPPORT_URL
ARG VITE_TMA_APP_URL
ARG VITE_TELEGRAM_BOT_TOKEN
ENV VITE_REMNAWAVE_URL=$VITE_REMNAWAVE_URL \
    VITE_PAYMENTS_URL=$VITE_PAYMENTS_URL \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_SUBPAGE_CONFIG=$VITE_SUBPAGE_CONFIG \
    VITE_TRIAL_PERIOD_IN_DAYS=$VITE_TRIAL_PERIOD_IN_DAYS \
    VITE_ALLOWED_AMOUNTS=$VITE_ALLOWED_AMOUNTS \
    VITE_ALLOWED_PERIODS=$VITE_ALLOWED_PERIODS \
    VITE_SUPPORT_URL=$VITE_SUPPORT_URL \
    VITE_TMA_APP_URL=$VITE_TMA_APP_URL \
    VITE_TELEGRAM_BOT_TOKEN=$VITE_TELEGRAM_BOT_TOKEN

# Build all packages except Vite apps first (Turbo runs many Nest builds in parallel).
RUN pnpm turbo build --concurrency=${TURBO_CONCURRENCY} --filter='!@jungle/web' --filter='!@jungle/tma'
# Vite apps: skip full-project `tsc -b` here — heavy on small VPS RAM; Vite already compiles TS.
# Run `pnpm --filter @jungle/web typecheck` / `@jungle/tma typecheck` in CI. No sourcemaps in image build.
RUN WEB_BUILD_SOURCEMAP=false pnpm --filter @jungle/web run build:docker
RUN WEB_BUILD_SOURCEMAP=false pnpm --filter @jungle/tma run build:docker

# ── Production dependencies only ─────────────────────────────────────
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/payments/package.json ./apps/payments/package.json
COPY apps/webhook/package.json ./apps/webhook/package.json
COPY apps/remnawave/package.json ./apps/remnawave/package.json
COPY apps/referrals/package.json ./apps/referrals/package.json
COPY apps/broadcasts/package.json ./apps/broadcasts/package.json
COPY apps/bot/package.json ./apps/bot/package.json
COPY apps/tma/package.json ./apps/tma/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-config/package.json ./packages/shared-config/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/core/package.json ./packages/core/package.json
RUN pnpm install --frozen-lockfile --prod

# ── Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/payments/node_modules ./apps/payments/node_modules
COPY --from=prod-deps /app/apps/webhook/node_modules ./apps/webhook/node_modules
COPY --from=prod-deps /app/apps/remnawave/node_modules ./apps/remnawave/node_modules
COPY --from=prod-deps /app/apps/referrals/node_modules ./apps/referrals/node_modules
COPY --from=prod-deps /app/apps/broadcasts/node_modules ./apps/broadcasts/node_modules
COPY --from=prod-deps /app/apps/bot/node_modules ./apps/bot/node_modules
COPY --from=prod-deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=prod-deps /app/apps/tma/node_modules ./apps/tma/node_modules
COPY --from=prod-deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=prod-deps /app/packages/types/node_modules ./packages/types/node_modules

COPY --from=build /app/apps/payments/dist ./apps/payments/dist
COPY --from=build /app/apps/webhook/dist ./apps/webhook/dist
COPY --from=build /app/apps/remnawave/dist ./apps/remnawave/dist
COPY --from=build /app/apps/referrals/dist ./apps/referrals/dist
COPY --from=build /app/apps/broadcasts/dist ./apps/broadcasts/dist
COPY --from=build /app/apps/bot/dist ./apps/bot/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/tma/dist ./apps/tma/dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/types/dist ./packages/types/dist

COPY --from=build /app/apps/payments/package.json ./apps/payments/package.json
COPY --from=build /app/apps/webhook/package.json ./apps/webhook/package.json
COPY --from=build /app/apps/remnawave/package.json ./apps/remnawave/package.json
COPY --from=build /app/apps/referrals/package.json ./apps/referrals/package.json
COPY --from=build /app/apps/broadcasts/package.json ./apps/broadcasts/package.json
COPY --from=build /app/apps/bot/package.json ./apps/bot/package.json
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/tma/package.json ./apps/tma/package.json
COPY --from=build /app/packages/database/package.json ./packages/database/package.json
COPY --from=build /app/packages/types/package.json ./packages/types/package.json
COPY --from=build /app/package.json ./package.json
