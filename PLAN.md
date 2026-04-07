# Development Plan

Status as of 2026-04-03. The app is functionally complete for core features. Remaining work is grouped by phase.

---

## What is done

### Core infrastructure
- [x] NestJS monorepo (Turborepo + pnpm workspaces)
- [x] PostgreSQL + Prisma ORM (User, Family, FamilyMember, FamilyInvite, Page, CalendarEvent)
- [x] JWT auth (15m access token + 7d HTTP-only refresh cookie)
- [x] Google OAuth2 login
- [x] Role-based access (OWNER / ADMIN / MEMBER) enforced in all service methods
- [x] Docker multi-stage builds (API + Web)
- [x] Vercel + Railway deployment config

### Family management
- [x] Create / rename family with emoji
- [x] Invite members via shareable link or targeted (email/phone)
- [x] Accept / redeem invites (authenticated + unauthenticated flow)
- [x] View and manage family members + roles
- [x] Multi-family support with family switcher

### Pages
- [x] List pages — grocery / shopping with checkboxes, assignee, due date, drag-to-reorder
- [x] Task pages — Kanban-style statuses (Todo / In Progress / Done), assignee, drag-to-reorder
- [x] Events pages — view calendar events linked to the page
- [x] Page creation modal (emoji + title + type)

### Calendar
- [x] Monthly calendar view with event pills
- [x] Create / edit / delete calendar events
- [x] Date range query for events

### Frontend
- [x] React Router 7 with protected routes + FamilyShell layout
- [x] TanStack Query data fetching with optimistic updates
- [x] Zustand stores (auth + active family), persisted to localStorage
- [x] Drag & drop via @dnd-kit
- [x] i18n: English + Hebrew (RTL auto-flip)
- [x] PWA: installable, service worker, offline asset caching
- [x] Mobile-first UI (bottom nav, responsive sidebar)

### Testing
- [x] API unit tests: auth, family, invites services
- [x] Web hook tests: usePages, usePage, useRestoreSession, useCalendarEvents
- [x] E2E: auth smoke test (Playwright)
- [x] MSW mocks for frontend tests

---

## Phase 4 — WhatsApp Notifications

Status: **complete**

Notify family members via WhatsApp (Twilio) for key events.

- [x] Integrate Twilio WhatsApp API in NestJS (notifications module)
- [x] Send notification on family invite received (targeted invite with phone)
- [x] Send notification on item/task assigned to a member
- [x] Send notification on calendar event reminder (configurable lead time)
- [x] Respect `FamilyMember.notificationSettings` (per-user on/off per type)
- [x] Store delivery logs in a `NotificationLog` table
- [x] Add `whatsappPhone` collection to onboarding / settings UI
- [x] Add notification preferences UI in FamilySettings

---

## Phase 5 — Polish & Missing Features

Status: **partially done**

### Type system fix
- [x] Add `'tasks'` to `PageType` union in `packages/types/src/page.types.ts`
- [x] Add `TaskItem` interface and `taskItems` field to the `Page` type

### Role management UI
- [x] Allow Owner/Admin to promote/demote members from FamilySettings
- [x] Show member actions (promote, remove) behind role check

### Event editing
- [ ] Full edit dialog for existing calendar events (currently unclear if implemented)
- [ ] Link/unlink events from an Events page

### Offline mutations
- [ ] Queue failed POST/PATCH/DELETE mutations when offline and replay on reconnect

### Dev-mode security
- [x] Remove / gate dev preset credentials in LoginPage (`?dev` query param) — do not ship to production

---

## Phase 6 — Test Coverage

Status: **needs attention**

- [ ] `pages.service.spec.ts` — add coverage for item creation, reordering, task status
- [ ] `calendar.service.spec.ts` — add unit tests
- [ ] E2E: full user journey (register → create family → add items → calendar → invite)
- [ ] Web component tests for ListPageView, TasksPageView, Sidebar
- [ ] API controller tests (pages, calendar)

---

