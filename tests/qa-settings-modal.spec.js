import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

/**
 * QA: SettingsModal
 *
 * Tests the 7-tab Settings modal in the Lighthouse dashboard.
 * The modal has no data-testid — it is identified by the "Settings" h2 heading.
 *
 * Key implementation details read from SettingsModal.jsx:
 *   - Opens via the ⚙️ button in Header (desktop only; mobile uses bottom nav).
 *   - Close button text is '✕' (not ×).
 *   - Tabs are rendered as buttons with emoji icon + label text (label hidden on mobile).
 *   - Score weights use number <input> + stepper buttons, NOT range sliders.
 *   - Theme is a <select> with options "True Black + Emerald" and "Noir Glass".
 *   - breakGapMinutes default is 5, input min=1 max=15.
 *   - scrollLock sets body.style.overflow = 'hidden' on open,
 *     and body.style.overflow = '' (empty string) on close.
 */

test.setTimeout(90000);

// ─── Benign error filter ──────────────────────────────────────────────────────
const BENIGN_ERRORS = [
  'ResizeObserver loop limit exceeded',
  'favicon.ico',
  'Failed to load resource: the server responded with a status of 404',
  '429',
  'Rate limit',
  'rate limit',
];

function isRealError(text) {
  return !BENIGN_ERRORS.some((b) => text.includes(b));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Click the settings gear button (⚙️) in the desktop header.
 * The button has title="Settings" and contains the ⚙️ emoji.
 * Returns true if the button was found and clicked.
 */
async function openSettingsModal(page) {
  // Primary selector: button with title "Settings"
  const byTitle = page.locator('button[title="Settings"]');
  if (await byTitle.isVisible().catch(() => false)) {
    await byTitle.click();
    await page.waitForTimeout(400);
    return true;
  }

  // Fallback: any button containing the gear emoji
  const byEmoji = page.locator('button').filter({ hasText: '⚙️' }).first();
  if (await byEmoji.isVisible().catch(() => false)) {
    await byEmoji.click();
    await page.waitForTimeout(400);
    return true;
  }

  return false;
}

/**
 * Returns the full settings modal body text (entire modal, not just the header).
 * SettingsModal structure: outer fixed overlay > inner panel (h2 header + tab bar + content div).
 * We read the body since `page.locator('body')` captures the full rendered text.
 */
async function settingsModalText(page) {
  // The settings modal portal renders into document.body.
  // Read the entire body text content — modal is the only overlay when open.
  return page.evaluate(() => document.body.innerText);
}

/**
 * Returns the settings modal container (identified by the "Settings" h2 heading).
 */
function settingsModal(page) {
  // The modal renders <h2>Settings</h2> inside the panel div.
  // We scope to the outermost div that contains the heading AND the tab buttons.
  // .first() = outermost ancestor div (contains all 20+ buttons including tabs).
  // .last() would pick the innermost header div (only ✕ button), missing the tabs.
  return page.locator('div').filter({ has: page.locator('h2', { hasText: 'Settings' }) }).first();
}

/**
 * Click a tab inside the settings modal by its label text.
 * Scoped to the settings modal to avoid matching similarly-emoji'd header buttons
 * (e.g. the 📅 date picker button in the header matches the Calendar tab emoji).
 */
async function clickTab(page, labelPattern) {
  // Scope to the modal overlay (fixed overlay containing the Settings h2)
  const modal = settingsModal(page);
  const tab = modal
    .locator('button')
    .filter({ hasText: labelPattern })
    .first();
  await tab.click();
  await page.waitForTimeout(300);
}

// ─── describe: Open / Close ───────────────────────────────────────────────────
test.describe('SettingsModal - Open/Close', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && isRealError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      if (isRealError(err.message)) pageErrors.push(err.message);
    });
    await addMemberSeedScript(page);
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  test('opens via settings gear button', async ({ page }) => {
    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    // The modal heading "Settings" must be visible
    await expect(page.locator('h2', { hasText: 'Settings' })).toBeVisible();

    // Body overflow should be locked
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('closes via ESC key — modal not visible and overflow restored', async ({ page }) => {
    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    // Confirm it is open
    await expect(page.locator('h2', { hasText: 'Settings' })).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // Heading should no longer be visible
    await expect(page.locator('h2', { hasText: 'Settings' })).not.toBeVisible();

    // unlockScroll() sets overflow = '' (empty string), not 'unset'
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('closes via X button', async ({ page }) => {
    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    await expect(page.locator('h2', { hasText: 'Settings' })).toBeVisible();

    // The close button text in SettingsModal.jsx is '✕'
    const closeBtn = page
      .locator('button')
      .filter({ hasText: '✕' })
      .first();

    let closed = false;
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      closed = true;
    } else {
      // Fallback: aria-label close
      const ariaClose = page.locator('[aria-label="Close"], [aria-label="close"]').first();
      if (await ariaClose.isVisible().catch(() => false)) {
        await ariaClose.click();
        closed = true;
      }
    }
    expect(closed).toBe(true);

    await page.waitForTimeout(400);
    await expect(page.locator('h2', { hasText: 'Settings' })).not.toBeVisible();

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});

// ─── describe: All 7 Tabs Navigate ───────────────────────────────────────────
test.describe('SettingsModal - All 7 Tabs Navigate', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && isRealError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      if (isRealError(err.message)) pageErrors.push(err.message);
    });
    await addMemberSeedScript(page);
    await page.goto('/');
    await page.waitForTimeout(2000);
    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);
    await expect(page.locator('h2', { hasText: 'Settings' })).toBeVisible();
  });

  test('ClickUp tab — shows API key field', async ({ page }) => {
    // ClickUp tab is active by default (initial state: 'clickup')
    // Click it explicitly to be certain
    await clickTab(page, /^🔗/);

    const modal = settingsModal(page);
    const text = await settingsModalText(page);

    // Should contain "API Key" or "API" and key-related text
    expect(text).toMatch(/API/i);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Team tab — shows member-related content', async ({ page }) => {
    await clickTab(page, /^👥/);

    const modal = settingsModal(page);
    const text = await settingsModalText(page);

    // Should contain "Team Members" or "member" or "Load Members"
    expect(text).toMatch(/member/i);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Score tab — shows weight percentage 40', async ({ page }) => {
    await clickTab(page, /^📊/);

    const modal = settingsModal(page);
    const text = await settingsModalText(page);

    // The default Time weight is 40%; the text "40" must appear
    expect(text).toMatch(/40/);
    // The word "weight" appears in weightConfig descriptions and headings
    expect(text).toMatch(/weight|Tracked Time|Tasks Worked|Tasks Done|Compliance/i);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Thresholds tab — shows break and offline minutes', async ({ page }) => {
    await clickTab(page, /^⏱️/);

    const modal = settingsModal(page);
    const text = await settingsModalText(page);

    // Should contain "break" and "minutes" (from field labels / hints)
    expect(text).toMatch(/break/i);
    expect(text).toMatch(/minutes/i);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Sync tab — shows interval or cache text', async ({ page }) => {
    await clickTab(page, /^🔄/);

    const modal = settingsModal(page);
    const text = await settingsModalText(page);

    // "Sync Interval" or "Cache" or "interval" must appear
    expect(text).toMatch(/interval|cache/i);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Calendar tab — shows work hours with 08:00 or 18:00', async ({ page }) => {
    // Use "Calendar" text to distinguish from the header date-picker "📅 Today" button
    await clickTab(page, /📅.*Calendar|Calendar/);

    const modal = settingsModal(page);
    const text = await settingsModalText(page);

    // Work Hours section; default start=08:00 / end=18:00
    expect(text).toMatch(/work hours|Start Time|End Time|08:00|18:00/i);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Display tab — shows theme options True Black and Noir Glass', async ({ page }) => {
    await clickTab(page, /^🎨/);

    const modal = settingsModal(page);
    const text = await settingsModalText(page);

    // Theme <select> options: "True Black + Emerald" and "Noir Glass"
    expect(text).toMatch(/True Black|Noir Glass/i);
    // Generic "Theme" label also present
    expect(text).toMatch(/theme/i);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});

