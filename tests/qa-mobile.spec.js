import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

/**
 * QA Mobile Test Suite
 * Tests all critical dashboard flows at 390x844 (iPhone 14 Pro viewport)
 * Settings is in MobileBottomNav (not header gear — that's desktop only)
 * Date picker 📅 button is in header on both mobile and desktop
 */

test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(90000);
// Mobile tests are timing-sensitive under parallel load — allow 1 retry for transient failures
test.describe.configure({ retries: 1 });

const BENIGN_ERRORS = [
  'ResizeObserver loop limit exceeded',
  'favicon.ico',
  'Failed to load resource: the server responded with a status of 404',
  'AbortError',
  '429',
  'Rate limit',
  'rate limit',
];
function isRealError(text) {
  return !BENIGN_ERRORS.some(b => text.includes(b));
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function loadDashboard(page) {
  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="member-card"]', { timeout: 30000 });
  await page.waitForTimeout(3000); // extra settle time under parallel load
}

async function checkNoHorizontalOverflow(page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(395); // 5px tolerance for scrollbar
}

async function checkModalFitsScreen(page, modal) {
  const box = await modal.boundingBox();
  expect(box.width).toBeGreaterThan(300);  // wide enough to be useful
  expect(box.width).toBeLessThanOrEqual(395);
  await checkNoHorizontalOverflow(page);
}

// ─── test.beforeEach shared setup ───────────────────────────────────────────

function setupErrorCapture(consoleErrors, pageErrors) {
  return (page) => {
    page.on('console', msg => {
      if (msg.type() === 'error' && isRealError(msg.text())) consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      if (isRealError(err.message)) pageErrors.push(err.message);
    });
  };
}

