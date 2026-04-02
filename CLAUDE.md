# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev               # Start all services (API + Web + types watch)
pnpm build             # Build all packages
pnpm test              # Run all unit tests
pnpm lint              # Lint all workspaces

# Single test file
pnpm --filter @family-life/api exec jest src/modules/family/family.service.spec.ts
pnpm --filter @family-life/web exec vitest run src/components/Sidebar/Sidebar.test.tsx

# Prisma
pnpm --filter @family-life/api exec prisma migrate dev --name <name>
pnpm --filter @family-life/api exec prisma generate
pnpm --filter @family-life/api exec prisma studio
```

The API runs on `:3000`, web on `:5173`. Swagger docs at `http://localhost:3000/api/docs`.

## Local setup (macOS, no Docker)

Requires PostgreSQL 16 and Redis running via Homebrew:
```bash
brew services start postgresql@16 redis
```

The `.env` `DATABASE_URL` must use your local macOS username (not `postgres`) since Homebrew Postgres creates a superuser matching your system user.

A copy of `.env` must also exist at `apps/api/.env` — Prisma CLI reads it from there.

## Architecture

### Monorepo layout
- `apps/api` — NestJS backend
- `apps/web` — React + Vite frontend
- `apps/e2e` — Playwright tests
- `packages/types` — Shared TypeScript types (`@family-life/types`)
- `packages/tsconfig` — Shared TS configs (`@family-life/tsconfig`)

### Database split
- **PostgreSQL (Prisma)** — all data: `User`, `Family`, `FamilyMember`, `FamilyInvite`, `CalendarEvent`, `NotificationLog`, and `Page` (flexible content stored as JSONB `Json` columns for `items`, `taskItems`, and `eventIds`)

Every service method verifies the requesting user is a `FamilyMember` via Prisma before accessing page data.

### Backend (NestJS)
Modules live at `apps/api/src/modules/[name]/` and follow this structure:
```
[name].module.ts
[name].controller.ts   — @Controller, @UseGuards(JwtAuthGuard), @CurrentUser()
[name].service.ts      — business logic + requireMember()/requireRole() guards
dto/
  create-[name].dto.ts — class-validator decorators, required fields use `!` assertion
  update-[name].dto.ts
```

All DTOs use `class-validator`. Required properties need the `!` definite assignment assertion (e.g. `title!: string`) to satisfy `strictPropertyInitialization`.

The `@CurrentUser()` decorator (`src/common/decorators/current-user.decorator.ts`) extracts the authenticated user from `request.user`. `JwtAuthGuard` is at `src/modules/auth/guards/jwt-auth.guard.ts`.

Auth flow: JWT access token (15 min) + HTTP-only refresh cookie (7 days). Refresh via `POST /api/auth/refresh`.

### Frontend (React)
**Routing** — `App.tsx` uses `<FamilyShell>` as a nested parent layout for all `/family/:id/*` routes. It provides the sidebar and mobile header via `<Outlet>`.

**State** — Two Zustand stores, both persisted to localStorage:
- `auth.store.ts` (`auth-storage`) — `user`, `accessToken`
- `family.store.ts` (`family-storage`) — `activeFamilyId`

The access token is kept in memory only; on page load `useRestoreSession` calls `/api/auth/refresh` to restore it.

**API calls** — All HTTP via `apiRequest<T>()` in `src/lib/api-client.ts`. It automatically injects the Bearer token, retries on 401 with a refresh, and includes cookies.

**Data fetching** — TanStack Query hooks in `src/hooks/`. Pattern: `useQuery` with `enabled: !!dependency`, query key `[resource, id]`.

**Testing** — MSW (`src/mocks/handlers.ts`) mocks all API responses in Vitest. API unit tests use `@nestjs/testing` with Jest.
