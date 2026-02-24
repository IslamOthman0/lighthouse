import { test } from '@playwright/test';

test('verify datepicker', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5175');
  await page.waitForTimeout(3000);

  // Click the calendar emoji button in header
  const calBtn = page.getByText('📅').first();
  if (await calBtn.isVisible()) {
    await calBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/v3-datepicker.png', fullPage: false });
  } else {
    console.log('Calendar button not found, trying locator approach');
    // Try any button with title containing "date"
    const dateBtn = page.locator('button[title*="date"], button[title*="Date"], div[title*="date"]').first();
    if (await dateBtn.isVisible().catch(() => false)) {
      await dateBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'tests/screenshots/v3-datepicker.png', fullPage: false });
    }
  }

  console.log('Done');
});
