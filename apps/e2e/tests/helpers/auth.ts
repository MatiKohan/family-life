import { Page } from '@playwright/test';

/**
 * Mocks all auth-related endpoints and seeds the Zustand `auth-storage` key in
 * localStorage so the ProtectedRoute considers the user logged in.
 *
 * The API client will hit /api/auth/refresh on the first request (no accessToken
 * persisted in localStorage), so we mock that too.
 *
 * Call this helper *before* page.goto() — it registers route intercepts and an
 * addInitScript that fires on every navigation within the same browser context.
 */
export async function mockAuth(page: Page): Promise<void> {
  const mockUser = {
    id: 'test-user-1',
    email: 'test@test.com',
    name: 'Test User',
    picture: null,
  };

  // Mock /api/auth/me — used by some components to re-hydrate the session
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    }),
  );

  // Mock /api/auth/refresh — the api-client calls this when accessToken is missing
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'mock-access-token' }),
    }),
  );

  // Seed Zustand persisted state so ProtectedRoute sees a user immediately
  // (auth-storage is the `name` passed to Zustand's persist middleware)
  await page.addInitScript((user: object) => {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({ state: { user }, version: 0 }),
    );
  }, mockUser);
}
