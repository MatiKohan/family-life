# Stage 1: base
FROM node:22-alpine AS base
# Node 22: pnpm 11 needs node:sqlite (missing on Node 20). Also pin pnpm so Corepack
# cannot float to latest. Railway often uses Nixpacks, not this file — see nixpacks.toml.
RUN npm install -g pnpm@10.32.1

# Stage 2: builder
FROM base AS builder
WORKDIR /app

# Copy manifests for dependency installation
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/

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
FROM node:22-alpine AS runner
RUN npm install -g pnpm@10.32.1
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
