# Known gaps and doc drift

Use this when prioritizing improvements. Verify in code before treating as still true.

## Docs vs code

- **Meal planner:** `README.md` and `PLAN.md` Phase 10 mark it complete (`meal-planner` page type, `MealPlannerPageView`, shopping-list endpoint). **No `meal-planner` / `MealPlan` symbols in TS.** `PageType` has no meal type.
- **`PLAN.md`** is a dated checklist (header ~2026-04-03). Treat as history, not inventory.
- **Claude agent** `.claude/agents/backend.md` module table is stale (only auth/users/health listed as current).
- **`CLAUDE.md`:** says both Zustand stores persist `accessToken`; actually **token is not persisted** (`partialize` user only). Redis mentioned in local setup; API does not use it.

## Architecture limits

- **SSE is in-process.** Horizontal scale of the API will drop cross-instance live updates unless realtime is moved (e.g. Redis pub/sub).
- **`requireMember` duplicated** across modules instead of always using `FamilyService`.
- **No Nest role guards** — missing a `requireMember` call is a security bug.
- Throttling is **auth-only**.

## Frontend inconsistencies

- (none currently tracked)

Fixed: SSE calendar invalidation uses `queryKeys.calendar.all`. Canvas list items log activity and send assignment push. Calendar event assignment notifies the assignee. Mobile `BottomNav` includes Activity. PWA/theme/logo use brand blue (`#2563eb` / `#3b82f6`). Unused `HomePage` and unused `ListPageView` removed (lists still use `CanvasPageView`). Family home shows today, assigned preview, leftover list items. Activity rows open the related page or calendar event. RSVP lives on calendar event details. Calendar grid uses local start day; `+N more` opens a day sheet; ICS includes RRULE; recurring event reminders use `reminderSentDates`.

## Tests / product

- Jest does not use a real Postgres; Prisma regressions can slip through until e2e or manual.
- CI does not run Playwright.
- MSW gaps: families list/get, login/register, invites, SSE, some page PATCH/delete.

## Product still described but unverified here

Confirm in UI before promising: offline mutation queue, meal planner, any PLAN items after the last implemented phase in git.
