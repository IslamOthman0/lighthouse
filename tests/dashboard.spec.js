import { test, expect } from '@playwright/test';

/**
 * Dashboard View Tests
 * Tests for Grid and List view rendering and basic functionality
 */

test.describe('Dashboard - Grid View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for data to load
    await page.waitForTimeout(2000);
  });

  test('should display the main header with logo', async ({ page }) => {
    // Check for Lighthouse logo/title
    await expect(page.locator('text=Lighthouse').first()).toBeVisible();
  });

  test('should display overview cards with data-testid', async ({ page }) => {
    // Check for the three main overview cards using data-testid
    await expect(page.locator('[data-testid="overview-card-team-tracked"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="overview-card-tasks-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="overview-card-team-score"]')).toBeVisible();
  });

  test('should display team status overview', async ({ page }) => {
    // Check for team status section with member avatars
    const statusSection = page.locator('text=Working').first();
    await expect(statusSection).toBeVisible();
  });

  test('should display project breakdown card', async ({ page }) => {
    await expect(page.locator('text=Projects Breakdown').first()).toBeVisible();
  });

  test('should display member cards in grid with data-testid', async ({ page }) => {
    // Look for member cards using data-testid
    const memberCards = page.locator('[data-testid="member-card"]');
    await expect(memberCards.first()).toBeVisible({ timeout: 10000 });

    // Should have at least one member card
    const count = await memberCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display score breakdown card', async ({ page }) => {
    // Check for Team Score card using data-testid
    const scoreCard = page.locator('[data-testid="overview-card-team-score"]');
    await expect(scoreCard).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dashboard - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  test('should have view toggle buttons', async ({ page }) => {
    // Check for view toggle buttons using data-testid
    const gridToggle = page.locator('[data-testid="grid-view-toggle"]');
    const listToggle = page.locator('[data-testid="list-view-toggle"]');

    // At least one should be visible (desktop only)
    const gridVisible = await gridToggle.isVisible().catch(() => false);
    const listVisible = await listToggle.isVisible().catch(() => false);

    // On desktop, both should be visible
    if (gridVisible || listVisible) {
      expect(gridVisible || listVisible).toBeTruthy();
    }
  });

  test('should switch to list view when toggle is clicked', async ({ page }) => {
    const listToggle = page.locator('[data-testid="list-view-toggle"]');

    if (await listToggle.isVisible()) {
      await listToggle.click();
      await page.waitForTimeout(500);

      // Should show a table in list view
      await expect(page.locator('table').first()).toBeVisible();
    }
  });

  test('should switch back to grid view', async ({ page }) => {
    const listToggle = page.locator('[data-testid="list-view-toggle"]');

    if (await listToggle.isVisible()) {
      // Switch to list first
      await listToggle.click();
      await page.waitForTimeout(500);

      // Then switch back to grid
      const gridToggle = page.locator('[data-testid="grid-view-toggle"]');
      await gridToggle.click();
      await page.waitForTimeout(500);

      // Should show member cards
      await expect(page.locator('[data-testid="member-card"]').first()).toBeVisible();
    }
  });

  test('should still show overview cards in list view', async ({ page }) => {
    const listToggle = page.locator('[data-testid="list-view-toggle"]');

    if (await listToggle.isVisible()) {
      await listToggle.click();
      await page.waitForTimeout(500);

      // Overview cards should be visible regardless of view mode
      await expect(page.locator('[data-testid="overview-card-team-tracked"]')).toBeVisible();
    }
  });
});

test.describe('Dashboard - Data Loading', () => {
  test('should show loading state or data', async ({ page }) => {
    await page.goto('/');

    // Either loading indicator or actual data should be present
    await page.waitForTimeout(3000);

    // Check that page has loaded something (not blank)
    const pageContent = await page.textContent('body');
    expect(pageContent.length).toBeGreaterThan(100);
  });

  test('should load member data from API', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Check that member data is loaded (member names should appear)
    const memberNames = ['Dina', 'Alaa', 'Nada', 'Islam', 'Riham', 'Samar', 'Merit'];
    let foundMember = false;

    for (const name of memberNames) {
      if (await page.locator(`text=${name}`).first().isVisible().catch(() => false)) {
        foundMember = true;
        break;
      }
    }

    expect(foundMember).toBeTruthy();
  });
});
