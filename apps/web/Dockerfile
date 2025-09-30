# syntax=docker/dockerfile:1

# ===========================================
# PRODUCTION DOCKERFILE FOR STAKE GAMES FRONTEND
# ===========================================
# Multi-stage build for optimal Next.js production image
# Follows Next.js and Docker best practices

# ===========================================
# STAGE 1: DEPENDENCIES
# ===========================================
FROM node:22-alpine AS deps

# Install libc6-compat for Alpine compatibility
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files to respect workspace structure
COPY packages/*/package.json packages/*/
COPY apps/*/package.json apps/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ===========================================
# STAGE 2: BUILDER
# ===========================================
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy package.json files
COPY packages/*/package.json packages/*/
COPY apps/*/package.json apps/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ packages/
COPY apps/web/ apps/web/

# Set Next.js environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js application
RUN pnpm run build --filter=@stake-games/web

# ===========================================
# STAGE 3: PRODUCTION RUNTIME
# ===========================================
FROM node:22-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy Next.js production files
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Create necessary directories and set permissions
RUN mkdir -p /app/apps/web/.next/cache
RUN chown -R nextjs:nodejs /app
RUN chmod -R 755 /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || curl -f http://localhost:3000/ || exit 1

# Use dumb-init as entrypoint
ENTRYPOINT ["dumb-init", "--"]

# Start the Next.js application
CMD ["node", "apps/web/server.js"]

# ===========================================
# BUILD LABELS & METADATA
# ===========================================
LABEL name="stake-games-frontend"
LABEL description="Frontend web application for Stake Games platform"
LABEL version="1.0.0"
LABEL maintainer="Gaming Platform Team"

# ===========================================
# OPTIMIZE NODE.JS FOR PRODUCTION
# ===========================================
ENV NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps"