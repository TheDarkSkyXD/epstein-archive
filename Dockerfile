# Use Node.js LTS (Long Term Support)
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application
# This runs vite build (frontend) and tsc (backend)
RUN npm run build:prod

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy database schema/migrations if needed (for runtime migrations)
COPY --from=builder /app/src/server/db/schema ./src/server/db/schema
COPY --from=builder /app/scripts ./scripts

# Copy tsconfig for tsx scripts (if needed for migrations) or pre-compile them
# Ideally we should compile scripts too, but for simplicity we can use tsx in prod if needed, 
# or just copy them. tsx is a dev dep usually, so we might need it in prod if we run migrations via tsx.
# Let's verify if we need tsx in prod. 'npm run migrate' uses tsx.
# So we either need tsx in prod deps or compile scripts.
# For now, let's install tsx globally or locally in prod.
RUN npm install -g tsx

# Environment variables (defaults, can be overridden)
ENV NODE_ENV=production
ENV PORT=3012
ENV DB_PATH=/data/epstein-archive.db

# Create data directory
RUN mkdir -p /data
VOLUME /data

# Expose port
EXPOSE 3012

# Start the server
CMD ["npm", "start"]
