import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and shows site title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/David Sanchez/);
  });

  test('has navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Blog' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Gaming' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact' })).toBeVisible();
  });

  test('has locale switcher', async ({ page }) => {
    await page.goto('/');
    // Docusaurus locale dropdown
    const localeDropdown = page.locator('.navbar__item.dropdown');
    await expect(localeDropdown).toBeVisible();
  });
});
