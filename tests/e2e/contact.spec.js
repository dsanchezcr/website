import { test, expect } from '@playwright/test';

test.describe('Contact Page', () => {
  test('contact form renders', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
  });
});
