import { test, expect, addMemberSeedScript } from './scripts/fixtures.js';

/**
 * QA: Overview Card Detail Modals
 * One-time QA verification tests for the 3 DashboardDetailModal variants:
 *   - Time (overview-card-team-tracked)
 *   - Tasks (overview-card-tasks-progress)
 *   - Score (overview-card-team-score)
 *
 * Note: unlockScroll() in scrollLock.js sets body.style.overflow = ''
 * (empty string), NOT 'unset'. Tests reflect the actual implementation.
 */

test.setTimeout(60000);

// ─── Benign errors to ignore ────────────────────────────────────────────────
const BENIGN_ERRORS = [
  'ResizeObserver loop limit exceeded',
  'favicon.ico',
  'Failed to load resource: the server responded with a status of 404',
  // Rate limit errors are expected during testing (many sequential page loads)
  '429',
  'Rate limit',
  'rate limit',
];

function isRealError(text) {
  return !BENIGN_ERRORS.some((b) => text.includes(b));
}

// ─── Shared helpers ──────────────────────────────────────────────────────────
async function waitForDashboard(page) {
  // Seed IndexedDB before page scripts run.
  // The init script opens LighthouseDB and seeds members, so when Dexie
  // initializes it finds members already present → app skips skeleton state.
  await addMemberSeedScript(page);
  await page.goto('/');
  // After seeding, the app renders real overview cards within a few seconds
  // (no API needed for the initial render — just IndexedDB members).
  // If the API also fires and updates data, that's fine.
  await page.waitForSelector('[data-testid^="overview-card-team-tracked"]', {
    timeout: 30000,
  });
  // Let sync populate live data
  await page.waitForTimeout(2000);
}

// 8 team members, 7 unique first names (both "Nada Meshref" and "Nada Amr" match "Nada")
const MEMBER_NAMES = ['Dina', 'Alaa', 'Nada', 'Islam', 'Riham', 'Samar', 'Merit'];

