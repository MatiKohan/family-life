# Data model

Schema: `apps/api/prisma/schema.prisma`. All family data is PostgreSQL via Prisma.

## Relational models

| Model | Purpose |
|---|---|
| `User` | Email, optional Google id / password, `refreshTokenHash`, name, avatar |
| `Family` | Name, emoji, optional `calendarToken` (ICS) |
Prefs live in `FamilyMember.notificationSettings` Json: `invite`, `itemAssigned`, `eventReminder`, `itemAdded` (all default on when the key is missing).
| `FamilyInvite` | Token, optional email/phone, `InviteStatus`, `expiresAt` |
| `PageFolder` | Sidebar folders; delete folder **hard-deletes** pages in it |
| `Page` | Typed workspace document; **content is JSON columns**, not child tables |
| `CalendarEvent` | Family events; `recurrence` Json; optional `assigneeId`; `attendees` Json (`{ userId, status, bringing? }[]`); `reminderSentDates` for recurring reminder de-dupe |
| `PushSubscription` | Web Push keys per device |
| `ActivityLog` | Cursor-paginated feed; `type` + `payload` Json |
| `NotificationLog` | Delivery audit (invite / assignment / reminder) |

Enums: `FamilyRole` (`OWNER`, `ADMIN`, `MEMBER`), `InviteStatus` (`PENDING`, `ACCEPTED`, `EXPIRED`).

## Page JSONB

`Page.type` is a **string** in the DB. App union in `packages/types`: `'list' | 'tasks' | 'events' | 'apartments'` (meal-planner is **not** in types/code despite README/PLAN).

| Column | Used by | Shape |
|---|---|---|
| `items` | list (and historically flat lists) | `Block[]` (`list` \| `text`) after lazy migrate; legacy was `ListItem[]` |
| `taskItems` | tasks | `TaskItem[]` (status, assignee, due, recurrence) |
| `eventIds` | events pages | `string[]` calendar event ids (hydrated on get) |
| `metadata` | apartments search params | e.g. `ApartmentSearchParams` |
| `apartmentListings` | apartments | `ApartmentListing[]` with `seenBy: userId[]` |

Soft delete: `Page.deletedAt`; list/task items use `deletedAt` inside JSON. Folders deleting pages is hard delete.

List pages: `getPage` wraps a legacy flat `items` array in one list `Block` (`normalizeBlocks`).

## Recurrence

- **Calendar:** `CalendarEvent.recurrence` (`freq`, `until`, `exceptions`). Expanded at **read** time in `listEvents` using **UTC** date arithmetic. Edit modes: `this` / `future` / `all`. Recurring reminders track sent instance dates in `reminderSentDates`.
- **Tasks:** `TaskItem.recurrence` `{ freq, nextDue }`. Midnight cron `RecurringTaskScheduler` resets due recurring tasks.

## Membership rules (approx.)

| Action | Who |
|---|---|
| Read family resources | any member |
| Update family name/emoji | ADMIN, OWNER |
| Delete family | OWNER |
| Change another member’s role | OWNER |
| Remove member | self, or ADMIN/OWNER; cannot remove last OWNER |
| Invites create/list/revoke | ADMIN, OWNER |
| ICS token regenerate | ADMIN, OWNER |
| Create family | any authenticated user → OWNER |

## Migrations

```bash
pnpm --filter @family-life/api exec prisma migrate dev --name <name>
pnpm --filter @family-life/api exec prisma generate
```

Prisma CLI needs `apps/api/.env` (copy of root `.env`). Homebrew Postgres: `DATABASE_URL` user = macOS username, not `postgres`.
