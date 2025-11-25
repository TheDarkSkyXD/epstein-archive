# Multi-stage build for production
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build:prod

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    sqlite \
    && addgroup -g 1001 -S nodejs \
    && adduser -S epstein-archive -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=epstein-archive:nodejs /app/dist ./dist
COPY --from=builder --chown=epstein-archive:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=epstein-archive:nodejs /app/package*.json ./
COPY --from=builder --chown=epstein-archive:nodejs /app/src/server.production.ts ./src/
COPY --from=builder --chown=epstein-archive:nodejs /app/src/config ./src/config
COPY --from=builder --chown=epstein-archive:nodejs /app/src/middleware ./src/middleware
COPY --from=builder --chown=epstein-archive:nodejs /app/src/services ./src/services
COPY --from=builder --chown=epstein-archive:nodejs /app/src/types ./src/types

# Create necessary directories
RUN mkdir -p logs backups uploads && \
    chown -R epstein-archive:nodejs /app

# Switch to non-root user
USER epstein-archive

# Expose port
EXPOSE 3012

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3012/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.production.js"]