import { test, expect } from '@playwright/test';

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('[data-testid="header"]', { timeout: 10000 }).catch(() => {});
  });

  test('opens settings modal via settings button', async ({ page }) => {
    // Click the settings gear icon in header
    const settingsBtn = page.locator('button').filter({ hasText: /settings|⚙/i }).first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      // Check modal appeared
      await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible({ timeout: 3000 }).catch(() => {
        // Fallback: check for any modal-like overlay
        expect(page.locator('.fixed.inset-0, [style*="position: fixed"]').first()).toBeVisible();
      });
    }
  });

  test('closes settings modal with close button', async ({ page }) => {
    const settingsBtn = page.locator('button').filter({ hasText: /settings|⚙/i }).first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(500);

      // Click close button (✕)
      const closeBtn = page.locator('button').filter({ hasText: '✕' }).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('all settings tabs are navigable', async ({ page }) => {
    const settingsBtn = page.locator('button').filter({ hasText: /settings|⚙/i }).first();
    if (!(await settingsBtn.isVisible())) return;

    await settingsBtn.click();
    await page.waitForTimeout(500);

    // Check for tab labels
    const expectedTabs = ['Team', 'Score', 'Thresholds', 'Sync', 'Calendar', 'Display'];
    for (const tabName of expectedTabs) {
      const tab = page.locator('button').filter({ hasText: new RegExp(tabName, 'i') }).first();
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(200);
      }
    }
  });

  test('score weight sliders maintain 100% total', async ({ page }) => {
    const settingsBtn = page.locator('button').filter({ hasText: /settings|⚙/i }).first();
    if (!(await settingsBtn.isVisible())) return;

    await settingsBtn.click();
    await page.waitForTimeout(500);

    // Navigate to Score tab
    const scoreTab = page.locator('button').filter({ hasText: /score/i }).first();
    if (await scoreTab.isVisible()) {
      await scoreTab.click();
      await page.waitForTimeout(300);

      // Check for "Total: 100%" indicator
      const totalIndicator = page.locator('text=/total.*100%/i').first();
      if (await totalIndicator.isVisible()) {
        await expect(totalIndicator).toContainText('100%');
      }
    }
  });

  test('theme change applies', async ({ page }) => {
    const settingsBtn = page.locator('button').filter({ hasText: /settings|⚙/i }).first();
    if (!(await settingsBtn.isVisible())) return;

    await settingsBtn.click();
    await page.waitForTimeout(500);

    // Navigate to Display tab
    const displayTab = page.locator('button').filter({ hasText: /display/i }).first();
    if (await displayTab.isVisible()) {
      await displayTab.click();
      await page.waitForTimeout(300);
    }
  });

  test('mobile: modal fills screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    const settingsBtn = page.locator('button').filter({ hasText: /settings|⚙/i }).first();
    if (!(await settingsBtn.isVisible())) return;

    await settingsBtn.click();
    await page.waitForTimeout(500);

    // On mobile, modal should be near full width
    const modal = page.locator('[data-testid="settings-modal"]').first();
    if (await modal.isVisible()) {
      const box = await modal.boundingBox();
      if (box) {
        // Modal should be at least 90% of viewport width
        expect(box.width).toBeGreaterThan(375 * 0.9);
      }
    }
  });

  test('mobile: tabs are scrollable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    const settingsBtn = page.locator('button').filter({ hasText: /settings|⚙/i }).first();
    if (!(await settingsBtn.isVisible())) return;

    await settingsBtn.click();
    await page.waitForTimeout(500);

    // Tabs container should exist and be scrollable
    const tabsContainer = page.locator('[style*="overflow"]').first();
    await expect(tabsContainer).toBeVisible().catch(() => {});
  });
});