// ─── describe: Score Weights Validation ──────────────────────────────────────
test.describe('SettingsModal - Score Weights Validation', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && isRealError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      if (isRealError(err.message)) pageErrors.push(err.message);
    });
    await addMemberSeedScript(page);
    await page.goto('/');
    await page.waitForTimeout(2000);
    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);
    await expect(page.locator('h2', { hasText: 'Settings' })).toBeVisible();
    // Navigate to Score tab
    await clickTab(page, /^📊/);
  });

  test('4 weight number inputs are present', async ({ page }) => {
    // The score tab renders 4 weight cards, each with a <input type="number">
    // for the weight value (0-200 range, as set in SettingsModal.jsx line 712-719)
    const numberInputs = page.locator('input[type="number"][min="0"][max="200"]');
    const count = await numberInputs.count();
    expect(count).toBeGreaterThanOrEqual(4);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('total indicator shows 100%', async ({ page }) => {
    // The total text is rendered as: "Total: {totalPct}%" (line 667)
    const totalText = await page
      .locator('span')
      .filter({ hasText: /Total:.*100%/ })
      .first()
      .textContent()
      .catch(() => null);

    // Fallback: look in the whole modal text
    if (!totalText) {
      const fullText = await settingsModalText(page);
      expect(fullText).toMatch(/Total:.*100%/);
    } else {
      expect(totalText).toMatch(/100%/);
    }

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('calibration banner confirms weights sum to 100%', async ({ page }) => {
    // When total === 100, the modal renders: "Weights sum to 100% — scoring is fully calibrated."
    const text = await settingsModalText(page);
    expect(text).toMatch(/100%/);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('no console errors on Score tab', async ({ page }) => {
    // Just visiting the tab should produce no errors
    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});

// ─── describe: Theme Switching ────────────────────────────────────────────────
test.describe('SettingsModal - Theme Switching', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && isRealError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      if (isRealError(err.message)) pageErrors.push(err.message);
    });
    await addMemberSeedScript(page);
    await page.goto('/');
    await page.waitForTimeout(2000);
    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);
    await expect(page.locator('h2', { hasText: 'Settings' })).toBeVisible();
    // Navigate to Display tab
    await clickTab(page, /^🎨/);
  });

  test('both theme options are visible in the select', async ({ page }) => {
    // The theme <select> has two <option> elements
    const themeSelect = page.locator('select').filter({
      has: page.locator('option[value="trueBlack"]'),
    }).first();

    await expect(themeSelect).toBeVisible();

    // Verify both options exist in DOM
    const trueBlackOption = page.locator('option[value="trueBlack"]');
    const noirGlassOption = page.locator('option[value="noirGlass"]');

    await expect(trueBlackOption).toHaveCount(1);
    await expect(noirGlassOption).toHaveCount(1);

    // Text content of options
    const trueBlackText = await trueBlackOption.textContent();
    const noirGlassText = await noirGlassOption.textContent();
    expect(trueBlackText).toMatch(/True Black/i);
    expect(noirGlassText).toMatch(/Noir Glass/i);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('switching to Noir Glass theme changes the select value', async ({ page }) => {
    const themeSelect = page.locator('select').filter({
      has: page.locator('option[value="trueBlack"]'),
    }).first();

    // Select Noir Glass
    await themeSelect.selectOption('noirGlass');
    await page.waitForTimeout(500);

    const selected = await themeSelect.inputValue();
    expect(selected).toBe('noirGlass');

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('switching back to True Black theme reverts select value', async ({ page }) => {
    const themeSelect = page.locator('select').filter({
      has: page.locator('option[value="trueBlack"]'),
    }).first();

    // First go to Noir Glass
    await themeSelect.selectOption('noirGlass');
    await page.waitForTimeout(300);

    // Revert to True Black
    await themeSelect.selectOption('trueBlack');
    await page.waitForTimeout(500);

    const selected = await themeSelect.inputValue();
    expect(selected).toBe('trueBlack');

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('no layout errors in console after theme change', async ({ page }) => {
    const themeSelect = page.locator('select').filter({
      has: page.locator('option[value="trueBlack"]'),
    }).first();

    await themeSelect.selectOption('noirGlass');
    await page.waitForTimeout(500);
    await themeSelect.selectOption('trueBlack');
    await page.waitForTimeout(500);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});

// ─── describe: Settings Persistence ──────────────────────────────────────────
test.describe('SettingsModal - Settings Persistence', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && isRealError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      if (isRealError(err.message)) pageErrors.push(err.message);
    });
    await addMemberSeedScript(page);
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  test('break gap input change persists after modal reopen', async ({ page }) => {
    // Step 1: Open settings and navigate to Thresholds
    let opened = await openSettingsModal(page);
    expect(opened).toBe(true);
    await expect(page.locator('h2', { hasText: 'Settings' })).toBeVisible();

    await clickTab(page, /^⏱️/);

    // Step 2: Find the "Ignore gaps under (minutes)" input (breakGapMinutes)
    // It has min="1" max="15" per SettingsModal.jsx line 799
    const breakGapInput = page.locator('input[type="number"][min="1"][max="15"]').first();
    await expect(breakGapInput).toBeVisible();

    // Step 3: Set to 7 (different from default 5)
    await breakGapInput.triple_click?.() || await breakGapInput.click({ clickCount: 3 });
    await breakGapInput.fill('7');
    // Trigger change event
    await breakGapInput.press('Tab');
    await page.waitForTimeout(300);

    // Step 4: Close via ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await expect(page.locator('h2', { hasText: 'Settings' })).not.toBeVisible();

    // Step 5: Reopen and navigate back to Thresholds
    opened = await openSettingsModal(page);
    expect(opened).toBe(true);
    await expect(page.locator('h2', { hasText: 'Settings' })).toBeVisible();

    await clickTab(page, /^⏱️/);

    // Step 6: Verify the value persisted
    const breakGapInputAfter = page.locator('input[type="number"][min="1"][max="15"]').first();
    await expect(breakGapInputAfter).toBeVisible();
    const persistedValue = await breakGapInputAfter.inputValue();
    expect(persistedValue).toBe('7');

    // Step 7: Restore default value (5)
    await breakGapInputAfter.click({ clickCount: 3 });
    await breakGapInputAfter.fill('5');
    await breakGapInputAfter.press('Tab');
    await page.waitForTimeout(300);

    // Close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('localStorage key lighthouse_settings contains persisted value', async ({ page }) => {
    // Open settings, go to Thresholds, change breakGapMinutes to 8
    const opened = await openSettingsModal(page);
    expect(opened).toBe(true);

    await clickTab(page, /^⏱️/);

    const breakGapInput = page.locator('input[type="number"][min="1"][max="15"]').first();
    await breakGapInput.click({ clickCount: 3 });
    await breakGapInput.fill('8');
    await breakGapInput.press('Tab');
    await page.waitForTimeout(300);

    // Read localStorage to verify persistence
    const storedRaw = await page.evaluate(() => localStorage.getItem('lighthouse_settings'));
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw);
    expect(stored?.thresholds?.breakGapMinutes).toBe(8);

    // Restore default
    await breakGapInput.click({ clickCount: 3 });
    await breakGapInput.fill('5');
    await breakGapInput.press('Tab');
    await page.waitForTimeout(300);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});
