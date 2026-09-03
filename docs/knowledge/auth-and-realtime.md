# Auth, realtime, notifications

## JWT session

1. Register / password login / Google OAuth issues:
   - **Access JWT** (~15 min, `JWT_SECRET`) — `Authorization: Bearer`
   - **Refresh JWT** (~7 days, `JWT_REFRESH_SECRET`) — httpOnly cookie `refresh_token`
   - Refresh stored as **bcrypt hash** on `User.refreshTokenHash` (rotation on refresh)
2. Cookie: path `/`, 7d; production `secure` + `sameSite=none`; else `sameSite=lax`
3. `POST /api/auth/refresh` — cookie only; throttled
4. `POST /api/auth/logout` — JWT; clear hash + cookie
5. Google: `GET /api/auth/google` → callback sets cookie and redirects `WEB_URL/auth/callback?accessToken=…`
6. Account merge: Google `findOrCreate` can link to existing email/password user. Later Google logins refresh **avatar only**, not `name`, so a chosen display name is kept.

**Web:** Zustand `auth-storage` persists **user only**. Access token is memory-only. `useRestoreSession` calls refresh on load. `apiRequest` retries once on 401 via refresh; failed refresh clears session.

CORS origin is `FRONTEND_URL`; OAuth/invite links use `WEB_URL`. Both default to `http://localhost:5173`.

Guards: `JwtAuthGuard`, `OptionalJwtAuthGuard` (invite join), `GoogleAuthGuard`. Throttling is on the auth controller (5/min login/register, 10/min refresh).

Delete account (`DELETE /api/auth/me`) is blocked if the user is the sole OWNER of a family.

## Realtime (SSE)

- `GET /api/families/:familyId/stream?token=` — EventSource cannot send headers, so JWT is a **query** param
- In-process RxJS `Subject` filtered by `familyId` — **not Redis**; multiple API instances will **not** share events
- Emit types include `'pages'`, `'calendar'`, etc.
- Web: `useRealtimeEvents` → `invalidateForRealtimeEvent` in `apps/web/src/lib/query-keys.ts`. Calendar events use prefix `['calendar', familyId]` so all date-range queries refetch.

## Calendar subscribe (ICS)

- Member: `GET /api/families/:familyId/calendar-token`
- Public feed: `GET /api/families/:familyId/calendar.ics?token=`
- Feed includes `RRULE` / `EXDATE` for stored recurrence (not expanded instances)
- Web: Calendar **Export** and Family Settings subscribe use `calendarSubscribeLinks` (Google `cid`, `webcal`, copy)
- ADMIN+ can regenerate token

## Notifications

`NotificationsService` (no HTTP controller):

| Event | WhatsApp (Twilio) | Web push |
|---|---|---|
| Targeted invite with phone | yes | — |
| Item/task assigned (including canvas list items) | if member prefs | yes |
| Calendar event assigned to someone else | if member prefs | yes |
| Page / list item / task / event created | — | yes (`itemAdded`, skip actor + assignee) |
| Calendar reminder (cron every minute) | if prefs | yes (one-off via `reminderSentAt`; recurring instances via `reminderSentDates`) |

Prefs: `FamilyMember.notificationSettings` (`eventReminder`, `itemAssigned`, `invite`, `itemAdded`). `itemAdded` is **Web Push only** (no WhatsApp): other members are notified when someone creates a page, list item, task, or event. The actor and the assignee (if any) are skipped. Missing Twilio/VAPID env disables those channels. Logs: `NotificationLog`.

Push and WhatsApp copy use `User.locale` (`en` / `he`, default `en`). The web app PATCHes `PATCH /api/auth/me` `{ locale }` when the UI language changes (and on protected load if it drifted). Recipients with different locales get different payloads. Invites use the inviter's locale. Event titles and names are not translated.

Apartments: daily 8:00 cron + manual sync; Yad2 via Apify (`APIFY_TOKEN`); mock listings when token missing in non-prod.
