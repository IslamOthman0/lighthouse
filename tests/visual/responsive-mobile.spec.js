/**
 * Phase 4.1 — Mobile (375px) Layout Tests
 *
 * Tests that the Lighthouse dashboard renders correctly at 375px width (iPhone SE).
 * All tests are code-based (no screenshots).
 *
 * Key facts:
 * - VIEWPORTS.MOBILE = { width: 375, height: 812 }
 * - Set viewport BEFORE setupMockApp
 * - MobileBottomNav: fixed bottom:16px, contains tab buttons "Feed"/"Dashboard"/"Leaves"
 * - No data-testid on bottom nav — detect via fixed-position element or tab button text
 * - Full cards: [data-testid="member-card"] for working/break/offline members
 * - Compact rows: [data-testid="member-compact-row"] for noActivity/leave members
 */

import { test, expect, VIEWPORTS, setupMockApp, openSettingsModal, switchView, collectConsoleErrors } from '../fixtures/test-setup.js';

// ─── GROUP 1: Layout at 375px ─────────────────────────────────────────────────

test.describe('GROUP 1 — Layout at 375px', () => {

  test('overview card visible at 375px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.MOBILE);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Overview card must be visible
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('no horizontal overflow at 375px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.MOBILE);
    await setupMockApp(page);

    // Page should not scroll horizontally
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasOverflow).toBe(false);
  });

  test('at least one member element visible at 375px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.MOBILE);
    await setupMockApp(page);

    // Either full card or compact row should be present
    const fullCards   = await page.locator('[data-testid="member-card"]').count();
    const compactRows = await page.locator('[data-testid="member-compact-row"]').count();

    expect(fullCards + compactRows).toBeGreaterThan(0);
  });

  test('MobileBottomNav visible at 375px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.MOBILE);
    await setupMockApp(page);

    // MobileBottomNav renders fixed at bottom — detect by its tab button labels
    // The component renders tab buttons with text "Feed", "Dashboard", "Leaves"
    const dashboardTab = page.locator('button').filter({ hasText: /^Dashboard$/ }).first();
    const feedTab      = page.locator('button').filter({ hasText: /^Feed$/ }).first();
    const leavesTab    = page.locator('button').filter({ hasText: /^Leaves$/ }).first();

    // At least the Dashboard tab button must be visible (core nav item)
    const dashVisible  = await dashboardTab.isVisible({ timeout: 3000 }).catch(() => false);
    const feedVisible  = await feedTab.isVisible({ timeout: 1000 }).catch(() => false);
    const leavesVisible = await leavesTab.isVisible({ timeout: 1000 }).catch(() => false);

    // At minimum the nav must show some tab buttons
    const anyNavVisible = dashVisible || feedVisible || leavesVisible;
    expect(anyNavVisible).toBe(true);

    // Also verify the bottom nav container itself is fixed-positioned
    const isFixed = await page.evaluate(() => {
      // Look for any fixed-position element at the bottom of the page
      // that contains nav buttons (the MobileBottomNav wrapper)
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && style.bottom !== 'auto') {
          const buttons = el.querySelectorAll('button');
          if (buttons.length >= 3) return true;
        }
      }
      return false;
    });
    expect(isFixed).toBe(true);
  });

});

// ─── GROUP 2: Interactions at 375px ──────────────────────────────────────────

