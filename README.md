# My App

A full-stack monorepo template with auth, API, web, and E2E testing ready to go.

## Stack

| Layer | Tech |
|-------|------|
| API | NestJS + Prisma + PostgreSQL + Redis |
| Web | React + Vite + TanStack Query + Tailwind |
| Auth | JWT + Google OAuth2 |
| Tests | Jest (API) · Vitest (Web) · Playwright (E2E) |
| Infra | Docker Compose · Turborepo · pnpm workspaces |

## Getting started

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Copy and fill env
cp .env.example .env

# 4. Run first migration
pnpm --filter @my-app/api exec prisma migrate dev --name init

# 5. Start dev servers
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000
- API docs: http://localhost:3000/api/docs

## Commands

```bash
pnpm dev          # Start all services
pnpm build        # Build all packages
pnpm test         # Run all unit tests
pnpm test:ci      # Tests with coverage
pnpm lint         # Lint all workspaces
pnpm test:e2e     # Playwright E2E tests
```

### Prisma

```bash
pnpm --filter @my-app/api exec prisma migrate dev    # New migration
pnpm --filter @my-app/api exec prisma migrate reset  # Reset DB
pnpm --filter @my-app/api exec prisma generate       # Regenerate client
pnpm --filter @my-app/api exec prisma studio         # Visual browser
```

## Project structure

```
apps/
  api/      NestJS backend
  web/      React + Vite frontend
  e2e/      Playwright tests
packages/
  types/    Shared TypeScript types
  tsconfig/ Shared TypeScript configs
```

## Auth

- Email/password registration and login
- Google OAuth2
- JWT access tokens (15 min) + HTTP-only refresh cookie (7 days)
- Protected routes on the frontend via `<ProtectedRoute />`

## Deployment

- **API + DB + Redis**: Railway (Dockerfile at `apps/api/Dockerfile`)
- **Web**: Vercel (root directory: `apps/web`, set `VITE_API_URL`)

See `.env.example` for all required environment variables.
