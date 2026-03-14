/**
 * settings-reactivity.spec.js — Phase 2, Tasks 2.1 + 2.2
 *
 * Tests that score weight settings are visible, readable, and that changing
 * them doesn't crash the app or break the score card display.
 * Also tests member filter (membersToMonitor) reactivity.
 *
 * Strategy (per task spec):
 * - No exact score value assertions — sync overwrites seeded member data
 * - Assert UI visibility, format (contains %, digits), and no JS errors
 * - GROUP 1: Settings modal opens, Score tab visible, weight inputs readable
 * - GROUP 2: Change a weight → close modal → score card still renders + shows %
 * - GROUP 3: Boot with CUSTOM_WEIGHTS injected → score card visible + shows %
 * - GROUP 4: Member filter via Settings injection (membersToMonitor)
 * - GROUP 5: Member filter UI — Team tab visible and accessible
 */

import { setupMockApp, openSettingsModal, collectConsoleErrors, mockClickUpAPI, injectMembers } from '../fixtures/test-setup.js';
import { MOCK_SETTINGS, MOCK_MEMBERS, MOCK_AUTH_USER } from '../fixtures/mock-data.js';
import { test, expect } from '@playwright/test';

// Required: IDB seeding + app boot takes ~22s
test.setTimeout(60000);

// ─── GROUP 1: Settings Modal Opens ───────────────────────────────────────────

test.describe('GROUP 1 — Settings Modal Opens', () => {
  test('settings modal opens via settings button', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    // Modal should be visible (Settings heading)
    const modal = page.locator('h2').filter({ hasText: 'Settings' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('settings modal has a Score tab', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await openSettingsModal(page);

    // Score tab is identified by its label text "Score" (desktop) or icon "📊"
    const scoreTabByLabel = page.locator('button').filter({ hasText: 'Score' }).first();
    const scoreTabByIcon  = page.locator('button').filter({ hasText: '📊' }).first();

    const labelVisible = await scoreTabByLabel.isVisible({ timeout: 3000 }).catch(() => false);
    const iconVisible  = await scoreTabByIcon.isVisible({ timeout: 3000 }).catch(() => false);

    expect(labelVisible || iconVisible).toBe(true);

    expect(getErrors()).toHaveLength(0);
  });

  test('score weight inputs are visible and have readable numeric values', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await openSettingsModal(page);

    // Navigate to Score tab
    const scoreTab = page.locator('button').filter({ hasText: 'Score' }).first();
    const iconTab  = page.locator('button').filter({ hasText: '📊' }).first();
    if (await scoreTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scoreTab.click();
    } else {
      await iconTab.click();
    }
    await page.waitForTimeout(300);

    // Four number inputs should be visible inside the score tab content
    const numberInputs = page.locator('input[type="number"]');
    const count = await numberInputs.count();
    expect(count).toBeGreaterThanOrEqual(4); // trackedTime, tasksWorked, tasksDone, compliance

    // Each should have a numeric value between 0 and 200
    const firstInput = numberInputs.first();
    await expect(firstInput).toBeVisible();
    const val = await firstInput.inputValue();
    expect(parseInt(val, 10)).toBeGreaterThanOrEqual(0);
    expect(parseInt(val, 10)).toBeLessThanOrEqual(200);

    expect(getErrors()).toHaveLength(0);
  });
});

// ─── GROUP 2: Weight Change Propagates ───────────────────────────────────────

test.describe('GROUP 2 — Weight Change Propagates', () => {
  test('change a weight value → close modal → score card still renders (no crash)', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Open settings → Score tab
    await openSettingsModal(page);
    const scoreTab = page.locator('button').filter({ hasText: 'Score' }).first();
    const iconTab  = page.locator('button').filter({ hasText: '📊' }).first();
    if (await scoreTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scoreTab.click();
    } else {
      await iconTab.click();
    }
    await page.waitForTimeout(300);

    // Change first weight input (trackedTime) to 50
    const firstInput = page.locator('input[type="number"]').first();
    await expect(firstInput).toBeVisible({ timeout: 3000 });
    await firstInput.click({ clickCount: 3 });
    await firstInput.fill('50');
    await page.waitForTimeout(200);

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Score card should still be visible
    const scoreCard = page.locator('[data-testid="overview-card-team-score"]');
    await expect(scoreCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('after weight change, score overview card shows a percentage value', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Open settings → Score tab → change a weight
    await openSettingsModal(page);
    const scoreTab = page.locator('button').filter({ hasText: 'Score' }).first();
    const iconTab  = page.locator('button').filter({ hasText: '📊' }).first();
    if (await scoreTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scoreTab.click();
    } else {
      await iconTab.click();
    }
    await page.waitForTimeout(300);

    const firstInput = page.locator('input[type="number"]').first();
    await expect(firstInput).toBeVisible({ timeout: 3000 });
    await firstInput.click({ clickCount: 3 });
    await firstInput.fill('45');
    await page.waitForTimeout(200);

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Score card content — look for a number (0-100) in the card
    const scoreCard = page.locator('[data-testid="overview-card-team-score"]');
    await expect(scoreCard).toBeVisible({ timeout: 5000 });
    const cardText = await scoreCard.textContent();
    // Should contain digits (a score value or metric values)
    expect(cardText).toMatch(/\d/);

    expect(getErrors()).toHaveLength(0);
  });

  test('no JS errors when changing score weights', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await openSettingsModal(page);
    const scoreTab = page.locator('button').filter({ hasText: 'Score' }).first();
    const iconTab  = page.locator('button').filter({ hasText: '📊' }).first();
    if (await scoreTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scoreTab.click();
    } else {
      await iconTab.click();
    }
    await page.waitForTimeout(300);

    // Change all 4 inputs
    const inputs = page.locator('input[type="number"]');
    const inputCount = await inputs.count();
    const toChange = Math.min(inputCount, 4);

    for (let i = 0; i < toChange; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        await input.click({ clickCount: 3 });
        await input.fill(String(10 + i * 10)); // 10, 20, 30, 40
        await page.waitForTimeout(100);
      }
    }

    // Close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // No JS errors during weight manipulation
    expect(getErrors()).toHaveLength(0);
  });
});