test.describe('GROUP 2 — Interactions at 375px', () => {

  test('member card tap opens detail modal', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.MOBILE);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Tap a full member card (working/break/offline)
    const memberCard = page.locator('[data-testid="member-card"]').first();
    const cardVisible = await memberCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (cardVisible) {
      await memberCard.click();
    } else {
      // Fall back to ranking table row
      const tableRow = page.locator('table tbody tr').first();
      await expect(tableRow).toBeVisible({ timeout: 3000 });
      await tableRow.click();
    }

    // Detail modal must appear
    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 8000 });

    // Close the modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    expect(getErrors()).toHaveLength(0);
  });

  test('settings modal opens and is usable at 375px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.MOBILE);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    // Settings modal is open — verify by checking for the "Settings" heading
    // and the tab buttons (on mobile, tabs are emoji-only: 🔗 👥 📊 ⏱️ 🔄 📅 🎨 🔐)
    const settingsHeading = page.getByRole('heading', { name: 'Settings' }).first();
    const headingVisible = await settingsHeading.isVisible({ timeout: 3000 }).catch(() => false);

    // Also check for at least one emoji tab button
    const emojiTabButtons = page.locator('button').filter({ hasText: /🔗|👥|📊|⏱️|🔄|📅|🎨|🔐/ });
    const tabCount = await emojiTabButtons.count();

    // Either the heading or the emoji tabs confirm settings modal is usable
    expect(headingVisible || tabCount > 0).toBe(true);

    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    expect(getErrors()).toHaveLength(0);
  });

  test('date picker opens at 375px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.MOBILE);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Try clicking the 📅 date button
    const dateBtn = page.locator('button').filter({ hasText: '📅' }).first();
    const dateBtnVisible = await dateBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (dateBtnVisible) {
      await dateBtn.click();
    } else {
      // Try data-testid button
      const headerDateBtn = page.locator('[data-testid="date-picker-button"]').first();
      const testIdVisible = await headerDateBtn.isVisible({ timeout: 1000 }).catch(() => false);
      if (testIdVisible) {
        await headerDateBtn.click();
      } else {
        // Try any button in the header region with a date-like text
        const headerBtns = page.locator('header button, [class*="header"] button').first();
        if (await headerBtns.isVisible({ timeout: 1000 }).catch(() => false)) {
          await headerBtns.click();
        }
      }
    }

    await page.waitForTimeout(500);

    // Preset buttons (Today, Yesterday, etc.) should appear in date picker
    const presetBtn = page.locator('button').filter({ hasText: /Today|Yesterday|This Week|Last 7/i }).first();
    const pickerVisible = await presetBtn.isVisible({ timeout: 3000 }).catch(() => false);

    expect(pickerVisible).toBe(true);

    // Close picker
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    expect(getErrors()).toHaveLength(0);
  });

  test('grid/list toggle works at 375px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.MOBILE);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Switch to list view
    await switchView(page, 'list');

    // Overview card must still be visible after switch
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    // Switch back to grid view
    await switchView(page, 'grid');

    // Overview card still visible
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

});

// ─── GROUP 3: Content at 375px ────────────────────────────────────────────────

test.describe('GROUP 3 — Content at 375px', () => {

  test('member card shows name text at 375px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.MOBILE);
    await setupMockApp(page);

    // Get text from all full member cards — names should be non-empty
    const memberCards = page.locator('[data-testid="member-card"]');
    const cardCount = await memberCards.count();

    if (cardCount > 0) {
      // Check at least the first card has some text content
      const cardText = await memberCards.first().textContent();
      expect(cardText).toBeTruthy();
      expect(cardText.trim().length).toBeGreaterThan(0);
    } else {
      // If no full cards, check compact rows
      const compactRows = page.locator('[data-testid="member-compact-row"]');
      const rowCount = await compactRows.count();
      expect(rowCount).toBeGreaterThan(0);
      const rowText = await compactRows.first().textContent();
      expect(rowText.trim().length).toBeGreaterThan(0);
    }
  });

  test('score overview card shows % characters at 375px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.MOBILE);
    await setupMockApp(page);

    // Score overview card should display a percentage value
    const scoreCard = page.locator('[data-testid="overview-card-team-score"]').first();
    const scoreCardVisible = await scoreCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (scoreCardVisible) {
      const scoreText = await scoreCard.textContent();
      expect(scoreText).toContain('%');
    } else {
      // Fall back: any overview card with % in its text
      const overviewCards = page.locator('[data-testid^="overview-card"]');
      const count = await overviewCards.count();
      expect(count).toBeGreaterThan(0);

      let foundPercent = false;
      for (let i = 0; i < count; i++) {
        const text = await overviewCards.nth(i).textContent();
        if (text.includes('%')) {
          foundPercent = true;
          break;
        }
      }
      expect(foundPercent).toBe(true);
    }
  });

  test('no JS errors throughout all mobile interactions', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.MOBILE);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // 1. Tap a member card
    const memberCard = page.locator('[data-testid="member-card"]').first();
    if (await memberCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await memberCard.click();
      await page.waitForTimeout(800);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 2. Open settings and close
    const opened = await openSettingsModal(page);
    if (opened) {
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 3. Switch views
    await switchView(page, 'list');
    await page.waitForTimeout(300);
    await switchView(page, 'grid');
    await page.waitForTimeout(300);

    // 4. Open date picker and close
    const dateBtn = page.locator('button').filter({ hasText: '📅' }).first();
    if (await dateBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dateBtn.click();
      await page.waitForTimeout(400);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    expect(getErrors()).toHaveLength(0);
  });

});
