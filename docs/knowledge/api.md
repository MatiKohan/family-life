# API (`apps/api`)

Global prefix **`/api`**. Bootstrap: `src/main.ts` (cookies, `ValidationPipe` whitelist + forbidNonWhitelisted + transform, CORS, Swagger). Root: `src/app.module.ts` (Config, Throttler, Schedule, feature modules). Prisma is `@Global`.

## Layout

```
src/common/decorators/current-user.decorator.ts
src/database/prisma.service.ts
src/modules/<name>/
  <name>.module.ts
  <name>.controller.ts   # @UseGuards(JwtAuthGuard), @CurrentUser()
  <name>.service.ts     # business logic + membership checks
  dto/
```

DTOs: `class-validator`. Required fields use `!` for `strictPropertyInitialization`. Shared types from `@family-life/types`.

## Modules and routes

| Module | HTTP | Notes |
|---|---|---|
| `health` | `GET /health` | No JWT, skip throttle |
| `users` | none | Used by auth (findOrCreate, refresh hash, deleteAccount) |
| `auth` | `/auth/*` | register, login, google, refresh, logout, me, delete me |
| `family` | `/families`, `/families/:id`, members | Exports `requireMember`, `requireRole`, `addMemberByInvite` |
| `invites` | `/families/:id/invites/*`, public `/invites/info/:token`, `/invites/join/:token` | Join uses optional JWT |
| `pages` | `/families/:id/pages` + items, task-items, event-refs, blocks | Soft-delete pages; `RecurringTaskScheduler` |
| `folders` | `/families/:id/folders` | |
| `calendar` | `/families/:id/calendar`, `PATCH .../calendar/:eventId/rsvp`, ICS token + `.ics` | Recurrence expansion; RSVP stored on `attendees` Json |
| `dashboard` | `GET /families/:familyId/dashboard?start&end` | Today events, assigned items/tasks/events, leftover list count |
| `search` | `/families/:familyId/search?q=` | `q` length ≥ 2 |
| `activity` | `/families/:familyId/activity?limit&cursor` | |
| `push` | `/push/subscribe` POST/DELETE | |
| `apartments` | `/families/:familyId/pages/:pageId/apartments` | search-params, sync, seen |
| `notifications` | none | Channels + reminder cron |
| `realtime` | `/families/:familyId/stream` | SSE |

Private `requireMember` (direct Prisma) is duplicated in pages, calendar, folders, search, apartments, ICS — same idea as `FamilyService.requireMember`, not injected.

## Side effects on writes

Typical page/calendar/invite mutations: `RealtimeService.emit` (`pages` and `activity` after list writes), `ActivityService.log` (awaited), assignment → `sendAssignmentNotification`.

List pages persist canvas blocks in `Page.items`. Empty lists used to store `[]`; each GET invented a new block id, so adding an item often missed the block. New list pages seed one list block; `addBlockItem` adopts the client block id when the stored list is empty.

Activity types seen in code: `item_added`, `item_checked`, `task_created`, `task_status_changed`, `event_created`, `member_invited`.

## Env (see `.env.example`)

Required for a working app: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. Optional: Google, Twilio, VAPID, `APIFY_TOKEN`. `REDIS_URL` is unused by application code.

Config loads `.env.${NODE_ENV}` then `.env`. Keep a copy at `apps/api/.env` for Prisma CLI.