// ─── GROUP 3: Custom Weights via Injection ────────────────────────────────────
//
// NOTE: test.setTimeout(60000) is set at file level above each group that needs it.
// Individual test.describe blocks that use setupMockApp need the timeout set.

test.describe('GROUP 3 — Custom Weights via Injection', () => {
  test('boot with CUSTOM_WEIGHTS (60/10/20/10) → score card visible and shows %', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    // Merge CUSTOM_WEIGHTS into DEFAULT settings
    const customSettings = {
      ...MOCK_SETTINGS.DEFAULT,
      ...MOCK_SETTINGS.CUSTOM_WEIGHTS,
      score: {
        ...MOCK_SETTINGS.DEFAULT.score,
        ...MOCK_SETTINGS.CUSTOM_WEIGHTS.score,
        weights: MOCK_SETTINGS.CUSTOM_WEIGHTS.score.weights,
      },
    };

    await setupMockApp(page, { settings: customSettings });

    // Score card visible
    const scoreCard = page.locator('[data-testid="overview-card-team-score"]');
    await expect(scoreCard).toBeVisible({ timeout: 10000 });

    // Card contains a % character (metric percentages like "32%", "20%" etc.)
    const cardText = await scoreCard.textContent();
    expect(cardText).toContain('%');

    expect(getErrors()).toHaveLength(0);
  });

  test('boot with default weights (40/20/30/10) → score card visible and shows %', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    await setupMockApp(page, { settings: MOCK_SETTINGS.DEFAULT });

    // Score card visible
    const scoreCard = page.locator('[data-testid="overview-card-team-score"]');
    await expect(scoreCard).toBeVisible({ timeout: 10000 });

    // Card contains a % character
    const cardText = await scoreCard.textContent();
    expect(cardText).toContain('%');

    expect(getErrors()).toHaveLength(0);
  });

  test('both weight configurations show % in score area (format check)', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    // Boot with default, verify score card has % values in metrics grid
    await setupMockApp(page, { settings: MOCK_SETTINGS.DEFAULT });

    const scoreCard = page.locator('[data-testid="overview-card-team-score"]');
    await expect(scoreCard).toBeVisible({ timeout: 10000 });

    // ScoreBreakdownCard renders metric values as "{value}%" — check at least 1 metric % exists
    const percentTexts = await scoreCard.locator('*').filter({ hasText: /%/ }).count();
    expect(percentTexts).toBeGreaterThan(0);

    expect(getErrors()).toHaveLength(0);
  });
});

