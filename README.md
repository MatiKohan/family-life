# Family Life

A mobile-first family management app. Create a family group, invite members, and manage shared lists, tasks, a calendar, and pages — all in one place.

## Features

- **Family groups** — create a family, invite members via link or email/phone, manage roles (Owner / Admin / Member)
- **Typed pages** — List pages (grocery, shopping) and Task pages (Kanban-style statuses) and Event pages linked to the calendar
- **Shared calendar** — monthly family calendar with event creation and reminders
- **Multi-family** — belong to multiple families, switch between them
- **PWA** — installable, works offline with service worker caching
- **Bilingual** — English and Hebrew (with RTL auto-flip)
- **WhatsApp notifications** — planned (Phase 4), not yet implemented

## Stack

| Layer | Tech |
|---|---|
| API | NestJS + Prisma + PostgreSQL |
| Web | React + Vite + TanStack Query + Zustand + Tailwind CSS |
| Auth | JWT (15m access + 7d refresh cookie) + Google OAuth2 |
| Tests | Jest (API) · Vitest (Web) · Playwright (E2E) |
| Infra | Turborepo · pnpm workspaces · Docker |

## Getting started

### Prerequisites (macOS via Homebrew)

```bash
brew install postgresql@16 redis
brew services start postgresql@16 redis

createdb family_life
createdb family_life_test
```

### Setup

```bash
pnpm install

# Copy and fill env — set DATABASE_URL user to your macOS username (no password)
cp .env.example .env
cp .env apps/api/.env   # Prisma CLI reads from apps/api/.env

# Run migrations
pnpm --filter @family-life/api exec prisma migrate dev

# Start dev servers
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000
- API docs: http://localhost:3000/api/docs

## Project structure

```
apps/
  api/      NestJS backend (modules: auth, users, family, invites, pages, calendar)
  web/      React + Vite frontend
  e2e/      Playwright E2E tests
packages/
  types/    Shared TypeScript types
  tsconfig/ Shared TypeScript configs
```

## Environment variables

See `.env.example` for all variables. Key ones:

```
DATABASE_URL            PostgreSQL connection string
JWT_SECRET              Strong random string (32+ chars)
JWT_REFRESH_SECRET      Strong random string, different from JWT_SECRET
GOOGLE_CLIENT_ID        Google OAuth2 client ID
GOOGLE_CLIENT_SECRET    Google OAuth2 client secret
GOOGLE_CALLBACK_URL     e.g. http://localhost:3000/api/auth/google/callback
WEB_URL                 Frontend URL (for CORS)
VITE_API_URL            Backend URL used by frontend build

# Phase 4 (not yet implemented):
TWILIO_ACCOUNT_SID      Twilio for WhatsApp
TWILIO_AUTH_TOKEN       Twilio for WhatsApp
TWILIO_WHATSAPP_FROM    e.g. whatsapp:+14155238886
```

## Commands

```bash
pnpm dev          # Start all services (API :3000 + Web :5173)
pnpm build        # Build all packages
pnpm test         # Run all unit tests
pnpm test:ci      # Run tests with coverage (run before pushing)
pnpm lint         # Lint all workspaces
pnpm test:e2e     # Playwright E2E tests
```

### Prisma

```bash
pnpm --filter @family-life/api exec prisma migrate dev --name <name>
pnpm --filter @family-life/api exec prisma studio
pnpm --filter @family-life/api exec prisma generate
```

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full production setup.

- **API**: Railway (`apps/api/Dockerfile`)
- **Web**: Vercel (`apps/web`) — set `VITE_API_URL` to your API's public URL
