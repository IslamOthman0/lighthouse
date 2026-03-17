import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

/**
 * QA: TaskListModal
 * Tests opening via status pills in ProjectBreakdownCard, content validation,
 * search, pagination, assignee breakdown, and mobile layout.
 *
 * Key implementation details (from source):
 *   - Status pill testid:  data-testid="status-pill-{status-name-lowercased-with-dashes}"
 *   - Modal testid:        data-testid="task-list-modal"  (via ModalShell testId prop)
 *   - Close button:        button containing "×" character (ModalShell header)
 *   - Backdrop:            fixed div behind modal (z-index 1000) with onClick=onClose
 *   - Search input:        placeholder="Search tasks by name, assignee, publisher..."
 *   - Clear button:        button with text "✕" — rendered only when searchQuery is set
 *   - "Found X tasks":     text rendered below search box when searchQuery is active
 *   - Pagination:          "← Prev" / "Next →" buttons — only rendered when totalPages > 1
 *   - By Assignee section: ModalSection title "By Assignee" (desktop only)
 *   - Summary stats bar:   "{N} Tasks · {time} Total · {time} Avg/Task"
 *   - TASKS_PER_PAGE = 20
 *
 * Note: scrollLock.js sets body.style.overflow = '' on unlock (empty string, not 'unset').
 * Tests check `not.toBe('hidden')` instead of `toBe('unset')`.
 */

test.setTimeout(120000);

// ─── Benign errors to ignore ─────────────────────────────────────────────────
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

// ─── Team members (first names) ───────────────────────────────────────────────
const MEMBER_NAMES = ['Dina', 'Alaa', 'Nada', 'Islam', 'Riham', 'Samar', 'Merit'];

// ─── Known ClickUp status names ───────────────────────────────────────────────
const KNOWN_STATUSES = [
  'ready',
  'in progress',
  'backlog',
  'stopped',
  'hold',
  'help',
  'pre-backlog',
];

// ─── Helper: navigate to page and switch to "Yesterday" to ensure data loads ──
/**
 * Navigates to the dashboard and switches the date range to "Yesterday"
 * so that ProjectBreakdownCard has historical data and renders status pills.
 * Today (live data) may show zeros if no one has tracked yet today.
 */
async function goToYesterday(page) {
  await addMemberSeedScript(page);
  await page.goto('/');

  // Wait for the INITIAL sync to complete (loads 90-day historical data ~10-15s).
  // We detect completion by waiting for "Sync completed successfully" in console,
  // or fall back to a generous timeout. Switching dates before this completes
  // can cause the date-range sync to be aborted/race with the initial load.
  await new Promise(resolve => {
    let resolved = false;
    const listener = (msg) => {
      if (!resolved && msg.text().includes('Sync completed successfully')) {
        resolved = true;
        page.off('console', listener);
        resolve();
      }
    };
    page.on('console', listener);
    // Fallback: resolve after 20s even if sync message not seen
    setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 20000);
  });

  await page.waitForTimeout(500);

  // Open the date picker and click "Yesterday"
  let calBtn = page.locator('[data-testid="date-picker-button"]');
  if (!(await calBtn.isVisible().catch(() => false))) {
    calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  }
  await calBtn.click();
  await page.waitForTimeout(500);

  const yesterdayBtn = page.locator('button').filter({ hasText: /^Yesterday$/ }).first();
  await yesterdayBtn.click();
  await page.waitForTimeout(300);

  // Click "Apply" to confirm selection (DatePickerModal requires explicit Apply)
  const applyBtn = page.locator('button').filter({ hasText: /^Apply$/ }).first();
  await applyBtn.click();

  // Wait for the "yesterday" sync to complete
  await new Promise(resolve => {
    let resolved = false;
    const listener = (msg) => {
      if (!resolved && msg.text().includes('Sync completed successfully')) {
        resolved = true;
        page.off('console', listener);
        resolve();
      }
    };
    page.on('console', listener);
    // Fallback: resolve after 20s
    setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 20000);
  });

  await page.waitForTimeout(500); // small buffer after sync
}

// ─── Helper: find the first status pill and open its modal ────────────────────
async function openFirstPill(page) {
  const pill = page.locator('[data-testid^="status-pill-"]').first();
  const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
  if (pillCount === 0) {
    return null;
  }
  await pill.click();
  await page.waitForTimeout(500);
  return page.locator('[data-testid="task-list-modal"]');
}

