# Development Plan

Status as of 2026-04-03. The app is functionally complete for core features. Remaining work is grouped by phase.

---

## What is done

### Core infrastructure
- [x] NestJS monorepo (Turborepo + pnpm workspaces)
- [x] PostgreSQL + Prisma ORM (User, Family, FamilyMember, FamilyInvite, Page, CalendarEvent)
- [x] JWT auth (15m access token + 7d HTTP-only refresh cookie)
- [x] Google OAuth2 login (with automatic account merging for existing password users)
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

Status: **complete**

### Type system fix
- [x] Add `'tasks'` to `PageType` union in `packages/types/src/page.types.ts`
- [x] Add `TaskItem` interface and `taskItems` field to the `Page` type

### Role management UI
- [x] Allow Owner/Admin to promote/demote members from FamilySettings
- [x] Show member actions (promote, remove) behind role check

### Event editing
- [x] Full edit dialog for existing calendar events
- [x] Link/unlink events from an Events page

### Dev-mode security
- [x] Remove / gate dev preset credentials in LoginPage (`?dev` query param) — do not ship to production

---

## Phase 6 — Test Coverage

Status: **complete**

- [x] `pages.service.spec.ts` — added reorderItems, reorderTaskItems, putBlocks, updateBlock, addBlockItem, updateBlockItem, deleteBlockItem
- [x] `calendar.service.spec.ts` — added recurrence expansion, editMode 'this'/'all', deleteEvent with instanceDate
- [x] `pages.controller.spec.ts` — new file covering listPages, createPage, deletePage, addItem, updateItem
- [x] `calendar.controller.spec.ts` — new file covering listEvents, createEvent, updateEvent, deleteEvent
- [x] Web component tests for ListPageView, TasksPageView, CanvasPageView — already covered
- [x] Sidebar component tests — new file with 13 cases (render, active page, navigation, loading, modal)
- [x] E2E: full user journey (register → create family → add items → calendar → invite)

---

## Phase 7 — Apartments page type

Status: **complete**

New page type for tracking apartment listings (rent or buy) from yad2.co.il via Apify scraper.

### Backend
- [x] `'apartments'` in `PageType`, `ApartmentListing` + `ApartmentSearchParams` types in `packages/types`
- [x] `apartments` NestJS module — `ApartmentsService`, `ApartmentsController`, `ApartmentsScheduler`
- [x] Apify yad2 provider with dev-mode mock listings (when `APIFY_TOKEN` not set)
- [x] Daily cron sync at 8 AM across all apartments pages
- [x] `POST /apartments/sync` — manual sync trigger
- [x] `PATCH /apartments/search-params` — save search params to `metadata` JSONB
- [x] `PATCH /apartments/:listingId/seen` — mark listing seen per user
- [x] Listings stored in `apartmentListings` JSONB on `Page`, `lastSyncedAt` timestamp

### Frontend
- [x] `ApartmentsPageView` — card grid (image, price, rooms, floor, location, yad2 link)
- [x] Search params form (deal type, rooms, price, city, area, floor, amenity toggles)
- [x] "Last synced" timestamp + manual "Sync now" button
- [x] Mark listings as seen (dims card, persists per user)
- [x] "Apartments" option in `CreatePageModal`
- [x] Full i18n: English + Hebrew

---

## Phase 8 — Web Push Notifications

Status: **complete**

Complement WhatsApp with native browser push notifications. Works for any family member without requiring a phone number. Fires on the same events as WhatsApp (item assigned, event reminder).

### How it works
- Browser asks permission → registers a push subscription (endpoint + keys)
- Subscription saved per user/device in the DB
- Server sends push via `web-push` npm package when events occur
- Service worker wakes up and shows a native OS notification, even if the tab is closed

### Backend
- [x] Install `web-push` package in `apps/api`
- [x] Add `PushSubscription` Prisma model (userId, endpoint, p256dh, auth, createdAt)
- [x] `POST /api/push/subscribe` — save subscription for current user
- [x] `DELETE /api/push/subscribe` — remove subscription (unsubscribe)
- [x] `PushService` — sends via `web-push` (integrated directly into NotificationsService)
- [x] Generate VAPID keys (stored in env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)

