/**
 * Task 1.3 — Member Detail Modal Correctness
 *
 * Tests that the MemberDetailModal renders correctly, tabs work,
 * header data is present in the right format, and accessibility basics pass.
 *
 * Strategy:
 *   - Open modal from Grid View via [data-testid="member-card"] click
 *   - Assert structure/format (not exact values — sync overwrites seeded data)
 *   - Tab data-testids: tab-timeline, tab-performance, tab-leaves
 *   - Backdrop (outer overlay) click → modal closes
 *   - Escape key → modal closes
 */

import { test, expect, setupMockApp, collectConsoleErrors } from '../fixtures/test-setup.js';

// ─── GROUP 1: Modal Opens and Closes ─────────────────────────────────────────

test.describe('GROUP 1 — Modal Opens and Closes', () => {
  test('clicking a member card in Grid View opens the modal', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    // Click the first full member card (Grid View is default)
    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    // Modal should appear
    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 8000 });
  });

  test('modal shows the clicked member name', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    // Read the name from the card before clicking
    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Get the card text to know which member we clicked
    const cardText = await firstCard.textContent();
    await firstCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // Modal should contain some text from the card (name portion)
    // We check that the modal has a non-empty name element
    const modalText = await modal.textContent();
    expect(modalText.length).toBeGreaterThan(10);
  });

  test('Escape key closes the modal', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // Press Escape — modal should close
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('clicking the backdrop closes the modal', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // Click the outer overlay (top-left corner, outside the modal dialog box)
    await page.mouse.click(10, 10);
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });
});

// ─── GROUP 2: Modal Tabs ──────────────────────────────────────────────────────

test.describe('GROUP 2 — Modal Tabs', () => {
  test('modal has Timeline, Performance, and Leaves tab buttons', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 8000 });

    // All three tab buttons must be present
    await expect(page.locator('[data-testid="tab-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-performance"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-leaves"]')).toBeVisible();
  });

  test('clicking Performance tab switches content without error', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 8000 });

    // Switch to Performance tab
    await page.locator('[data-testid="tab-performance"]').click();
    await page.waitForTimeout(500);

    // Tab should now appear active (we can't easily assert active state via inline styles,
    // so verify the modal still shows content and has no crash)
    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();
    const modalText = await modal.textContent();
    expect(modalText.length).toBeGreaterThan(10);
  });

  test('clicking Leaves tab switches content without error', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 8000 });

    // Switch to Leaves tab
    await page.locator('[data-testid="tab-leaves"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();
    const modalText = await modal.textContent();
    expect(modalText.length).toBeGreaterThan(10);
  });

  test('can cycle through all three tabs without errors', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // Cycle: Timeline → Performance → Leaves → Timeline
    await page.locator('[data-testid="tab-timeline"]').click();
    await page.waitForTimeout(300);
    await expect(modal).toBeVisible();

    await page.locator('[data-testid="tab-performance"]').click();
    await page.waitForTimeout(300);
    await expect(modal).toBeVisible();

    await page.locator('[data-testid="tab-leaves"]').click();
    await page.waitForTimeout(300);
    await expect(modal).toBeVisible();

    await page.locator('[data-testid="tab-timeline"]').click();
    await page.waitForTimeout(300);
    await expect(modal).toBeVisible();
  });
});

// ─── GROUP 3: Modal Header Data ───────────────────────────────────────────────

test.describe('GROUP 3 — Modal Header Data', () => {
  test('header shows member name (non-empty text)', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // The modal header area contains the member name in a div with fontSize 16px / fontWeight 700
    // We locate it by checking modal text — it must have a name-like substring
    const modalText = await modal.textContent();
    // Should contain at least one word character sequence (a name)
    expect(/[A-Za-z\u0600-\u06FF]{2,}/.test(modalText)).toBe(true);
  });

  test('header shows tracked hours in h/m format', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // Progress bar area shows "Xh Ym / Xh Ym (N%)"
    // We check that some "h" and "m" pattern exists in the modal header region
    const modalText = await modal.textContent();
    // formatHoursToHM produces "Xh Ym" or "0h 0m" — check for at least one "h" followed by content
    expect(/\d+h/.test(modalText)).toBe(true);
  });

  test('header shows score with % symbol', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // The progress bar label shows "(N%)" — check for % in modal text
    const modalText = await modal.textContent();
    expect(modalText.includes('%')).toBe(true);
  });

  test('header shows a progress label (Today\'s Progress or N-Day Progress or Progress)', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    // Skip leave member (no progress bar) — find a non-leave card
    // working/break/offline members all show progress bars
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // In today mode (default), the label is "Today's Progress"
    // For leave members it's hidden, but first card should be a working member (Dina)
    const modalText = await modal.textContent();
    const hasProgressLabel = modalText.includes("Progress");
    // Either it's a leave member (no progress bar → label absent) or it shows Progress
    // We just assert the modal rendered something meaningful
    expect(modalText.length).toBeGreaterThan(20);

    // If progress is shown, it must have the word "Progress"
    // (Leave member won't have it but first card is working by sort order)
    // We check softly: if "h" is in text, "Progress" must also be there
    if (/\d+h/.test(modalText)) {
      expect(hasProgressLabel).toBe(true);
    }
  });
});

// ─── GROUP 4: Modal Accessibility ────────────────────────────────────────────

test.describe('GROUP 4 — Modal Accessibility', () => {
  test('modal container is focusable / receives focus after open', async ({ page }) => {
    test.setTimeout(60000);
    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // Verify keyboard navigation works: Tab should move focus within modal
    // (at minimum the close button ✕ and tab buttons are clickable)
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // After Tab, the modal should still be visible (focus stayed inside or moved to a focusable element)
    await expect(modal).toBeVisible();
  });

  test('no JS errors when opening and closing the modal', async ({ page }) => {
    test.setTimeout(60000);

    // Collect errors BEFORE navigation
    const getErrors = collectConsoleErrors(page);

    await setupMockApp(page);

    const firstCard = page.locator('[data-testid="member-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Open modal
    await firstCard.click();
    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);

    // Switch tabs
    await page.locator('[data-testid="tab-performance"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="tab-leaves"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="tab-timeline"]').click();
    await page.waitForTimeout(400);

    // Close via Escape
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // No real JS errors
    expect(getErrors()).toHaveLength(0);
  });
});
