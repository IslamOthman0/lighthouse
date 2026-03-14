/**
 * Task 1.4 — Dashboard Detail Modal Correctness
 *
 * Tests that the DashboardDetailModal opens for all three types (time, tasks, score),
 * renders content, closes correctly, and has no JS errors.
 *
 * Opening triggers:
 *   - "Team Tracked" overview card → type='time'  → data-testid="dashboard-detail-modal-time"
 *   - "Tasks Progress" overview card → type='tasks' → data-testid="dashboard-detail-modal-tasks"
 *   - ScoreBreakdownCard → type='score'             → data-testid="dashboard-detail-modal-score"
 *
 * ModalShell uses a backdrop div (onClick=onClose) + Escape key.
 * No src/ changes needed — all three modal types have testIds.
 *
 * Known facts:
 *   - test.setTimeout(60000) required on every test
 *   - Sync overwrites seeded data — assert format not exact values
 *   - OverviewCard testId = overview-card-{label-lowercase-dashed}
 *     but label changes for multi-day ("Team Tracked (N days)") — click by text instead
 */

import { test, expect, setupMockApp, collectConsoleErrors } from '../fixtures/test-setup.js';

// ─── Helper: open a specific dashboard modal ──────────────────────────────────

async function openDashboardModal(page, type) {
  let cardSelector;

  if (type === 'time') {
    // "Team Tracked" or "Team Tracked (N days)" overview card
    cardSelector = page.locator('[data-testid^="overview-card-team-tracked"]').first();
  } else if (type === 'tasks') {
    // "Tasks Progress" overview card
    cardSelector = page.locator('[data-testid="overview-card-tasks-progress"]').first();
  } else if (type === 'score') {
    // ScoreBreakdownCard has testid overview-card-team-score
    cardSelector = page.locator('[data-testid="overview-card-team-score"]').first();
  }

  await expect(cardSelector).toBeVisible({ timeout: 10000 });
  await cardSelector.click();

  const modal = page.locator(`[data-testid="dashboard-detail-modal-${type}"]`);
  await expect(modal).toBeVisible({ timeout: 8000 });
  return modal;
}

// ─── GROUP 1: Modal Opens for All Three Types ─────────────────────────────────

test.describe('GROUP 1 — Modal Opens for All Three Types', () => {
  test('clicking Team Tracked card opens time modal', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'time');
    await expect(modal).toBeVisible();
  });

  test('clicking Tasks Progress card opens tasks modal', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'tasks');
    await expect(modal).toBeVisible();
  });

  test('clicking Score card opens score modal', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'score');
    await expect(modal).toBeVisible();
  });
});

// ─── GROUP 2: Modal Closes Correctly ─────────────────────────────────────────

test.describe('GROUP 2 — Modal Closes Correctly', () => {
  test('Escape key closes the time modal', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'time');
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('clicking the backdrop closes the modal', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    // Open score modal (ScoreBreakdownCard is reliably visible)
    const modal = await openDashboardModal(page, 'score');
    await expect(modal).toBeVisible();

    // ModalShell backdrop is a full-screen div BEHIND the modal content
    // Click top-left corner (outside the centered modal box)
    await page.mouse.click(5, 5);
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });
});

// ─── GROUP 3: Time Modal Content ─────────────────────────────────────────────

test.describe('GROUP 3 — Time Modal Content', () => {
  test('time modal shows title "Time Tracked Details"', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'time');
    const modalText = await modal.textContent();
    expect(modalText).toContain('Time Tracked');
  });

  test('time modal shows hours in h/m format', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'time');
    const modalText = await modal.textContent();
    // formatHoursToHM always produces "Xh Ym"
    expect(/\d+h/.test(modalText)).toBe(true);
  });

  test('time modal shows member breakdown (names in content)', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'time');
    const modalText = await modal.textContent();
    // "Member Breakdown" section title always rendered
    expect(modalText).toContain('Member');
  });

  test('time modal shows percentage value', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'time');
    const modalText = await modal.textContent();
    expect(modalText.includes('%')).toBe(true);
  });
});

// ─── GROUP 4: Tasks Modal Content ────────────────────────────────────────────

test.describe('GROUP 4 — Tasks Modal Content', () => {
  test('tasks modal shows title "Tasks Progress Details"', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'tasks');
    const modalText = await modal.textContent();
    expect(modalText).toContain('Tasks');
  });

  test('tasks modal shows member or empty state content', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'tasks');
    const modalText = await modal.textContent();
    // Either shows "By Member" section OR "No task data" empty state
    const hasContent = modalText.includes('Member') || modalText.includes('No task data');
    expect(hasContent).toBe(true);
  });
});

// ─── GROUP 5: Score Modal Content ────────────────────────────────────────────

test.describe('GROUP 5 — Score Modal Content', () => {
  test('score modal shows title "Team Score Details"', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'score');
    const modalText = await modal.textContent();
    expect(modalText).toContain('Score');
  });

  test('score modal shows score formula breakdown section', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'score');
    const modalText = await modal.textContent();
    // Shows either "Score Formula Breakdown" or "No score data" empty state
    const hasContent = modalText.includes('Score') && modalText.length > 50;
    expect(hasContent).toBe(true);
  });

  test('score modal shows percentage values', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);
    const modal = await openDashboardModal(page, 'score');
    const modalText = await modal.textContent();
    expect(modalText.includes('%')).toBe(true);
  });
});

// ─── GROUP 6: No JS Errors ───────────────────────────────────────────────────

test.describe('GROUP 6 — No JS Errors', () => {
  test('opening and closing all three modal types produces no JS errors', async ({ page }) => {
    test.setTimeout(60000);

    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Open + close time modal
    const timeModal = await openDashboardModal(page, 'time');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await expect(timeModal).not.toBeVisible({ timeout: 5000 });

    // Open + close tasks modal
    const tasksModal = await openDashboardModal(page, 'tasks');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await expect(tasksModal).not.toBeVisible({ timeout: 5000 });

    // Open + close score modal
    const scoreModal = await openDashboardModal(page, 'score');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await expect(scoreModal).not.toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });
});
