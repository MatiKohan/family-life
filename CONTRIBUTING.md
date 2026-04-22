# Developer Guide

Internal reference for working on the family-life monorepo.

---

## Prerequisites (macOS)

```bash
brew install postgresql@16 redis node
brew services start postgresql@16 redis
corepack enable
corepack prepare pnpm@latest --activate
```

Create databases:
```bash
createdb family_life
createdb family_life_test
```

---

## Setup

```bash
pnpm install

# Copy env — set DATABASE_URL username to your macOS username (Homebrew Postgres has no password)
cp .env.example .env
cp .env apps/api/.env   # Prisma CLI reads from apps/api/.env

# Run migrations
pnpm --filter @family-life/api exec prisma migrate dev

# Start dev servers
pnpm dev
```

| Service | URL |
|---|---|
| Web | http://localhost:5173 |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |

---

## Commands

```bash
# Dev
pnpm dev                  # Start API (:3000) + Web (:5173) + types watch

# Build
pnpm build                # Build all packages

# Tests
pnpm test                 # Run all unit tests
pnpm test:ci              # Tests + coverage (run before every push)
pnpm test:e2e             # Playwright E2E tests

# Lint
pnpm lint                 # Lint all workspaces

# Single file tests
pnpm --filter @family-life/api exec jest src/modules/calendar/calendar.service.spec.ts
pnpm --filter @family-life/web exec vitest run src/components/Sidebar/Sidebar.test.tsx
```

### Prisma

```bash
pnpm --filter @family-life/api exec prisma migrate dev --name <migration-name>
pnpm --filter @family-life/api exec prisma generate      # Regenerate client after schema changes
pnpm --filter @family-life/api exec prisma studio        # GUI at http://localhost:5555
pnpm --filter @family-life/api exec prisma migrate reset # Wipe + re-run all migrations (dev only)
```

---

## Monorepo layout

```
apps/
  api/          NestJS backend
  web/          React + Vite frontend
  e2e/          Playwright E2E tests
packages/
  types/        Shared TypeScript types (@family-life/types)
  tsconfig/     Shared TS configs (@family-life/tsconfig)
```

---

## Architecture

### Database (PostgreSQL via Prisma)

Key models:
- `User` — email/password + optional Google OAuth (`googleId`, `avatarUrl`)
- `Family` — name, emoji, `calendarToken` (for ICS export)
- `FamilyMember` — userId + familyId + role (OWNER/ADMIN/MEMBER) + WhatsApp phone + notification settings
- `Page` — flexible JSONB storage: `items`, `taskItems`, `apartmentListings`, `metadata`, `blocks`
- `CalendarEvent` — title, startAt, endAt, isAllDay, recurrence (JSONB), reminderMinutesBefore
- `PageFolder` — groups pages in the sidebar
- `ActivityLog` — audit trail for family activity feed
- `PushSubscription` — Web Push subscriptions per user/device
- `NotificationLog` — delivery records for WhatsApp notifications

Env: `DATABASE_URL=postgresql://<your-mac-username>@localhost:5432/family_life`

### Backend (NestJS)

Modules in `apps/api/src/modules/`:

| Module | Purpose |
|---|---|
| `auth` | JWT + Google OAuth, login/register/refresh/logout |
| `users` | User CRUD, Google account merging |
| `family` | Family CRUD, member management, roles |
| `invites` | Shareable invite links, targeted invites |
| `pages` | All page types — CRUD, blocks, items, task items |
| `calendar` | Events CRUD, recurrence expansion, ICS export |
| `folders` | Sidebar folder management |
| `search` | Global search across pages, items, tasks, events |
| `activity` | Activity feed — write + paginated read |
| `notifications` | WhatsApp (Twilio) + Web Push delivery |
| `push` | Web Push subscription management |
| `apartments` | yad2 listings via Apify, daily cron sync |
| `realtime` | SSE stream endpoint, in-memory family event bus |

Pattern for new modules:
```
[name].module.ts
[name].controller.ts   — @Controller, @UseGuards(JwtAuthGuard), @CurrentUser()
[name].service.ts      — business logic, requireMember()/requireRole() guards
dto/
  create-[name].dto.ts — class-validator decorators, required fields use `!` assertion
  update-[name].dto.ts
```

Auth flow:
- Access token: JWT, 15 min, in `Authorization: Bearer` header
- Refresh token: JWT, 7 days, HTTP-only cookie
- Google OAuth: `GET /api/auth/google` → Google → `GET /api/auth/google/callback` → redirect to `/auth/callback?accessToken=`
- Account merge: on Google login, existing password account with same email is linked automatically

### Frontend (React + Vite)

**Routing** — `App.tsx` uses `<FamilyShell>` as nested layout for all `/family/:id/*` routes.

**State** — two Zustand stores, both persisted to localStorage:
- `auth.store.ts` (`auth-storage`) — `user`, `accessToken`
- `family.store.ts` (`family-storage`) — `activeFamilyId`, collapsed folder IDs

**API client** — `src/lib/api-client.ts` → `apiRequest<T>()`:
- Injects Bearer token automatically
- Retries on 401 with a refresh call
- Includes cookies

**Data fetching** — TanStack Query hooks in `src/hooks/`. Pattern:
```ts
useQuery({ queryKey: ['resource', id], queryFn: () => apiRequest(...), enabled: !!id })
```

**Real-time** — `useRealtimeEvents(familyId)` in `FamilyShell`:
- Opens `EventSource` to `GET /api/families/:id/stream?token=<accessToken>`
- On event received, invalidates the relevant query cache

**Offline** — `networkMode: 'offlineFirst'` on all mutations (TanStack Query):
- Mutations pause when offline, auto-replay on reconnect
- `<OfflineBanner>` shown when `navigator.onLine` is false

**i18n** — `src/i18n/` with `en.json` + `he.json`. RTL auto-applied for Hebrew. Add new keys to both files and to `src/test/setup.ts` inline resources.

**Testing** — MSW (`src/mocks/handlers.ts`) mocks all API responses in Vitest. Add new endpoints to handlers when writing tests.

---

## Environment variables

### API (`apps/api/.env` + root `.env`)

```bash
# Database
DATABASE_URL=postgresql://<username>@localhost:5432/family_life

# Auth
JWT_SECRET=<random 32+ chars>
JWT_REFRESH_SECRET=<random 32+ chars, different from above>

# Google OAuth
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Frontend URL (for OAuth redirect + CORS)
WEB_URL=http://localhost:5173

# WhatsApp (Twilio) — optional
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Web Push (VAPID) — generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com

# Apartments (Apify) — optional, uses mock data in dev if not set
APIFY_TOKEN=
```

### Web (`apps/web/.env.local`)

```bash
VITE_API_URL=           # Leave empty for local dev (Vite proxies /api to :3000)
VITE_VAPID_PUBLIC_KEY=  # Must match VAPID_PUBLIC_KEY above
```

---

## Before pushing

Always run and fix before pushing:

```bash
pnpm lint
pnpm --filter @family-life/api exec tsc --noEmit
pnpm --filter @family-life/web exec tsc --noEmit
pnpm test:ci
```

---

## Dev login

The login page has a quick-fill button (only shown in dev/local) that pre-fills credentials for `matikohan@gmail.com`. Password: `password123`.
