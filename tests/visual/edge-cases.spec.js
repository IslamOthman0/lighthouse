/**
 * Phase 5.1 — Edge Cases & Extreme Values Tests
 *
 * Tests app stability under boundary conditions:
 * - Empty team (0 members)
 * - Single member
 * - All members in same state (noActivity)
 * - Extreme metric values (tracked=0, tracked=999999, score=0/100)
 * - Settings edge cases (weights sum >100, breakGapMinutes=0)
 *
 * All tests are code-based — NO screenshots.
 */

import { test, expect, setupMockApp, collectConsoleErrors, clickMember,
  injectSettings, mockClickUpAPI, injectMembers } from '../fixtures/test-setup.js';
import { MOCK_SETTINGS, MOCK_AUTH_USER, EDGE_CASE_MEMBERS, createMockMember } from '../fixtures/mock-data.js';

// ─── Helper: boot app without the member-element waitFor check ────────────────
// setupMockApp's waitForDashboard polls for member-card/compact-row elements.
// With 0 members or all-noActivity members (no data-testid="member-compact-row"
// in the current app), that poll hangs until the test timeout.
// We replicate the bootstrap steps but skip the member-element wait.

async function setupEdgeApp(page, options = {}) {
  const {
    members  = [],
    settings = MOCK_SETTINGS.DEFAULT,
    authUser = MOCK_AUTH_USER,
    leaves   = null,
  } = options;

  // Steps 1-3: inject settings, mock API, seed IDB
  await injectSettings(page, settings);
  await mockClickUpAPI(page);
  await injectMembers(page, members, authUser, leaves);

  // Step 4: Navigate
  await page.goto('/');

  // Step 5: Wait for the app shell to render (not login screen)
  // With members: the overview cards appear. With 0 members: skeleton stays up
  // but the app shell (header "LIGHTHOUSE") always renders once authenticated.
  await page.waitForFunction(() => {
    // App is past LoginScreen if either: overview cards appear, OR the header text appears
    const hasOverview = document.querySelectorAll('[data-testid^="overview-card"]').length > 0;
    const hasHeader   = document.body.textContent.includes('LIGHTHOUSE');
    return hasOverview || hasHeader;
  }, { timeout: 40000, polling: 300 });

  // Brief settle for React flushes
  await page.waitForTimeout(500);
}

// ─── GROUP 1: Empty Team (0 members) ─────────────────────────────────────────
// With 0 members the app renders the header/shell but stays in a skeleton state
// (no overview cards with data-testid). Assertions: app shell visible, no crash.

test.describe('GROUP 1 — Empty team (0 members)', () => {

  test('app shell renders without crash with 0 members', async ({ page }) => {
    test.setTimeout(60000);

    const getErrors = collectConsoleErrors(page);
    await setupEdgeApp(page, { members: EDGE_CASE_MEMBERS.EMPTY_TEAM });

    // App should have rendered something beyond a blank page (not still on login screen)
    // Check: either the skeleton UI is shown (CSS keyframes present) OR the dashboard is up
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    // The app renders a loading skeleton when it has no members — body is not empty
    expect(bodyHTML.length).toBeGreaterThan(100);

    expect(getErrors()).toHaveLength(0);
  });

  test('no member elements present with 0 members', async ({ page }) => {
    test.setTimeout(60000);

    await setupEdgeApp(page, { members: EDGE_CASE_MEMBERS.EMPTY_TEAM });

    // No full cards and no compact rows should exist
    const fullCards   = await page.locator('[data-testid="member-card"]').count();
    const compactRows = await page.locator('[data-testid="member-compact-row"]').count();

    expect(fullCards).toBe(0);
    expect(compactRows).toBe(0);
  });

  test('no JS errors with empty team', async ({ page }) => {
    test.setTimeout(60000);

    const getErrors = collectConsoleErrors(page);
    await setupEdgeApp(page, { members: EDGE_CASE_MEMBERS.EMPTY_TEAM });

    // Wait a moment for any deferred errors
    await page.waitForTimeout(1000);

    expect(getErrors()).toHaveLength(0);
  });

});

// ─── GROUP 2: Single Member ───────────────────────────────────────────────────

