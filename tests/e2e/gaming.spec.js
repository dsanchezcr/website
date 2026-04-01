import { test, expect } from '@playwright/test';

test.describe('Gaming Section', () => {
  test('gaming page loads', async ({ page }) => {
    await page.goto('/gaming');
    await expect(page).toHaveTitle(/Gaming/i);
  });

  test('gaming page has platform links', async ({ page }) => {
    await page.goto('/gaming');
    // Should have links to platform subpages
    await expect(page.getByRole('link', { name: /Xbox/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /PlayStation/i })).toBeVisible();
  });
});
