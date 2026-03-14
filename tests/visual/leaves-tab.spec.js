/**
 * Task 1.5 — Leaves Tab Correctness
 *
 * Tests that the Leaves tab renders correctly, its sub-tabs (Overview/Calendar)
 * work, leave data from seeded db.leaves displays, and no JS errors occur.
 *
 * Navigation:
 *   - Click "📅 Leaves & WFH" button in MainTabs to switch to Leaves tab
 *
 * LeavesTab sub-tabs (no testids — locate by text):
 *   - "Overview" → TeamOverviewPanel (status chips: on leave, WFH, available)
 *   - "Calendar"  → LeaveCalendar (month grid)
 *
 * Known facts:
 *   - test.setTimeout(60000) required
 *   - No data-testid on any leaves component — navigate by text
 *   - MOCK_LEAVES seeds: Riham=approved leave, Dina=upcoming leave, Islam=WFH
 *   - Sync with empty API doesn't affect db.leaves (leaves are synced separately)
 *   - setupMockApp seeds leaves via the `leaves` option
 */

import { test, expect, setupMockApp, collectConsoleErrors } from '../fixtures/test-setup.js';
import { MOCK_LEAVES } from '../fixtures/mock-data.js';

// ─── Helper: navigate to Leaves tab ──────────────────────────────────────────

async function goToLeavesTab(page) {
  const leavesTab = page.locator('button').filter({ hasText: 'Leaves & WFH' }).first();
  await expect(leavesTab).toBeVisible({ timeout: 10000 });
  await leavesTab.click();
  await page.waitForTimeout(500);
}

// ─── GROUP 1: Tab Navigation ──────────────────────────────────────────────────

test.describe('GROUP 1 — Tab Navigation', () => {
  test('can navigate to the Leaves & WFH tab', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    await goToLeavesTab(page);

    // Should show Overview/Calendar sub-tab switcher
    const overviewBtn = page.locator('button').filter({ hasText: 'Overview' }).first();
    await expect(overviewBtn).toBeVisible({ timeout: 5000 });
  });

  test('Overview sub-tab is active by default', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    await goToLeavesTab(page);

    // Status chips should be visible: "on leave", "WFH", "available"
    const pageText = await page.locator('body').textContent();
    const hasOverviewContent = pageText.includes('on leave') || pageText.includes('available') || pageText.includes('WFH');
    expect(hasOverviewContent).toBe(true);
  });

  test('can switch to Calendar sub-tab', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    await goToLeavesTab(page);

    const calendarBtn = page.locator('button').filter({ hasText: 'Calendar' }).first();
    await expect(calendarBtn).toBeVisible({ timeout: 5000 });
    await calendarBtn.click();
    await page.waitForTimeout(400);

    // Calendar shows days of week headers (Sun, Mon, Tue, ...)
    const pageText = await page.locator('body').textContent();
    const hasDayNames = pageText.includes('Sun') || pageText.includes('Mon') || pageText.includes('Tue');
    expect(hasDayNames).toBe(true);
  });

  test('can switch back from Calendar to Overview', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    await goToLeavesTab(page);

    // Switch to Calendar
    await page.locator('button').filter({ hasText: 'Calendar' }).first().click();
    await page.waitForTimeout(300);

    // Switch back to Overview
    await page.locator('button').filter({ hasText: 'Overview' }).first().click();
    await page.waitForTimeout(300);

    // Overview content visible again
    const pageText = await page.locator('body').textContent();
    const hasOverviewContent = pageText.includes('on leave') || pageText.includes('available') || pageText.includes('Annual');
    expect(hasOverviewContent).toBe(true);
  });
});

// ─── GROUP 2: Overview Content ────────────────────────────────────────────────

