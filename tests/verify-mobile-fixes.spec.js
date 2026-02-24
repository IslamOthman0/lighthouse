import { test } from '@playwright/test';

test('verify all mobile fixes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5175');
  await page.waitForTimeout(3000);

  // 1. Screenshot: Header
  await page.screenshot({
    path: 'tests/screenshots/mobile-header-fixed.png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 390, height: 80 }
  });

  // 2. Screenshot: Grid view (default)
  await page.screenshot({
    path: 'tests/screenshots/mobile-grid.png',
    fullPage: false,
  });

  // 3. Switch to list view
  const listToggle = page.locator('[data-testid="list-view-toggle"]');
  await listToggle.click();
  await page.waitForTimeout(1000);

  // 4. Screenshot: List view
  await page.screenshot({
    path: 'tests/screenshots/mobile-list-fixed.png',
    fullPage: false,
  });

  // 5. Scroll down to see ranking table
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  await page.screenshot({
    path: 'tests/screenshots/mobile-ranking-fixed.png',
    fullPage: false,
  });

  console.log('All screenshots saved');
});
