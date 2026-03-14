/**
 * Phase 4.2 — Tablet (768px) Layout Tests
 *
 * Tests that the Lighthouse dashboard renders correctly at 768px width (iPad).
 * All tests are code-based (no screenshots).
 *
 * Key facts:
 * - VIEWPORTS.TABLET = { width: 768, height: 1024 }
 * - Set viewport BEFORE setupMockApp
 * - At 768px, app may show desktop Header (button[title="Account & Settings"]) OR MobileBottomNav
 * - Full cards: [data-testid="member-card"]
 * - Compact rows: [data-testid="member-compact-row"]
 * - Settings tabs: text labels on desktop (Score/Team/Schedule...) OR emoji-only on mobile
 */

import { test, expect, VIEWPORTS, setupMockApp, openSettingsModal, switchView, collectConsoleErrors } from '../fixtures/test-setup.js';

// ─── GROUP 1: Layout at 768px ─────────────────────────────────────────────────

test.describe('GROUP 1 — Layout at 768px', () => {

  test('overview card visible at 768px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.TABLET);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Overview card must be visible
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('no horizontal overflow at 768px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.TABLET);
    await setupMockApp(page);

    // Page should not scroll horizontally
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasOverflow).toBe(false);
  });

  test('at least one member element visible at 768px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.TABLET);
    await setupMockApp(page);

    // Either full card or compact row should be present
    const fullCards   = await page.locator('[data-testid="member-card"]').count();
    const compactRows = await page.locator('[data-testid="member-compact-row"]').count();

    expect(fullCards + compactRows).toBeGreaterThan(0);
  });

  test('navigation visible at 768px (desktop header or mobile nav)', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.TABLET);
    await setupMockApp(page);

    // At 768px, app may render either desktop Header or MobileBottomNav
    // Check for desktop Header settings button
    const desktopSettingsBtn = page.locator('button[title="Account & Settings"]').first();
    const desktopVisible = await desktopSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (desktopVisible) {
      // Desktop layout confirmed
      expect(desktopVisible).toBe(true);
      return;
    }

    // Check for MobileBottomNav tab buttons
    const dashboardTab = page.locator('button').filter({ hasText: /^Dashboard$/ }).first();
    const feedTab      = page.locator('button').filter({ hasText: /^Feed$/ }).first();
    const leavesTab    = page.locator('button').filter({ hasText: /^Leaves$/ }).first();

    const dashVisible   = await dashboardTab.isVisible({ timeout: 2000 }).catch(() => false);
    const feedVisible   = await feedTab.isVisible({ timeout: 1000 }).catch(() => false);
    const leavesVisible = await leavesTab.isVisible({ timeout: 1000 }).catch(() => false);

    // Also check for fixed-position nav container with buttons
    const hasFixedNav = await page.evaluate(() => {
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

    // Either desktop header settings button OR mobile nav must be present
    expect(desktopVisible || dashVisible || feedVisible || leavesVisible || hasFixedNav).toBe(true);
  });

});

// ─── GROUP 2: Interactions at 768px ──────────────────────────────────────────

test.describe('GROUP 2 — Interactions at 768px', () => {

  test('member element click opens detail modal at 768px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.TABLET);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Try full member card first
    const memberCard = page.locator('[data-testid="member-card"]').first();
    const cardVisible = await memberCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (cardVisible) {
      await memberCard.click();
    } else {
      // Try compact row
      const compactRow = page.locator('[data-testid="member-compact-row"]').first();
      const compactVisible = await compactRow.isVisible({ timeout: 2000 }).catch(() => false);

      if (compactVisible) {
        await compactRow.click();
      } else {
        // Fall back to ranking table row
        const tableRow = page.locator('table tbody tr').first();
        await expect(tableRow).toBeVisible({ timeout: 3000 });
        await tableRow.click();
      }
    }

    // Detail modal must appear
    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 8000 });

    // Close the modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    expect(getErrors()).toHaveLength(0);
  });

  test('settings modal opens and is usable at 768px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.TABLET);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    // Verify settings modal is usable — check for "Settings" heading
    const settingsHeading = page.getByRole('heading', { name: 'Settings' }).first();
    const headingVisible = await settingsHeading.isVisible({ timeout: 3000 }).catch(() => false);

    // Also check for tabs — desktop text labels OR emoji-only mobile tabs
    const textTabLabels = page.locator('button').filter({ hasText: /^(Score|Team|Schedule|Thresholds|Sync|Notifications|Display|Security)$/ });
    const textTabCount = await textTabLabels.count();

    const emojiTabButtons = page.locator('button').filter({ hasText: /🔗|👥|📊|⏱️|🔄|📅|🎨|🔐/ });
    const emojiTabCount = await emojiTabButtons.count();

    // Either heading or some tabs confirm settings modal is open and usable
    expect(headingVisible || textTabCount > 0 || emojiTabCount > 0).toBe(true);

    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    expect(getErrors()).toHaveLength(0);
  });

  test('date picker opens at 768px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.TABLET);
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
        // Try any button in the header region with date-like text
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

  test('grid/list toggle works at 768px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.TABLET);
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

// ─── GROUP 3: Content at 768px ────────────────────────────────────────────────

test.describe('GROUP 3 — Content at 768px', () => {

  test('member element shows non-empty text at 768px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.TABLET);
    await setupMockApp(page);

    // Check full member cards first
    const memberCards = page.locator('[data-testid="member-card"]');
    const cardCount = await memberCards.count();

    if (cardCount > 0) {
      const cardText = await memberCards.first().textContent();
      expect(cardText).toBeTruthy();
      expect(cardText.trim().length).toBeGreaterThan(0);
    } else {
      // Fall back to compact rows
      const compactRows = page.locator('[data-testid="member-compact-row"]');
      const rowCount = await compactRows.count();
      expect(rowCount).toBeGreaterThan(0);
      const rowText = await compactRows.first().textContent();
      expect(rowText.trim().length).toBeGreaterThan(0);
    }
  });

  test('overview card shows % characters at 768px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.TABLET);
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

  test('no JS errors throughout all tablet interactions', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.TABLET);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // 1. Click a member element
    const memberCard = page.locator('[data-testid="member-card"]').first();
    const compactRow = page.locator('[data-testid="member-compact-row"]').first();
    const tableRow   = page.locator('table tbody tr').first();

    if (await memberCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await memberCard.click();
      await page.waitForTimeout(800);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else if (await compactRow.isVisible({ timeout: 1000 }).catch(() => false)) {
      await compactRow.click();
      await page.waitForTimeout(800);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else if (await tableRow.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tableRow.click();
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
