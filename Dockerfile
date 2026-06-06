FROM node:20-alpine AS base

# Install pnpm — pinned to match the packageManager field in web/package.json
# so `pnpm install --frozen-lockfile` can parse the committed lock file.
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate

# ── deps stage ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── builder stage ───────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web/ .

ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# Dummy DATABASE_URL so page-data collection doesn't throw during build.
# The real value is injected at runtime via Container Apps secrets.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ── runner stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# next.config.ts output: 'standalone' produces a self-contained server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