test.describe('GROUP 2 — Single member', () => {

  test('exactly 1 member element visible with 1 member', async ({ page }) => {
    test.setTimeout(60000);

    await setupMockApp(page, {
      members: EDGE_CASE_MEMBERS.SINGLE_MEMBER,
    });

    const fullCards   = await page.locator('[data-testid="member-card"]').count();
    const compactRows = await page.locator('[data-testid="member-compact-row"]').count();

    // Total member elements must be exactly 1
    expect(fullCards + compactRows).toBe(1);
  });

  test('overview cards render without crashing with 1 member', async ({ page }) => {
    test.setTimeout(60000);

    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page, {
      members: EDGE_CASE_MEMBERS.SINGLE_MEMBER,
    });

    const overviewCards = page.locator('[data-testid^="overview-card"]');
    const cardCount = await overviewCards.count();
    expect(cardCount).toBeGreaterThan(0);

    expect(getErrors()).toHaveLength(0);
  });

  test('single member click opens detail modal', async ({ page }) => {
    test.setTimeout(60000);

    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page, {
      members: EDGE_CASE_MEMBERS.SINGLE_MEMBER,
    });

    // Click the single member (working status → full card)
    const memberCard = page.locator('[data-testid="member-card"]').first();
    const cardVisible = await memberCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (cardVisible) {
      await memberCard.click();
    } else {
      // Compact row fallback
      const compactRow = page.locator('[data-testid="member-compact-row"]').first();
      const rowVisible = await compactRow.isVisible({ timeout: 2000 }).catch(() => false);
      if (rowVisible) {
        await compactRow.click();
      } else {
        // Ranking table fallback
        const tableRow = page.locator('table tbody tr').first();
        await expect(tableRow).toBeVisible({ timeout: 3000 });
        await tableRow.click();
      }
    }

    // Detail modal must appear
    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 8000 });

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    expect(getErrors()).toHaveLength(0);
  });

});

// ─── GROUP 3: All members in same state (noActivity) ─────────────────────────

test.describe('GROUP 3 — All members noActivity', () => {

  test('all 8 noActivity members render (no full cards, 8 ranking table rows)', async ({ page }) => {
    test.setTimeout(60000);

    const getErrors = collectConsoleErrors(page);
    // noActivity members don't show as member-card — use setupEdgeApp + wait for ranking table
    await setupEdgeApp(page, { members: EDGE_CASE_MEMBERS.ALL_NO_ACTIVITY });

    // No working/break/offline full cards expected
    const fullCards = await page.locator('[data-testid="member-card"]').count();
    expect(fullCards).toBe(0);

    // Ranking table should show all 8 members
    const tableRows = await page.locator('table tbody tr').count();
    expect(tableRows).toBe(8);

    expect(getErrors()).toHaveLength(0);
  });

  test('overview cards render with all-noActivity team', async ({ page }) => {
    test.setTimeout(60000);

    const getErrors = collectConsoleErrors(page);
    await setupEdgeApp(page, { members: EDGE_CASE_MEMBERS.ALL_NO_ACTIVITY });

    const overviewCards = page.locator('[data-testid^="overview-card"]');
    const cardCount = await overviewCards.count();
    expect(cardCount).toBeGreaterThan(0);

    expect(getErrors()).toHaveLength(0);
  });

});

// ─── GROUP 4: Extreme metric values ──────────────────────────────────────────

