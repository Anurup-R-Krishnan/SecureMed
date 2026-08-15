FROM oven/bun:1 AS deps

WORKDIR /app
COPY package.json bun.lock ./
COPY patches ./patches
COPY scripts ./scripts
RUN bun install --frozen-lockfile

# ── production build ──────────────────────────────────────────────────────────
FROM deps AS builder

COPY . .
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL
RUN bun run build

# ── production runtime ────────────────────────────────────────────────────────
FROM oven/bun:1 AS runner

WORKDIR /app

# BACKEND_URL is read by next.config.mjs at runtime for /api rewrites, so it
# must be available to the running server, not only the build stage.
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL \
    NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid 1001 nextjs

# output: 'standalone' copies server.js to .next/standalone/ — copy its contents into /app
COPY --from=builder --chown=nextjs:nodejs /app/public               ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone      ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static          ./.next/static

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]

# ── dev ───────────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS dev

WORKDIR /app

ENV NODE_ENV=development \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY package.json bun.lock ./
COPY patches ./patches
COPY scripts ./scripts
RUN bun install

COPY . .

EXPOSE 3000
CMD ["bun", "run", "dev"]
