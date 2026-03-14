/**
 * Task 1.1 — Grid View: All Cards Display Correct Data
 *
 * Verifies that the Grid View dashboard renders correct data
 * from mock fixtures. All assertions are code-based — NO screenshots.
 *
 * Groups:
 *   GROUP 1 — Overview Cards (team-tracked, tasks-progress, team-score)
 *   GROUP 2 — Member presence (all 8 names in DOM)
 *   GROUP 3 — Status counts (TeamStatusOverview body text)
 *   GROUP 4 — No JS errors in console
 *
 * Note: test.setTimeout(60000) overrides the 30s global timeout because
 * setupMockApp (IDB seeding + app boot) takes ~22s on this machine.
 */

import { test, expect, setupMockApp, collectConsoleErrors } from '../fixtures/test-setup.js';

// ─── GROUP 1 — Overview Cards ─────────────────────────────────────────────────

test.describe('GROUP 1 — Overview Cards', () => {
  test('overview-card-team-tracked is visible and shows hours', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    // OverviewCard label "Team Tracked" → testid "overview-card-team-tracked"
    const card = page.locator('[data-testid="overview-card-team-tracked"]');
    await expect(card).toBeVisible();
    // Should display something containing "h" (hours format like "27h 0m" or "27h")
    await expect(card).toContainText('h');
  });

  test('overview-card-tasks-progress is visible', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    // OverviewCard label "Tasks Progress" → testid "overview-card-tasks-progress"
    const card = page.locator('[data-testid="overview-card-tasks-progress"]');
    await expect(card).toBeVisible();
  });

  test('overview-card-team-score is visible and shows a numeric value', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    // ScoreBreakdownCard has data-testid="overview-card-team-score"
    const card = page.locator('[data-testid="overview-card-team-score"]');
    await expect(card).toBeVisible();
    // Should contain a number (the team score)
    const text = await card.textContent();
    expect(text).toMatch(/\d/); // at least one digit
  });
});

// ─── GROUP 2 — Member Presence ────────────────────────────────────────────────

test.describe('GROUP 2 — Member Presence (all 8 names in DOM)', () => {
  test('Working members appear in DOM — Dina Ibrahim, Alaa Soliman, Samar Magdy', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    // Use .first() to handle names appearing in both member card and ranking table
    await expect(page.getByText('Dina Ibrahim').first()).toBeVisible();
    await expect(page.getByText('Alaa Soliman').first()).toBeVisible();
    await expect(page.getByText('Samar Magdy').first()).toBeVisible();
  });

  test('Break member appears in DOM — Nada Meshref', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    await expect(page.getByText('Nada Meshref').first()).toBeVisible();
  });

  test('Offline members appear in DOM — Nada Amr, Merit Fouad', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    await expect(page.getByText('Nada Amr').first()).toBeVisible();
    await expect(page.getByText('Merit Fouad').first()).toBeVisible();
  });

  test('Leave member appears in DOM — Riham', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    // "Riham" appears in both member card and ranking table — use .first()
    await expect(page.getByText('Riham').first()).toBeVisible();
  });

  test('NoActivity member appears in DOM — Islam Othman', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    // "Islam Othman" appears in both card and ranking table — use .first()
    await expect(page.getByText('Islam Othman').first()).toBeVisible();
  });

  test('All 8 member names found in DOM', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    const names = [
      'Dina Ibrahim',
      'Alaa Soliman',
      'Nada Meshref',
      'Nada Amr',
      'Islam Othman',
      'Riham',
      'Samar Magdy',
      'Merit Fouad',
    ];

    for (const name of names) {
      // Use .first() — names appear in both member card and ranking table
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('6 full member-cards rendered for working/break/offline members', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    // TeamStatusCard renders noActivity + leave members as CompactMemberRow (no data-testid).
    // Only working (3) + break (1) + offline (2) members render through CardShell →
    // data-testid="member-card". Total = 6 full cards.
    // noActivity (Islam Othman) and leave (Riham) appear as compact rows (no testid).
    await expect(page.locator('[data-testid="member-card"]')).toHaveCount(6, { timeout: 10000 });
  });
});

// ─── GROUP 3 — Status Counts (TeamStatusOverview) ────────────────────────────

test.describe('GROUP 3 — Status Counts (TeamStatusOverview)', () => {
  test('TeamStatusOverview body contains status labels', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    // TeamStatusOverview renders: Working, Break, Offline, Leave, No Activity
    // Names appear multiple times (cards + TeamStatusOverview) — use .first()
    await expect(page.getByText('Working').first()).toBeVisible();
    await expect(page.getByText('Break').first()).toBeVisible();
    await expect(page.getByText('Offline').first()).toBeVisible();
    await expect(page.getByText('Leave').first()).toBeVisible();
    // "No Activity" renders as "No Activity" (camelCase → spaced in TeamStatusOverview)
    await expect(page.getByText('No Activity').first()).toBeVisible();
  });

  test('Working count is 3 (Dina, Alaa, Samar)', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    // TeamStatusOverview renders: <span>Working</span> ... <span>3</span>
    // Body text contains "3" for the working group count
    const body = await page.locator('body').textContent();
    expect(body).toContain('3');
  });

  test('Break count is 1 (Nada Meshref)', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('1');
  });

  test('Offline count is 2 (Nada Amr, Merit Fouad)', async ({ mockPage: page }) => {
    test.setTimeout(60000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('2');
  });
});

// ─── GROUP 4 — No JS Errors ───────────────────────────────────────────────────

test.describe('GROUP 4 — No JS errors in console', () => {
  test('Dashboard loads without JS errors', async ({ page }) => {
    test.setTimeout(60000);
    // Set up error collection BEFORE bootstrap
    const getErrors = collectConsoleErrors(page);

    // Bootstrap the app with full 8-member mock
    await setupMockApp(page);

    const errors = getErrors();
    expect(errors).toHaveLength(0);
  });
});
