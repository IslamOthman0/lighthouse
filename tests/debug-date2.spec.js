import { test } from '@playwright/test';

test('debug: date parsing', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const d1 = new Date("2026-02-26");  // UTC midnight
    const d2 = new Date("2026-02-26T00:00:00");  // local midnight
    const opts = { month: 'short', day: 'numeric' };
    return {
      d1_iso: d1.toISOString(),
      d1_locale: d1.toLocaleDateString('en-US', opts),
      d2_iso: d2.toISOString(),
      d2_locale: d2.toLocaleDateString('en-US', opts),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  });
  console.log(JSON.stringify(result, null, 2));
});
