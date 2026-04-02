# =============================================================================
#  Tourist Assistant — Next.js Multi-Stage Dockerfile
# =============================================================================

# ─── Stage 1 : Install dependencies ─────────────────────────────────────────
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY aetherion/package.json aetherion/package-lock.json ./
RUN npm ci

# ─── Stage 2 : Build the application ────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY aetherion/ ./

# Disable Next.js telemetry during builds
ENV NEXT_TELEMETRY_DISABLED=1

# Accept optional build-time args (for pages that need env at build time).
# At runtime docker-compose passes the real values via `environment:`.
ARG DATABASE_URL=""
ARG MONGODB_URI=""
ENV DATABASE_URL=${DATABASE_URL}
ENV MONGODB_URI=${MONGODB_URI}

RUN npm run build

# ─── Stage 3 : Production server ────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Force Next.js to bind to all interfaces (required for Docker / Cloud Run)
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Public assets
COPY --from=builder /app/public ./public

# Standalone output — only the minimal traced files, no node_modules bulk
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Run the minimal Node server directly
CMD ["node", "server.js"]