### Frontend
- [x] Expose `VITE_VAPID_PUBLIC_KEY` env var to the web app
- [x] `usePushSubscription` hook — requests permission, subscribes via `serviceWorker.pushManager`, POSTs to API
- [x] Push opt-in toggle in FamilySettings notification section (alongside WhatsApp toggles)
- [x] Service worker push handler — `push` event → `showNotification` with title + body
- [x] `notificationclick` handler — focuses/opens the app when notification is tapped

### Triggers (reuse existing NotificationsService)
- [x] Item/task assigned → push to assignee's subscriptions
- [x] Calendar event reminder (cron) → push to all family members with subscriptions

### Notes
- VAPID keys generated once with `npx web-push generate-vapid-keys`
- iOS requires PWA added to home screen (iOS 16.4+)
- Multiple subscriptions per user (one per browser/device) must be supported
- Failed/expired subscriptions (410 Gone) should be auto-deleted

---

## Phase 9 — Functionality Gaps

Core UX improvements that cut across all page types.

### Search

Status: **complete**

Global search across all pages, items, tasks, and calendar events.
- [x] `GET /api/families/:id/search?q=` — query across Page titles, list items, task items, event titles
- [x] Search bar in the sidebar (desktop) + magnifier icon in mobile header (expands inline)
- [x] Results grouped by type (Pages, Items, Tasks, Events) with links to the source
- [x] Debounced frontend query with TanStack Query (`useSearch` hook)
- [x] CI now runs on all branches (not just main)

### Activity Feed
Implemented as Phase 13 — see below.
- [x] `ActivityLog` Prisma model (familyId, userId, type, payload JSONB, createdAt)
- [x] Write activity entries on key mutations (item checked, task created, event created, member invited)
- [x] `GET /api/families/:id/activity` — paginated, newest first
- [x] `ActivityFeedPage` — avatar + action + timestamp
- [x] Poll every 60s for new entries

### Recurring Calendar Events

Status: **complete**

- [x] Add `recurrence Json?` to `CalendarEvent` Prisma schema (migration: `add_event_recurrence`)
- [x] `RecurrenceRule` type in `packages/types` (`freq`, `until?`, `exceptions?[]`)
- [x] `CalendarService.listEvents` expands recurring instances within the queried date range at query time (no extra DB rows)
- [x] `createEvent` accepts optional `recurrence` field
- [x] `updateEvent` supports `editMode: 'this' | 'all' | 'future'` + `instanceDate` — editing a single instance adds it to `exceptions` and creates a standalone override; "future" cuts the series and creates a new one
- [x] `deleteEvent` accepts optional `?instance=YYYY-MM-DD` — deletes single instance by adding to `exceptions`
- [x] UI: recurrence picker in `CreateEventModal` (None / Daily / Weekly / Monthly / Yearly + optional end date)
- [x] `EventDetailModal`: recurrence badge (🔁) in read view; edit/delete show a choice dialog — "This event only" vs "All events in series"
- [x] Edit form pre-populates recurrence picker from existing event data; sends updated recurrence in PATCH body

### Shared Notes Page
Decided against a separate notes page type. Notes are supported via **text blocks** inside the existing "Lists & Notes" canvas page (Phase 16). Changes made:
- [x] Renamed "List" page type display → "Lists & Notes" (i18n: en + he)
- [x] Renamed "+ Text" block button → "+ Notes" in the canvas (i18n: en + he)
- [x] No new page type needed — text blocks already provide freeform note-taking per block

---

## Phase 10 — Meal Planner Page

Status: **complete**

Plan dinners for the week. Optionally generate a shopping list from planned meals.

### Data model
- `MealPlanItem`: `{ day, weekStart, meal, recipeUrl? }` — stored in `items` JSONB column
- Multiple weeks co-exist in the same array, keyed by `weekStart` (ISO Monday date)

### Backend
- [x] Add `'meal-planner'` to `PageType` in `packages/types`
- [x] `MealPlanDay` + `MealPlanItem` types
- [x] `PUT /families/:fid/pages/:pid/meal-plan` — replace items for a given `weekStart`
- [x] `POST /families/:fid/pages/:pid/meal-plan/shopping-list` — create new list page from week's meals
- [x] `getPage` maps `items` → `mealPlanItems` for meal-planner pages
- [x] Service tests (9 cases)

### Frontend
- [x] `MealPlannerPageView` — day cells Mon–Sun, inline editable, recipe URL support
- [x] Week navigation (← prev / next →), defaulting to current week
- [x] "Generate shopping list" button with success toast
- [x] "Meal Planner" option in `CreatePageModal`
- [x] i18n: English + Hebrew

