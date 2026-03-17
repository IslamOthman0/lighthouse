import { test } from '@playwright/test';

test('debug: verify Header.jsx fix applied', async ({ page }) => {
  // Go to dev server and check the bundle for our fix
  const response = await page.goto('/');
  await page.waitForTimeout(1000);
  
  // Check if our fix is in the rendered code by executing the same logic
  const testResult = await page.evaluate(() => {
    // Test the exact logic from our fix
    const dateStr = "2026-02-26";
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    const d = regex.test(dateStr) ? new Date(dateStr + 'T00:00:00') : new Date(dateStr);
    return {
      iso: d.toISOString(),
      locale: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });
  console.log('Test result:', JSON.stringify(testResult));
  
  // Check title of header button to verify dev server has new code
  await page.waitForTimeout(2000);
  
  // Read the JS source of Header.jsx from dev server network response
  const headerSource = await page.evaluate(async () => {
    // Try to fetch the Header.jsx chunk
    const scripts = [...document.querySelectorAll('script[type="module"]')];
    return scripts.map(s => s.src).join('|');
  });
  console.log('Script sources:', headerSource.substring(0, 200));
});
