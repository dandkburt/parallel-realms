# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy backend source
COPY backend.ts ./
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript to JavaScript
RUN npx tsc backend.ts \
  --outDir dist \
  --target es2020 \
  --module esnext \
  --moduleResolution node \
  --skipLibCheck true \
  --esModuleInterop true

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/backend.js"]
