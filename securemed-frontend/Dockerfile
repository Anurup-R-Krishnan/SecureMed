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

ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# output: 'standalone' copies server.js to .next/standalone/ — copy its contents into /app
COPY --from=builder --chown=nextjs:nodejs /app/public               ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone      ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static          ./.next/static

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]

# ── dev ───────────────────────────────────────────────────────────────────────
FROM deps AS dev

WORKDIR /app
USER root
EXPOSE 3000
CMD ["bun", "run", "dev"]
