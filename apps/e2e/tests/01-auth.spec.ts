/**
 * Journey: Registration and Login
 *
 * Covers:
 * - New user registers with email + password → lands on home page
 * - Returning user can log in via form
 * - Invalid credentials show an error
 * - Unauthenticated user redirected to /login
 */
import { test, expect } from '@playwright/test';

const PASSWORD = 'password123';

test.describe('Registration', () => {
  test('new user can register and lands on home page', async ({ page }) => {
    const email = `e2e-reg-${Date.now()}@test.local`;

    await page.goto('/login');
    await page.getByRole('button', { name: /register/i }).click();

    await page.getByPlaceholder('Your name').fill('E2E Tester');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••').fill(PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });
});

test.describe('Login', () => {
  test('registered user can log in via form', async ({ page }) => {
    const email = `e2e-login-${Date.now()}@test.local`;

    // Register via API first
    await page.request.post('/api/auth/register', {
      data: { email, password: PASSWORD, name: 'Login Tester' },
    });

    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••').fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/');
  });

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('nobody@test.local');
    await page.getByPlaceholder('••••••').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid|unauthorized|wrong|incorrect/i)).toBeVisible();
  });

  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });
});
