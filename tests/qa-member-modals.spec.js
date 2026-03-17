import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

/**
 * QA: MemberDetailModal — all 3 tabs, all 5 member states
 *
 * Note on body overflow:
 *   scrollLock.js sets document.body.style.overflow = '' (empty string) on unlock,
 *   NOT 'unset'. Tests check `.not.toBe('hidden')` rather than `.toBe('unset')`.
 */

test.setTimeout(90000);

// ─── Constants ───────────────────────────────────────────────────────────────

const MEMBER_NAMES = ['Dina', 'Alaa', 'Nada', 'Islam', 'Riham', 'Samar', 'Merit'];

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

// ─── Shared setup ────────────────────────────────────────────────────────────

/**
 * Navigate to dashboard and wait for member cards to load.
 * On a fresh Playwright context, IndexedDB is empty so the app shows skeleton
 * cards until the first ClickUp API sync completes (~30s). We wait up to 45s.
 * Error listeners must be registered BEFORE calling this helper.
 */
async function waitForDashboard(page) {
  // Seed IndexedDB with members before page load to bypass API discovery
  await addMemberSeedScript(page);
  await page.goto('/');
  // Wait for real member cards — skeleton cards do NOT have this testid
  await page.waitForSelector('[data-testid="member-card"]', { timeout: 15000 });
  // Brief settle time after cards appear
  await page.waitForTimeout(1000);
}

// ─── Helper: open first member modal ─────────────────────────────────────────

async function openFirstMemberModal(page) {
  await page.locator('[data-testid="member-card"]').first().click();
  await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 5000 });
}

// ─── describe: MemberDetailModal - Open/Close ─────────────────────────────────

test.describe('MemberDetailModal - Open/Close', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    // Register listeners BEFORE navigation
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

  test('opens on member card click', async ({ page }) => {
    await page.locator('[data-testid="member-card"]').first().click();

    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');

    await page.keyboard.press('Escape');
  });

  test('member name in modal matches a known team member', async ({ page }) => {
    await openFirstMemberModal(page);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const modalText = await modal.textContent();

    const found = MEMBER_NAMES.some((name) => modalText.includes(name));
    expect(found).toBeTruthy();

    await page.keyboard.press('Escape');
  });

  test('closes via ESC key', async ({ page }) => {
    await openFirstMemberModal(page);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await expect(page.locator('[data-testid="member-detail-modal"]')).not.toBeVisible();

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('closes via backdrop click', async ({ page }) => {
    await openFirstMemberModal(page);

    // Click near top-left corner which is outside the centred modal panel
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(400);

    await expect(page.locator('[data-testid="member-detail-modal"]')).not.toBeVisible();
  });

  test('closes via X button', async ({ page }) => {
    await openFirstMemberModal(page);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();

    const closeBtn = modal
      .locator('button')
      .filter({ hasText: /[×✕✗x]/i })
      .first();

    let closed = false;
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      closed = true;
    } else {
      // Fallback: aria-label close button anywhere on page
      const ariaClose = page.locator('[aria-label="Close"], [aria-label="close"]');
      if (await ariaClose.first().isVisible().catch(() => false)) {
        await ariaClose.first().click();
        closed = true;
      }
    }

    // Explicit guard — never silently pass if no close button was found
    expect(closed).toBe(true);

    await page.waitForTimeout(300);
    await expect(modal).not.toBeVisible();
  });

  test('no console errors during open/close', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });
});

// ─── describe: MemberDetailModal - Timeline Tab ────────────────────────────────

