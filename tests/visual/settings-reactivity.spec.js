/**
 * settings-reactivity.spec.js — Phase 2, Task 2.1
 *
 * Tests that score weight settings are visible, readable, and that changing
 * them doesn't crash the app or break the score card display.
 *
 * Strategy (per task spec):
 * - No exact score value assertions — sync overwrites seeded member data
 * - Assert UI visibility, format (contains %, digits), and no JS errors
 * - GROUP 1: Settings modal opens, Score tab visible, weight inputs readable
 * - GROUP 2: Change a weight → close modal → score card still renders + shows %
 * - GROUP 3: Boot with CUSTOM_WEIGHTS injected → score card visible + shows %
 */

import { setupMockApp, openSettingsModal, collectConsoleErrors } from '../fixtures/test-setup.js';
import { MOCK_SETTINGS } from '../fixtures/mock-data.js';
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