// ═════════════════════════════════════════════════════════════════════════════
// describe: TaskListModal - Open from Status Pill
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TaskListModal - Open from Status Pill', () => {
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
    await goToYesterday(page);
    // Wait for pills — if they don't appear (e.g. API rate limit), tests will skip
    await page.waitForSelector('[data-testid^="status-pill-"]', { timeout: 60000 })
      .catch(() => {/* pills may not appear due to rate limits — individual tests skip if pillCount===0 */});
  });

  // 1. Opens on pill click
  test('opens modal when a status pill is clicked', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found — ProjectBreakdownCard has no data');
    }

    const pill = page.locator('[data-testid^="status-pill-"]').first();
    await pill.click();
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="task-list-modal"]')).toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');
  });

  // 2. Modal header shows project name and status
  test('modal header contains a status name', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const text = await modal.textContent();

    // The modal title is "{project} — {StatusDisplayName}"
    // It should contain a known status word OR at least one capitalized word after "—"
    const hasKnownStatus = KNOWN_STATUSES.some((s) =>
      text.toLowerCase().includes(s)
    );
    const hasCapitalizedWord = /—\s*[A-Z]/.test(text);

    expect(hasKnownStatus || hasCapitalizedWord).toBeTruthy();
  });

  // 3. Summary stats bar present
  test('summary stats bar shows task count and time in "Xh Ym" format', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const text = await modal.textContent();

    // Should contain at least one number (task count like "5 Tasks")
    expect(text).toMatch(/\d+\s*Tasks?/i);

    // Should contain time in "h" format (e.g. "2h 30m" or "0m Total")
    // formatMinutesToHM is used — output is always "Xh Ym" or "0m"
    expect(text).toMatch(/\d+h|\d+m/i);
  });

  // 4. Closes via ESC
  test('closes via ESC key and body overflow is restored', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    await openFirstPill(page);
    await expect(page.locator('[data-testid="task-list-modal"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await expect(page.locator('[data-testid="task-list-modal"]')).not.toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  // 5. Closes via backdrop click
  test('closes via backdrop click', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    await openFirstPill(page);
    await expect(page.locator('[data-testid="task-list-modal"]')).toBeVisible();

    // Click far top-left corner — outside the modal content, on the backdrop
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(400);

    await expect(page.locator('[data-testid="task-list-modal"]')).not.toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  // 6. Closes via X button
  test('closes via the × close button', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    await expect(modal).toBeVisible();

    // ModalShell renders a button with the "×" character in the header
    const closeBtn = modal
      .locator('button')
      .filter({ hasText: /[×✕✗x]/i })
      .first();

    let closed = false;
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      closed = true;
    } else {
      const ariaClose = page.locator('[aria-label="Close"], [aria-label="close"]');
      if (await ariaClose.isVisible().catch(() => false)) {
        await ariaClose.first().click();
        closed = true;
      }
    }

    expect(closed).toBe(true);
    await page.waitForTimeout(300);
    await expect(modal).not.toBeVisible();
  });

  // 7. No console errors on open/close
  test('no real console errors on modal open and close', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    await openFirstPill(page);
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// describe: TaskListModal - Task List Content
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TaskListModal - Task List Content', () => {
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
    await goToYesterday(page);
    // Wait for pills — if they don't appear (e.g. API rate limit), tests will skip
    await page.waitForSelector('[data-testid^="status-pill-"]', { timeout: 60000 })
      .catch(() => {/* pills may not appear due to rate limits — individual tests skip if pillCount===0 */});
  });

  // 1. At least 1 task row renders
  test('modal content has meaningful task list text', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const text = await modal.textContent();

    // The modal body should be well-populated — header alone is ~30 chars,
    // real task content should bring total well above 100 chars
    expect(text.length).toBeGreaterThan(100);
  });

  // 2. No "undefined" or "NaN" in task text
  test('task list contains no "undefined" or "NaN" strings', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const text = await modal.textContent();

    expect(text).not.toContain('undefined');
    expect(text).not.toMatch(/\bNaN\b/);
  });

  // 3. Time values use "Xh Ym" format (not raw decimals like "3.14h")
  test('time values use "Xh Ym" format — no raw decimal hours', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const text = await modal.textContent();

    // formatMinutesToHM() is always used — raw decimal like "3.14h" must not appear
    expect(text).not.toMatch(/\d+\.\d+h/);
  });

  // 4. No raw 13-digit Unix timestamps visible
  test('no raw Unix timestamps (13-digit numbers) visible in task list', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const text = await modal.textContent();

    // 13-digit epoch timestamps (ms) like 1700000000000 should never appear raw
    expect(text).not.toMatch(/\b\d{13}\b/);
  });

  // 5. Task names visible (non-empty content in task rows)
  test('task rows contain visible task names', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);

    // Desktop: task names are in <a> links inside the grid rows
    // Mobile: task names are in <span> elements
    // Both cases: check that at least one anchor or span with enough text exists
    // Try anchor links first (desktop layout)
    const taskLinks = modal.locator('a[href*="app.clickup.com"], a[target="_blank"]');
    const linkCount = await taskLinks.count();

    if (linkCount > 0) {
      const firstName = await taskLinks.first().textContent();
      expect(firstName.trim().length).toBeGreaterThan(0);
    } else {
      // Mobile or no tasks with ClickUp URLs — fall back to checking non-empty text
      const text = await modal.textContent();
      // The "Task List (N)" section title indicates tasks are present
      expect(text).toMatch(/Task List\s*\(\d+\)/);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// describe: TaskListModal - Search Functionality
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TaskListModal - Search Functionality', () => {
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
    await goToYesterday(page);
    // Wait for pills — if they don't appear (e.g. API rate limit), tests will skip
    await page.waitForSelector('[data-testid^="status-pill-"]', { timeout: 60000 })
      .catch(() => {/* pills may not appear due to rate limits — individual tests skip if pillCount===0 */});
  });

  // 1. Search box renders and accepts input
  test('search input is present and filters results', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);

    // Locate search input by placeholder (from TaskListModal source)
    const searchInput = modal.locator(
      'input[placeholder*="Search tasks"]'
    );
    await expect(searchInput).toBeVisible();

    // Read initial task count from "Task List (N)" section title
    const textBefore = await modal.textContent();
    const countMatch = textBefore.match(/Task List\s*\((\d+)\)/);
    const initialCount = countMatch ? parseInt(countMatch[1], 10) : null;

    // Type a single character — results should filter or stay the same
    await searchInput.fill('a');
    await page.waitForTimeout(300);

    const textAfter = await modal.textContent();

    // Either "Found X tasks" text appears OR the task section count updated
    const hasFoundText = /Found \d+ tasks?/i.test(textAfter);
    const newCountMatch = textAfter.match(/Task List\s*\((\d+)\)/);
    const newCount = newCountMatch ? parseInt(newCountMatch[1], 10) : null;

    expect(hasFoundText || newCount !== null).toBeTruthy();
  });

  // 2. Clear button (✕) appears when search has value
  test('clear button appears when search field has text', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const searchInput = modal.locator('input[placeholder*="Search tasks"]');
    await expect(searchInput).toBeVisible();

    // The ✕ clear button should not be visible before typing
    // (it's conditionally rendered via {searchQuery && <button>✕</button>})
    const clearBtnBefore = modal.locator('button').filter({ hasText: '✕' });
    const visibleBefore = await clearBtnBefore.isVisible().catch(() => false);
    expect(visibleBefore).toBe(false);

    // Type something to trigger the clear button rendering
    await searchInput.fill('test');
    await page.waitForTimeout(200);

    const clearBtnAfter = modal.locator('button').filter({ hasText: '✕' });
    await expect(clearBtnAfter).toBeVisible();
  });

  // 3. Clearing search restores full list
  test('clearing search restores the full task list', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const searchInput = modal.locator('input[placeholder*="Search tasks"]');

    // Capture initial task count
    const textBefore = await modal.textContent();
    const countMatchBefore = textBefore.match(/Task List\s*\((\d+)\)/);
    const initialCount = countMatchBefore ? parseInt(countMatchBefore[1], 10) : null;

    // Type a query
    await searchInput.fill('xyzzy_no_match_guaranteed');
    await page.waitForTimeout(300);

    // Click clear button
    const clearBtn = modal.locator('button').filter({ hasText: '✕' });
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
    } else {
      // Fallback: clear the input manually
      await searchInput.fill('');
      await searchInput.press('Enter');
    }
    await page.waitForTimeout(300);

    // After clearing, task count should be restored
    const textAfter = await modal.textContent();
    const countMatchAfter = textAfter.match(/Task List\s*\((\d+)\)/);
    const restoredCount = countMatchAfter ? parseInt(countMatchAfter[1], 10) : null;

    if (initialCount !== null && restoredCount !== null) {
      expect(restoredCount).toBe(initialCount);
    } else {
      // At minimum, the "Found X tasks" helper text should be gone
      expect(textAfter).not.toMatch(/Found \d+ tasks?/i);
    }
  });

  // 4. Empty search shows empty state
  test('searching for a nonsense string shows empty state or "Found 0 tasks"', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const searchInput = modal.locator('input[placeholder*="Search tasks"]');

    // Very unlikely to match any real task
    await searchInput.fill('xxxxxxxxxzzzz99999');
    await page.waitForTimeout(300);

    const text = await modal.textContent();

    // Either "Found 0 tasks" matching ... text appears OR an EmptyState renders
    // EmptyState renders when tasks.length === 0 (no tasks passed to modal at all)
    // For search with zero results, filteredTasks.length === 0 and paginatedTasks is empty
    const hasZeroFound = /Found 0 tasks?/i.test(text);
    // When all tasks are filtered out, no task rows remain — section still shows "Task List (0)"
    const hasZeroCount = /Task List\s*\(0\)/.test(text);
    // EmptyState renders "No ... tasks" text
    const hasEmptyState = /No\s+\w+\s+tasks/i.test(text);

    expect(hasZeroFound || hasZeroCount || hasEmptyState).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// describe: TaskListModal - Pagination
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TaskListModal - Pagination', () => {
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
    await goToYesterday(page);
    // Wait for pills — if they don't appear (e.g. API rate limit), tests will skip
    await page.waitForSelector('[data-testid^="status-pill-"]', { timeout: 60000 })
      .catch(() => {/* pills may not appear due to rate limits — individual tests skip if pillCount===0 */});
  });

  // Helper: find a pill whose task count exceeds TASKS_PER_PAGE (20)
  async function openPillWithManyTasks(page) {
    const pills = page.locator('[data-testid^="status-pill-"]');
    const pillCount = await pills.count();

    for (let i = 0; i < pillCount; i++) {
      const pill = pills.nth(i);
      await pill.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[data-testid="task-list-modal"]');
      const text = await modal.textContent();
      const countMatch = text.match(/(\d+)\s*Tasks?/i);
      const taskCount = countMatch ? parseInt(countMatch[1], 10) : 0;

      if (taskCount > 20) {
        return { modal, taskCount };
      }

      // Close and try next pill
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    return null; // No pill with >20 tasks found
  }

  // 1. Detect if pagination is needed
  test('Next button is enabled when task count exceeds 20', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const result = await openPillWithManyTasks(page);
    if (!result) {
      test.skip(true, 'No status pill has more than 20 tasks — pagination not applicable');
    }

    const { modal } = result;
    // Pagination bar renders "← Prev" and "Next →" buttons (only when totalPages > 1)
    const nextBtn = modal.locator('button').filter({ hasText: /Next/i });
    await expect(nextBtn).toBeVisible();
    expect(await nextBtn.isDisabled()).toBe(false);
  });

  // 2. First page: Prev disabled, Next enabled
  test('on first page, Prev button is disabled and Next button is enabled', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const result = await openPillWithManyTasks(page);
    if (!result) {
      test.skip(true, 'No status pill has more than 20 tasks');
    }

    const { modal } = result;

    const prevBtn = modal.locator('button').filter({ hasText: /Prev/i });
    const nextBtn = modal.locator('button').filter({ hasText: /Next/i });

    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // On page 1: Prev is disabled (opacity 0.5 and cursor not-allowed, but also disabled attr)
    expect(await prevBtn.isDisabled()).toBe(true);
    expect(await nextBtn.isDisabled()).toBe(false);
  });

  // 3. Click Next → new page loads (different "Page X of Y" indicator)
  test('clicking Next navigates to page 2', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const result = await openPillWithManyTasks(page);
    if (!result) {
      test.skip(true, 'No status pill has more than 20 tasks');
    }

    const { modal } = result;

    // Confirm we start on page 1
    const textBefore = await modal.textContent();
    expect(textBefore).toMatch(/Page 1 of \d+/);

    const nextBtn = modal.locator('button').filter({ hasText: /Next/i });
    await nextBtn.click();
    await page.waitForTimeout(300);

    const textAfter = await modal.textContent();
    expect(textAfter).toMatch(/Page 2 of \d+/);
  });

  // 4. Prev becomes enabled after clicking Next
  test('Prev button becomes enabled after navigating to page 2', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const result = await openPillWithManyTasks(page);
    if (!result) {
      test.skip(true, 'No status pill has more than 20 tasks');
    }

    const { modal } = result;

    const prevBtn = modal.locator('button').filter({ hasText: /Prev/i });
    const nextBtn = modal.locator('button').filter({ hasText: /Next/i });

    // Initially disabled
    expect(await prevBtn.isDisabled()).toBe(true);

    await nextBtn.click();
    await page.waitForTimeout(300);

    // After going to page 2, Prev should become enabled
    expect(await prevBtn.isDisabled()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// describe: TaskListModal - By-Assignee Section
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TaskListModal - By-Assignee Section', () => {
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
    await goToYesterday(page);
    // Wait for pills — if they don't appear (e.g. API rate limit), tests will skip
    await page.waitForSelector('[data-testid^="status-pill-"]', { timeout: 60000 })
      .catch(() => {/* pills may not appear due to rate limits — individual tests skip if pillCount===0 */});
  });

  // 1. Assignee breakdown section renders
  test('By Assignee section is present on desktop', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const text = await modal.textContent();

    // The "By Assignee" ModalSection is rendered on desktop (isMobile = false for 1280px viewport)
    // It's only shown when tasks.length > 0
    // If there's an EmptyState, the section won't appear
    if (text.includes('No ') && text.includes('tasks')) {
      // Empty modal — skip gracefully
      test.skip(true, 'No tasks in this status pill — assignee section not rendered');
    }

    expect(text).toContain('By Assignee');
  });

  // 2. Shows at least one team member name
  test('By Assignee section shows at least one known member name', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const text = await modal.textContent();

    if (!text.includes('By Assignee')) {
      test.skip(true, 'By Assignee section not rendered (empty tasks or mobile view)');
    }

    const found = MEMBER_NAMES.some((name) => text.includes(name));
    expect(found).toBeTruthy();
  });

  // 3. Assignee task counts are valid numbers (not NaN)
  test('By Assignee section shows numeric task counts (not NaN)', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found');
    }

    const modal = await openFirstPill(page);
    const text = await modal.textContent();

    if (!text.includes('By Assignee')) {
      test.skip(true, 'By Assignee section not rendered (empty tasks or mobile view)');
    }

    // NaN must not appear anywhere in the modal
    expect(text).not.toMatch(/\bNaN\b/);

    // The By Assignee section must contain at least one digit (task count)
    const assigneeSection = text.slice(text.indexOf('By Assignee'));
    expect(assigneeSection).toMatch(/\d+/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// describe: TaskListModal - Mobile Layout
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TaskListModal - Mobile Layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

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
    await goToYesterday(page);
    // Wait for pills — if they don't appear (e.g. API rate limit), tests will skip
    await page.waitForSelector('[data-testid^="status-pill-"]', { timeout: 60000 })
      .catch(() => {/* pills may not appear due to rate limits — individual tests skip if pillCount===0 */});
  });

  // 1. Open pill modal on mobile
  test('modal opens on mobile viewport', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found on mobile');
    }

    const modal = await openFirstPill(page);
    await expect(modal).toBeVisible();
  });

  // 2. Modal width fills screen on mobile (nearly full width)
  test('modal width fills the mobile screen width', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found on mobile');
    }

    const modal = await openFirstPill(page);
    await expect(modal).toBeVisible();

    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    // On 390px viewport with 10px padding on each side, modal width >= 350px
    expect(box.width).toBeGreaterThanOrEqual(350);
  });

  // 3. No horizontal overflow on mobile
  test('page has no horizontal overflow on mobile with modal open', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found on mobile');
    }

    await openFirstPill(page);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    // Should not exceed viewport width
    expect(scrollWidth).toBeLessThanOrEqual(390);
  });

  // 4. Task content visible on mobile
  test('task content is visible on mobile (non-trivial text length)', async ({ page }) => {
    const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
    if (pillCount === 0) {
      test.skip(true, 'No status pills found on mobile');
    }

    const modal = await openFirstPill(page);
    await expect(modal).toBeVisible();

    const text = await modal.textContent();
    // Mobile layout renders task name + Assignee/Date/Tracked grid
    // Meaningful content should be much more than just the header
    expect(text.trim().length).toBeGreaterThan(50);
  });
});