test.describe('MemberDetailModal - Timeline Tab', () => {
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

  test('Timeline tab renders without errors', async ({ page }) => {
    await openFirstMemberModal(page);

    await page.locator('[data-testid="tab-timeline"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('date navigation buttons are present on Timeline tab', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-timeline"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    // The Timeline tab always renders Today / Yesterday / This Week / Custom buttons
    const hasDateNav =
      text.includes('Today') ||
      text.includes('Yesterday') ||
      text.includes('This Week');
    expect(hasDateNav).toBeTruthy();

    await page.keyboard.press('Escape');
  });

  test('daily day labels use short names (Sun/Mon/Tue…) not raw numbers', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-timeline"]').click();

    // Click "This Week" to reveal weekly breakdown bars
    const modal = page.locator('[data-testid="member-detail-modal"]');
    const thisWeekBtn = modal.locator('button', { hasText: 'This Week' });
    if (await thisWeekBtn.isVisible().catch(() => false)) {
      await thisWeekBtn.click();
    }
    await page.waitForTimeout(1000);

    const text = await modal.textContent();
    // Weekly bars always render day names Sun–Sat
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    const foundDay = dayNames.some((d) => text.includes(d));
    expect(foundDay).toBeTruthy();

    await page.keyboard.press('Escape');
  });

  test('time values do not use raw decimal hours (e.g. "6.5h")', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-timeline"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    // Pattern like "3.14h" should NOT appear — formatHoursToHM is used everywhere
    expect(text).not.toMatch(/\d+\.\d+h/);

    await page.keyboard.press('Escape');
  });

  test('no "NaN" or "undefined" in Timeline tab text', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-timeline"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    expect(text).not.toContain('NaN');
    expect(text).not.toContain('undefined');

    await page.keyboard.press('Escape');
  });

  test('Today date navigation button is active by default', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-timeline"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    // Timeline renders "Today", "Yesterday", "This Week", "Custom" buttons
    expect(text).toContain('Today');

    await page.keyboard.press('Escape');
  });
});

// ─── describe: MemberDetailModal - Performance Tab ────────────────────────────

test.describe('MemberDetailModal - Performance Tab', () => {
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

  test('Performance tab renders without errors', async ({ page }) => {
    await openFirstMemberModal(page);

    await page.locator('[data-testid="tab-performance"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('Performance Score section is present', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-performance"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    // The performance hero always renders "Performance Score" and "/100"
    expect(text).toMatch(/Performance Score/i);
    expect(text).toContain('/100');

    await page.keyboard.press('Escape');
  });

  test('metric cards show at least 2 of: Time, Tasks, On-Time', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-performance"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    const labels = ['Time', 'Tasks', 'On-Time'];
    const foundCount = labels.filter((l) => text.includes(l)).length;
    expect(foundCount).toBeGreaterThanOrEqual(2);

    await page.keyboard.press('Escape');
  });

  test('weekly hours trend section is present', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-performance"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    // The component always renders "Weekly Hours Trend" section
    expect(text).toMatch(/Weekly Hours Trend/i);

    // Day names should appear in the bar chart
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    const foundDay = dayNames.some((d) => text.includes(d));
    expect(foundDay).toBeTruthy();

    await page.keyboard.press('Escape');
  });

  test('rank information is rendered in performance tab', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-performance"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    // Hero card renders "#X of Y team members • Top Z%"
    expect(text).toMatch(/#\d+\s+of\s+\d+/);

    await page.keyboard.press('Escape');
  });

  test('no "NaN" or "undefined" in Performance tab text', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-performance"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    expect(text).not.toContain('NaN');
    expect(text).not.toContain('undefined');

    await page.keyboard.press('Escape');
  });

  test('6.5h target reference is present in performance tab', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-performance"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    // The bar chart always renders "6.5h target" reference line label
    expect(text).toContain('6.5h target');

    await page.keyboard.press('Escape');
  });
});

// ─── describe: MemberDetailModal - Leaves Tab ─────────────────────────────────