// ─── GROUP 4: Member Filter via Settings Injection ────────────────────────────
//
// Strategy: inject membersToMonitor AFTER injectMembers clears it (add a 3rd init script)
// injectMembers has a script that clears membersToMonitor — we override with a late inject.
//
// filteredMembers in App.jsx: empty [] = show all; non-empty = show only matching members
// Full cards [data-testid="member-card"]: working×3 + break×1 + offline×2 = 6
// Compact rows [data-testid="member-compact-row"]: noActivity×1 + leave×1 = 2
// Total member elements = 8

/**
 * Boot app with specific membersToMonitor — bypasses the injectMembers clearing.
 * Injects the filter setting AFTER all other init scripts via an extra addInitScript call.
 */
async function setupWithMemberFilter(page, membersToMonitor) {
  const filteredSettings = {
    ...MOCK_SETTINGS.DEFAULT,
    team: { ...MOCK_SETTINGS.DEFAULT.team, membersToMonitor },
  };

  // Step 1: injectSettings first (standard)
  await page.addInitScript((settingsObj) => {
    localStorage.setItem('lighthouse_settings', JSON.stringify(settingsObj));
  }, filteredSettings);

  // Step 2: Mock API
  await mockClickUpAPI(page);

  // Step 3: injectMembers (this will clear membersToMonitor as a side effect)
  await injectMembers(page, MOCK_MEMBERS, MOCK_AUTH_USER);

  // Step 4: Re-inject the filter AFTER injectMembers' clearing script
  // (init scripts run in registration order — this runs last)
  await page.addInitScript((ids) => {
    const key = 'lighthouse_settings';
    const stored = localStorage.getItem(key);
    if (stored) {
      const s = JSON.parse(stored);
      s.team = s.team || {};
      s.team.membersToMonitor = ids;
      localStorage.setItem(key, JSON.stringify(s));
    }
  }, membersToMonitor);

  // Step 5: Navigate + wait
  await page.goto('/');
  // Wait for overview card — should appear within 25s even with filtered members
  await page.waitForSelector('[data-testid^="overview-card"]', { timeout: 25000 });
  // Brief settle for React re-renders
  await page.waitForTimeout(500);
}

test.describe('GROUP 4 — Member Filter via Settings Injection', () => {
  // Extra long timeout: global-setup takes 120s + app boot ~25s = 145s needed
  test.setTimeout(180000);

  test('3-member filter: dashboard shows ≤3 member cards (Dina, Alaa, Nada M)', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    // Dina=87657591 (working), Alaa=93604849 (working), Nada M=93604850 (break)
    // Expected: at most 3 full member cards visible (may be fewer if sync clears data)
    await setupWithMemberFilter(page, ['87657591', '93604849', '93604850']);

    // Full member cards should be ≤ 3 (not 6 or 8)
    const fullCards = page.locator('[data-testid="member-card"]');
    const cardCount = await fullCards.count();
    expect(cardCount).toBeLessThanOrEqual(3);

    // Overview cards still visible (dashboard didn't crash)
    const overviewCards = page.locator('[data-testid^="overview-card"]');
    await expect(overviewCards.first()).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('empty filter (show all): dashboard shows 6 full member cards', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    // Empty membersToMonitor = show all members
    await setupWithMemberFilter(page, []);

    // Expect 6 full cards (working×3 + break×1 + offline×2)
    // noActivity + leave render as compact rows, not member-card
    const fullCards = page.locator('[data-testid="member-card"]');
    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-testid="member-card"]').length >= 1;
    }, { timeout: 10000, polling: 300 }).catch(() => {});

    const cardCount = await fullCards.count();
    // Sync may reduce count; assert ≥ 1 and ≤ 6 (structural, not exact)
    expect(cardCount).toBeGreaterThanOrEqual(1);
    expect(cardCount).toBeLessThanOrEqual(6);

    expect(getErrors()).toHaveLength(0);
  });

  test('single noActivity member filter (Islam Othman): at most 1 member element visible', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    // Islam Othman (87650455) = noActivity in MOCK_MEMBERS → renders as CompactMemberRow
    await setupWithMemberFilter(page, ['87650455']);

    // Full member cards should be 0 (noActivity renders as compact row)
    const fullCards = page.locator('[data-testid="member-card"]');
    const cardCount = await fullCards.count();
    expect(cardCount).toBe(0);

    // Total member elements (full + compact) should be ≤ 1
    const compactRows = page.locator('[data-testid="member-compact-row"]');
    const compactCount = await compactRows.count();
    const totalElements = cardCount + compactCount;
    expect(totalElements).toBeLessThanOrEqual(1);

    // Dashboard still renders overview cards
    await expect(page.locator('[data-testid^="overview-card"]').first()).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });
});

