import { test } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test('debug: header date after yesterday', async ({ page }) => {
  const logs = [];
  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('Date') || t.includes('date') || t.includes('setDateRange')) logs.push(t);
  });
  
  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForTimeout(2000);
  
  // Read current store date range
  const storeDate = await page.evaluate(() => {
    const stores = window.__zustand_stores__ || {};
    // Try to get from React fiber
    const app = document.querySelector('#root')?._reactFiber;
    return 'no direct access';
  });
  
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  const initialText = await calBtn.textContent();
  console.log('Initial header:', initialText);
  
  await calBtn.click();
  await page.waitForTimeout(500);
  
  // Click Yesterday
  const ytdBtn = page.locator('button').filter({ hasText: 'Yesterday' }).first();
  const ytdText = await ytdBtn.textContent();
  console.log('Yesterday button text:', ytdText);
  await ytdBtn.click({ force: true });
  await page.waitForTimeout(300);
  
  // Read the selected range display inside modal
  const modalDisplay = await page.locator('div').filter({ hasText: 'Selected Range' }).first().textContent();
  console.log('Modal display:', modalDisplay.substring(0, 100));
  
  // Click Apply
  await page.locator('button').filter({ hasText: 'Apply' }).first().click();
  await page.waitForTimeout(1000);
  
  const headerAfter = await calBtn.textContent();
  console.log('Header after:', headerAfter);
  
  // Inject a probe to read the dateRange store value
  const dateRangeValue = await page.evaluate(() => {
    // Try to read window store
    try {
      // Zustand store may be on window in dev
      const keys = Object.keys(window).filter(k => typeof window[k] === 'function' && k.includes('use'));
      return 'searched: ' + keys.slice(0, 5).join(',');
    } catch(e) { return e.message; }
  });
  console.log('Store probe:', dateRangeValue);
});
