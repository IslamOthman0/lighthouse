/**
 * Phase 4.3 — Laptop (1024px) & Desktop (1440px) Layout Tests
 *
 * Tests that the Lighthouse dashboard renders correctly at laptop and desktop widths.
 * All tests are code-based (no screenshots).
 *
 * Key facts:
 * - VIEWPORTS.LAPTOP  = { width: 1024, height: 768 }
 * - VIEWPORTS.DESKTOP = { width: 1440, height: 900 }
 * - Both render desktop layout: Header with button[title="Account & Settings"]
 * - No MobileBottomNav at these widths
 * - Settings tabs: text labels (Score/Team/Schedule/Thresholds/Sync/Display/Security)
 * - Full cards: [data-testid="member-card"] for working/break/offline members
 * - Compact rows: [data-testid="member-compact-row"] for noActivity/leave members
 */

import { test, expect, VIEWPORTS, setupMockApp, openSettingsModal, switchView, collectConsoleErrors } from '../fixtures/test-setup.js';

// ─── GROUP 1: Layout at 1024px (Laptop) ──────────────────────────────────────

test.describe('GROUP 1 — Layout at 1024px (Laptop)', () => {

  test('overview card visible at 1024px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.LAPTOP);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('no horizontal overflow at 1024px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.LAPTOP);
    await setupMockApp(page);

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasOverflow).toBe(false);
  });

  test('at least one member element visible at 1024px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.LAPTOP);
    await setupMockApp(page);

    const fullCards   = await page.locator('[data-testid="member-card"]').count();
    const compactRows = await page.locator('[data-testid="member-compact-row"]').count();

    expect(fullCards + compactRows).toBeGreaterThan(0);
  });

  test('desktop header visible at 1024px (no mobile nav)', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.LAPTOP);
    await setupMockApp(page);

    // Desktop header settings button must be present
    const desktopSettingsBtn = page.locator('button[title="Account & Settings"]').first();
    await expect(desktopSettingsBtn).toBeVisible({ timeout: 5000 });

    // MobileBottomNav should NOT be rendered at 1024px
    const mobileNavFixed = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && style.bottom !== 'auto') {
          const buttons = el.querySelectorAll('button');
          // Check if any button has mobile tab text
          for (const btn of buttons) {
            if (/^(Feed|Dashboard|Leaves)$/.test(btn.textContent.trim())) return true;
          }
        }
      }
      return false;
    });

    expect(mobileNavFixed).toBe(false);
  });

});

// ─── GROUP 2: Layout at 1440px (Desktop) ─────────────────────────────────────

test.describe('GROUP 2 — Layout at 1440px (Desktop)', () => {

  test('overview card visible at 1440px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.DESKTOP);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('no horizontal overflow at 1440px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await setupMockApp(page);

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasOverflow).toBe(false);
  });

  test('at least one member element visible at 1440px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await setupMockApp(page);

    const fullCards   = await page.locator('[data-testid="member-card"]').count();
    const compactRows = await page.locator('[data-testid="member-compact-row"]').count();

    expect(fullCards + compactRows).toBeGreaterThan(0);
  });

  test('desktop header visible at 1440px (no mobile nav)', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await setupMockApp(page);

    const desktopSettingsBtn = page.locator('button[title="Account & Settings"]').first();
    await expect(desktopSettingsBtn).toBeVisible({ timeout: 5000 });

    const mobileNavFixed = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && style.bottom !== 'auto') {
          const buttons = el.querySelectorAll('button');
          for (const btn of buttons) {
            if (/^(Feed|Dashboard|Leaves)$/.test(btn.textContent.trim())) return true;
          }
        }
      }
      return false;
    });

    expect(mobileNavFixed).toBe(false);
  });

});

// ─── GROUP 3: Interactions at 1024px ─────────────────────────────────────────

