# Stage 1: builder
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy manifests for dependency installation
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/e2e/package.json ./apps/e2e/
COPY packages/types/package.json ./packages/types/
COPY packages/tsconfig/package.json ./packages/tsconfig/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build shared types package
RUN pnpm --filter @family-life/types build

# Bake in the API URL at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the web app
RUN pnpm --filter @family-life/web build

# Stage 2: runner
FROM nginx:alpine AS runner

# Copy nginx SPA config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite build output
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
