import { test } from '@playwright/test';

test('debug: preset click avoiding header button', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);
  
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  
  // Test the new clickPreset logic
  const allYesterdayBtns = page.locator('button').filter({ hasText: 'Yesterday' });
  const count = await allYesterdayBtns.count();
  console.log('All Yesterday buttons:', count);
  
  for (let i = 0; i < count; i++) {
    const btn = allYesterdayBtns.nth(i);
    const text = await btn.textContent();
    console.log(`btn[${i}] text: "${text}" emoji: ${text.includes('📅')}`);
  }
  
  // Now click the non-emoji one
  for (let i = 0; i < count; i++) {
    const btn = allYesterdayBtns.nth(i);
    const text = await btn.textContent();
    if (!text.includes('📅')) {
      console.log('Clicking btn[', i, ']');
      await btn.click({ force: true });
      await page.waitForTimeout(500);
      
      // Click Apply
      await page.locator('button').filter({ hasText: 'Apply' }).first().click();
      await page.waitForTimeout(500);
      
      // Check header
      const headerText = await page.locator('button').filter({ hasText: '📅' }).first().textContent();
      console.log('Header after Yesterday:', headerText);
      break;
    }
  }
});
