# Web (`apps/web`)

React 19 + Vite, Tailwind, TanStack Query, Zustand, React Router, i18n (`en` / `he` + RTL), PWA (`sw.ts`).

## Bootstrap

`main.tsx`: QueryClient (queries `staleTime` 5 min, `retry: 1`; mutations `networkMode: 'offlineFirst'`), Router, i18n, onlineManager.

`lib/api-client.ts`: `BASE_URL` = `VITE_API_URL/api` or `/api`. Bearer + `credentials: 'include'`. 401 → refresh once.

## Routes (`App.tsx`)

| Path | Guard | UI |
|---|---|---|
| `/login` | public | Login / register |
| `/auth/callback` | public | Google `?accessToken=` |
| `/join/:token` | public | Invite redeem |
| `/family/create` | ProtectedRoute | Create family (no shell) |
| `/family/:id` | Protected + **FamilyShell** | Home, pages, calendar, settings, activity |
| `/` | Protected + legacy **Layout** | `HomeRedirect` (not `HomePage.tsx`) |
| `*` | | navigate `/` |

`HomeRedirect`: `family-storage` `activeFamilyId`, else first family from `useMyFamilies()`, else `/family/create`.

**FamilyShell:** sidebar (desktop), mobile header + `BottomNav`, `useRealtimeEvents`, `<Outlet />`. Failed `useFamily` clears active family → create.

**Page views** (`PageViewPage` by `page.type`):

| type | Component |
|---|---|
| `list` | `CanvasPageView` (blocks) |
| `tasks` | `TasksPageView` |
| `events` | `EventsPageView` |
| `apartments` | `ApartmentsPageView` |

`ListPageView` still exists and is tested; **routing uses Canvas** for lists. `NotesPageView/` is empty. `HomePage.tsx` is unused.

## Zustand

| Store | persist key | Persisted | Memory |
|---|---|---|---|
| `auth.store` | `auth-storage` | `user` | `accessToken` |
| `family.store` | `family-storage` | `activeFamilyId`, `collapsedFolderIds` | — |

Language: `localStorage` `language`.

## Query keys

Canonical factory: `src/lib/query-keys.ts` (`queryKeys.*`). SSE uses `invalidateForRealtimeEvent` so live updates hit the same keys as the fetch hooks.

| Helper | Key |
|---|---|
| `queryKeys.families.all()` | `['families']` |
| `queryKeys.families.detail(id)` | `['families', id]` |
| `queryKeys.pages.all(familyId)` | `['pages', familyId]` (also prefixes page detail) |
| `queryKeys.pages.detail(familyId, pageId)` | `['pages', familyId, pageId]` |
| `queryKeys.folders.all(familyId)` | `['folders', familyId]` |
| `queryKeys.calendar.range(familyId, start, end)` | `['calendar', familyId, start, end]` |
| `queryKeys.calendar.all(familyId)` | `['calendar', familyId]` (invalidates all ranges) |
| `queryKeys.calendar.token(familyId)` | `['calendar-token', familyId]` |
| `queryKeys.activity.all(familyId)` | `['activity', familyId]` |
| `queryKeys.search.query(familyId, q)` | `['search', familyId, q]` |
| `queryKeys.invites.all(familyId)` | `['invites', familyId]` |

Many mutations live **inline** in Sidebar / canvas / calendar views, not only in `hooks/`.

## Layout

- Desktop `md+`: `Sidebar` + main
- Mobile: `BottomNav` (Pages, Calendar, New, Settings — **no Activity tab**; Activity is in sidebar)
- Search: sidebar desktop, header magnifier on mobile
- DnD: `@dnd-kit` (pages, folders, list/task items)

## i18n

`src/i18n/locales/{en,he}.json`. New user-visible strings need both locales. Vitest setup embeds a **subset** of English, not the full JSON.