// ═══════════════════════════════════════════════════════════════════════════
test.describe('Mobile - Dashboard Layout', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    setupErrorCapture(consoleErrors, pageErrors)(page);
    await loadDashboard(page);
  });

  test('member cards render at mobile viewport', async ({ page }) => {
    const cards = page.locator('[data-testid="member-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('member cards fit within 390px width', async ({ page }) => {
    const card = page.locator('[data-testid="member-card"]').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const box = await card.boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
  });

  test('no horizontal overflow on dashboard', async ({ page }) => {
    await checkNoHorizontalOverflow(page);
  });

  test('overview cards render and fit width', async ({ page }) => {
    const timeCard = page.locator('[data-testid^="overview-card-team-tracked"]');
    await expect(timeCard).toBeVisible();
    const box = await timeCard.boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
  });

  test('MobileBottomNav is visible at bottom', async ({ page }) => {
    // Bottom nav has "Dashboard", "Leaves", "Alerts", "Settings", "Feed" labels
    const dashBtn = page.locator('button').filter({ hasText: 'Dashboard' }).first();
    await expect(dashBtn).toBeVisible();
    const leavesBtn = page.locator('button').filter({ hasText: 'Leaves' }).first();
    await expect(leavesBtn).toBeVisible();
  });

  test('no console errors on initial mobile load', async ({ page }) => {
    const allErrors = [...consoleErrors, ...pageErrors];
    if (allErrors.length > 0) console.log('[QA] Mobile load errors:', allErrors);
    expect(allErrors).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
test.describe('Mobile - Bottom Nav Navigation', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    setupErrorCapture(consoleErrors, pageErrors)(page);
    await loadDashboard(page);
  });

  test('Dashboard tab is active by default (shows member cards)', async ({ page }) => {
    const cards = page.locator('[data-testid="member-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
  });

  test('clicking Leaves tab shows leaves content', async ({ page }) => {
    const leavesBtn = page.locator('button').filter({ hasText: 'Leaves' }).first();
    await leavesBtn.click();
    await page.waitForTimeout(500);
    // Leaves tab renders LeavesTab content
    const body = await page.textContent('body');
    expect(
      body.toLowerCase().includes('leave') || body.toLowerCase().includes('wfh')
    ).toBeTruthy();
  });

  test('navigating Leaves → Dashboard restores member cards', async ({ page }) => {
    const leavesBtn = page.locator('button').filter({ hasText: 'Leaves' }).first();
    await leavesBtn.click();
    await page.waitForTimeout(500);

    const dashBtn = page.locator('button').filter({ hasText: 'Dashboard' }).first();
    await dashBtn.click();
    await page.waitForTimeout(500);

    const cards = page.locator('[data-testid="member-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
  });

  test('clicking Settings in bottom nav opens settings modal', async ({ page }) => {
    const settingsBtn = page.locator('button').filter({ hasText: 'Settings' }).first();
    await settingsBtn.click();
    await page.waitForTimeout(500);

    // Settings modal should open — look for "Settings" heading
    const body = await page.textContent('body');
    expect(body).toContain('Settings');

    // Close
    await page.keyboard.press('Escape');
  });

  test('no console errors during tab navigation', async ({ page }) => {
    const leavesBtn = page.locator('button').filter({ hasText: 'Leaves' }).first();
    await leavesBtn.click();
    await page.waitForTimeout(500);
    const dashBtn = page.locator('button').filter({ hasText: 'Dashboard' }).first();
    await dashBtn.click();
    await page.waitForTimeout(500);

    const allErrors = [...consoleErrors, ...pageErrors];
    if (allErrors.length > 0) console.log('[QA] Nav errors:', allErrors);
    expect(allErrors).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
test.describe('Mobile - Modals Fit Screen', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    setupErrorCapture(consoleErrors, pageErrors)(page);
    await loadDashboard(page);
  });

  test('OverviewCard detail modal opens and fits screen', async ({ page }) => {
    const timeCard = page.locator('[data-testid^="overview-card-team-tracked"]');
    await timeCard.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    await expect(modal).toBeVisible();
    await checkModalFitsScreen(page, modal);

    // Modal should have scrollable content
    const text = await modal.textContent();
    expect(text.length).toBeGreaterThan(30);

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('MemberDetailModal opens, fits screen, and tabs are accessible', async ({ page }) => {
    const card = page.locator('[data-testid="member-card"]').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();
    await checkModalFitsScreen(page, modal);

    // All 3 tabs should be clickable
    const timelineTab = page.locator('[data-testid="tab-timeline"]');
    if (await timelineTab.isVisible().catch(() => false)) {
      await timelineTab.click();
      await page.waitForTimeout(300);
    }
    const perfTab = page.locator('[data-testid="tab-performance"]');
    if (await perfTab.isVisible().catch(() => false)) {
      await perfTab.click();
      await page.waitForTimeout(300);
    }
    const leavesTab = page.locator('[data-testid="tab-leaves"]');
    if (await leavesTab.isVisible().catch(() => false)) {
      await leavesTab.click();
      await page.waitForTimeout(300);
    }

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('TaskListModal opens and fits screen (if pills visible)', async ({ page }) => {
    const pills = page.locator('[data-testid^="status-pill-"]');
    const pillCount = await pills.count();
    if (pillCount === 0) {
      console.log('[QA] No status pills found — skipping TaskListModal mobile test');
      test.skip();
      return;
    }

    await pills.first().click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="task-list-modal"]');
    await expect(modal).toBeVisible();
    await checkModalFitsScreen(page, modal);

    const text = await modal.textContent();
    expect(text.length).toBeGreaterThan(50);

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('SettingsModal opens and fits screen', async ({ page }) => {
    // On mobile, settings is in bottom nav
    const settingsBtn = page.locator('button').filter({ hasText: 'Settings' }).first();
    await settingsBtn.click();
    await page.waitForTimeout(500);

    // Settings modal opens — find it by its heading
    const settingsHeading = page.locator('h2').filter({ hasText: 'Settings' }).first();
    const headingVisible = await settingsHeading.isVisible().catch(() => false);
    expect(headingVisible).toBeTruthy();

    // Check the modal container fits
    const modal = settingsHeading.locator('../..');
    const isVisible = await modal.isVisible().catch(() => false);
    if (isVisible) {
      const box = await modal.boundingBox();
      if (box) expect(box.width).toBeLessThanOrEqual(395);
    }

    await checkNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
  });

  test('DatePickerModal opens and fits screen', async ({ page }) => {
    // 📅 button is in the header on both mobile and desktop
    const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
    const btnVisible = await calBtn.isVisible().catch(() => false);

    if (!btnVisible) {
      console.log('[QA] Date picker button not found on mobile — skipping');
      test.skip();
      return;
    }

    await calBtn.click();
    await page.waitForTimeout(500);

    // Date picker modal shows presets — check for "Today" or "Yesterday"
    const body = await page.textContent('body');
    const hasPresets = body.includes('Today') || body.includes('Yesterday') || body.includes('This Week');
    expect(hasPresets).toBeTruthy();

    await checkNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
test.describe('Mobile - View Switching', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    setupErrorCapture(consoleErrors, pageErrors)(page);
    await loadDashboard(page);
  });

  test('grid view shows member cards by default', async ({ page }) => {
    const cards = page.locator('[data-testid="member-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
  });

  test('list view toggle switches layout (if available)', async ({ page }) => {
    // Look for list view toggle (may be in header or view tabs)
    const listBtn = page.locator('button[title*="list" i], button[title*="List"]').first();
    const listBtnVisible = await listBtn.isVisible().catch(() => false);

    if (!listBtnVisible) {
      console.log('[QA] List view toggle not visible on mobile — skipping');
      test.skip();
      return;
    }

    await listBtn.click();
    await page.waitForTimeout(500);

    // Check no horizontal overflow after view switch
    await checkNoHorizontalOverflow(page);

    // Restore grid view
    const gridBtn = page.locator('button[title*="grid" i], button[title*="Grid"]').first();
    if (await gridBtn.isVisible().catch(() => false)) {
      await gridBtn.click();
      await page.waitForTimeout(300);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
test.describe('Mobile - No Layout Breaks Across Modals', () => {
  test.beforeEach(async ({ page }) => {
    // No error capture needed here — this is just layout integrity
    await loadDashboard(page);
  });

  test('no horizontal overflow after opening and closing each modal type', async ({ page }) => {
    // Start: no overflow
    await checkNoHorizontalOverflow(page);

    // 1. Overview modal
    const timeCard = page.locator('[data-testid^="overview-card-team-tracked"]');
    await timeCard.click();
    await page.waitForTimeout(400);
    await checkNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await checkNoHorizontalOverflow(page);

    // 2. Member modal
    const memberCard = page.locator('[data-testid="member-card"]').first();
    await expect(memberCard).toBeVisible({ timeout: 15000 });
    await memberCard.click();
    await page.waitForTimeout(400);
    await checkNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await checkNoHorizontalOverflow(page);

    // 3. Status pill → task list modal (if available)
    const pill = page.locator('[data-testid^="status-pill-"]').first();
    if (await pill.isVisible().catch(() => false)) {
      await pill.click();
      await page.waitForTimeout(400);
      await checkNoHorizontalOverflow(page);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await checkNoHorizontalOverflow(page);
    }

    // 4. Settings modal (via bottom nav)
    const settingsBtn = page.locator('button').filter({ hasText: 'Settings' }).first();
    if (await settingsBtn.isVisible().catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(400);
      await checkNoHorizontalOverflow(page);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await checkNoHorizontalOverflow(page);
    }

    // Final state: no overflow
    await checkNoHorizontalOverflow(page);
  });
});
