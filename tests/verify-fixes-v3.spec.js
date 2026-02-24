import { test } from '@playwright/test';

test('verify fixes v3', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5175');
  await page.waitForTimeout(3000);

  // 1. Sort dropdown - positioned correctly on right
  const sortBtn = page.locator('button').filter({ hasText: '☰' }).first();
  await sortBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/v3-sort.png', fullPage: false });
  // Close
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.click('body', { position: { x: 200, y: 400 }, force: true });
  await page.waitForTimeout(300);

  // 2. Filter dropdown
  const filterBtn = page.locator('button').filter({ hasText: '▽' }).first();
  await filterBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/v3-filter.png', fullPage: false });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.click('body', { position: { x: 200, y: 400 }, force: true });
  await page.waitForTimeout(300);

  // 3. Date picker - click on the date text in the header area
  // The date picker button should be somewhere in the top header
  const headerBtns = page.locator('header button, [class*="header"] button, div >> text=/Feb|2026/');
  const count = await headerBtns.count();
  console.log(`Found ${count} potential date buttons`);

  // Try clicking on text that looks like a date
  const dateText = page.getByText(/Feb.*2026|Today|Yesterday/).first();
  if (await dateText.isVisible().catch(() => false)) {
    await dateText.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/v3-datepicker.png', fullPage: false });
  } else {
    // Try the calendar icon or any clickable date element in header
    const allBtns = page.locator('button');
    const btnCount = await allBtns.count();
    for (let i = 0; i < Math.min(btnCount, 10); i++) {
      const text = await allBtns.nth(i).innerText().catch(() => '');
      console.log(`Button ${i}: "${text}"`);
    }
  }

  // 4. Scroll to ranking
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/v3-ranking.png', fullPage: false });

  console.log('All v3 screenshots saved');
});
