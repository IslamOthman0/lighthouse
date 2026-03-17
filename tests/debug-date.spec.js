import { test } from '@playwright/test';

test('debug: what date does the browser think it is', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);
  
  const result = await page.evaluate(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      today: now.toDateString(),
      todayISO: now.toISOString(),
      yesterday: yesterday.toDateString(),
      yesterdayISO: yesterday.toISOString(),
      locale: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  });
  console.log('Date info:', JSON.stringify(result, null, 2));
});
