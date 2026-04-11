import { test, expect } from '@playwright/test';

test.describe('Projects Section', () => {
  test('projects page loads', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveTitle(/Projects/i);
  });

  test('projects page has project links', async ({ page }) => {
    await page.goto('/projects');
    const main = page.getByRole('main');
    await expect(main.getByRole('link', { name: /Secret Santa/i }).first()).toBeVisible();
    await expect(main.getByRole('link', { name: /Issue Importer/i }).first()).toBeVisible();
    await expect(main.getByRole('link', { name: /Colones Exchange Rate/i }).first()).toBeVisible();
  });

  test('projects page has previous roles section', async ({ page }) => {
    await page.goto('/projects');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: /Previous Roles/i })).toBeVisible();
  });

  test('individual project page loads', async ({ page }) => {
    await page.goto('/projects/secret-santa');
    await expect(page).toHaveTitle(/Secret Santa/i);
    await expect(page.locator('h1')).toContainText('Secret Santa');
  });

  test('projects sidebar navigation works', async ({ page }) => {
    await page.goto('/projects');
    // Docusaurus docs sidebar with project links
    const sidebar = page.locator('[class*="sidebar"]').filter({ hasText: 'Secret Santa' });
    await expect(sidebar.first()).toBeVisible();
  });
});