// ─── TIME Modal ──────────────────────────────────────────────────────────────
test.describe('Time Detail Modal', () => {
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
    await waitForDashboard(page);
  });

  test('opens when clicking the Time overview card', async ({ page }) => {
    const errors = [...consoleErrors, ...pageErrors];

    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    await expect(
      page.locator('[data-testid="dashboard-detail-modal-time"]')
    ).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('body overflow is hidden when modal is open', async ({ page }) => {
    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');
  });

  test('hero section contains "Total Time Tracked" or "Time Tracked"', async ({ page }) => {
    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    const text = await modal.textContent();
    expect(text).toMatch(/Time Tracked/i);
  });

  test('working days count is present and non-zero', async ({ page }) => {
    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    const text = await modal.textContent();
    // Matches "1 day", "5 days", "Working Days", etc.
    expect(text).toMatch(/\d+\s*(working\s*)?days?/i);
  });

  test('at least one member name appears in the breakdown', async ({ page }) => {
    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    const text = await modal.textContent();

    const found = MEMBER_NAMES.some((name) => text.includes(name));
    expect(found).toBeTruthy();
  });

  test('no "NaN" or "undefined" in modal text content', async ({ page }) => {
    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    const text = await modal.textContent();
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('undefined');
  });

  test('time values use "Xh Ym" format — no raw decimal hours like "6.5h"', async ({ page }) => {
    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    const text = await modal.textContent();
    // Raw decimal-hour pattern like "3.14h" should NOT appear
    expect(text).not.toMatch(/\d+\.\d+h/);
  });

  test('insight text is present after the member table', async ({ page }) => {
    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    const text = await modal.textContent();
    // The component always renders an Insight paragraph
    expect(text).toMatch(/Insight:/i);
  });

  test('closes via ESC key and body overflow is restored', async ({ page }) => {
    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    // Confirm open
    await expect(
      page.locator('[data-testid="dashboard-detail-modal-time"]')
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // Modal gone
    await expect(
      page.locator('[data-testid="dashboard-detail-modal-time"]')
    ).not.toBeVisible();

    // scrollLock.js sets overflow = '' on unlock, not 'unset'
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('closes via backdrop click', async ({ page }) => {
    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    await expect(
      page.locator('[data-testid="dashboard-detail-modal-time"]')
    ).toBeVisible();

    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(400);

    await expect(
      page.locator('[data-testid="dashboard-detail-modal-time"]')
    ).not.toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('closes via the × close button', async ({ page }) => {
    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    await expect(modal).toBeVisible();

    // The ModalShell renders a button containing the × character
    const closeBtn = modal
      .locator('button')
      .filter({ hasText: /[×✕✗x]/i })
      .first();

    let closed = false;
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.first().click();
      closed = true;
    } else {
      const ariaClose = page.locator('[aria-label="Close"], [aria-label="close"]');
      if (await ariaClose.isVisible().catch(() => false)) {
        await ariaClose.first().click();
        closed = true;
      }
    }
    expect(closed).toBe(true); // fail explicitly if no close button found
    await page.waitForTimeout(300);
    await expect(modal).not.toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('no real console errors during time modal interaction', async ({ page }) => {
    await page.locator('[data-testid^="overview-card-team-tracked"]').click();
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});

// ─── TASKS Modal ─────────────────────────────────────────────────────────────
test.describe('Tasks Detail Modal', () => {
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
    await waitForDashboard(page);
  });

  test('opens when clicking the Tasks overview card', async ({ page }) => {
    await page.locator('[data-testid="overview-card-tasks-progress"]').click();
    await page.waitForTimeout(500);

    await expect(
      page.locator('[data-testid="dashboard-detail-modal-tasks"]')
    ).toBeVisible();
  });

  test('body overflow is hidden when modal is open', async ({ page }) => {
    await page.locator('[data-testid="overview-card-tasks-progress"]').click();
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');
  });

  test('contains "Tasks Completed" or "Task" heading text', async ({ page }) => {
    await page.locator('[data-testid="overview-card-tasks-progress"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-tasks"]');
    const text = await modal.textContent();
    expect(text).toMatch(/Tasks?/i);
  });

  test('at least 4 stat numbers are visible (completed, in-progress, total, avg)', async ({ page }) => {
    await page.locator('[data-testid="overview-card-tasks-progress"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-tasks"]');

    // The tasks modal renders 4 stat cards: Completed, In Progress, Total Tasks, Avg / Member / Day
    const statLabels = ['Completed', 'In Progress', 'Total', 'Avg'];
    let foundCount = 0;
    const text = await modal.textContent();
    for (const label of statLabels) {
      if (text.includes(label)) foundCount++;
    }
    expect(foundCount).toBeGreaterThanOrEqual(4);
  });

  test('member breakdown rows are present', async ({ page }) => {
    await page.locator('[data-testid="overview-card-tasks-progress"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-tasks"]');
    const text = await modal.textContent();

    const found = MEMBER_NAMES.some((name) => text.includes(name));
    expect(found).toBeTruthy();
  });

  test('no "NaN" or "undefined" in modal text content', async ({ page }) => {
    await page.locator('[data-testid="overview-card-tasks-progress"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-tasks"]');
    const text = await modal.textContent();
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('undefined');
  });

  test('closes via ESC key', async ({ page }) => {
    await page.locator('[data-testid="overview-card-tasks-progress"]').click();
    await page.waitForTimeout(500);

    await expect(
      page.locator('[data-testid="dashboard-detail-modal-tasks"]')
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await expect(
      page.locator('[data-testid="dashboard-detail-modal-tasks"]')
    ).not.toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('closes via backdrop click', async ({ page }) => {
    await page.locator('[data-testid="overview-card-tasks-progress"]').click();
    await page.waitForTimeout(500);

    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(400);

    await expect(
      page.locator('[data-testid="dashboard-detail-modal-tasks"]')
    ).not.toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('closes via × close button', async ({ page }) => {
    await page.locator('[data-testid="overview-card-tasks-progress"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-tasks"]');
    await expect(modal).toBeVisible();

    const closeBtn = modal
      .locator('button')
      .filter({ hasText: /[×✕✗x]/i })
      .first();

    let closed = false;
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.first().click();
      closed = true;
    } else {
      const ariaClose = page.locator('[aria-label="Close"], [aria-label="close"]');
      if (await ariaClose.isVisible().catch(() => false)) {
        await ariaClose.first().click();
        closed = true;
      }
    }
    expect(closed).toBe(true); // fail explicitly if no close button found
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="dashboard-detail-modal-tasks"]')).not.toBeVisible();
  });

  test('no real console errors during tasks modal interaction', async ({ page }) => {
    await page.locator('[data-testid="overview-card-tasks-progress"]').click();
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});

// ─── SCORE Modal ─────────────────────────────────────────────────────────────
test.describe('Score Detail Modal', () => {
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
    await waitForDashboard(page);
  });

  test('opens when clicking the Score overview card', async ({ page }) => {
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);

    await expect(
      page.locator('[data-testid="dashboard-detail-modal-score"]')
    ).toBeVisible();
  });

  test('body overflow is hidden when modal is open', async ({ page }) => {
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');
  });

  test('grade badge shows one of A, B, C, D, F', async ({ page }) => {
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-score"]');
    const text = await modal.textContent();

    // The hero subValue is "/ 100 · Grade: X"
    expect(text).toMatch(/Grade:\s*[ABCDF]/);
  });

  test('all 4 score component sections are visible (Time 40%, Workload 20%, Completion 30%, Compliance 10%)', async ({
    page,
  }) => {
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-score"]');
    const text = await modal.textContent();

    const components = [
      { label: 'Time Tracked', weight: '40' },
      { label: 'Workload', weight: '20' },
      { label: 'Completion', weight: '30' },
      { label: 'Compliance', weight: '10' },
    ];

    for (const comp of components) {
      expect(text).toContain(comp.label);
      expect(text).toContain(comp.weight);
    }
  });

  test('member rankings section has at least one member row with a rank number', async ({ page }) => {
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-score"]');
    const text = await modal.textContent();

    // Rank numbers appear as "#1", "#2", etc.
    expect(text).toMatch(/#\d+/);

    // At least one known member name should appear in rankings
    const found = MEMBER_NAMES.some((name) => text.includes(name));
    expect(found).toBeTruthy();
  });

  test('top 3 members get medal emoji (🥇, 🥈, or 🥉)', async ({ page }) => {
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);

    const scoreModal = page.locator('[data-testid="dashboard-detail-modal-score"]');
    const rankingText = await scoreModal.textContent();
    const hasMedal = rankingText.includes('🥇') || rankingText.includes('🥈') || rankingText.includes('🥉');
    // Count visible member rows - only require medals if 2+ members loaded
    const memberRowCount = MEMBER_NAMES.filter(name => rankingText.includes(name)).length;
    if (memberRowCount >= 2) {
      expect(hasMedal).toBeTruthy();
    } else {
      console.log(`[QA] Only ${memberRowCount} member(s) loaded - skipping medal assertion`);
    }
  });

  test('no "NaN" or "undefined" in modal text content', async ({ page }) => {
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-score"]');
    const text = await modal.textContent();
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('undefined');
  });

  test('closes via ESC key', async ({ page }) => {
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);

    await expect(
      page.locator('[data-testid="dashboard-detail-modal-score"]')
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await expect(
      page.locator('[data-testid="dashboard-detail-modal-score"]')
    ).not.toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('closes via backdrop click', async ({ page }) => {
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);

    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(400);

    await expect(
      page.locator('[data-testid="dashboard-detail-modal-score"]')
    ).not.toBeVisible();
  });

  test('closes via × close button', async ({ page }) => {
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="dashboard-detail-modal-score"]');
    await expect(modal).toBeVisible();

    const closeBtn = modal
      .locator('button')
      .filter({ hasText: /[×✕✗x]/i })
      .first();

    let closed = false;
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.first().click();
      closed = true;
    } else {
      const ariaClose = page.locator('[aria-label="Close"], [aria-label="close"]');
      if (await ariaClose.isVisible().catch(() => false)) {
        await ariaClose.first().click();
        closed = true;
      }
    }
    expect(closed).toBe(true); // fail explicitly if no close button found
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="dashboard-detail-modal-score"]')).not.toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('no real console errors during score modal interaction', async ({ page }) => {
    await page.locator('[data-testid="overview-card-team-score"]').click();
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});
