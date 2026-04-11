import { test, expect } from '@playwright/test';

test.describe('About Page', () => {
  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveTitle(/About/i);
  });

  test('career timeline is visible', async ({ page }) => {
    await page.goto('/about');
    // CareerTimeline should render timeline items
    const timelineItems = page.locator('[class*="timeline"] [class*="item"]');
    await expect(timelineItems.first()).toBeVisible();
    // Should have multiple milestones
    const count = await timelineItems.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('image comparison slider is visible', async ({ page }) => {
    await page.goto('/about');
    // ImageCompareSlider should be present
    const slider = page.locator('[role="slider"]');
    await expect(slider).toBeVisible();
  });
});
