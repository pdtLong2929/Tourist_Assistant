# Stage 1: Install dependencies
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY aetherion/package.json aetherion/package-lock.json ./
RUN npm ci

# Stage 2: Rebuild the source code
FROM node:24-alpine AS builder
WORKDIR /app

# Copy the dependencies from deps
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the application code
COPY aetherion/ ./

# Disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN npm run build

# Stage 3: Production server
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Force Next.js to bind to all interfaces so Cloud Run can route traffic to it
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 2. (Optional) If you added a public folder earlier, uncomment this:
# COPY --from=builder /app/public ./public

# 3. The Standalone Magic: We only copy the minimal traced files, NOT node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# 4. Run the minimal server directly with Node, ditching the npm overhead
CMD ["node", "server.js"]