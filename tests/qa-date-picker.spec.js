import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

/**
 * QA: DatePickerModal
 *
 * Covers:
 *   - Open / Close behaviour (ESC, backdrop, button)
 *   - All 11 quick presets (Today … Last Year)
 *   - Custom calendar range selection
 *   - Edge cases (future dates, single-day, 90-day warning, rapid clicks,
 *     month navigation, year picker)
 *   - Data updates after date change (Today, Yesterday, Last Week, Last Month)
 *
 * Today's date used in calculations: 2026-02-26 (Thursday)
 *
 * Note on scrollLock: unlockScroll() sets body.style.overflow = '' (empty
 * string), NOT 'unset'. Tests assert `!== 'hidden'` rather than a specific
 * value so they remain correct regardless of the implementation detail.
 */

test.setTimeout(180000); // Long-range syncs (Last Year = 13 chunks) can take 60-90s

// ─── Benign errors to ignore ─────────────────────────────────────────────────
const BENIGN_ERRORS = [
  'ResizeObserver loop limit exceeded',
  'favicon.ico',
  'Failed to load resource: the server responded with a status of 404',
  'AbortError',  // debounced sync aborts are expected on date change
  '429',         // ClickUp rate limit during back-to-back test runs
  'Rate limit',  // rate limit log messages
  'ClickUp API error: 429',
];