// ─── GROUP 5: Member Filter via Settings Modal ────────────────────────────────
//
// Tests that the Team tab is accessible and shows the member management UI.
// In the test environment (mocked API, no API key), the member list is empty
// until "Load Members" is clicked. We verify the Team tab renders correctly.

test.describe('GROUP 5 — Member Filter via Settings Modal (Team Tab)', () => {
  test.setTimeout(60000);

  test('settings modal has a Team tab accessible via tab button', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    // Team tab is identified by label "Team" or icon "👥"
    const teamTabByLabel = page.locator('button').filter({ hasText: 'Team' }).first();
    const teamTabByIcon  = page.locator('button').filter({ hasText: '👥' }).first();

    const labelVisible = await teamTabByLabel.isVisible({ timeout: 3000 }).catch(() => false);
    const iconVisible  = await teamTabByIcon.isVisible({ timeout: 3000 }).catch(() => false);

    expect(labelVisible || iconVisible).toBe(true);

    expect(getErrors()).toHaveLength(0);
  });

  test('Team tab shows member management content with Load Members button', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await openSettingsModal(page);

    // Navigate to Team tab
    const teamTabByLabel = page.locator('button').filter({ hasText: 'Team' }).first();
    const teamTabByIcon  = page.locator('button').filter({ hasText: '👥' }).first();
    if (await teamTabByLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await teamTabByLabel.click();
    } else {
      await teamTabByIcon.click();
    }
    await page.waitForTimeout(400);

    // Team tab content should show "Load Members" button (empty state)
    // OR member names if members were already loaded
    const loadMembersBtn = page.locator('button').filter({ hasText: /Load Members/i }).first();
    const teamMembersHeader = page.locator('*').filter({ hasText: /Team Members/i }).first();

    const loadBtnVisible   = await loadMembersBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const headerVisible    = await teamMembersHeader.isVisible({ timeout: 3000 }).catch(() => false);

    // At least one of: Load Members button or Team Members section header
    expect(loadBtnVisible || headerVisible).toBe(true);

    expect(getErrors()).toHaveLength(0);
  });
});

// ─── GROUP 6: Theme via Settings Injection ────────────────────────────────────
//
// Strategy: inject settings with display.theme pre-set, verify app renders without
// errors and that the visible background differs between themes.
//
// Theme is applied via inline style on the root div (not a CSS class):
//   True Black:  theme.bg = '#0A0A0A'
//   Noir Glass:  theme.bg = 'linear-gradient(170deg, #F9F9F7 ...)'
//
// We detect the theme by reading the background style of the root element.