## Phase 7 — Apartments page type

New page type for tracking apartment listings (rent or buy) from yad2.co.il.

### Data source strategy
**Apify managed scraper** (recommended) — calls the published yad2 actor via Apify API.
- No anti-bot complexity, no proxy management
- Returns structured JSON (rooms, price, location, floor, images, amenities, listing URL)
- ~$5/1k results; personal/family use fits free tier
- Requires `APIFY_TOKEN` env var

### Search params (user-configured per page)
- Deal type: rent | buy
- Rooms: min / max
- Location: city / area (yad2 area codes)
- Price: max (₪/month for rent, ₪ total for buy)
- Floor: min / max (optional)
- Keywords: free text (optional)

### Backend
- [ ] Add `'apartments'` to `PageType` in `packages/types`
- [ ] New `ApartmentListing` type in `packages/types` (id, title, price, rooms, floor, area, city, url, imageUrl, foundAt)
- [ ] New `ApartmentSearch` type for search params stored on the Page
- [ ] `apartments` NestJS module with `ApartmentsService` (fetch from Apify, diff against stored, save new)
- [ ] Add `@nestjs/schedule` (also needed for Phase 4 event reminders) — daily cron at configurable time
- [ ] Store listings as JSONB `items` on the `Page` (consistent with list/task pages)
- [ ] Store search params as JSONB `metadata` column on `Page` (add to schema)

### Frontend
- [ ] `ApartmentsPageView` component — card grid layout (image, price, rooms, location, link to yad2)
- [ ] Search params form in `CreatePageModal` when type = apartments
- [ ] "Last synced" timestamp + manual "Sync now" button
- [ ] Mark listings as seen/archived (per user)

### Future
- [ ] WhatsApp notification when new listings found (via existing NotificationsService)
- [ ] Support additional sources (Homeless.co.il, Facebook Marketplace)

---

## Phase 8 — Web Push Notifications

Complement WhatsApp with native browser push notifications. Works for any family member without requiring a phone number. Fires on the same events as WhatsApp (item assigned, event reminder).

### How it works
- Browser asks permission → registers a push subscription (endpoint + keys)
- Subscription saved per user/device in the DB
- Server sends push via `web-push` npm package when events occur
- Service worker wakes up and shows a native OS notification, even if the tab is closed

### Backend
- [ ] Install `web-push` package in `apps/api`
- [ ] Add `PushSubscription` Prisma model (userId, endpoint, p256dh, auth, createdAt)
- [ ] `POST /api/push/subscribe` — save subscription for current user
- [ ] `DELETE /api/push/subscribe` — remove subscription (unsubscribe)
- [ ] `WebPushChannel` implementing `INotificationChannel` — sends via `web-push`
- [ ] Register `WebPushChannel` in `NotificationsModule` alongside `WhatsAppChannel`
- [ ] Generate VAPID keys (one-time, stored in env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)

### Frontend
- [ ] Expose `VITE_VAPID_PUBLIC_KEY` env var to the web app
- [ ] `usePushSubscription` hook — requests permission, subscribes via `serviceWorker.pushManager`, POSTs to API
- [ ] Push opt-in toggle in FamilySettings notification section (alongside WhatsApp toggles)
- [ ] Service worker push handler — `push` event → `showNotification` with title + body
- [ ] `notificationclick` handler — focuses/opens the app when notification is tapped

### Triggers (reuse existing NotificationsService)
- [ ] Item/task assigned → push to assignee's subscriptions
- [ ] Calendar event reminder (cron) → push to all family members with subscriptions

### Notes
- VAPID keys generated once with `npx web-push generate-vapid-keys`
- iOS requires PWA added to home screen (iOS 16.4+)
- Multiple subscriptions per user (one per browser/device) must be supported
- Failed/expired subscriptions (410 Gone) should be auto-deleted

---

## Backlog / Future ideas

- [ ] Photo/media pages
- [ ] Budget tracking page type
- [ ] Family activity feed
- [ ] Dark mode