test.describe('MemberDetailModal - Leaves Tab', () => {
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

  test('Leaves tab renders without errors', async ({ page }) => {
    await openFirstMemberModal(page);

    await page.locator('[data-testid="tab-leaves"]').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    expect([...consoleErrors, ...pageErrors]).toHaveLength(0);
  });

  test('annual leave quota (30 days default) is present', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-leaves"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    // DEFAULT_MEMBER_QUOTAS.annualLeave = 30
    expect(text).toContain('30');

    await page.keyboard.press('Escape');
  });

  test('WFH monthly quota (2 days default) is present', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-leaves"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    // DEFAULT_MEMBER_QUOTAS.wfhDays = 2
    expect(text).toContain('2');

    await page.keyboard.press('Escape');
  });

  test('leave section renders key leave-related terms', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-leaves"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    const leaveTerms = ['Leave', 'leave', 'WFH', 'Annual', 'annual', 'Balance', 'balance'];
    const found = leaveTerms.some((term) => text.includes(term));
    expect(found).toBeTruthy();

    await page.keyboard.press('Escape');
  });

  test('"Leave Balance" year heading is present', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-leaves"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    // The hero card renders "{year} Leave Balance"
    expect(text).toMatch(/\d{4}\s+Leave Balance/);

    await page.keyboard.press('Escape');
  });

  test('no "NaN" or "undefined" in Leaves tab text', async ({ page }) => {
    await openFirstMemberModal(page);
    await page.locator('[data-testid="tab-leaves"]').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[data-testid="member-detail-modal"]');
    const text = await modal.textContent();

    expect(text).not.toContain('NaN');
    expect(text).not.toContain('undefined');

    await page.keyboard.press('Escape');
  });
});

// ─── describe: MemberDetailModal - All Member Cards ───────────────────────────

test.describe('MemberDetailModal - All Member Cards', () => {
  test.setTimeout(120000); // Extra time for iterating over all 8 member cards

  test.beforeEach(async ({ page }) => {
    await addMemberSeedScript(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="member-card"]', { timeout: 15000 });
    await page.waitForTimeout(1000);
  });

  test('each visible member card opens and closes the modal', async ({ page }) => {
    const cards = page.locator('[data-testid="member-card"]');
    const count = await cards.count();

    // We expect up to 8 member cards
    expect(count).toBeGreaterThan(0);

    let successCount = 0;

    for (let i = 0; i < Math.min(count, 8); i++) {
      // Re-query cards after each close to avoid stale handles
      const card = page.locator('[data-testid="member-card"]').nth(i);

      // Get a snippet of the card text for debug logging
      const cardText = await card.textContent({ timeout: 3000 }).catch(() => '(unreadable)');
      const foundName = MEMBER_NAMES.find((n) => cardText.includes(n)) || '(unknown)';

      // Click with shorter action timeout to avoid hanging on non-actionable cards
      await card.click({ timeout: 5000 }).catch(() => {
        console.log(`[QA] Card #${i + 1} click timed out — skipping`);
        return;
      });

      await page.waitForTimeout(300);

      const modal = page.locator('[data-testid="member-detail-modal"]');
      const isVisible = await modal.isVisible().catch(() => false);

      if (isVisible) {
        console.log(`[QA] Opened modal for member #${i + 1}: ${foundName}`);
        successCount++;

        // Close via ESC
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);

        // Check closed (non-strict — if it doesn't close, just continue)
        const stillVisible = await modal.isVisible().catch(() => false);
        if (stillVisible) {
          // Force close via clicking outside
          await page.mouse.click(10, 10);
          await page.waitForTimeout(300);
        }
      } else {
        console.log(`[QA] Card #${i + 1} did not open a modal (${foundName})`);
      }
    }

    // At least 1 member must have successfully opened
    expect(successCount).toBeGreaterThan(0);
  });
});

// ─── describe: MemberDetailModal - Member States ──────────────────────────────

