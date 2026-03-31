# 🏠 Family Life

A mobile-first family management app. Create a family group, invite members, manage shared lists, a calendar, and tasks — all in one place.

## Features

- **Family groups** — create a family, invite members via link or email/phone, manage roles
- **Typed pages** — list pages (grocery, shopping, tasks) and event pages, with more types coming
- **Shared calendar** — family calendar with event reminders
- **WhatsApp notifications** — configurable per family: invites, assignments, event reminders
- **Multi-family** — belong to multiple families, switch between them

## Stack

| Layer | Tech |
|---|---|
| API | NestJS + Prisma + PostgreSQL + MongoDB + Redis |
| Web | React + Vite + TanStack Query + Zustand + Tailwind |
| Auth | JWT + Google OAuth2 |
| Notifications | Twilio WhatsApp API |
| Tests | Jest (API) · Vitest (Web) · Playwright (E2E) |
| Infra | Turborepo · pnpm workspaces |

## Getting started

### Prerequisites (macOS via Homebrew)

```bash
brew install postgresql@16 redis
brew tap mongodb/brew && brew install mongodb-community@7.0

brew services start postgresql@16
brew services start redis
brew services start mongodb/brew/mongodb-community@7.0

createdb family_life
createdb family_life_test
```

### Setup

```bash
# Install dependencies
pnpm install

# Copy and fill env
cp .env.example .env
# Edit .env: set DATABASE_URL user to your local postgres user (e.g. your mac username, no password)

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
  api/      NestJS backend (Prisma + MongoDB)
  web/      React + Vite frontend
  e2e/      Playwright E2E tests
packages/
  types/    Shared TypeScript types
  tsconfig/ Shared TypeScript configs
```

## Environment variables

See `.env.example` for all variables. Key ones:

```
DATABASE_URL          PostgreSQL connection string
MONGO_URL             MongoDB connection string
JWT_SECRET            Strong random string
JWT_REFRESH_SECRET    Strong random string (different from above)
GOOGLE_CLIENT_ID      Google OAuth2 (optional)
GOOGLE_CLIENT_SECRET  Google OAuth2 (optional)
TWILIO_ACCOUNT_SID    Twilio for WhatsApp (Phase 4)
TWILIO_AUTH_TOKEN     Twilio for WhatsApp (Phase 4)
```

## Commands

```bash
pnpm dev          # Start all services
pnpm build        # Build all packages
pnpm test         # Run all unit tests
pnpm lint         # Lint all workspaces
pnpm test:e2e     # Playwright E2E tests
```

### Prisma

```bash
pnpm --filter @family-life/api exec prisma migrate dev    # New migration
pnpm --filter @family-life/api exec prisma studio         # Visual DB browser
pnpm --filter @family-life/api exec prisma generate       # Regenerate client
```

## Deployment

- **API**: Deploy `apps/api/Dockerfile` to Railway/Fly.io/Render
- **Web**: Deploy `apps/web` to Vercel — set `VITE_API_URL` to your API's public URL
- **MongoDB**: MongoDB Atlas free tier
- **Redis**: Upstash free tier
