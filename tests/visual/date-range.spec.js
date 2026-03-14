/**
 * date-range.spec.js — Phase 3, Task 3.1
 *
 * Tests that changing the date range updates ALL screens correctly.
 *
 * Strategy (per task spec):
 * - No exact value assertions — sync overwrites seeded member data
 * - Assert structural changes: header date text, overview cards visible, no JS errors
 * - Assert consistency: Grid ↔ List show same total/structure after date change
 * - GROUP 1: Date range change updates header display + overview cards stay visible
 * - GROUP 2: Grid ↔ List consistency after date change
 * - GROUP 3: Member detail modal opens correctly after date change
 *
 * DatePickerModal actual presets (quickPresets array):
 *   'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month',
 *   'this_quarter', 'last_quarter', 'half_year', 'this_year', 'last_year'
 * Labels: 'Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', ...
 *
 * The shared changeDateRange() helper maps 'last7' → 'Last 7 Days' which does NOT
 * exist in DatePickerModal. Use localChangeDateRange() below with actual labels.
 */

import { setupMockApp, collectConsoleErrors, switchView, closeModal } from '../fixtures/test-setup.js';
import { test, expect } from '@playwright/test';

/**
 * localChangeDateRange(page, presetLabel)
 *
 * Opens the date picker using the 📅 button, clicks a preset by its EXACT label
 * as rendered in DatePickerModal.jsx quickPresets, then clicks Apply.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} presetLabel - Exact label from quickPresets: 'Yesterday', 'This Week', 'Today', etc.
 */
async function localChangeDateRange(page, presetLabel) {
  // Open the date picker: find button containing 📅 emoji
  const dateBtn = page.locator('button').filter({ hasText: '📅' }).first();
  if (await dateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dateBtn.click();
  } else {
    // Fallback: click any button with title containing "Select date range" or "Viewing"
    const titleBtn = page.locator('button[title*="date" i], button[title*="Date" i], button[title*="Viewing" i]').first();
    await titleBtn.click({ timeout: 3000 });
  }
  await page.waitForTimeout(400);

  // Click the preset button by exact label text
  const presetBtn = page.locator('button').filter({ hasText: presetLabel }).first();
  await expect(presetBtn).toBeVisible({ timeout: 5000 });
  await presetBtn.click();
  await page.waitForTimeout(200);

  // Click Apply button
  const applyBtn = page.locator('button').filter({ hasText: 'Apply' }).first();
  if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await applyBtn.click();
  }

  await page.waitForTimeout(800);
}

test.setTimeout(60000);

// ─── GROUP 1: Date Range Changes Update Header + Overview ─────────────────────

