# Family Life

A mobile-first family management app. Create a family group, invite members, and manage shared lists, tasks, a calendar, meal plans, apartment hunting, and more — all in one place with real-time sync.

## Features

### Organization
- **Typed pages** — create pages of different types inside your family space
  - **Lists & Notes** — block-based canvas with multiple named lists, text/note blocks, progress bars, categorized lists, drag-to-reorder
  - **Tasks** — Kanban board (Todo / In Progress / Done), assignee, due dates, recurring tasks (daily/weekly/monthly)
  - **Calendar Events** — timeline view linked to the family calendar
  - **Meal Planner** — weekly dinner planner Mon–Sun, generate shopping list from meals
  - **Apartments** — track yad2.co.il listings with search filters, auto-synced daily via Apify
- **Sidebar folders** — group pages into collapsible folders, drag pages in/out, rename folders
- **Global search** — search across all pages, list items, tasks, and calendar events

### Calendar
- Monthly view with event pills
- Create / edit / delete events with recurrence (daily / weekly / monthly / yearly + end date)
- Edit a single instance or the full series
- Subscribe to family calendar via ICS (Apple Calendar / Google Calendar)

### Family
- Create a family with emoji + name
- Invite members via shareable link, email, or phone (WhatsApp notification)
- Role-based access: Owner / Admin / Member
- Multi-family support with family switcher

### Notifications
- **WhatsApp** (Twilio) — item/task assigned, calendar event reminders
- **Web Push** — browser notifications even when the tab is closed (PWA)
- Configurable per member in family settings

### Technical
- **Real-time** — changes appear instantly for all connected family members (SSE)
- **Offline-first** — mutations queue when offline and replay on reconnect
- **PWA** — installable on iOS and Android, service worker caching
- **Bilingual** — English and Hebrew with RTL auto-flip
- **Google OAuth** — sign in with Google; existing password accounts are auto-merged on first Google login

## Stack

| Layer | Tech |
|---|---|
| API | NestJS · Prisma · PostgreSQL |
| Web | React · Vite · TanStack Query · Zustand · Tailwind CSS |
| Auth | JWT (15m access + 7d refresh cookie) · Google OAuth2 |
| Real-time | Server-Sent Events (SSE) |
| Notifications | Twilio WhatsApp · Web Push (VAPID) |
| Tests | Jest (API) · Vitest + MSW (Web) · Playwright (E2E) |
| Infra | Turborepo · pnpm workspaces · Docker · Railway (API) · Vercel (Web) |

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the full production setup guide.

- **API**: Railway — `apps/api/Dockerfile`
- **Web**: Vercel — set `VITE_API_URL` to your Railway API URL
