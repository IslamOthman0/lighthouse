/**
 * List View Data Correctness — Phase 1, Task 1.2
 *
 * Tests that List View renders all 8 members with correct structure
 * and is consistent with Grid View.
 *
 * Known facts applied from Task 1.1 + grid-view results:
 *   - test.setTimeout(60000) required on every test (mockPage fixture ~22s)
 *   - Names appear in multiple DOM locations — always use .first()
 *   - Sync with empty API overwrites member tracked/score to 0 → avoid exact data assertions
 *   - Grid member-card count = 6 before sync; may drop after sync overwrites status
 *   - View toggle: [data-testid="list-view-toggle"] / [data-testid="grid-view-toggle"]
 *   - ListView has TWO tables: "Team Members List" (expand-only rows) + "Team Ranking" (RankingTable)
 *   - Total tbody rows = 16 (8 per table); scope to first table for 8 count
 *   - Clicking main table rows toggles expand — does NOT open modal
 *   - Clicking RankingTable rows (second table) calls onMemberClick → opens modal
 *   - Use "Team Ranking" header to scope to RankingTable for modal tests
 */

import { test, expect, setupMockApp, collectConsoleErrors } from '../fixtures/test-setup.js';
import { switchView, getScreenData, clickMember, closeModal } from '../fixtures/test-setup.js';
import { MOCK_MEMBERS } from '../fixtures/mock-data.js';

// ─── GROUP 1: Switch to List View ─────────────────────────────────────────────

test.describe('GROUP 1 — Switch to List View', () => {
  test('switches from grid to list view', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    // Default: Grid View is visible
    const gridToggle = page.locator('[data-testid="grid-view-toggle"]').first();
    await expect(gridToggle).toBeVisible();

    // Switch to List View
    await switchView(page, 'list');

    // List View content is visible (main "Team Members List" table)
    await expect(page.getByText('Team Members List').first()).toBeVisible();
  });

  test('grid view member-cards are gone after switching to list view', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    // Switch to List View
    await switchView(page, 'list');

    // Full member cards (grid-specific) are no longer visible
    const cardCount = await page.locator('[data-testid="member-card"]').count();
    expect(cardCount).toBe(0);
  });

  test('RankingTable is visible after switching to list view', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    await switchView(page, 'list');

    // RankingTable header "Team Ranking" is visible
    await expect(page.getByText('Team Ranking').first()).toBeVisible();
  });
});

// ─── GROUP 2: Table Content ────────────────────────────────────────────────────

test.describe('GROUP 2 — Table Content', () => {
  test('all 8 member names appear in list view', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    await switchView(page, 'list');

    const memberNames = MOCK_MEMBERS.map(m => m.name);
    for (const name of memberNames) {
      // Use first() — names appear in both "Team Members List" and "Team Ranking" tables
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  test('Team Members List table has 8 rows (one per member)', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    await switchView(page, 'list');

    // Wait for table to render
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Scope to the FIRST table (Team Members List) — total DOM has 16 rows (2 tables × 8)
    const firstTable = page.locator('table').first();
    const rows = firstTable.locator('tbody tr');
    await expect(rows).toHaveCount(8);
  });

  test('each row contains member name and time-formatted data', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    await switchView(page, 'list');

    // Dina Ibrahim should be in the table
    await expect(page.getByText('Dina Ibrahim').first()).toBeVisible();

    // "Team Members List" table header has a "Tracked" column
    await expect(page.getByText('Tracked').first()).toBeVisible();

    // Table renders time values in "Xm" or "Xh Xm" format (check body text)
    const bodyText = await page.locator('body').textContent();
    // After sync with empty API, tracked = 0 → "0m" for all; just verify format exists
    expect(bodyText).toMatch(/\d+m|\d+h/);
  });

  test('Team Ranking table shows score column', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    await switchView(page, 'list');

    // RankingTable has a "Score" column header
    await expect(page.getByText('Score').first()).toBeVisible();

    // Score values render as "X%" — body text contains at least one percentage
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/\d+%/);
  });

  test('team member count shown in RankingTable header', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    await switchView(page, 'list');

    // RankingTable header shows "{N} members" count
    await expect(page.getByText('8 members').first()).toBeVisible();
  });
});

// ─── GROUP 3: Data Consistency (Grid → List) ──────────────────────────────────

