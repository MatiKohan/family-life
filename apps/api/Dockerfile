# Stage 1: base
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# Stage 2: builder
FROM base AS builder
WORKDIR /app

# Copy manifests for dependency installation
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/e2e/package.json ./apps/e2e/
COPY packages/types/package.json ./packages/types/
# tsconfig package has no JS deps — create stub so pnpm can resolve the workspace reference
RUN mkdir -p packages/tsconfig && \
    echo '{"name":"@family-life/tsconfig","version":"1.0.0","private":true}' \
    > packages/tsconfig/package.json

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build shared types package
RUN pnpm --filter @family-life/types build

# Generate Prisma client
RUN pnpm --filter @family-life/api exec prisma generate

# Build API
RUN pnpm --filter @family-life/api build

# Stage 3: runner
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
ENV PATH="/app/apps/api/node_modules/.bin:/app/node_modules/.bin:$PATH" \
    NODE_PATH="/app/apps/api/node_modules:/app/node_modules"

# Use non-root user
USER node

# Copy built output and production node_modules from builder
COPY --from=builder --chown=node:node /app/apps/api/package.json ./package.json
COPY --from=builder --chown=node:node /app/apps/api/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=node:node /app/apps/api/prisma ./prisma
COPY --from=builder --chown=node:node /app/packages ./packages

EXPOSE 3000

CMD ["sh", "-c", "prisma migrate deploy && node dist/main"]
