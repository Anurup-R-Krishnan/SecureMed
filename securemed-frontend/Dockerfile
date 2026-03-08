FROM oven/bun:1 AS deps

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install

# ── production build ──────────────────────────────────────────────────────────
FROM deps AS builder

COPY . .
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL
RUN bun run build

# ── production runtime ────────────────────────────────────────────────────────
FROM oven/bun:1 AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public        ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs
EXPOSE 3000
CMD ["bun", "run", "server.js"]

# ── dev (default) ─────────────────────────────────────────────────────────────
FROM deps AS dev

WORKDIR /app
COPY . .
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL
EXPOSE 3000
CMD ["bun", "run", "dev"]
