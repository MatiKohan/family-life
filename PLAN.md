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

Status: **not started**

Notify family members via WhatsApp (Twilio) for key events.

- [ ] Integrate Twilio WhatsApp API in NestJS (notifications module)
- [ ] Send notification on family invite received
- [ ] Send notification on item/task assigned to a member
- [ ] Send notification on calendar event reminder (configurable lead time)
- [ ] Respect `FamilyMember.notificationSettings` (per-user on/off per type)
- [ ] Store delivery logs in a `NotificationLog` table
- [ ] Add `whatsappPhone` collection to onboarding / settings UI
- [ ] Add notification preferences UI in FamilySettings

---

## Phase 5 — Polish & Missing Features

Status: **partially done**

### Type system fix
- [x] Add `'tasks'` to `PageType` union in `packages/types/src/page.types.ts`
- [x] Add `TaskItem` interface and `taskItems` field to the `Page` type

### Role management UI
- [ ] Allow Owner/Admin to promote/demote members from FamilySettings
- [ ] Show member actions (promote, remove) behind role check

### Event editing
- [ ] Full edit dialog for existing calendar events (currently unclear if implemented)
- [ ] Link/unlink events from an Events page

### Offline mutations
- [ ] Queue failed POST/PATCH/DELETE mutations when offline and replay on reconnect

### Dev-mode security
- [ ] Remove / gate dev preset credentials in LoginPage (`?dev` query param) — do not ship to production

---

## Phase 6 — Test Coverage

Status: **needs attention**

- [ ] `pages.service.spec.ts` — add coverage for item creation, reordering, task status
- [ ] `calendar.service.spec.ts` — add unit tests
- [ ] E2E: full user journey (register → create family → add items → calendar → invite)
- [ ] Web component tests for ListPageView, TasksPageView, Sidebar
- [ ] API controller tests (pages, calendar)

---

## Backlog / Future ideas

- [ ] Photo/media pages
- [ ] Budget tracking page type
- [ ] Push notifications (web push via service worker)
- [ ] Family activity feed
- [ ] Dark mode
