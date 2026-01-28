# ============================================
# Production Dockerfile for Cloud Run
# SINTRA.AI v3 - Optimized Build
# ============================================

FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time env vars
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=8192"
# Skip external service connections during build
ENV NEXT_BUILD_PHASE=1
ENV SKIP_ENV_VALIDATION=1
ENV OPENAI_API_KEY=sk-build-placeholder
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV REDIS_URL=redis://localhost:6379
ENV ENCRYPTION_KEY=0d9a2ab6873a16651028cafea6477e3930c2d143514d524799840c3db6392d03
ENV JWT_SECRET=build-placeholder-jwt-secret-32chars

# Generate Prisma client
RUN npx prisma generate || true

# Build Next.js (will use standalone output)
RUN npm run build

# Production image - Use standalone output for faster startup
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Cloud Run uses PORT env var (default 8080), Next.js standalone uses port 3000 by default
# We override this in the CMD
ENV HOSTNAME="0.0.0.0"

# Create system user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build output (if available) or fallback to standard
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run sets PORT environment variable
EXPOSE 3000

# Use Next.js standalone server - respects PORT env var
CMD ["node", "server.js"]
