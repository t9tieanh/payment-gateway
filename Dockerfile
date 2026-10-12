# ============================================
# Build Stage - Compile TypeScript
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only dependency files
COPY package*.json ./

# Install all dependencies (including dev for build tools)
RUN npm ci

# Copy source code and config
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript to JavaScript
RUN npm run build

# ============================================
# Production Stage - Runtime Only
# ============================================
FROM node:22-alpine

WORKDIR /app

# Copy only production dependency files
COPY package*.json ./

# Install only production dependencies (no dev dependencies)
RUN npm install --omit=dev && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/*

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create logs directory and set permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start application
CMD ["node", "dist/index.js"]
