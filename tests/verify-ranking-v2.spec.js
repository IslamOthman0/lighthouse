import { test } from '@playwright/test';

test('verify ranking table v2', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5175');
  await page.waitForTimeout(3000);

  // Scroll to ranking table
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/v4-ranking.png', fullPage: false });

  // Open sort dropdown
  const sortBtn = page.locator('button').filter({ hasText: '↕' }).first();
  if (await sortBtn.isVisible()) {
    await sortBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'tests/screenshots/v4-ranking-sort.png', fullPage: false });
  }

  console.log('Done');
});