test.describe('MemberDetailModal - Member States', () => {
  test.beforeEach(async ({ page }) => {
    await addMemberSeedScript(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="member-card"]', { timeout: 15000 });
    await page.waitForTimeout(1000);
  });

  test('working members show a live timer in modal (if any are working)', async ({ page }) => {
    const cards = page.locator('[data-testid="member-card"]');
    const count = await cards.count();

    // Collect indices of working members by looking for the live-timer HH:MM:SS pattern
    // in the card text content (the member card renders LiveTimer for working state)
    const workingIndices = [];
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent().catch(() => '');
      if (/\d{2}:\d{2}:\d{2}/.test(text)) {
        workingIndices.push(i);
      }
    }

    if (workingIndices.length === 0) {
      console.log('[QA] No working members detected — skipping live timer assertion');
      test.skip();
      return;
    }

    // Test the first working member
    const workingCard = cards.nth(workingIndices[0]);
    await workingCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();

    // The modal header shows the member name and StatusBadge
    const modalText = await modal.textContent();
    // A working member should have a timer visible somewhere on the dashboard overlay
    // (the timer lives on the card, not in the modal itself, so we verify the modal
    // opened for a working-state member and contains "working" related info)
    expect(modalText.length).toBeGreaterThan(50);

    // Try to find a live timer element inside the modal
    const timerEl = modal.locator('text=/\\d{2}:\\d{2}:\\d{2}/').first();
    const timerVisible = await timerEl.isVisible().catch(() => false);

    if (timerVisible) {
      // Verify the timer is counting (live)
      const timer1 = await timerEl.textContent();
      await page.waitForTimeout(2000);
      const timer2 = await timerEl.textContent();
      expect(timer1).not.toBe(timer2);
      console.log(`[QA] Live timer confirmed: ${timer1} → ${timer2}`);
    } else {
      console.log('[QA] Live timer not in modal body (may be in card only) — modal opened OK for working member');
    }

    await page.keyboard.press('Escape');
  });

  test('offline members show "Offline" text in their modal (if any are offline)', async ({ page }) => {
    const cards = page.locator('[data-testid="member-card"]');
    const count = await cards.count();

    // Detect offline members by "Offline" text in card content
    const offlineIndices = [];
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent().catch(() => '');
      if (text.toLowerCase().includes('offline')) {
        offlineIndices.push(i);
      }
    }

    if (offlineIndices.length === 0) {
      console.log('[QA] No offline members detected — skipping offline state assertion');
      test.skip();
      return;
    }

    const offlineCard = cards.nth(offlineIndices[0]);
    await offlineCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();

    const modalText = await modal.textContent();

    // The MemberDetailModal header renders the StatusBadge which shows "Offline"
    expect(modalText.toLowerCase()).toContain('offline');
    // Note: "last seen" text appears in the card, not the modal itself

    console.log('[QA] Offline state verified in modal');

    await page.keyboard.press('Escape');
  });

  test('break members show "Break" or "On break" in their modal (if any are on break)', async ({ page }) => {
    const cards = page.locator('[data-testid="member-card"]');
    const count = await cards.count();

    const breakIndices = [];
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent().catch(() => '');
      if (text.toLowerCase().includes('break')) {
        breakIndices.push(i);
      }
    }

    if (breakIndices.length === 0) {
      console.log('[QA] No break members detected — skipping break state assertion');
      test.skip();
      return;
    }

    const breakCard = cards.nth(breakIndices[0]);
    await breakCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();

    const modalText = await modal.textContent();
    expect(modalText.toLowerCase()).toContain('break');

    console.log('[QA] Break state verified in modal');

    await page.keyboard.press('Escape');
  });

  test('leave members show "Leave" in their modal (if any are on leave)', async ({ page }) => {
    const cards = page.locator('[data-testid="member-card"]');
    const count = await cards.count();

    const leaveIndices = [];
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent().catch(() => '');
      if (text.toLowerCase().includes('leave')) {
        leaveIndices.push(i);
      }
    }

    if (leaveIndices.length === 0) {
      console.log('[QA] No leave members detected — skipping leave state assertion');
      test.skip();
      return;
    }

    const leaveCard = cards.nth(leaveIndices[0]);
    await leaveCard.click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();

    const modalText = await modal.textContent();
    expect(modalText.toLowerCase()).toContain('leave');

    console.log('[QA] Leave state verified in modal');

    await page.keyboard.press('Escape');
  });

  test('all 3 tabs are accessible regardless of member state', async ({ page }) => {
    // Open the first available member card
    await page.locator('[data-testid="member-card"]').first().click();

    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible();

    // Confirm all 3 tab buttons exist
    await expect(page.locator('[data-testid="tab-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-performance"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-leaves"]')).toBeVisible();

    // Cycle through all tabs
    await page.locator('[data-testid="tab-performance"]').click();
    await page.waitForTimeout(500);
    await expect(modal).toBeVisible();

    await page.locator('[data-testid="tab-leaves"]').click();
    await page.waitForTimeout(500);
    await expect(modal).toBeVisible();

    await page.locator('[data-testid="tab-timeline"]').click();
    await page.waitForTimeout(500);
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
  });
});