test.describe('GROUP 4 — Extreme metric values', () => {

  test('member with tracked=0, score=0 renders without errors', async ({ page }) => {
    test.setTimeout(60000);

    const zeroMember = createMockMember({
      id: 1,
      name: 'Zero Member',
      initials: 'ZM',
      clickUpId: '11111111',
      color: '#6366f1',
      target: 6.5,
      status: 'noActivity',
      tracked: 0,
      score: 0,
      tasks: 0,
      done: 0,
      completionDenominator: 0,
      complianceHours: 0,
      scoreBreakdown: { trackedTime: 0, tasksWorked: 0, tasksDone: 0, compliance: 0 },
      lastActiveDate: null,
    });

    const getErrors = collectConsoleErrors(page);
    // noActivity member — use setupEdgeApp (no member-card/compact-row in waitFor)
    await setupEdgeApp(page, { members: [zeroMember] });

    // App must render — overview cards should be visible
    const overviewCards = page.locator('[data-testid^="overview-card"]');
    const cardCount = await overviewCards.count();
    expect(cardCount).toBeGreaterThan(0);

    expect(getErrors()).toHaveLength(0);
  });

  test('overview card shows % with tracked=0 member', async ({ page }) => {
    test.setTimeout(60000);

    const zeroMember = createMockMember({
      id: 1,
      name: 'Zero Member',
      initials: 'ZM',
      clickUpId: '11111111',
      color: '#6366f1',
      target: 6.5,
      status: 'noActivity',
      tracked: 0,
      score: 0,
      complianceHours: 0,
    });

    await setupEdgeApp(page, { members: [zeroMember] });

    // At least one overview card must contain a % character (score/tracked display)
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

  test('member with tracked=999999, score=100 renders without errors', async ({ page }) => {
    test.setTimeout(60000);

    const extremeMember = createMockMember({
      id: 1,
      name: 'Extreme Member',
      initials: 'EM',
      clickUpId: '22222222',
      color: '#10b981',
      target: 6.5,
      status: 'working',
      timer: 3600,
      tracked: 999999,
      score: 100,
      tasks: 9999,
      done: 9999,
      completionDenominator: 9999,
      complianceHours: 999999,
      isOverworking: true,
      overtimeMinutes: 99999,
      scoreBreakdown: { trackedTime: 40, tasksWorked: 20, tasksDone: 30, compliance: 10 },
      lastActiveDate: new Date().toISOString(),
    });

    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page, { members: [extremeMember] });

    // App must render — overview cards should be visible
    const overviewCards = page.locator('[data-testid^="overview-card"]');
    const cardCount = await overviewCards.count();
    expect(cardCount).toBeGreaterThan(0);

    expect(getErrors()).toHaveLength(0);
  });

  test('no layout overflow with tracked=999999 member', async ({ page }) => {
    test.setTimeout(60000);

    const extremeMember = createMockMember({
      id: 1,
      name: 'Extreme Member',
      initials: 'EM',
      clickUpId: '22222222',
      color: '#10b981',
      target: 6.5,
      status: 'working',
      timer: 3600,
      tracked: 999999,
      score: 100,
      isOverworking: true,
      overtimeMinutes: 99999,
      lastActiveDate: new Date().toISOString(),
    });

    await setupMockApp(page, { members: [extremeMember] });

    // Page should not scroll horizontally (no text overflow breaking layout)
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 5; // 5px tolerance
    });
    expect(hasOverflow).toBe(false);
  });

  test('overview card shows % with tracked=999999 member', async ({ page }) => {
    test.setTimeout(60000);

    const extremeMember = createMockMember({
      id: 1,
      name: 'Extreme Member',
      initials: 'EM',
      clickUpId: '22222222',
      color: '#10b981',
      target: 6.5,
      status: 'working',
      timer: 3600,
      tracked: 999999,
      score: 100,
      isOverworking: true,
      lastActiveDate: new Date().toISOString(),
    });

    await setupMockApp(page, { members: [extremeMember] });

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

});

// ─── GROUP 5: Settings edge cases ────────────────────────────────────────────

test.describe('GROUP 5 — Settings edge cases', () => {

  test('weights summing to >100 do not crash the app', async ({ page }) => {
    test.setTimeout(60000);

    const overweightSettings = {
      ...MOCK_SETTINGS.DEFAULT,
      score: {
        weights: {
          trackedTime: 0.60,
          tasksWorked: 0.60,
          tasksDone: 0.60,
          compliance: 0.60,
        },
        taskBaseline: 3,
      },
    };

    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page, { settings: overweightSettings });

    // App must render without crashing
    const overviewCards = page.locator('[data-testid^="overview-card"]');
    const cardCount = await overviewCards.count();
    expect(cardCount).toBeGreaterThan(0);

    expect(getErrors()).toHaveLength(0);
  });

  test('no JS errors with weights summing to >100', async ({ page }) => {
    test.setTimeout(60000);

    const overweightSettings = {
      ...MOCK_SETTINGS.DEFAULT,
      score: {
        weights: {
          trackedTime: 0.60,
          tasksWorked: 0.60,
          tasksDone: 0.60,
          compliance: 0.60,
        },
        taskBaseline: 3,
      },
    };

    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page, { settings: overweightSettings });

    // Wait for any deferred errors to surface
    await page.waitForTimeout(1000);

    expect(getErrors()).toHaveLength(0);
  });

  test('breakGapMinutes=0 does not crash the app', async ({ page }) => {
    test.setTimeout(60000);

    const zeroBreakSettings = {
      ...MOCK_SETTINGS.DEFAULT,
      thresholds: {
        breakMinutes: 15,
        offlineMinutes: 60,
        breakGapMinutes: 0,
      },
    };

    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page, { settings: zeroBreakSettings });

    // App must render without crashing
    const overviewCards = page.locator('[data-testid^="overview-card"]');
    const cardCount = await overviewCards.count();
    expect(cardCount).toBeGreaterThan(0);

    expect(getErrors()).toHaveLength(0);
  });

  test('no JS errors with breakGapMinutes=0', async ({ page }) => {
    test.setTimeout(60000);

    const zeroBreakSettings = {
      ...MOCK_SETTINGS.DEFAULT,
      thresholds: {
        breakMinutes: 15,
        offlineMinutes: 60,
        breakGapMinutes: 0,
      },
    };

    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page, { settings: zeroBreakSettings });

    // Wait for any deferred errors to surface
    await page.waitForTimeout(1000);

    expect(getErrors()).toHaveLength(0);
  });

});