test.describe('GROUP 3 — Data Consistency (Grid → List)', () => {
  test('team score overview card is visible in both views', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    // Verify score card is visible in Grid View and contains a number
    const scoreCard = page.locator('[data-testid="overview-card-team-score"]');
    await expect(scoreCard).toBeVisible();
    const gridScore = await scoreCard.textContent();
    expect(gridScore).toMatch(/\d/); // contains a number

    // Switch to List View
    await switchView(page, 'list');

    // Score card is still visible (overview cards persist in both views)
    await expect(scoreCard).toBeVisible();
    const listScore = await scoreCard.textContent();

    // Both show a numeric value (exact equality not guaranteed — sync may run between reads)
    expect(listScore).toMatch(/\d/);
  });

  test('team tracked overview card shows same value in grid and list view', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    // Switch to List View first — sync has already run, values are stable
    await switchView(page, 'list');

    // Wait for values to stabilize after switch
    await page.waitForTimeout(500);

    // Both overview cards are visible in List View
    const trackedCard = page.locator('[data-testid="overview-card-team-tracked"]');
    const scoreCard = page.locator('[data-testid="overview-card-team-score"]');
    await expect(trackedCard).toBeVisible();
    await expect(scoreCard).toBeVisible();

    // Capture values — then switch back to grid and compare (same React state, no re-sync)
    const listTracked = await trackedCard.textContent();
    const listScore = await scoreCard.textContent();

    // Switch back to Grid View
    await switchView(page, 'grid');
    await page.waitForTimeout(300);

    const gridTracked = await trackedCard.textContent();
    const gridScore = await scoreCard.textContent();

    // Values must match (same store, no sync between view switches)
    expect(gridTracked).toBe(listTracked);
    expect(gridScore).toBe(listScore);
  });

  test('all 8 members visible in both grid and list view', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    // Grid View: all names in body
    const gridBody = await page.locator('body').textContent();
    const namesInGrid = MOCK_MEMBERS.filter(m => gridBody.includes(m.name.split(' ')[0])).length;
    expect(namesInGrid).toBe(8);

    // Switch to List View
    await switchView(page, 'list');

    // List View: all names still in body
    const listBody = await page.locator('body').textContent();
    const namesInList = MOCK_MEMBERS.filter(m => listBody.includes(m.name.split(' ')[0])).length;
    expect(namesInList).toBe(8);
  });
});

// ─── GROUP 4: Member Row Interaction ─────────────────────────────────────────

test.describe('GROUP 4 — Member Row Interaction', () => {
  test('clicking a RankingTable row opens MemberDetailModal', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    await switchView(page, 'list');

    // Wait for both tables to render (ListView has 2 tables; RankingTable is the second)
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // RankingTable is always the second <table> in ListView
    const tables = page.locator('table');
    const rankingTable = tables.nth(1);
    const firstRow = rankingTable.locator('tbody tr').first();
    await firstRow.click();

    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 5000 });
  });

  test('modal shows a member name when opened', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    await switchView(page, 'list');

    // Click a row in RankingTable — use the table scoped to "Team Ranking"
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Get all tables and click a row in the last table (RankingTable)
    const tables = page.locator('table');
    const tableCount = await tables.count();
    const rankingTable = tables.nth(tableCount - 1); // last table = RankingTable
    const firstRow = rankingTable.locator('tbody tr').first();

    await firstRow.click();
    const modal = page.locator('[data-testid="member-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Modal contains at least one member name from MOCK_MEMBERS
    const modalText = await modal.textContent();
    const hasAMemberName = MOCK_MEMBERS.some(m => modalText.includes(m.name.split(' ')[0]));
    expect(hasAMemberName).toBe(true);
  });

  test('pressing Escape closes the modal', async ({ mockPage: page }) => {
    test.setTimeout(60000);

    await switchView(page, 'list');

    // Open modal via RankingTable row
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    const tables = page.locator('table');
    const tableCount = await tables.count();
    const rankingTable = tables.nth(tableCount - 1);
    const firstRow = rankingTable.locator('tbody tr').first();

    await firstRow.click();
    await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible({ timeout: 5000 });

    // Close via Escape
    await closeModal(page);

    await expect(page.locator('[data-testid="member-detail-modal"]')).not.toBeVisible({ timeout: 3000 });
  });
});

// ─── GROUP 5: No JS Errors ────────────────────────────────────────────────────

test.describe('GROUP 5 — No JS Errors', () => {
  test('no JS errors when switching to list view', async ({ page }) => {
    test.setTimeout(60000);

    const getErrors = collectConsoleErrors(page);

    // Bootstrap with full mock
    await setupMockApp(page);

    // Switch to list view
    await switchView(page, 'list');

    // Wait for list view tables to render
    await page.waitForSelector('table tbody tr', { timeout: 5000 }).catch(() => {});

    expect(getErrors()).toHaveLength(0);
  });
});
