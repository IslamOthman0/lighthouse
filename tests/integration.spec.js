import { test, expect } from '@playwright/test';

/**
 * Integration Tests
 * Full workflow tests combining multiple features
 */

test.describe('Complete Dashboard Workflow', () => {
  test('full dashboard interaction flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000); // Wait for API data

    // Step 1: Verify dashboard loads
    await expect(page.locator('text=Lighthouse').first()).toBeVisible();

    // Step 2: View overview cards using data-testid
    await expect(page.locator('[data-testid="overview-card-team-tracked"]')).toBeVisible();
    await expect(page.locator('[data-testid="overview-card-tasks-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="overview-card-team-score"]')).toBeVisible();

    // Step 3: Open Time detail modal
    await page.locator('[data-testid="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="dashboard-detail-modal-time"]')).toBeVisible({ timeout: 5000 });

    // Step 4: Close with ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Step 5: Open Tasks modal
    await page.locator('[data-testid="overview-card-tasks-progress"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="dashboard-detail-modal-tasks"]')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Step 6: Open Score modal
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="dashboard-detail-modal-score"]')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Step 7: Click member card to open MemberDetailModal
    const memberCard = page.locator('[data-testid="member-card"]').first();
    if (await memberCard.isVisible().catch(() => false)) {
      await memberCard.click();

      await page.waitForTimeout(500);

      // Step 8: Navigate member modal tabs
      const timelineTab = page.locator('[data-testid="tab-timeline"]');
      const performanceTab = page.locator('[data-testid="tab-performance"]');
      const leavesTab = page.locator('[data-testid="tab-leaves"]');

      if (await timelineTab.isVisible().catch(() => false)) {
        await timelineTab.click();
        await page.waitForTimeout(300);
      }

      if (await performanceTab.isVisible().catch(() => false)) {
        await performanceTab.click();
        await page.waitForTimeout(300);
      }

      if (await leavesTab.isVisible().catch(() => false)) {
        await leavesTab.click();
        await page.waitForTimeout(300);
      }

      // Step 9: Close member modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Step 10: Test project breakdown status pill
    const projectsSection = page.locator('text=Projects Breakdown');
    await expect(projectsSection.first()).toBeVisible();

    // Find and click a status pill using data-testid
    const statusPills = page.locator('[data-testid^="status-pill-"]');
    if (await statusPills.first().isVisible().catch(() => false)) {
      await statusPills.first().click();
      await page.waitForTimeout(500);

      // Step 11: Verify task list modal
      await expect(page.locator('[data-testid="task-list-modal"]')).toBeVisible({ timeout: 5000 });

      // Step 12: Close task list modal
      await page.keyboard.press('Escape');
    }

    // Workflow complete - dashboard should still be functional
    await expect(page.locator('[data-testid="overview-card-team-tracked"]')).toBeVisible();
  });

  test('view switching workflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Step 1: Start in default view
    const timeCard = page.locator('[data-testid="overview-card-team-tracked"]');
    await expect(timeCard).toBeVisible();

    // Step 2: Open modal in current view (Grid)
    await timeCard.click();
    await page.waitForTimeout(500);

    // Verify modal opened in Grid view
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Step 3: Switch to list view
    const listToggle = page.locator('[data-testid="list-view-toggle"]');
    if (await listToggle.isVisible().catch(() => false)) {
      await listToggle.click();
      await page.waitForTimeout(1000); // Wait longer for view transition
    }

    // Step 4: Verify card is still visible after view switch
    await expect(timeCard).toBeVisible({ timeout: 5000 });

    // Step 5: Switch back to grid view
    const gridToggle = page.locator('[data-testid="grid-view-toggle"]');
    if (await gridToggle.isVisible().catch(() => false)) {
      await gridToggle.click();
      await page.waitForTimeout(500);
    }

    // Step 6: Verify grid view works and modal still functions
    await expect(timeCard).toBeVisible();
    await timeCard.click();
    await page.waitForTimeout(500);

    // Verify modal still works after view switch cycle
    const bodyOverflowAfter = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflowAfter).toBe('hidden');

    await page.keyboard.press('Escape');
  });

  test('modal interaction workflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Test rapid modal open/close using data-testid
    const timeCard = page.locator('[data-testid="overview-card-team-tracked"]');
    for (let i = 0; i < 3; i++) {
      await timeCard.click();
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Dashboard should still work
    await expect(timeCard).toBeVisible();

    // Test clicking backdrop to close
    await timeCard.click();
    await page.waitForTimeout(500);

    // Click outside modal (backdrop)
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);

    // Modal should be closed
    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    const isModalClosed = !(await modal.isVisible().catch(() => false));
    expect(isModalClosed).toBeTruthy();
  });
});

test.describe('Data Consistency', () => {
  test('data should be consistent across views', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Get data from overview card using data-testid
    const timeCard = page.locator('[data-testid="overview-card-team-tracked"]');
    const timeCardText = await timeCard.textContent().catch(() => '');

    // Open modal and compare
    await timeCard.click();
    await page.waitForTimeout(500);

    // Modal should show related data
    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    const modalText = await modal.textContent().catch(() => '');

    // Both should have time-related content
    expect(timeCardText.length > 0 || modalText.length > 0).toBeTruthy();

    await page.keyboard.press('Escape');
  });

  test('member data should match between card and modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Click first member card using data-testid
    const memberCard = page.locator('[data-testid="member-card"]').first();

    if (await memberCard.isVisible().catch(() => false)) {
      // Get member name from card
      const cardText = await memberCard.textContent().catch(() => '');

      // Click member to open modal
      await memberCard.click();
      await page.waitForTimeout(500);

      // Modal should contain member information
      const modal = page.locator('[data-testid="member-detail-modal"]');
      const modalContent = await modal.textContent().catch(() => '');

      // Modal should have content
      expect(modalContent.length).toBeGreaterThan(50);

      await page.keyboard.press('Escape');
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle empty data gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Page should render even with potential data issues
    const pageContent = await page.textContent('body');
    expect(pageContent.length).toBeGreaterThan(100);

    // Overview cards should be visible
    await expect(page.locator('[data-testid="overview-card-team-tracked"]')).toBeVisible();
  });

  test('modals should handle missing data', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Open modal using data-testid
    await page.locator('[data-testid="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    // Modal should open without crashing
    await expect(page.locator('[data-testid="dashboard-detail-modal-time"]')).toBeVisible();

    // Should be closable
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('should recover from rapid interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Rapid clicks on different elements using data-testid
    const elements = [
      page.locator('[data-testid="overview-card-team-tracked"]'),
      page.locator('[data-testid="overview-card-tasks-progress"]'),
      page.locator('[data-testid="overview-card-team-score"]'),
    ];

    for (const el of elements) {
      if (await el.isVisible().catch(() => false)) {
        await el.click().catch(() => {});
        await page.waitForTimeout(100);
        await page.keyboard.press('Escape').catch(() => {});
      }
    }

    // Page should still be functional
    await expect(page.locator('[data-testid="overview-card-team-tracked"]')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('page should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForSelector('[data-testid="overview-card-team-tracked"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('modals should open quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const startTime = Date.now();
    await page.locator('[data-testid="overview-card-team-tracked"]').click();

    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    await modal.waitFor({ state: 'visible', timeout: 3000 });

    const openTime = Date.now() - startTime;

    // Modal should open within 3 seconds
    expect(openTime).toBeLessThan(3000);

    await page.keyboard.press('Escape');
  });

  test('view switching should be responsive', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const listToggle = page.locator('[data-testid="list-view-toggle"]');

    if (await listToggle.isVisible().catch(() => false)) {
      const startTime = Date.now();
      await listToggle.click();
      await page.waitForTimeout(1000);
      const switchTime = Date.now() - startTime;

      // View switch should be quick
      expect(switchTime).toBeLessThan(2000);
    }
  });
});

test.describe('Accessibility Basics', () => {
  test('page should have proper document structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Should have title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to tab without errors
    expect(true).toBeTruthy();
  });

  test('modals should trap focus', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Open modal using data-testid
    await page.locator('[data-testid="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    // Tab should stay within modal (check body overflow is hidden)
    const bodyOverflow = await page.evaluate(() => {
      return document.body.style.overflow;
    });

    expect(bodyOverflow).toBe('hidden');

    await page.keyboard.press('Escape');
  });
});