---

## Phase 11 — Recurring Tasks

Status: **complete**

Some chores repeat on a schedule (water plants, change filter, pay rent). These are maintenance tasks, not calendar events.

### Data model
- Add `recurrence` field to `TaskItem` JSONB: `{ freq: 'daily' | 'weekly' | 'monthly', nextDue: date }`
- When a recurring task is marked done, server auto-resets status to `'todo'` and advances `nextDue`

### Backend
- [x] Extend `TaskItem` type in `packages/types` with optional `recurrence` field
- [x] `CreateTaskItemDto` and `UpdateTaskItemDto` accept optional `recurrence` (via `RecurringTaskDto`)
- [x] In `PagesService.updateTaskItem`: if item is marked `done` and has recurrence → advance `nextDue` (status stays `done` until the cron fires)
- [x] Cron (daily) via `RecurringTaskScheduler` — resets any items where `nextDue <= today` and status is `done`

### Frontend
- [x] Recurrence picker in add-task form (None / Daily / Weekly / Monthly)
- [x] 🔁 recurrence label on task cards
- [x] "Due today" (yellow) / "Overdue" (red) badges on task cards
- [x] Overdue recurring tasks float to top of Todo column

---

## Phase 12 — Canvas List Enhancements

Status: **complete**

Progress tracking and categorized grouping for list blocks in canvas pages.

### List block improvements
- [x] Progress bar on each list block — shows checked/total count, thin brand-colored bar
- [x] Reset button (↺) — unchecks all items in one tap, appears when any item is checked
- [x] List type picker — clicking "+ List ▾" opens a dropdown: "Simple list" | "List by categories"
- [x] `variant: 'simple' | 'categorized'` field added to `ListBlock` type
- [x] `category?: string` field added to `ListItem` type + backend `CreateItemDto`
- [x] Categorized list view — items grouped by category into collapsible sections, each with its own add-item input
- [x] "+ Add category" inline input to create new category sections
- [x] i18n: English + Hebrew for all new labels

---

## Phase 13 — Activity Feed

Status: **complete**

Show a chronological log of what family members have done.

### Backend
- [x] `ActivityLog` Prisma model (id, familyId, userId, type, payload JSONB, createdAt)
- [x] `ActivityType` enum: `item_checked`, `item_added`, `task_created`, `task_status_changed`, `event_created`, `member_invited`
- [x] Write activity entries on key mutations in PagesService, CalendarService, InvitesService
- [x] `GET /api/families/:id/activity?limit=&cursor=` — paginated cursor-based, newest first
- [x] `activity` NestJS module with service + controller

### Frontend
- [x] `ActivityFeedPage` at `/family/:id/activity`
- [x] `useActivityFeed` hook with infinite scroll (TanStack Query `useInfiniteQuery`)
- [x] Entry row: member avatar + action description + relative timestamp ("2 min ago")
- [x] Add "Activity" link to sidebar nav
- [x] Poll every 60s for new entries (or manual refresh button)

---

## Phase 14 — Navbar Folders

Status: **complete**

Group pages under collapsible folders in the sidebar. Users can create folders, rename them, and drag pages in/out.

### Data model
- New `PageFolder` Prisma model: `id`, `familyId`, `name`, `emoji?`, `order` (int), `createdAt`
- Add `folderId?` (nullable FK) to `Page` model — pages without a folder appear at the root level
- Add `pageOrder` int to `Page` for ordering within a folder (and at root level)

### Backend
- [x] Add `PageFolder` model to Prisma schema + migration
- [x] Add `folderId` + `sortOrder` to `Page` model + migration
- [x] `folders` NestJS module: `GET/POST /api/families/:fid/folders`, `PATCH/DELETE /api/families/:fid/folders/:id`
- [x] `PATCH /api/families/:fid/pages/:pid` — accept `folderId` to move a page
- [x] `PATCH /api/families/:fid/folders/reorder` — bulk-update folder order
- [x] `GET /api/families/:fid/pages` response includes `folderId`

### Frontend
- [x] `FolderItem` sidebar component — collapsible section with folder emoji + name + child pages
- [x] "New folder" button in sidebar
- [x] Inline rename on double-click for folders
- [x] Drag-and-drop (extend existing `@dnd-kit` setup):
  - [x] Drag a page onto a folder → assigns `folderId`
  - [x] Drag a page out of a folder → clears `folderId`
  - [x] Drag folders to reorder them
