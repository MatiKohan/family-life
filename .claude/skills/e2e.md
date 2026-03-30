---
description: Run, write, and debug Playwright E2E browser tests for the my-app project
---

You are helping with Playwright end-to-end browser tests for the my-app monorepo.

## Project context

- Monorepo root: `my-app/`
- E2E tests live in `apps/e2e/tests/`
- Playwright config: `apps/e2e/playwright.config.ts`
- App runs on `http://localhost:5173` (web) and `http://localhost:3000` (API)
- Package manager: `pnpm`

## Key commands

```bash
# Install Playwright browsers (first time)
pnpm --filter @my-app/e2e exec playwright install

# Run all E2E tests (headless)
pnpm test:e2e

# Run a specific test file
pnpm --filter @my-app/e2e exec playwright test tests/01-auth.spec.ts

# Run with headed browser (visible)
pnpm --filter @my-app/e2e exec playwright test --headed

# Debug a specific test interactively
pnpm --filter @my-app/e2e exec playwright test --debug tests/01-auth.spec.ts

# Show HTML report after a run
pnpm --filter @my-app/e2e report

# Generate test code by recording browser actions
pnpm --filter @my-app/e2e exec playwright codegen http://localhost:5173
```

## Test structure conventions

- Test files: `apps/e2e/tests/*.spec.ts`
- Use `@playwright/test` imports only
- Group by feature: `01-auth.spec.ts`, `02-feature.spec.ts`, etc.
- Use `page.getByRole`, `page.getByLabel`, `page.getByText` (prefer accessible queries)
- Auth helper: `tests/helpers/auth.ts` — use `mockAuth(page)` to skip login in non-auth tests

## Typical E2E test shape

```ts
import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';

test.describe('Feature name', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await page.goto('/');
  });

  test('does something useful', async ({ page }) => {
    await page.getByRole('button', { name: 'Do thing' }).click();
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

## When the user invokes this skill

1. **Check if Playwright is installed** — look for `apps/e2e/playwright.config.ts`. If missing, offer to set it up.
2. **Understand the goal** — running tests, writing a new test, or debugging a failure.
3. **For running**: execute the appropriate command and report results clearly.
4. **For writing**: create the file in `apps/e2e/tests/`, follow the conventions above, and offer to run it immediately.
5. **For debugging**: use `--debug` or `report`, read the trace, and explain what failed and why.
6. **Always check that the dev server is running** before executing tests — remind the user to run `pnpm dev` if needed (the Playwright config will auto-start both servers).
