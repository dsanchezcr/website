import { test, expect } from '@playwright/test';

test.describe('Blog', () => {
  test('blog page loads and shows posts', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveTitle(/Blog/);
    // Should have at least one blog post link
    const posts = page.locator('article');
    await expect(posts.first()).toBeVisible();
  });

  test('blog post renders correctly', async ({ page }) => {
    await page.goto('/blog');
    // Click the first blog post
    const firstPostLink = page.locator('article a').first();
    await firstPostLink.click();
    // Should have a heading (h1 or h2) with the post title
    const heading = page.locator('header h1, header h2').first();
    await expect(heading).toBeVisible();
  });
});
