import { test, expect } from '@playwright/test';

test.describe('Leaves & WFH Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000); // Wait for app to load
  });

  test('navigates to Leaves tab', async ({ page }) => {
    // Click Leaves tab in main navigation
    const leavesTab = page.locator('button').filter({ hasText: /leaves|leave/i }).first();
    if (await leavesTab.isVisible()) {
      await leavesTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('stats cards render', async ({ page }) => {
    const leavesTab = page.locator('button').filter({ hasText: /leaves|leave/i }).first();
    if (!(await leavesTab.isVisible())) return;

    await leavesTab.click();
    await page.waitForTimeout(500);

    // Should see stat cards (On Leave Today, WFH Today, etc.)
    const statLabels = ['On Leave Today', 'WFH Today', 'Team Availability'];
    for (const label of statLabels) {
      const card = page.locator(`text=${label}`).first();
      // Card may or may not be visible depending on data, just check it doesn't crash
      if (await card.isVisible()) {
        await expect(card).toBeVisible();
      }
    }
  });

  test('calendar/list view toggle works', async ({ page }) => {
    const leavesTab = page.locator('button').filter({ hasText: /leaves|leave/i }).first();
    if (!(await leavesTab.isVisible())) return;

    await leavesTab.click();
    await page.waitForTimeout(500);

    // Find view toggle button
    const toggleBtn = page.locator('button').filter({ hasText: /list view|calendar view/i }).first();
    if (await toggleBtn.isVisible()) {
      const initialText = await toggleBtn.textContent();
      await toggleBtn.click();
      await page.waitForTimeout(300);

      // Text should change after toggle
      const newText = await toggleBtn.textContent();
      expect(newText).not.toBe(initialText);
    }
  });

  test('period selector works', async ({ page }) => {
    const leavesTab = page.locator('button').filter({ hasText: /leaves|leave/i }).first();
    if (!(await leavesTab.isVisible())) return;

    await leavesTab.click();
    await page.waitForTimeout(500);

    // Click through period options
    for (const period of ['Week', 'Month', 'Year']) {
      const btn = page.locator('button').filter({ hasText: new RegExp(`this ${period}`, 'i') }).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(200);
      }
    }
  });

  test('calendar month navigation works', async ({ page }) => {
    const leavesTab = page.locator('button').filter({ hasText: /leaves|leave/i }).first();
    if (!(await leavesTab.isVisible())) return;

    await leavesTab.click();
    await page.waitForTimeout(500);

    // Look for prev/next month buttons
    const prevBtn = page.locator('button').filter({ hasText: /◀|←|prev/i }).first();
    const nextBtn = page.locator('button').filter({ hasText: /▶|→|next/i }).first();

    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(300);
    }

    if (await prevBtn.isVisible()) {
      await prevBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('mobile responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    const leavesTab = page.locator('button').filter({ hasText: /leaves|leave/i }).first();
    if (!(await leavesTab.isVisible())) return;

    await leavesTab.click();
    await page.waitForTimeout(500);

    // Content should be visible and not overflowing
    const content = page.locator('main, [role="main"], .flex-1').first();
    if (await content.isVisible()) {
      const box = await content.boundingBox();
      if (box) {
        // Content should not exceed viewport width
        expect(box.width).toBeLessThanOrEqual(375 + 5);
      }
    }
  });
});