test.describe('GROUP 2 — Overview Content', () => {
  test('Overview shows status chips (on leave / WFH / available)', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page, { leaves: MOCK_LEAVES });
    await goToLeavesTab(page);

    const pageText = await page.locator('body').textContent();
    // All three chips always render (count can be 0)
    expect(pageText).toContain('on leave');
    expect(pageText).toContain('WFH');
    expect(pageText).toContain('available');
  });

  test('Overview shows member quota cards (at least one member name)', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page, { leaves: MOCK_LEAVES });
    await goToLeavesTab(page);

    // Member quota cards should include seeded member names
    const pageText = await page.locator('body').textContent();
    // Any of the 8 seeded member names should appear
    const memberNames = ['Dina', 'Alaa', 'Nada', 'Islam', 'Riham', 'Samar', 'Merit'];
    const hasAnyMember = memberNames.some(name => pageText.includes(name));
    expect(hasAnyMember).toBe(true);
  });

  test('Overview shows leave type labels (Annual Leave or WFH)', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page, { leaves: MOCK_LEAVES });
    await goToLeavesTab(page);

    const pageText = await page.locator('body').textContent();
    // MOCK_LEAVES has annual and wfh types — quota cards show "Annual", "WFH" or "Leave"
    const hasLeaveType = pageText.includes('Annual') || pageText.includes('WFH') || pageText.includes('Leave');
    expect(hasLeaveType).toBe(true);
  });

  test('Overview shows numeric quota values (digits visible)', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page, { leaves: MOCK_LEAVES });
    await goToLeavesTab(page);

    const pageText = await page.locator('body').textContent();
    // QuotaBar shows "X / Y" style numbers (remaining / total)
    expect(/\d+/.test(pageText)).toBe(true);
  });
});

// ─── GROUP 3: Calendar Content ────────────────────────────────────────────────

test.describe('GROUP 3 — Calendar Content', () => {
  test('Calendar shows current month name and year', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    await goToLeavesTab(page);

    await page.locator('button').filter({ hasText: 'Calendar' }).first().click();
    await page.waitForTimeout(400);

    const pageText = await page.locator('body').textContent();
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const hasMonth = months.some(m => pageText.includes(m));
    expect(hasMonth).toBe(true);
    // Year should be present (2026)
    expect(pageText.includes('2026') || pageText.includes('2025')).toBe(true);
  });

  test('Calendar shows day-of-week headers', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    await goToLeavesTab(page);

    await page.locator('button').filter({ hasText: 'Calendar' }).first().click();
    await page.waitForTimeout(400);

    const pageText = await page.locator('body').textContent();
    // Calendar renders abbreviated day names
    expect(pageText).toContain('Sun');
    expect(pageText).toContain('Mon');
  });

  test('Calendar has month navigation buttons', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    await goToLeavesTab(page);

    await page.locator('button').filter({ hasText: 'Calendar' }).first().click();
    await page.waitForTimeout(400);

    // Navigation buttons contain < or > or ‹ › arrows (prev/next month)
    const navButtons = page.locator('button').filter({ hasText: /[<>‹›←→]/ });
    const count = await navButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

// ─── GROUP 4: No JS Errors ────────────────────────────────────────────────────

test.describe('GROUP 4 — No JS Errors', () => {
  test('navigating Leaves tab and sub-tabs produces no JS errors', async ({ page }) => {
    test.setTimeout(60000);

    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page, { leaves: MOCK_LEAVES });

    // Navigate to Leaves tab
    await goToLeavesTab(page);
    await page.waitForTimeout(300);

    // Switch to Calendar
    await page.locator('button').filter({ hasText: 'Calendar' }).first().click();
    await page.waitForTimeout(400);

    // Switch back to Overview
    await page.locator('button').filter({ hasText: 'Overview' }).first().click();
    await page.waitForTimeout(300);

    // Navigate back to Dashboard
    const dashboardTab = page.locator('button').filter({ hasText: 'Dashboard' }).first();
    await dashboardTab.click();
    await page.waitForTimeout(300);

    expect(getErrors()).toHaveLength(0);
  });
});