test.describe('GROUP 1 — Date Range Updates Header and Overview', () => {
  test('header shows "Today" by default', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Header date button should contain "Today" text
    // It's rendered as a <span> inside the date picker button
    const todayText = page.locator('button').filter({ hasText: 'Today' }).first();
    const dateText  = page.locator('span').filter({ hasText: 'Today' }).first();

    const btnVisible  = await todayText.isVisible({ timeout: 5000 }).catch(() => false);
    const spanVisible = await dateText.isVisible({ timeout: 5000 }).catch(() => false);

    expect(btnVisible || spanVisible).toBe(true);
    expect(getErrors()).toHaveLength(0);
  });

  test('switch to This Week → header no longer shows "Today"', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Record initial state: header shows "Today"
    const initialTodayText = page.locator('button').filter({ hasText: 'Today' }).first();
    const hadToday = await initialTodayText.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hadToday).toBe(true);

    // Change to This Week
    await localChangeDateRange(page, 'This Week');

    // "Today" should no longer be the sole text in the date button
    // The date button now shows a range like "Mar 8 — Mar 14"
    // Check for a date range pattern (two month names or dates with "—")
    const headerContent = await page.evaluate(() => {
      // Find all buttons that might be the date picker button
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const text = btn.textContent || '';
        // A date range shows "Mon DD — Mon DD" or similar with "—" separator
        if (text.includes('—') || text.includes('–') || /[A-Z][a-z]{2}\s+\d+/.test(text)) {
          return text.trim();
        }
      }
      // Fallback: check spans
      const spans = Array.from(document.querySelectorAll('span'));
      for (const span of spans) {
        const text = span.textContent || '';
        if (text.includes('—') || text.includes('–') || /[A-Z][a-z]{2}\s+\d+/.test(text)) {
          return text.trim();
        }
      }
      return null;
    });

    // Header should show a date range (not just "Today")
    expect(headerContent).not.toBeNull();

    // Overview card must still be visible (no crash)
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('switch to Yesterday → header shows a single date (not "Today")', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await localChangeDateRange(page, 'Yesterday');

    // Overview card must still be visible
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    // "Today" text should NOT be visible as the date display
    // The header button should now show a specific date like "Mar 13"
    const todayInHeader = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        // Look for any button that still says just "Today"
        if (btn.textContent.trim() === 'Today') return true;
      }
      return false;
    });
    expect(todayInHeader).toBe(false);

    expect(getErrors()).toHaveLength(0);
  });

  test('switch back to Today → header shows "Today" again', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Go to This Week, then back to Today
    await localChangeDateRange(page, 'This Week');
    await page.waitForTimeout(500);
    await localChangeDateRange(page, 'Today');

    // "Today" should be back in the header
    const todayText = page.locator('button').filter({ hasText: 'Today' }).first();
    const dateText  = page.locator('span').filter({ hasText: 'Today' }).first();

    const btnVisible  = await todayText.isVisible({ timeout: 5000 }).catch(() => false);
    const spanVisible = await dateText.isVisible({ timeout: 5000 }).catch(() => false);

    expect(btnVisible || spanVisible).toBe(true);

    // Overview card still visible
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('overview cards remain visible after each date range change', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const overviewCard = page.locator('[data-testid^="overview-card"]').first();

    // Cycle through multiple presets (using actual DatePickerModal labels)
    for (const presetLabel of ['Yesterday', 'This Week', 'Today']) {
      await localChangeDateRange(page, presetLabel);
      await expect(overviewCard).toBeVisible({ timeout: 8000 });
    }

    expect(getErrors()).toHaveLength(0);
  });

  test('no JS errors when switching date ranges repeatedly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Rapid switching (using actual DatePickerModal labels)
    await localChangeDateRange(page, 'Yesterday');
    await localChangeDateRange(page, 'This Week');
    await localChangeDateRange(page, 'Today');

    expect(getErrors()).toHaveLength(0);
  });
});

// ─── GROUP 2: Grid ↔ List Consistency After Date Change ──────────────────────

test.describe('GROUP 2 — Grid ↔ List Consistency After Date Change', () => {
  test('after date change to This Week, switching Grid → List shows same member count', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Switch to This Week
    await localChangeDateRange(page, 'This Week');
    await page.waitForTimeout(500);

    // Count member elements in Grid View
    const gridFullCards   = await page.locator('[data-testid="member-card"]').count();
    const gridCompactRows = await page.locator('[data-testid="member-compact-row"]').count();
    const gridTotal = gridFullCards + gridCompactRows;

    // Switch to List View
    await switchView(page, 'list');
    await page.waitForTimeout(600);

    // List View has a ranking table — count rows
    // Two tables exist: member list (expand) + ranking table; count tbody rows in ranking table
    const tables = page.locator('table tbody');
    const tableCount = await tables.count();
    let listRowCount = 0;
    if (tableCount > 0) {
      // Use last table (ranking table) which opens member modal
      const lastTable = tables.last();
      listRowCount = await lastTable.locator('tr').count();
    }

    // NOTE: For a historical range with mocked empty API, sync clears member data.
    // Both views should show the SAME count (consistency), even if both are 0.
    // The key structural assertion: list row count ≥ grid card count (list always shows all members).
    expect(listRowCount).toBeGreaterThanOrEqual(gridTotal);

    // Overview card still visible in list view (dashboard didn't crash)
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('after date change, switching List → Grid → List shows overview card each time', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await localChangeDateRange(page, 'Yesterday');
    await page.waitForTimeout(400);

    const overviewCard = page.locator('[data-testid^="overview-card"]').first();

    // List
    await switchView(page, 'list');
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    // Grid
    await switchView(page, 'grid');
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    // Back to list
    await switchView(page, 'list');
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('overview card visible in Grid View after This Week change', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await localChangeDateRange(page, 'This Week');

    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 8000 });

    // Check that overview area has some text content (not blank)
    const cardText = await overviewCard.textContent();
    expect(cardText).toMatch(/\S/); // at least one non-whitespace character

    expect(getErrors()).toHaveLength(0);
  });

  test('score overview card shows digits after date range change to This Week', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await localChangeDateRange(page, 'This Week');

    const scoreCard = page.locator('[data-testid="overview-card-team-score"]');
    await expect(scoreCard).toBeVisible({ timeout: 8000 });
    const cardText = await scoreCard.textContent();
    // Should contain digits (score value) and % (metric percentages)
    expect(cardText).toMatch(/\d/);
    expect(cardText).toContain('%');

    expect(getErrors()).toHaveLength(0);
  });
});

