# Testing and CI

Before considering work done or pushing: **`pnpm test:ci`**.

## Commands

```bash
pnpm test                 # unit tests (turbo)
pnpm test:ci             # coverage; required before push
pnpm test:e2e            # Playwright (@family-life/e2e)
pnpm lint

pnpm --filter @family-life/api exec jest src/modules/family/family.service.spec.ts
pnpm --filter @family-life/web exec vitest run src/components/Sidebar/Sidebar.test.tsx
```

## API (Jest)

- Co-located `*.spec.ts`
- `@nestjs/testing` + mock `PrismaService` as nested `jest.fn()` per model
- Mock sibling services (Notifications, Activity, Realtime, FamilyService)
- `apps/api/test/setup.ts` does **not** boot a real DB (`DATABASE_URL_TEST` is unused by Jest)

## Web (Vitest + MSW)

- `vitest` + jsdom, `src/test/setup.ts` (jest-dom + partial i18n)
- MSW: `src/mocks/handlers.ts`, `server.ts` for tests; `browser.ts` exists but is **not** started from `main.tsx`
- Pattern: `server.listen` / `resetHandlers` / `close`; `QueryClient` `retry: false`; seed `useAuthStore.setSession`
- Colocate `*.test.tsx` with components/hooks

## E2E (Playwright)

- `apps/e2e/tests/01-auth.spec.ts`, `02-user-journey.spec.ts`
- Chromium, `workers: 1`, baseURL `localhost:5173`, config starts API + web
- **Not** run in GitHub `ci.yml`

## CI

`.github/workflows/ci.yml`: all branches + PRs to `main`. Postgres 16 + Redis services. `pnpm lint` → prisma generate/migrate → `pnpm test:ci`. No Playwright.

`deploy.yml` on `main`: Docker build API + web (`push: false`).
