/**
 * Journey: Full user journey — Phase 6
 *
 * Covers (in a single sequential test sharing browser state):
 * 1. Register via API, then log in via UI
 * 2. Create a family
 * 3. Create a list page
 * 4. Add a list block, then add items (Milk, Bread)
 * 5. Check an item (Milk) and verify the line-through state
 * 6. Navigate to Calendar, create an event, verify it appears
 * 7. Navigate to Settings, open the invite modal, verify a link is generated
 */
import { test, expect } from '@playwright/test';

const PASSWORD = 'password123';

test.describe('Full user journey', () => {
  test('register → family → page → items → calendar → invite', async ({ page }) => {
    const email = `e2e-journey-${Date.now()}@test.local`;

    // -------------------------------------------------------------------------
    // 1. Register via API (faster than UI form)
    // -------------------------------------------------------------------------
    const registerResponse = await page.request.post('/api/auth/register', {
      data: { email, password: PASSWORD, name: 'E2E Journey User' },
    });
    expect(registerResponse.ok()).toBeTruthy();

    // -------------------------------------------------------------------------
    // 2. Login via UI
    // -------------------------------------------------------------------------
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••').fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/family/create', { timeout: 10000 });

    // -------------------------------------------------------------------------
    // 3. Create family
    // -------------------------------------------------------------------------
    await page.getByPlaceholder('The Smiths').fill('E2E Family');
    await page.getByRole('button', { name: /create family/i }).click();

    await expect(page).toHaveURL(/\/family\/[^/]+$/, { timeout: 10000 });

    // -------------------------------------------------------------------------
    // 4. Create a list page
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: '+ New Page', exact: true }).click();

    // Modal heading is t('pages.createTitle') = "New page"
    await expect(page.getByRole('heading', { name: /new page/i })).toBeVisible({ timeout: 5000 });
    await page.locator('#page-title').fill('Groceries');

    // Submit — create button text is t('common.create') = "Create"
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page).toHaveURL(/\/family\/[^/]+\/pages\/[^/]+$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Groceries' })).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 5. Add a list block (canvas page starts empty)
    // -------------------------------------------------------------------------
    // Click the "+ List ▾" button to open the block type picker
    await page.getByRole('button', { name: /\+ list/i }).click();
    // Select "Simple list" from the dropdown
    await page.getByRole('button', { name: /simple list/i }).click();

    // The list block appears — wait for the add-item input
    const addItemInput = page.getByLabel('New item text').first();
    await expect(addItemInput).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 6. Add list items
    // -------------------------------------------------------------------------
    await addItemInput.fill('Milk');
    await addItemInput.press('Enter');
    await expect(page.getByText('Milk')).toBeVisible({ timeout: 10000 });

    await addItemInput.fill('Bread');
    await addItemInput.press('Enter');
    await expect(page.getByText('Bread')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // 7. Check the "Milk" item — verify line-through
    // -------------------------------------------------------------------------
    // Milk was added first so its checkbox is first on the page
    await page.getByRole('checkbox').first().click();

    const milkText = page.getByText('Milk', { exact: true });
    await expect(milkText).toHaveClass(/line-through/, { timeout: 10000 });

    // -------------------------------------------------------------------------
    // 8. Navigate to Calendar and create an event
    // -------------------------------------------------------------------------
    await page.getByRole('link', { name: /calendar/i }).click();
    await expect(page).toHaveURL(/\/family\/[^/]+\/calendar$/, { timeout: 10000 });

    await page.getByRole('button', { name: /new event/i }).click();

    await expect(page.getByLabel(/event title/i)).toBeVisible({ timeout: 5000 });
    await page.getByLabel(/event title/i).fill('E2E Birthday');

    await page.getByRole('button', { name: /^save$/i }).click();

    await expect(page.getByText('E2E Birthday')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // 9. Generate an invite link via family settings
    // -------------------------------------------------------------------------
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/family\/[^/]+\/settings$/, { timeout: 10000 });

    await page.getByRole('button', { name: /invite member/i }).click();

    const inviteInput = page.locator('input[readonly]');
    await expect(inviteInput).toBeVisible({ timeout: 10000 });

    const inviteUrl = await inviteInput.inputValue();
    expect(inviteUrl).toMatch(/\/join\//);
  });
});