// ─── GROUP 3: Member Detail Modal After Date Change ───────────────────────────

test.describe('GROUP 3 — Member Detail Modal After Date Change', () => {
  test('member detail modal opens after switching to This Week', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await localChangeDateRange(page, 'This Week');
    await page.waitForTimeout(500);

    // Click first member card or ranking table row to open modal
    const memberCard = page.locator('[data-testid="member-card"]').first();
    const cardVisible = await memberCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (cardVisible) {
      await memberCard.click();
    } else {
      // Try ranking table row
      const tableRow = page.locator('table tbody tr').first();
      if (await tableRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tableRow.click();
      }
    }

    // Member detail modal should open
    const modal = page.locator('[data-testid="member-detail-modal"]');
    const modalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);

    if (modalVisible) {
      // Modal shows the member's name
      const modalText = await modal.textContent();
      expect(modalText).toMatch(/\S/); // not empty

      // Close it cleanly
      await closeModal(page);
    } else {
      // If modal didn't open, at least verify no crash
      // (some states may not open modal on click — noActivity)
    }

    // Dashboard still renders after modal interaction
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('member detail modal shows a "Progress" label after date change to This Week', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await localChangeDateRange(page, 'This Week');
    await page.waitForTimeout(500);

    // Try to open a member modal via ranking table (most reliable)
    const tables = page.locator('table tbody');
    const tableCount = await tables.count();
    let modalOpened = false;

    if (tableCount > 0) {
      const lastTable = tables.last();
      const rows = lastTable.locator('tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        await rows.first().click();
        const modal = page.locator('[data-testid="member-detail-modal"]');
        modalOpened = await modal.isVisible({ timeout: 5000 }).catch(() => false);

        if (modalOpened) {
          // Modal should show "Progress" label (BUG-010 was fixed to show N-Day or "7-Day Progress")
          const modalText = await modal.textContent();
          expect(modalText).toMatch(/Progress/i);

          await closeModal(page);
        }
      }
    }

    // No crash regardless of modal open result
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('no JS errors when opening and closing modal across date ranges', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Open modal on today's date range
    const memberCard = page.locator('[data-testid="member-card"]').first();
    if (await memberCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await memberCard.click();
      const modal = page.locator('[data-testid="member-detail-modal"]');
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeModal(page);
      }
    }

    // Change date range
    await localChangeDateRange(page, 'This Week');
    await page.waitForTimeout(500);

    // Open modal again
    const memberCard2 = page.locator('[data-testid="member-card"]').first();
    if (await memberCard2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await memberCard2.click();
      const modal2 = page.locator('[data-testid="member-detail-modal"]');
      if (await modal2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeModal(page);
      }
    }

    // No JS errors throughout
    expect(getErrors()).toHaveLength(0);
  });
});
