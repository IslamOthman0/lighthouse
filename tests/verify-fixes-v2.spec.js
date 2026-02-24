import { test } from '@playwright/test';

test('verify all fixes v2', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5175');
  await page.waitForTimeout(3000);

  // 1. Grid view (mobile should not show list toggle)
  await page.screenshot({
    path: 'tests/screenshots/v2-mobile-grid.png',
    fullPage: false,
  });

  // 2. Open sort dropdown
  const sortBtn = page.locator('button').filter({ hasText: '☰' }).first();
  await sortBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'tests/screenshots/v2-sort-dropdown.png',
    fullPage: false,
  });
  // Close it
  await page.click('body', { position: { x: 10, y: 10 } });
  await page.waitForTimeout(300);

  // 3. Open filter dropdown
  const filterBtn = page.locator('button').filter({ hasText: '▽' }).first();
  await filterBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'tests/screenshots/v2-filter-dropdown.png',
    fullPage: false,
  });
  // Close it
  await page.click('body', { position: { x: 10, y: 10 } });
  await page.waitForTimeout(300);

  // 4. Scroll to ranking table
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'tests/screenshots/v2-ranking-mobile.png',
    fullPage: false,
  });

  // 5. Open date picker
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  // Click date text in header
  const dateBtn = page.locator('[style*="cursor: pointer"]').filter({ hasText: /Feb|Jan|Mar/ }).first();
  if (await dateBtn.isVisible()) {
    await dateBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/v2-datepicker.png',
      fullPage: false,
    });
  }

  console.log('All v2 screenshots saved');
});
