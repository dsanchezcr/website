import { test, expect } from '@playwright/test';

test.describe('Language Switching', () => {
  test('Spanish version loads', async ({ page }) => {
    await page.goto('/es/');
    // Page should have Spanish content
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('Portuguese version loads', async ({ page }) => {
    await page.goto('/pt/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  });
});