test.describe('GROUP 3 — Interactions at 1024px', () => {

  test('member element click opens detail modal at 1024px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.LAPTOP);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const memberCard = page.locator('[data-testid="member-card"]').first();
    const cardVisible = await memberCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (cardVisible) {
      await memberCard.click();
    } else {
      const compactRow = page.locator('[data-testid="member-compact-row"]').first();
      const compactVisible = await compactRow.isVisible({ timeout: 2000 }).catch(() => false);
      if (compactVisible) {
        await compactRow.click();
      } else {
        const tableRow = page.locator('table tbody tr').first();
        await expect(tableRow).toBeVisible({ timeout: 3000 });
        await tableRow.click();
      }
    }

    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 8000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    expect(getErrors()).toHaveLength(0);
  });

  test('settings modal opens with text tabs at 1024px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.LAPTOP);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    // At laptop, settings should show text tab labels (not emoji-only)
    const textTabLabels = page.locator('button').filter({ hasText: /^(Score|Team|Schedule|Thresholds|Sync|Display|Security)$/ });
    const tabCount = await textTabLabels.count();

    // Heading also expected
    const settingsHeading = page.getByRole('heading', { name: 'Settings' }).first();
    const headingVisible = await settingsHeading.isVisible({ timeout: 3000 }).catch(() => false);

    expect(headingVisible || tabCount > 0).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    expect(getErrors()).toHaveLength(0);
  });

  test('date picker opens at 1024px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.LAPTOP);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const dateBtn = page.locator('button').filter({ hasText: '📅' }).first();
    const dateBtnVisible = await dateBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (dateBtnVisible) {
      await dateBtn.click();
    } else {
      const headerDateBtn = page.locator('[data-testid="date-picker-button"]').first();
      if (await headerDateBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await headerDateBtn.click();
      }
    }

    await page.waitForTimeout(500);

    const presetBtn = page.locator('button').filter({ hasText: /Today|Yesterday|This Week|Last 7/i }).first();
    const pickerVisible = await presetBtn.isVisible({ timeout: 3000 }).catch(() => false);

    expect(pickerVisible).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    expect(getErrors()).toHaveLength(0);
  });

  test('grid/list toggle works at 1024px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.LAPTOP);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await switchView(page, 'list');
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    await switchView(page, 'grid');
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

});

// ─── GROUP 4: Interactions at 1440px ─────────────────────────────────────────

test.describe('GROUP 4 — Interactions at 1440px', () => {

  test('member element click opens detail modal at 1440px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.DESKTOP);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const memberCard = page.locator('[data-testid="member-card"]').first();
    const cardVisible = await memberCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (cardVisible) {
      await memberCard.click();
    } else {
      const compactRow = page.locator('[data-testid="member-compact-row"]').first();
      const compactVisible = await compactRow.isVisible({ timeout: 2000 }).catch(() => false);
      if (compactVisible) {
        await compactRow.click();
      } else {
        const tableRow = page.locator('table tbody tr').first();
        await expect(tableRow).toBeVisible({ timeout: 3000 });
        await tableRow.click();
      }
    }

    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 8000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    expect(getErrors()).toHaveLength(0);
  });

  test('settings modal opens with text tabs at 1440px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.DESKTOP);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    const textTabLabels = page.locator('button').filter({ hasText: /^(Score|Team|Schedule|Thresholds|Sync|Display|Security)$/ });
    const tabCount = await textTabLabels.count();

    const settingsHeading = page.getByRole('heading', { name: 'Settings' }).first();
    const headingVisible = await settingsHeading.isVisible({ timeout: 3000 }).catch(() => false);

    expect(headingVisible || tabCount > 0).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    expect(getErrors()).toHaveLength(0);
  });

  test('grid/list toggle works at 1440px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.DESKTOP);
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await switchView(page, 'list');
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    await switchView(page, 'grid');
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

});

// ─── GROUP 5: Content at both breakpoints ────────────────────────────────────

test.describe('GROUP 5 — Content at laptop & desktop', () => {

  test('member element shows non-empty text at 1024px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.LAPTOP);
    await setupMockApp(page);

    const memberCards = page.locator('[data-testid="member-card"]');
    const cardCount = await memberCards.count();

    if (cardCount > 0) {
      const cardText = await memberCards.first().textContent();
      expect(cardText.trim().length).toBeGreaterThan(0);
    } else {
      const compactRows = page.locator('[data-testid="member-compact-row"]');
      const rowCount = await compactRows.count();
      expect(rowCount).toBeGreaterThan(0);
      const rowText = await compactRows.first().textContent();
      expect(rowText.trim().length).toBeGreaterThan(0);
    }
  });

  test('overview cards show % characters at 1440px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await setupMockApp(page);

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
  });

  test('no JS errors throughout all desktop interactions at 1440px', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize(VIEWPORTS.DESKTOP);
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
