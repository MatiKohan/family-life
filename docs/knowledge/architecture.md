# Architecture

Family Life is a **mobile-first family workspace**: one or more families, typed pages (lists/notes canvas, tasks, calendar-linked events, apartments), shared calendar, invites, notifications, and live updates.

## Monorepo

Turborepo + pnpm workspaces (`apps/*`, `packages/*`).

| Path | Package | Role |
|---|---|---|
| `apps/api` | `@family-life/api` | NestJS API, Prisma, cron, SSE |
| `apps/web` | `@family-life/web` | React + Vite PWA |
| `apps/e2e` | `@family-life/e2e` | Playwright |
| `packages/types` | `@family-life/types` | Shared TS types (API + web import this) |
| `packages/tsconfig` | `@family-life/tsconfig` | Shared TS configs |

**Local:** API `:3000` (`/api`, Swagger `/api/docs`), web `:5173` (Vite proxies `/api` → API). Postgres 16 required. Redis is in Homebrew/CI/`DEPLOY.md` but **the API does not use Redis** today (realtime is in-process).

**Prod:** API on Railway (`apps/api/Dockerfile` when the service root is the repo; otherwise Nixpacks + Node 22), web on Vercel (`VITE_API_URL`). See `DEPLOY.md`.

## Request flow

```
Browser (PWA)
  → apiRequest() + Bearer access JWT + cookie refresh
  → Nest /api/* (JwtAuthGuard on most routes)
  → Service requireMember / requireRole via FamilyMember
  → Prisma / PostgreSQL
  → side effects: ActivityLog, Notifications (WhatsApp + web push), RealtimeService.emit
```

Web mutations use TanStack Query; SSE (`GET /api/families/:id/stream?token=`) invalidates caches so other tabs/members refresh.

## Authz model

- **Authentication:** Nest guards (`JwtAuthGuard`, optional JWT for invite redeem).
- **Authorization:** **service layer only** — `FamilyService.requireMember` / `requireRole`, or a **private duplicate** `requireMember` on pages/calendar/folders/search/apartments/ICS. There is no Nest role guard.
- Roles: `OWNER` | `ADMIN` | `MEMBER`.

## Source of truth

- **DB shape:** `apps/api/prisma/schema.prisma`
- **API/UI contracts:** `packages/types` (page type is a **string** in Prisma, union in types)
- **Agent how-to:** `CLAUDE.md`, `CONTRIBUTING.md`, `.cursor/rules/`
- **Historical roadmap:** `PLAN.md` (verify against code)