- [x] Folder collapse state persisted in Zustand `family.store` (not DB — client-only)
- [x] "Create page modal" gains an optional folder selector
- [x] Rename / Delete on folder: hover trash button for delete, double-click for rename
- [x] Fix: folder name RTL alignment (`text-start` instead of hardcoded `text-left`)
- [x] Mobile: folders shown in `FamilyHomePage` as collapsible sections (shared collapse state with desktop sidebar)

---

## Phase 15 — List Page: Drag-to-Reorder Items

Status: **complete**

### Backend
- [x] `PagesService.reorderItems()` exists and handles list-type pages
- [x] `PATCH /api/families/:fid/pages/:pid/items/reorder` — accepts `{ itemIds: string[] }`, reorders by array position
- [x] `getPage` returns items in stored order

### Frontend
- [x] `ListPageView` uses `@dnd-kit` `SortableContext` with vertical list strategy
- [x] Drag handle icon on each row (visible on hover)
- [x] Optimistic reorder in TanStack Query cache on drag end
- [x] `useMutation` calls reorder endpoint after drop

---

## Phase 16 — List Page as Canvas (Block-based)

Status: **complete**

Replace the single flat list with a flexible canvas: users can add multiple named lists, free text blocks, and rearrange blocks vertically.

### Concept
Each list page becomes a stack of **blocks**. A block has a `type` (`list` | `text`) and optional `title`. Users can add, remove, reorder, and rename blocks. This keeps backward compatibility — existing single-list pages become a canvas with one unnamed list block.

### Data model
- New `Block` shape stored in the `items` JSONB column:
  ```ts
  type Block =
    | { id: string; type: 'list';  title?: string; items: ListItem[] }
    | { id: string; type: 'text';  title?: string; content: string }
  ```
- Migration strategy: wrap existing flat `items` arrays in a single `{ type: 'list', items: [...] }` block on first load (lazy migration in `getPage`)

### Backend
- [x] New `Block` type in `packages/types`
- [x] `getPage` — if `page.items` is a flat array (legacy), wrap it in a single list block before returning
- [x] `PUT /api/families/:fid/pages/:pid/blocks` — replace the full blocks array (optimistic whole-page save)
- [x] `PATCH /api/families/:fid/pages/:pid/blocks/:bid` — update a single block's title or content
- [x] `POST /api/families/:fid/pages/:pid/blocks/:bid/items` — add item to a list block
- [x] `PATCH /api/families/:fid/pages/:pid/blocks/:bid/items/:iid` — toggle/update item in a list block
- [x] `DELETE /api/families/:fid/pages/:pid/blocks/:bid/items/:iid` — remove item from a list block
- [x] `PATCH /api/families/:fid/pages/:pid/blocks/:bid/items/reorder` — reorder items within a list block

### Frontend
- [x] `CanvasPageView` replaces `ListPageView` for `'list'` page type
- [x] `BlockRenderer` — renders a block by type (`ListBlock` | `TextBlock`)
- [x] `ListBlock` — existing list UI (checkbox rows, assignee, due date) with optional title header
- [x] `TextBlock` — contenteditable / textarea with auto-grow, renders Markdown in read mode
- [x] "Add block" button (bottom of canvas): opens a small picker — "List" | "Text"
- [x] Drag-to-reorder blocks (vertical, `@dnd-kit`)
- [x] Block title inline-editable (click to edit)
- [x] Delete block button (trash icon on block hover, with confirmation if block has items)
- [x] Auto-save on blur (debounced `PUT /blocks`) — no explicit save button
- [x] Backward compat: pages with legacy flat items load seamlessly as a single list block

---

## Phase 17 — Offline Mutation Queue

Status: **complete**

Queue failed POST/PATCH/DELETE mutations when offline and replay on reconnect.

- [x] Detect offline state via `navigator.onLine` + `online`/`offline` events
- [x] Use TanStack Query `networkMode: 'offlineFirst'` + `onlineManager` to pause mutations when offline
- [x] Show offline indicator in the UI (amber banner at top of app)
- [x] Replay queued mutations automatically on reconnect

---

## Backlog / Future ideas

- [ ] Photo/media pages
- [ ] Budget tracking page type
- [ ] Dark mode
- [x] Calendar sync — ICS subscribe URL (`GET /api/families/:id/calendar.ics`) token-based, no JWT; webcal:// link for Apple Calendar, Google Calendar deep link; token regeneration in FamilySettings
