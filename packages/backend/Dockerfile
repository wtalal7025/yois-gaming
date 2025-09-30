# syntax=docker/dockerfile:1

# ===========================================
# PRODUCTION DOCKERFILE FOR STAKE GAMES BACKEND
# ===========================================
# Multi-stage build for optimal production image
# Follows Docker best practices for Node.js applications

# ===========================================
# STAGE 1: DEPENDENCIES & BUILD
# ===========================================
FROM node:22-alpine AS dependencies

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Set working directory
WORKDIR /app

# Copy workspace root files for pnpm workspace setup
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files to respect workspace structure
COPY packages/*/package.json packages/*/
COPY apps/*/package.json apps/*/

# Install dependencies with pnpm (production only)
RUN npm install -g pnpm@9.0.0
RUN pnpm install --frozen-lockfile --production

# ===========================================
# STAGE 2: APPLICATION BUILD
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

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ packages/
COPY apps/ apps/

# Build the backend application
RUN pnpm run build --filter=@stake-games/backend

# ===========================================
# STAGE 3: PRODUCTION RUNTIME
# ===========================================
FROM node:22-alpine AS runtime

# Install runtime dependencies only
RUN apk add --no-cache \
    dumb-init \
    curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9.0.0

# Copy workspace configuration
COPY --chown=backend:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=backend:nodejs turbo.json ./

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=backend:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=backend:nodejs /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder --chown=backend:nodejs /app/packages/backend/package.json ./packages/backend/
COPY --from=builder --chown=backend:nodejs /app/packages/shared ./packages/shared
COPY --from=builder --chown=backend:nodejs /app/packages/game-engine ./packages/game-engine

# Copy any additional runtime files (like prisma schema if needed)
COPY --from=builder --chown=backend:nodejs /app/packages/backend/prisma ./packages/backend/prisma

# Set correct permissions
RUN chown -R backend:nodejs /app
RUN chmod -R 755 /app

# Switch to non-root user
USER backend

# Set working directory to backend package
WORKDIR /app/packages/backend

# Expose port (will be overridden by Railway/environment)
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# ===========================================
# BUILD LABELS & METADATA
# ===========================================
LABEL name="stake-games-backend"
LABEL description="Backend API server for Stake Games platform"
LABEL version="1.0.0"
LABEL maintainer="Gaming Platform Team"

# ===========================================
# ENVIRONMENT VARIABLES
# ===========================================
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Optimize Node.js for production
ENV NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps"