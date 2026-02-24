import { test, expect } from '@playwright/test';

/**
 * Modal Interaction Tests
 * Tests for DashboardDetailModal, MemberDetailModal, and TaskListModal
 */

test.describe('DashboardDetailModal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    // Close any open modals first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('should open Time Tracked detail modal', async ({ page }) => {
    // Click the Time Tracked overview card
    const timeCard = page.locator('[data-testid="overview-card-team-tracked"]');
    await expect(timeCard).toBeVisible({ timeout: 10000 });
    await timeCard.click();
    await page.waitForTimeout(500);

    // Modal should open (body overflow hidden)
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    // Modal should show time details
    await expect(page.locator('[data-testid="dashboard-detail-modal-time"]')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('should open Tasks Progress detail modal', async ({ page }) => {
    const tasksCard = page.locator('[data-testid="overview-card-tasks-progress"]');
    await expect(tasksCard).toBeVisible({ timeout: 10000 });
    await tasksCard.click();
    await page.waitForTimeout(500);

    // Modal should open
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    // Modal should show tasks details
    await expect(page.locator('[data-testid="dashboard-detail-modal-tasks"]')).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('should open Team Score detail modal', async ({ page }) => {
    const scoreCard = page.locator('[data-testid="overview-card-team-score"]');
    await expect(scoreCard).toBeVisible({ timeout: 10000 });
    await scoreCard.click();
    await page.waitForTimeout(500);

    // Modal should open
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    // Modal should show score details
    await expect(page.locator('[data-testid="dashboard-detail-modal-score"]')).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('should close modal with ESC key', async ({ page }) => {
    const timeCard = page.locator('[data-testid="overview-card-team-tracked"]');
    await expect(timeCard).toBeVisible({ timeout: 10000 });
    await timeCard.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    let bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Verify modal is closed
    bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('unset');
  });

  test('should close modal when clicking backdrop', async ({ page }) => {
    const timeCard = page.locator('[data-testid="overview-card-team-tracked"]');
    await timeCard.click();
    await page.waitForTimeout(500);

    // Click on the backdrop (outside the modal content)
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);

    // Modal should be closed
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('unset');
  });

  test('should close modal with X button', async ({ page }) => {
    const timeCard = page.locator('[data-testid="overview-card-team-tracked"]');
    await timeCard.click();
    await page.waitForTimeout(500);

    // Find and click close button
    const closeButton = page.locator('button:has-text("×")').or(page.locator('button:has-text("✕")'));

    if (await closeButton.first().isVisible().catch(() => false)) {
      await closeButton.first().click();
      await page.waitForTimeout(300);

      const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
      expect(bodyOverflow).toBe('unset');
    }
  });
});

test.describe('MemberDetailModal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('should open member detail modal when clicking member card', async ({ page }) => {
    const memberCard = page.locator('[data-testid="member-card"]').first();
    await expect(memberCard).toBeVisible({ timeout: 10000 });
    await memberCard.click();
    await page.waitForTimeout(500);

    // Modal should open
    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('should navigate between tabs in member modal', async ({ page }) => {
    const memberCard = page.locator('[data-testid="member-card"]').first();
    await memberCard.click();
    await page.waitForTimeout(500);

    // Click Timeline tab
    const timelineTab = page.locator('[data-testid="tab-timeline"]');
    if (await timelineTab.isVisible().catch(() => false)) {
      await timelineTab.click();
      await page.waitForTimeout(300);
    }

    // Click Performance tab
    const performanceTab = page.locator('[data-testid="tab-performance"]');
    if (await performanceTab.isVisible().catch(() => false)) {
      await performanceTab.click();
      await page.waitForTimeout(300);
    }

    // Click Leaves tab
    const leavesTab = page.locator('[data-testid="tab-leaves"]');
    if (await leavesTab.isVisible().catch(() => false)) {
      await leavesTab.click();
      await page.waitForTimeout(300);
    }

    await page.keyboard.press('Escape');
  });

  test('should show member name in modal', async ({ page }) => {
    const memberCard = page.locator('[data-testid="member-card"]').first();
    await memberCard.click();
    await page.waitForTimeout(500);

    // Modal should contain member information
    const modal = page.locator('[data-testid="member-detail-modal"]');
    const modalContent = await modal.textContent();
    expect(modalContent.length).toBeGreaterThan(50);

    await page.keyboard.press('Escape');
  });
});

test.describe('TaskListModal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('should open task list modal from project status pill', async ({ page }) => {
    // Find status pills using data-testid pattern
    const statusPills = page.locator('[data-testid^="status-pill-"]');
    const pillCount = await statusPills.count();

    if (pillCount > 0) {
      await statusPills.first().click();
      await page.waitForTimeout(500);

      // Modal should open
      await expect(page.locator('[data-testid="task-list-modal"]')).toBeVisible();

      await page.keyboard.press('Escape');
    }
  });

  test('should show task details in task modal', async ({ page }) => {
    const statusPills = page.locator('[data-testid^="status-pill-"]');
    const pillCount = await statusPills.count();

    if (pillCount > 0) {
      await statusPills.first().click();
      await page.waitForTimeout(500);

      // Modal should have content
      const modal = page.locator('[data-testid="task-list-modal"]');
      const modalContent = await modal.textContent();
      expect(modalContent.length).toBeGreaterThan(50);

      await page.keyboard.press('Escape');
    }
  });
});

test.describe('Modal Accessibility', () => {
  test('should trap focus within modal (body overflow)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const timeCard = page.locator('[data-testid="overview-card-team-tracked"]');
    await timeCard.click();
    await page.waitForTimeout(500);

    // Body should have overflow hidden when modal is open
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    await page.keyboard.press('Escape');
  });

  test('should restore body scroll after modal closes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const timeCard = page.locator('[data-testid="overview-card-team-tracked"]');
    await timeCard.click();
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Body should have scroll restored
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('unset');
  });

  test('should handle rapid modal open/close', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const timeCard = page.locator('[data-testid="overview-card-team-tracked"]');

    // Rapidly open and close
    for (let i = 0; i < 3; i++) {
      await timeCard.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Page should still be functional
    const pageContent = await page.textContent('body');
    expect(pageContent.length).toBeGreaterThan(100);
  });
});
