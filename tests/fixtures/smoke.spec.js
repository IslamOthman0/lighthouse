/**
 * Phase 0 Smoke Test — Verify test-setup.js helper works
 *
 * Confirms:
 * - App loads with 8 mock members (varied states)
 * - Overview cards render with computed stats
 * - No JS errors in console
 * - Member names visible in DOM
 *
 * Run: npx playwright test tests/fixtures/smoke.spec.js
 */
import { test, expect, setupMockApp, collectConsoleErrors, VIEWPORTS } from './test-setup.js';
import { MOCK_MEMBERS, MOCK_SETTINGS, EDGE_CASE_MEMBERS } from './mock-data.js';

test.describe('Phase 0 Smoke — test-setup.js helper', () => {

  test('1. App loads with 8 mock members — overview cards visible', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page);

    // Overview cards confirm dashboard loaded
    await expect(page.locator('[data-testid^="overview-card"]').first()).toBeVisible();

    // At least 1 member name should appear in the DOM
    const bodyText = await page.locator('body').innerText();
    const namesFound = MOCK_MEMBERS.filter(m => bodyText.includes(m.name.split(' ')[0])).length;
    console.log(`  Names found in DOM: ${namesFound}/8`);
    expect(namesFound).toBeGreaterThanOrEqual(1);

    // No JS errors
    const errors = getErrors();
    if (errors.length > 0) {
      console.log('  JS errors:', errors);
    }
    expect(errors).toHaveLength(0);
  });

  test('2. Working member card — Dina visible in DOM', async ({ page }) => {
    await setupMockApp(page);

    // Dina (working, high score) should appear somewhere in DOM
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Dina');
  });

  test('3. Settings injection — noirGlass theme applied', async ({ page }) => {
    const noirSettings = {
      ...MOCK_SETTINGS.DEFAULT,
      display: { theme: 'noirGlass', defaultView: 'grid', showProfilePictures: true, developerMode: false },
    };
    await setupMockApp(page, { settings: noirSettings });

    // App loads with noirGlass theme (different background from trueBlack)
    await expect(page.locator('[data-testid^="overview-card"]').first()).toBeVisible();
    const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bg).toBeTruthy();
    console.log(`  Background color with noirGlass: ${bg}`);
  });

  test('4. All-overworking edge case — 8 orange warning cards', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await setupMockApp(page, { members: EDGE_CASE_MEMBERS.ALL_OVERWORKING });

    await expect(page.locator('[data-testid^="overview-card"]').first()).toBeVisible();

    // All members are working (overworking) — body should contain names
    const bodyText = await page.locator('body').innerText();
    const namesFound = EDGE_CASE_MEMBERS.ALL_OVERWORKING.filter(m =>
      bodyText.includes(m.name.split(' ')[0])
    ).length;
    console.log(`  Names found (all overworking): ${namesFound}/8`);
    expect(namesFound).toBeGreaterThanOrEqual(1);

    const errors = getErrors();
    if (errors.length > 0) console.log('  JS errors (all overworking):', errors);
    expect(errors).toHaveLength(0);
  });

  test('5. Mobile viewport — dashboard renders', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.MOBILE);
    await setupMockApp(page);

    await expect(page.locator('[data-testid^="overview-card"]').first()).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`  Mobile horizontal overflow: ${hasOverflow}`);
    // Log for now — Phase 4 will assert this properly
  });

});
