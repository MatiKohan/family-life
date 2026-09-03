# Shared types (`packages/types`)

Import from `@family-life/types`. Do not duplicate unions/interfaces in the API or web.

Barrel: `packages/types/src/index.ts`.

| File | Contents |
|---|---|
| `auth.types.ts` | `AuthUser` (includes `locale`), `JwtPayload` `{ sub, email }`, `TokenResponse` |
| `family.types.ts` | Family, member, invite, roles, notification settings, invite request DTOs |
| `page.types.ts` | `PageType`, `ListItem`, `TaskItem`, `Block`, apartments, `Page`, `CreatePageRequest` |
| `calendar.types.ts` | `RecurrenceRule`, RSVP/attendees, `FamilyDashboard` |
| `activity.types.ts` | `ActivityType`, `ActivityLog`, feed response |
| `common.types.ts` | `PaginatedResponse`, `ApiError` |

`pnpm dev` watches types (`tsc -w`). After changing types, API DTOs and web `src/types/*` (thin local mirrors if any) must stay aligned.

**PageType in code today:** `'list' | 'tasks' | 'events' | 'apartments'`. Prisma stores `type` as string — new page types need types + API + CreatePageModal + `PageViewPage` switch + i18n.

Web also has `src/types/{calendar,family,page,search}.ts` for UI-specific shapes; prefer extending the package when the contract is shared with the API.