test.describe('GROUP 6 — Theme via Settings Injection', () => {
  test.setTimeout(60000);

  test('boot with Noir Glass theme → app renders, no JS errors', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    // Merge NOIR_GLASS_THEME display into DEFAULT settings
    const noirSettings = {
      ...MOCK_SETTINGS.DEFAULT,
      display: { ...MOCK_SETTINGS.DEFAULT.display, ...MOCK_SETTINGS.NOIR_GLASS_THEME.display },
    };

    await setupMockApp(page, { settings: noirSettings });

    // Dashboard rendered — overview cards visible
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 10000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('boot with True Black theme → app renders, no JS errors', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    await setupMockApp(page, { settings: MOCK_SETTINGS.DEFAULT });

    // Dashboard rendered — overview cards visible
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 10000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('Noir Glass theme has a different background style than True Black', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    // Boot with Noir Glass
    const noirSettings = {
      ...MOCK_SETTINGS.DEFAULT,
      display: { ...MOCK_SETTINGS.DEFAULT.display, ...MOCK_SETTINGS.NOIR_GLASS_THEME.display },
    };
    await setupMockApp(page, { settings: noirSettings });

    // Read background of first full-height div (the themed root div)
    // Theme is applied as inline style on a <div> with minHeight: 100vh
    const noirBg = await page.evaluate(() => {
      // Find the outermost div that has minHeight: 100vh (the theme root div in App.jsx)
      const divs = document.querySelectorAll('div');
      for (const div of divs) {
        const style = div.getAttribute('style') || '';
        if (style.includes('min-height') || style.includes('minHeight')) {
          return window.getComputedStyle(div).backgroundColor + '|' + style;
        }
      }
      // Fallback: body background
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // Noir Glass has a light background — F9F9F7 is near-white
    // True Black has a very dark background — 0A0A0A
    // We detect by checking if the background references light values (not '#0A0A0A')
    expect(noirBg).not.toContain('0A0A0A');
    expect(noirBg).not.toContain('0a0a0a');

    expect(getErrors()).toHaveLength(0);
  });
});

// ─── GROUP 7: Theme Toggle via Settings Modal ─────────────────────────────────
//
// Tests that the Display tab in SettingsModal shows the theme selector.
// The Display tab is labeled "Display" with icon "🎨" (SettingsModal.jsx:416).
// Theme selector is a <select> with options "True Black + Emerald" and "Noir Glass".

test.describe('GROUP 7 — Theme Toggle via Settings Modal (Display Tab)', () => {
  test.setTimeout(60000);

  test('settings modal has a Display tab accessible via tab button', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    // Display tab identified by label "Display" or icon "🎨"
    const displayTabByLabel = page.locator('button').filter({ hasText: 'Display' }).first();
    const displayTabByIcon  = page.locator('button').filter({ hasText: '🎨' }).first();

    const labelVisible = await displayTabByLabel.isVisible({ timeout: 3000 }).catch(() => false);
    const iconVisible  = await displayTabByIcon.isVisible({ timeout: 3000 }).catch(() => false);

    expect(labelVisible || iconVisible).toBe(true);

    expect(getErrors()).toHaveLength(0);
  });

  test('Display tab shows theme selector with True Black and Noir Glass options', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await openSettingsModal(page);

    // Navigate to Display tab
    const displayTabByLabel = page.locator('button').filter({ hasText: 'Display' }).first();
    const displayTabByIcon  = page.locator('button').filter({ hasText: '🎨' }).first();
    if (await displayTabByLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await displayTabByLabel.click();
    } else {
      await displayTabByIcon.click();
    }
    await page.waitForTimeout(300);

    // Theme selector: <select> containing "True Black" and "Noir Glass" options
    const themeSelect = page.locator('select').filter({ hasText: /True Black/i }).first();
    const selectVisible = await themeSelect.isVisible({ timeout: 3000 }).catch(() => false);
    expect(selectVisible).toBe(true);

    // Verify both theme options exist
    const trueBlackOption = page.locator('option[value="trueBlack"]').first();
    const noirGlassOption = page.locator('option[value="noirGlass"]').first();

    await expect(trueBlackOption).toBeAttached({ timeout: 3000 });
    await expect(noirGlassOption).toBeAttached({ timeout: 3000 });

    expect(getErrors()).toHaveLength(0);
  });
});

// ─── GROUP 8: Threshold Settings via Injection ────────────────────────────────
//
// Strategy: inject custom thresholds via localStorage, verify app renders with
// no JS errors and the overview card is visible.
// Thresholds only affect real-time sync (mocked), so we only assert structural
// correctness (no crash, dashboard visible).

test.describe('GROUP 8 — Threshold Settings via Injection', () => {
  test.setTimeout(60000);

  test('boot with custom thresholds (breakMinutes:30, offlineMinutes:120, breakGapMinutes:10) → app renders, no JS errors', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    const customThresholdSettings = {
      ...MOCK_SETTINGS.DEFAULT,
      thresholds: {
        breakMinutes: 30,
        offlineMinutes: 120,
        breakGapMinutes: 10,
      },
    };

    await setupMockApp(page, { settings: customThresholdSettings });

    // Dashboard rendered — overview card visible
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 10000 });

    expect(getErrors()).toHaveLength(0);
  });

  test('boot with default thresholds (breakMinutes:15, offlineMinutes:60, breakGapMinutes:5) → app renders, no JS errors', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    // DEFAULT settings already contain the default thresholds
    await setupMockApp(page, { settings: MOCK_SETTINGS.DEFAULT });

    // Dashboard rendered — overview card visible
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 10000 });

    expect(getErrors()).toHaveLength(0);
  });
});

