import { test } from '@playwright/test';

test('debug: preset click with Apply container', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);
  
  // Open date picker
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  
  // Check the modal container by "Apply" button
  const applyBtns = await page.locator('button', { hasText: 'Apply' }).count();
  console.log('Apply button count:', applyBtns);
  
  // Check div containers with Apply
  const modalByApply = page.locator('div').filter({ has: page.locator('button', { hasText: 'Apply' }) }).last();
  const btnCountInModal = await modalByApply.locator('button').count();
  console.log('Buttons in modal (last Apply div):', btnCountInModal);
  
  // Try all matching divs
  const allModals = page.locator('div').filter({ has: page.locator('button', { hasText: 'Apply' }) });
  const modalCount = await allModals.count();
  console.log('Total divs with Apply:', modalCount);
  
  for (let i = 0; i < Math.min(modalCount, 5); i++) {
    const m = allModals.nth(i);
    const c = await m.locator('button').count();
    const ytdCount = await m.locator('button').filter({ hasText: 'Yesterday' }).count();
    console.log(`modal[${i}]: buttons=${c}, yesterday=${ytdCount}`);
  }
  
  // Try force clicking the Yesterday button inside last modal
  const preset = modalByApply.locator('button').filter({ hasText: 'Yesterday' }).first();
  const presetCount = await preset.count();
  console.log('Yesterday preset count:', presetCount);
  
  if (presetCount > 0) {
    try {
      await preset.click({ force: true, timeout: 5000 });
      console.log('Clicked Yesterday successfully');
    } catch(e) {
      console.log('Click failed:', e.message.substring(0, 100));
    }
  }
});
