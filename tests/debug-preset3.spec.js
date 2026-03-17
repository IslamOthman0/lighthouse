import { test } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test('debug: clickPreset with emoji filter', async ({ page }) => {
  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForTimeout(2000);
  
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  
  const allYesterdayBtns = page.locator('button').filter({ hasText: 'Yesterday' });
  const count = await allYesterdayBtns.count();
  console.log('Yesterday buttons:', count);
  
  for (let i = 0; i < count; i++) {
    const btn = allYesterdayBtns.nth(i);
    const text = await btn.textContent();
    console.log(`btn[${i}] text="${text}" hasEmoji=${text.includes('📅')}`);
    
    if (!text.includes('📅')) {
      await btn.click({ force: true });
      await page.waitForTimeout(300);
      await page.locator('button').filter({ hasText: 'Apply' }).first().click();
      await page.waitForTimeout(1000);
      const headerText = await page.locator('button').filter({ hasText: '📅' }).first().textContent();
      console.log('Header after Yesterday + Apply:', headerText);
      return;
    }
  }
});