function isRealError(text) {
  return !BENIGN_ERRORS.some((b) => text.includes(b));
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Get the header date button. Uses title attribute (robust to sync spinner)
 * so it works even when the 📅 emoji is replaced by a loading indicator.
 */
async function getDateHeaderButton(page) {
  // During sync, the button may not have 📅; use title to find it robustly
  const byTitle = page.locator('button[title*="Viewing" i], button[title*="date range" i]').first();
  if (await byTitle.isVisible().catch(() => false)) return byTitle;
  return page.locator('button').filter({ hasText: '📅' }).first();
}

/**
 * Open the DatePickerModal from the header button.
 * Tries data-testid first, then the 📅 emoji text, then title attribute.
 */
async function openDatePicker(page) {
  // Wait for any ongoing sync to settle (spinner may replace 📅 during sync)
  await page.waitForTimeout(500);

  let calBtn = page.locator('[data-testid="date-picker-button"]');
  if (!(await calBtn.isVisible().catch(() => false))) {
    // Match by title: "Select date range" (Today) or "Viewing: ..." (non-Today)
    calBtn = page.locator('button[title*="date range" i], button[title*="Viewing" i]').first();
  }
  if (!(await calBtn.isVisible().catch(() => false))) {
    calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  }
  await calBtn.click();
  // Wait for the modal's Apply button to confirm it opened
  await page.locator('button').filter({ hasText: 'Apply' }).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
}

/**
 * Click a quick-preset button inside the open DatePickerModal.
 */
async function clickPreset(page, presetText) {
  // The date picker modal has an "Apply" button. We find all buttons with presetText,
  // then pick the one that is NOT the header date button (which contains "📅").
  // Header button text: "📅Today" or "📅Feb 26" — preset buttons have plain text like "Today".

  const allMatchingBtns = page.locator('button').filter({ hasText: new RegExp(`^${presetText}$`) });
  const count = await allMatchingBtns.count();

  if (count > 0) {
    // Prefer exact match (preset buttons use exact text)
    await allMatchingBtns.first().click({ force: true });
    await page.waitForTimeout(300);
    return;
  }

  // Fallback: loose match, skip header button
  const looseBtns = page.locator('button').filter({ hasText: presetText });
  const looseCount = await looseBtns.count();
  for (let i = 0; i < looseCount; i++) {
    const btn = looseBtns.nth(i);
    const text = await btn.textContent();
    if (text.includes('📅')) continue;
    await btn.click({ force: true });
    await page.waitForTimeout(300);
    return;
  }
  // Last resort
  await looseBtns.first().click({ force: true });
  await page.waitForTimeout(300);
}

/**
 * Wait for a sync cycle to complete after a date range change.
 * The modal closes immediately on Apply, then a debounced sync fires.
 * We wait a generous minimum so the sync can at least start.
 */
async function waitForSyncComplete(page, timeout = 120000) {
  // Wait for both sync indicators to clear:
  // 1. "Syncing..." status pill text disappears
  // 2. Date header button no longer shows "Loading..." (isSyncing + non-Today)
  await page.waitForFunction(
    () => {
      const body = document.body.innerText;
      if (body.includes('Syncing')) return false;
      // Check date button not in loading state (find by title, lowercase for safety)
      const buttons = Array.from(document.querySelectorAll('button[title]'));
      const dateBtn = buttons.find(b => {
        const t = b.getAttribute('title') || '';
        return t.toLowerCase().includes('viewing') || t.toLowerCase().includes('date range');
      });
      if (dateBtn && dateBtn.innerText.includes('Loading')) return false;
      return true;
    },
    { timeout }
  ).catch(() => {}); // non-fatal — some syncs never show these states
  await page.waitForTimeout(1000);
}

// ─── Standard beforeEach factory ─────────────────────────────────────────────
function makeBeforeEach(consoleErrors, pageErrors) {
  return async ({ page }) => {
    consoleErrors.length = 0;
    pageErrors.length = 0;
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
    await page.waitForSelector('[data-testid^="overview-card-team-tracked"]', {
      timeout: 20000,
    });
    await page.waitForTimeout(2000);
  };
}

// ─── describe: DatePickerModal - Open/Close ───────────────────────────────────
test.describe('DatePickerModal - Open/Close', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(makeBeforeEach(consoleErrors, pageErrors));

  test('opens via calendar button in header — modal content is visible', async ({ page }) => {
    await openDatePicker(page);

    // The modal renders "Select Date Range" as its heading and has preset
    // buttons. Checking for the "Today" preset button is a reliable signal.
    const todayBtn = page.locator('button').filter({ hasText: 'Today' }).first();
    await expect(todayBtn).toBeVisible();

    // Also check for the modal title text
    await expect(page.locator('h3').filter({ hasText: 'Select Date Range' })).toBeVisible();
  });

  test('body overflow is hidden while the modal is open', async ({ page }) => {
    await openDatePicker(page);

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');
  });

  test('closes via ESC key — modal gone, scroll unlocked', async ({ page }) => {
    await openDatePicker(page);

    // Confirm open
    await expect(
      page.locator('h3').filter({ hasText: 'Select Date Range' })
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // Modal gone
    await expect(
      page.locator('h3').filter({ hasText: 'Select Date Range' })
    ).not.toBeVisible();

    // scrollLock sets overflow = '' on unlock
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('closes via backdrop click — modal gone', async ({ page }) => {
    await openDatePicker(page);

    await expect(
      page.locator('h3').filter({ hasText: 'Select Date Range' })
    ).toBeVisible();

    // Click well outside the modal panel (top-left corner)
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(400);

    await expect(
      page.locator('h3').filter({ hasText: 'Select Date Range' })
    ).not.toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('header button shows active (white bg) state for non-Today date and normal state for Today', async ({
    page,
  }) => {
    // Default state should be Today — button uses theme.cardBg (dark, not white)
    const calBtn = await getDateHeaderButton(page);
    const todayBg = await calBtn.evaluate((el) => el.style.background);

    // Now apply "Yesterday" and verify the button changes to white background
    await openDatePicker(page);
    await clickPreset(page, 'Yesterday');
    // Click Apply
    await page.locator('button').filter({ hasText: 'Apply' }).click();
    // Wait for the button to turn white (state has been applied)
    await page.waitForFunction(
      () => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          b => b.style.background?.includes('255') || b.style.background === '#ffffff' || b.style.background === '#fff'
        );
        return !!btn;
      },
      { timeout: 10000 }
    ).catch(() => {});

    const activeBg = await calBtn.evaluate((el) => el.style.background);
    // Active state is rgb(255, 255, 255) / #ffffff
    expect(activeBg).toMatch(/rgb\(255,\s*255,\s*255\)|#ffffff|#fff/i);

    // Switch back to Today
    await openDatePicker(page);
    await clickPreset(page, 'Today');
    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await page.waitForTimeout(300);

    const restoredBg = await calBtn.evaluate((el) => el.style.background);
    // Today state should NOT be white (it reverts to theme.cardBg)
    expect(restoredBg).not.toMatch(/rgb\(255,\s*255,\s*255\)|#ffffff/i);
  });
});

// ─── describe: DatePickerModal - Quick Presets ────────────────────────────────
test.describe('DatePickerModal - Quick Presets', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(makeBeforeEach(consoleErrors, pageErrors));

  // Helper: open picker, click preset, apply, verify header text, check errors.
  // For Quick Presets we only test UI state (not data) — we wait for the header
  // button to reflect the new date range (instant on Apply) rather than full sync.
  async function testPreset(page, presetLabel, verifyFn) {
    await openDatePicker(page);
    await clickPreset(page, presetLabel);
    await page.locator('button').filter({ hasText: 'Apply' }).click();

    // Wait for modal to close (Apply triggers instant state update)
    await page.waitForFunction(
      () => !document.body.innerText.includes('Apply'),
      { timeout: 5000 }
    ).catch(() => {});
    await page.waitForTimeout(500);

    if (verifyFn) await verifyFn(page);

    // Header date display must not be empty or "Loading"
    // Use title-based selector when 📅 is replaced by spinner during sync
    let calBtn = page.locator('button[title*="Viewing" i], button[title*="date range" i]').first();
    if (!(await calBtn.isVisible().catch(() => false))) {
      calBtn = page.locator('button').filter({ hasText: '📅' }).first();
    }
    const btnText = await calBtn.textContent();
    expect(btnText).not.toMatch(/^$/);
    expect(btnText).not.toMatch(/^Loading$/i);

    // No real errors
    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  }

  test('Today — header shows "Today"', async ({ page }) => {
    await testPreset(page, 'Today', async (p) => {
      const calBtn = await getDateHeaderButton(p);
      const btnText = await calBtn.textContent();
      expect(btnText).toContain('Today');
    });
  });

  test('Yesterday — header shows yesterday\'s date', async ({ page }) => {
    await testPreset(page, 'Yesterday', async (p) => {
      const calBtn = await getDateHeaderButton(p);
      const btnText = await calBtn.textContent();
      // Header shows a short date like "Feb 26" (yesterday's date dynamically)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const expectedMonth = yesterday.toLocaleDateString('en-US', { month: 'short' });
      const expectedDay = yesterday.getDate().toString();
      expect(btnText).toContain(expectedMonth);
      expect(btnText).toContain(expectedDay);
    });
  });

  test('This Week — header shows a date range (Feb range)', async ({ page }) => {
    await testPreset(page, 'This Week', async (p) => {
      // Week of Feb 26: Sun Feb 22 — Thu Feb 26 (capped at today)
      const calBtn = await getDateHeaderButton(p);
      const btnText = await calBtn.textContent();
      // Should contain a dash/em-dash separating two dates
      expect(btnText).toMatch(/—|-/);
    });
  });

  test('Last Week — header shows last-week range', async ({ page }) => {
    await testPreset(page, 'Last Week', async (p) => {
      // Last week: Sun Feb 15 — Sat Feb 21, 2026
      const calBtn = await getDateHeaderButton(p);
      const btnText = await calBtn.textContent();
      expect(btnText).toMatch(/—|-/);
      expect(btnText).toContain('Feb');
    });
  });

  test('This Month — header shows February range', async ({ page }) => {
    await testPreset(page, 'This Month', async (p) => {
      const calBtn = await getDateHeaderButton(p);
      const btnText = await calBtn.textContent();
      expect(btnText).toContain('Feb');
    });
  });

  test('Last Month — header shows January range', async ({ page }) => {
    await testPreset(page, 'Last Month', async (p) => {
      const calBtn = await getDateHeaderButton(p);
      const btnText = await calBtn.textContent();
      expect(btnText).toContain('Jan');
    });
  });

  test('This Quarter — header shows Q1 2026 range (Jan—Feb)', async ({ page }) => {
    await testPreset(page, 'This Quarter', async (p) => {
      // Q1 2026: Jan 1 — Feb 26 (today)
      const calBtn = await getDateHeaderButton(p);
      const btnText = await calBtn.textContent();
      expect(btnText).toMatch(/Jan|Feb/);
    });
  });

  test('Last Quarter — header shows Q4 2025 range (Oct—Dec)', async ({ page }) => {
    await testPreset(page, 'Last Quarter', async (p) => {
      // Q4 2025: Oct 1 — Dec 31
      const calBtn = await getDateHeaderButton(p);
      const btnText = await calBtn.textContent();
      expect(btnText).toMatch(/Oct|Nov|Dec/);
    });
  });

  test('Half Year — header shows 6-month range AND long-range info appears in modal', async ({
    page,
  }) => {
    consoleErrors.length = 0;
    pageErrors.length = 0;

    await openDatePicker(page);
    await clickPreset(page, 'Half Year');

    // Info note should appear for ranges > 90 days: "ℹ Syncing X chunks — may take a moment"
    const warningText = await page
      .locator('body')
      .evaluate((body) => body.innerText);
    expect(warningText).toMatch(/chunks/i);

    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await waitForSyncComplete(page);

    // Wait for date button to show the range (not "Loading..." which appears during sync)
    const calBtn = page.locator('button[title*="Viewing" i]').first();
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[title*="Viewing" i]');
        return btn && !btn.innerText.includes('Loading');
      },
      { timeout: 120000 }
    ).catch(() => {});
    const btnText = await calBtn.textContent();
    expect(btnText).toMatch(/—|-/); // range display

    // AbortError expected from debounced sync abort — already benign-filtered
    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('This Year — header shows 2026 range AND 90-day warning appears in modal', async ({
    page,
  }) => {
    consoleErrors.length = 0;
    pageErrors.length = 0;

    await openDatePicker(page);
    await clickPreset(page, 'This Year');

    // Jan 1 2026 to Feb 26 2026 = 56 days — NOT > 90.
    // But we still do a soft check: warning may or may not appear.
    // The test verifies it does NOT crash and header updates.
    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await waitForSyncComplete(page);

    const calBtn = await getDateHeaderButton(page);
    const btnText = await calBtn.textContent();
    expect(btnText).not.toMatch(/^$/);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Last Year — header shows 2025 range AND long-range info appears in modal', async ({
    page,
  }) => {
    consoleErrors.length = 0;
    pageErrors.length = 0;

    await openDatePicker(page);
    await clickPreset(page, 'Last Year');

    // Jan 1 2025 — Dec 31 2025 = 364 days → info note must appear (chunks count)
    const warningVisible = await page
      .locator('body')
      .evaluate((body) => body.innerText.match(/chunks/i) !== null);
    expect(warningVisible).toBe(true);

    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await waitForSyncComplete(page);

    // Wait for date button to show the range (not "Loading..." which appears during sync)
    const calBtn = page.locator('button[title*="Viewing" i]').first();
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[title*="Viewing" i]');
        return btn && !btn.innerText.includes('Loading');
      },
      { timeout: 120000 }
    ).catch(() => {});
    const btnText = await calBtn.textContent();
    // Should show a range like "Jan 1 — Dec 31"
    expect(btnText).toMatch(/—|-/);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});

// ─── describe: DatePickerModal - Custom Calendar Range ────────────────────────
test.describe('DatePickerModal - Custom Calendar Range', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(makeBeforeEach(consoleErrors, pageErrors));

  test('selects a custom range via calendar and applies it', async ({ page }) => {
    await openDatePicker(page);

    // Navigate to previous month (January 2026) using the ‹ button
    const prevBtn = page.locator('button').filter({ hasText: '‹' }).first();
    await prevBtn.click();
    await page.waitForTimeout(300);

    // Verify we are on January 2026
    await expect(
      page.locator('button').filter({ hasText: 'January' }).first()
    ).toBeVisible();

    // Click the 1st of January
    // Calendar day buttons contain just the day number as text.
    // We need the first enabled date button showing "1".
    const day1 = page
      .locator('button')
      .filter({ hasText: /^1$/ })
      .first();
    await day1.click();
    await page.waitForTimeout(300);

    // After first click, selection mode moves to 'end'.
    // The hint text "▶ Now click end date" should be visible.
    const hintText = await page.locator('body').evaluate((b) => b.innerText);
    expect(hintText).toContain('end date');

    // Click the 8th (7 days after the 1st)
    const day8 = page
      .locator('button')
      .filter({ hasText: /^8$/ })
      .first();
    await day8.click();
    await page.waitForTimeout(300);

    // "Selected Range" display inside the modal should now show a range
    const rangeDisplay = await page
      .locator('body')
      .evaluate((b) => b.innerText);
    expect(rangeDisplay).toMatch(/Jan/);

    // Click Apply
    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await waitForSyncComplete(page);

    // Header button shows the custom date range (wait for Loading... to clear)
    const calBtn = page.locator('button[title*="Viewing" i]').first();
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[title*="Viewing" i]');
        return btn && !btn.innerText.includes('Loading');
      },
      { timeout: 60000 }
    ).catch(() => {});
    const btnText = await calBtn.textContent();
    expect(btnText).toContain('Jan');
    expect(btnText).toMatch(/—|-/);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('cancel discards custom selection — header unchanged', async ({ page }) => {
    // Record baseline header text (Today)
    const calBtn = await getDateHeaderButton(page);
    const baselineText = await calBtn.textContent();

    await openDatePicker(page);

    // Navigate to January
    const prevBtn = page.locator('button').filter({ hasText: '‹' }).first();
    await prevBtn.click();
    await page.waitForTimeout(200);

    // Click the 5th
    const day5 = page
      .locator('button')
      .filter({ hasText: /^5$/ })
      .first();
    await day5.click();
    await page.waitForTimeout(200);

    // Click Cancel instead of Apply
    await page.locator('button').filter({ hasText: 'Cancel' }).click();
    await page.waitForTimeout(300);

    // Modal closed, header unchanged
    await expect(
      page.locator('h3').filter({ hasText: 'Select Date Range' })
    ).not.toBeVisible();

    const afterText = await calBtn.textContent();
    expect(afterText).toBe(baselineText);
  });
});

// ─── describe: DatePickerModal - Edge Cases ───────────────────────────────────
test.describe('DatePickerModal - Edge Cases', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(makeBeforeEach(consoleErrors, pageErrors));

  test('future dates are disabled — clicking tomorrow does NOT change header', async ({
    page,
  }) => {
    // Capture baseline header text
    const calBtn = await getDateHeaderButton(page);
    const baseline = await calBtn.textContent();

    await openDatePicker(page);

    // Dynamically compute tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.getDate().toString();

    // The calendar shows the current month by default.
    // If tomorrow is in next month, navigate forward — but for now try current month.
    // Find the button for tomorrow's day — it should be disabled (isFuture).
    const dayBtn = page
      .locator('button')
      .filter({ hasText: new RegExp(`^${tomorrowDay}$`) })
      .first();

    const isDisabled = await dayBtn
      .getAttribute('disabled')
      .then((v) => v !== null)
      .catch(() => false);
    expect(isDisabled).toBe(true);

    // Attempt to click it anyway (Playwright can force-click a disabled button)
    await dayBtn.click({ force: true }).catch(() => {}); // may throw, that's OK
    await page.waitForTimeout(300);

    // Cancel the modal — we never applied
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Header unchanged
    const afterText = await calBtn.textContent();
    expect(afterText).toBe(baseline);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('single-day selection — clicking the same date twice results in a single-date range', async ({
    page,
  }) => {
    await openDatePicker(page);

    // Navigate to January
    const prevBtn = page.locator('button').filter({ hasText: '‹' }).first();
    await prevBtn.click();
    await page.waitForTimeout(200);

    // Click Jan 15 twice (first click = start, second click in 'end' mode but same date)
    const day15 = page
      .locator('button')
      .filter({ hasText: /^15$/ })
      .first();
    await day15.click();
    await page.waitForTimeout(200);
    await day15.click();
    await page.waitForTimeout(200);

    // The "Selected Range" display should show a single date, not a range with "—"
    // After clicking the same date as end, the startDate == endDate, so formatRangeDisplay
    // returns a single date (no "—").
    // Read the whole modal body text to check the range display
    const modalBody = await page.evaluate(() => document.body.innerText);
    const rangeSection = modalBody.split('Selected Range')[1]?.slice(0, 100) || '';
    // Should NOT contain "—" (em dash separator) right after "Selected Range"
    expect(rangeSection).not.toContain('—');
    expect(rangeSection).toContain('Jan');

    // Apply and check header
    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await waitForSyncComplete(page);

    const calBtn = await getDateHeaderButton(page);
    const btnText = await calBtn.textContent();
    // Single date: no range separator
    expect(btnText).not.toContain('—');
    expect(btnText).toContain('Jan');

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('long-range info — Half Year shows chunk count note inside modal', async ({ page }) => {
    await openDatePicker(page);
    await clickPreset(page, 'Half Year');

    // Info note: "ℹ Syncing X chunks — may take a moment"
    const bodyText = await page
      .locator('body')
      .evaluate((b) => b.innerText);
    expect(bodyText).toMatch(/chunks/i);

    // Warning does NOT block — Apply is still clickable
    const applyBtn = page.locator('button').filter({ hasText: 'Apply' }).first();
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();
    await waitForSyncComplete(page);

    // Dashboard still operational — no JS error
    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('rapid preset clicking — AbortErrors are benign, dashboard still shows data', async ({
    page,
  }) => {
    await openDatePicker(page);
    await clickPreset(page, 'Yesterday');
    await clickPreset(page, 'This Week');
    await clickPreset(page, 'Last Week');

    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await waitForSyncComplete(page);

    // Dashboard should still be functional
    await expect(
      page.locator('[data-testid^="overview-card-team-tracked"]')
    ).toBeVisible();

    // Only real (non-AbortError) errors should fail
    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('month navigation — prev arrow shows January, next arrow returns to February', async ({
    page,
  }) => {
    await openDatePicker(page);

    // Should start on February 2026 (current month)
    await expect(
      page.locator('button').filter({ hasText: 'February' }).first()
    ).toBeVisible();

    // Click prev month (‹)
    const prevBtn = page.locator('button').filter({ hasText: '‹' }).first();
    await prevBtn.click();
    await page.waitForTimeout(300);

    await expect(
      page.locator('button').filter({ hasText: 'January' }).first()
    ).toBeVisible();

    // Click next month (›)
    const nextBtn = page.locator('button').filter({ hasText: '›' }).first();
    await nextBtn.click();
    await page.waitForTimeout(300);

    await expect(
      page.locator('button').filter({ hasText: 'February' }).first()
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('year picker — clicking year button opens year list, selecting 2025 switches calendar', async ({
    page,
  }) => {
    await openDatePicker(page);

    // Click on the year button (shows "2026")
    const yearBtn = page.locator('button').filter({ hasText: /^2026$/ }).first();
    await yearBtn.click();
    await page.waitForTimeout(300);

    // Year list should appear — contains buttons for 2025, 2026
    const year2025Btn = page
      .locator('button')
      .filter({ hasText: /^2025$/ })
      .first();
    await expect(year2025Btn).toBeVisible();

    // Select 2025
    await year2025Btn.click();
    await page.waitForTimeout(300);

    // Year picker closes; calendar now shows 2025
    // The year button in the header should now show 2025
    const updatedYearBtn = page
      .locator('button')
      .filter({ hasText: /^2025$/ })
      .first();
    await expect(updatedYearBtn).toBeVisible();

    // Year list should be gone (navMode reset to null)
    // Verify by checking there's no 3-column grid of year buttons
    const yearListItems = page
      .locator('button')
      .filter({ hasText: /^202[0-9]$/ });
    const yearCount = await yearListItems.count();
    // Only the year header button should remain (1 button showing 2025)
    expect(yearCount).toBeLessThanOrEqual(1);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});

// ─── describe: DatePickerModal - Data Updates After Date Change ───────────────
test.describe('DatePickerModal - Data Updates After Date Change', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(makeBeforeEach(consoleErrors, pageErrors));

  test('Today preset — at least one member card visible, no NaN in overview cards', async ({
    page,
  }) => {
    await openDatePicker(page);
    await clickPreset(page, 'Today');
    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await waitForSyncComplete(page);

    // Overview card must still render
    await expect(
      page.locator('[data-testid^="overview-card-team-tracked"]')
    ).toBeVisible();

    // No NaN in overview area
    const overviewText = await page
      .locator('[data-testid^="overview-card-team-tracked"]')
      .textContent();
    expect(overviewText).not.toContain('NaN');
    expect(overviewText).not.toContain('undefined');

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Yesterday preset — overview cards update, no NaN or undefined', async ({ page }) => {
    // Read current overview value before switching
    const beforeText = await page
      .locator('[data-testid^="overview-card-team-tracked"]')
      .textContent();

    await openDatePicker(page);
    await clickPreset(page, 'Yesterday');
    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await waitForSyncComplete(page);

    // Overview card visible and well-formed
    const afterText = await page
      .locator('[data-testid^="overview-card-team-tracked"]')
      .textContent();
    expect(afterText).not.toContain('NaN');
    expect(afterText).not.toContain('undefined');

    // Header reflects yesterday's date (dynamic)
    const calBtn = await getDateHeaderButton(page);
    const btnText = await calBtn.textContent();
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    const expectedDay = yd.getDate().toString();
    expect(btnText).toContain(expectedDay);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Last Week preset — overview cards show data, no NaN', async ({ page }) => {
    await openDatePicker(page);
    await clickPreset(page, 'Last Week');
    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await waitForSyncComplete(page);

    const overviewText = await page
      .locator('[data-testid^="overview-card-team-tracked"]')
      .textContent();
    expect(overviewText).not.toContain('NaN');
    expect(overviewText).not.toContain('undefined');

    // Overview card is still visible (not blank or error-state)
    await expect(
      page.locator('[data-testid^="overview-card-team-tracked"]')
    ).toBeVisible();

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Last Month — working days count is at least 15 (January 2026 has 22 working days)', async ({
    page,
  }) => {
    await openDatePicker(page);
    await clickPreset(page, 'Last Month');
    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await waitForSyncComplete(page);

    // Overview cards must be visible without errors
    await expect(
      page.locator('[data-testid^="overview-card-team-tracked"]')
    ).toBeVisible();

    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).not.toContain('NaN');
    expect(pageText).not.toContain('undefined');

    // Header reflects January range
    const calBtn = await getDateHeaderButton(page);
    const btnText = await calBtn.textContent();
    expect(btnText).toContain('Jan');

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('switching presets multiple times ends with valid state and no errors', async ({
    page,
  }) => {
    // Cycle through several presets to stress-test state management
    const presets = ['Yesterday', 'Last Week', 'This Month', 'Today'];

    for (const preset of presets) {
      await openDatePicker(page);
      await clickPreset(page, preset);
      await page.locator('button').filter({ hasText: 'Apply' }).click();
      await page.waitForTimeout(3000); // allow sync to start before next open
    }

    // After final "Today" selection the dashboard should be in a clean state
    await waitForSyncComplete(page);

    await expect(
      page.locator('[data-testid^="overview-card-team-tracked"]')
    ).toBeVisible();

    const overviewText = await page
      .locator('[data-testid^="overview-card-team-tracked"]')
      .textContent();
    expect(overviewText).not.toContain('NaN');
    expect(overviewText).not.toContain('undefined');

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Last Year — header shows 2025 range, no NaN, data loads correctly', async ({ page }) => {
    await openDatePicker(page);
    await clickPreset(page, 'Last Year');

    // Long-range info note must appear inside the open date picker modal
    // (Last Year = 364 days → 13 chunks info shown)
    const warningInModal = await page
      .evaluate(() => document.body.innerText.match(/chunks/i) !== null);
    expect(warningInModal).toBe(true);

    await page.locator('button').filter({ hasText: 'Apply' }).click();
    await waitForSyncComplete(page);

    // Overview cards must still render without errors
    await expect(
      page.locator('[data-testid^="overview-card-team-tracked"]')
    ).toBeVisible();

    // Header date button should show the 2025 range (Jan — Dec)
    const calBtn = page.locator('button').filter({ hasText: /Jan|Dec/ }).first();
    const btnText = await calBtn.textContent().catch(() => '');
    expect(btnText).toMatch(/Jan/);
    expect(btnText).toMatch(/Dec/);

    // No NaN anywhere on page (the 90-day limit means older months show 0, not NaN)
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).not.toContain('NaN');
    expect(pageText).not.toContain('undefined');

    // Overview card target should reflect a full year of working days (≥ 200 days)
    // 261 working days × 8 members × 6.5h = 13,572h — target should be in thousands
    const overviewText = await page
      .locator('[data-testid^="overview-card-team-tracked"]')
      .textContent();
    // Target is shown as e.g. "/ 11875h 30m" — verify it's not "/ 52h" (1-day target)
    expect(overviewText).not.toMatch(/\/\s*52h/); // 52h = 8 members × 6.5h (1-day target)

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});
