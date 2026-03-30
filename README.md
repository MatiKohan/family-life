# Template Repository

A full-stack monorepo template with auth, API, web, and E2E testing ready to go.

## Using this as a template

### 1. Clone and rename

```bash
# Clone or copy this repo, then rename the project
# Replace "template-repository" with your project name across the codebase:
grep -r "template-repository" --include="*.json" --include="*.ts" --include="*.tsx" --include="*.yml" -l
# Then run: find . -not -path '*/node_modules/*' -not -path '*/.git/*' | xargs sed -i '' 's/template-repository/your-project-name/g'
```

Key files to update:
- `package.json` — `name` field
- `apps/api/package.json` — `name: @template-repository/api`
- `apps/web/package.json` — `name: @template-repository/web`
- `apps/e2e/package.json` — `name: @template-repository/e2e`
- `packages/types/package.json` — `name: @template-repository/types`
- `packages/tsconfig/package.json` — `name: @template-repository/tsconfig`
- `.github/workflows/*.yml` — Docker image tags

### 2. Configure environment

```bash
cp .env.example .env
```

Required values to fill:
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — generate strong random strings
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console (OAuth2 credentials)
- `GOOGLE_CALLBACK_URL` — update to your production domain when deploying

### 3. Set up the database

```bash
docker compose up -d
pnpm install
pnpm --filter @template-repository/api exec prisma migrate dev --name init
```

### 4. Configure CI/CD secrets

In your GitHub repository settings → Secrets, add:
- `DATABASE_URL` — production DB connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- (For deploy.yml) registry credentials if pushing Docker images

### 5. Configure deployment

- **API**: Deploy `apps/api/Dockerfile` to Railway/Fly.io/Render; set all env vars
- **Web**: Deploy `apps/web` to Vercel; set `VITE_API_URL` to your API's public URL
- Update `VITE_API_URL` in `.github/workflows/deploy.yml` (currently a placeholder)
- Update `GOOGLE_CALLBACK_URL` in production env to `https://your-api-domain/api/auth/google/callback`

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
pnpm --filter @template-repository/api exec prisma migrate dev --name init

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
pnpm --filter @template-repository/api exec prisma migrate dev    # New migration
pnpm --filter @template-repository/api exec prisma migrate reset  # Reset DB
pnpm --filter @template-repository/api exec prisma generate       # Regenerate client
pnpm --filter @template-repository/api exec prisma studio         # Visual browser
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
