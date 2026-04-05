# Build stage
FROM node:25-alpine AS builder

WORKDIR /app

# Copy dependency files for better layer caching
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Copy prisma schema first for better caching
COPY prisma ./prisma

# Generate Prisma client
RUN npm run prisma:generate

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production dependencies stage
FROM node:25-alpine AS dependencies

WORKDIR /app

COPY package*.json ./

# Install only production dependencies + prisma CLI for migrations
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --prefer-offline --no-audit --ignore-scripts && \
    npm install prisma@latest --save-optional --no-audit

# Copy prisma for production
COPY prisma ./prisma

# Generate Prisma client for production
RUN npm run prisma:generate

# Production stage
FROM node:25-alpine AS production

# Security: Install dumb-init (better than tini for signal handling)
RUN apk add --no-cache dumb-init

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Security: Set proper ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Copy only necessary files from previous stages
COPY --chown=nodejs:nodejs --from=dependencies /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs --from=builder /app/dist ./dist
COPY --chown=nodejs:nodejs --from=builder /app/prisma ./prisma
COPY --chown=nodejs:nodejs --from=builder /app/prisma.config.mjs ./
COPY --chown=nodejs:nodejs package*.json ./

# Security: Run as non-root
ENV NODE_ENV=production

EXPOSE 4000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.js"]

# Development stage (kept separate for convenience)
FROM node:25-alpine AS development

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

COPY . .
RUN npm run prisma:generate

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start:dev"]
