import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and shows site title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/David Sanchez/);
  });

  test('has navigation links', async ({ page }) => {
    await page.goto('/');
    const navbar = page.getByLabel('Main', { exact: true });
    await expect(navbar.getByRole('link', { name: 'Blog' })).toBeVisible();
    await expect(navbar.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect(navbar.getByRole('link', { name: 'About' })).toBeVisible();
    await expect(navbar.getByRole('link', { name: 'Contact' })).toBeVisible();
    // Gaming is now inside the Interests dropdown
    const interestsDropdown = navbar.locator('.dropdown', { hasText: 'Interests' });
    await expect(interestsDropdown).toBeVisible();
  });

  test('has locale switcher', async ({ page }) => {
    await page.goto('/');
    // Docusaurus locale dropdown
    const localeDropdown = page.locator('.navbar__item.dropdown');
    await expect(localeDropdown.first()).toBeVisible();
  });

  test('hero section displays correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header.hero')).toBeVisible();
    await expect(page.locator('h1')).toContainText('David Sanchez');
  });

  test('feature cards are visible', async ({ page }) => {
    await page.goto('/');
    // Three feature cards: Blog, Projects, About
    const featureLinks = page.locator('section a[class*="featureCard"]');
    await expect(featureLinks).toHaveCount(3);
  });
});