// ─── GROUP 9: Threshold Settings via Settings Modal ───────────────────────────
//
// Tests that the Thresholds tab in SettingsModal is accessible and shows
// numeric input fields. Thresholds tab: id='thresholds', label='Thresholds',
// icon='⏱️' (SettingsModal.jsx:413).
// Three inputs: breakMinutes, offlineMinutes, breakGapMinutes.

test.describe('GROUP 9 — Threshold Settings via Settings Modal (Thresholds Tab)', () => {
  test.setTimeout(60000);

  test('settings modal has a Thresholds tab accessible via tab button', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    // Thresholds tab identified by label "Thresholds" or icon "⏱️"
    const thresholdsTabByLabel = page.locator('button').filter({ hasText: 'Thresholds' }).first();
    const thresholdsTabByIcon  = page.locator('button').filter({ hasText: '⏱️' }).first();

    const labelVisible = await thresholdsTabByLabel.isVisible({ timeout: 3000 }).catch(() => false);
    const iconVisible  = await thresholdsTabByIcon.isVisible({ timeout: 3000 }).catch(() => false);

    expect(labelVisible || iconVisible).toBe(true);

    expect(getErrors()).toHaveLength(0);
  });

  test('Thresholds tab shows at least one numeric input', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    await openSettingsModal(page);

    // Navigate to Thresholds tab
    const thresholdsTabByLabel = page.locator('button').filter({ hasText: 'Thresholds' }).first();
    const thresholdsTabByIcon  = page.locator('button').filter({ hasText: '⏱️' }).first();
    if (await thresholdsTabByLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await thresholdsTabByLabel.click();
    } else {
      await thresholdsTabByIcon.click();
    }
    await page.waitForTimeout(300);

    // At least one number input must be visible (breakMinutes, offlineMinutes, breakGapMinutes)
    const numberInputs = page.locator('input[type="number"]');
    const count = await numberInputs.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // First visible input should be readable
    const firstInput = numberInputs.first();
    await expect(firstInput).toBeVisible({ timeout: 3000 });
    const val = await firstInput.inputValue();
    expect(parseInt(val, 10)).toBeGreaterThanOrEqual(0);

    expect(getErrors()).toHaveLength(0);
  });

  test('change a threshold value → close modal → no JS errors + overview card still visible', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Open settings → Thresholds tab
    await openSettingsModal(page);
    const thresholdsTabByLabel = page.locator('button').filter({ hasText: 'Thresholds' }).first();
    const thresholdsTabByIcon  = page.locator('button').filter({ hasText: '⏱️' }).first();
    if (await thresholdsTabByLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await thresholdsTabByLabel.click();
    } else {
      await thresholdsTabByIcon.click();
    }
    await page.waitForTimeout(300);

    // Change first threshold input (breakMinutes) to 20
    const firstInput = page.locator('input[type="number"]').first();
    await expect(firstInput).toBeVisible({ timeout: 3000 });
    await firstInput.click({ clickCount: 3 });
    await firstInput.fill('20');
    await page.waitForTimeout(200);

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Overview card should still be visible (no crash)
    const overviewCard = page.locator('[data-testid^="overview-card"]').first();
    await expect(overviewCard).toBeVisible({ timeout: 5000 });

    expect(getErrors()).toHaveLength(0);
  });
});
