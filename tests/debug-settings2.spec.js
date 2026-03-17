import { test, expect } from '@playwright/test';

test('debug modal structure', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);
  
  await page.locator('button[title="Settings"]').click();
  await page.waitForTimeout(500);
  
  // Count how many divs contain the h2
  const allDivsWithH2 = page.locator('div').filter({ has: page.locator('h2', { hasText: 'Settings' }) });
  console.log('All divs with Settings h2:', await allDivsWithH2.count());
  
  // Try each div
  for (let i = 0; i < await allDivsWithH2.count(); i++) {
    const d = allDivsWithH2.nth(i);
    const tabCount = await d.locator('button').filter({ hasText: /^🔗/ }).count();
    const allBtnCount = await d.locator('button').count();
    const tagName = await d.evaluate(el => el.tagName + '.' + el.className.substring(0,30));
    console.log(`div[${i}]: ${tagName} | tabs=${tabCount} | allBtns=${allBtnCount}`);
  }
  
  // Check what body text says about 🔗 button
  const emojiBtn = page.locator('button').filter({ hasText: '🔗' });
  console.log('Page-level 🔗 button count:', await emojiBtn.count());
  if (await emojiBtn.count() > 0) {
    console.log('🔗 button text:', await emojiBtn.first().textContent());
  }
});
