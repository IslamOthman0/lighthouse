import { test } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test('debug: live trace header rendering', async ({ page }) => {
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push('[' + msg.type() + '] ' + msg.text()));

  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForTimeout(2000);
  
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  await page.locator('button').filter({ hasText: 'Yesterday' }).first().click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('button').filter({ hasText: 'Apply' }).first().click();
  await page.waitForTimeout(1000);
  
  // Inject a script to check what's in the Zustand store
  const dateRangeCheck = await page.evaluate(() => {
    // Intercept React rendering by reading the actual state from store
    // The Zustand store hooks into React context
    // Try another approach - read from the component tree
    const buttons = [...document.querySelectorAll('button')];
    const calBtns = buttons.filter(b => b.textContent.includes('📅'));
    return calBtns.map(b => ({
      text: b.textContent,
      title: b.title || '',
      dataset: JSON.stringify(b.dataset),
    }));
  });
  
  console.log('Calendar buttons:', JSON.stringify(dateRangeCheck, null, 2));
  
  // Check what Header.jsx toDate would compute for "2026-02-26"
  const headerCompute = await page.evaluate(() => {
    // Simulate Header.jsx toDate function
    const dateStr = "2026-02-26";
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(dateStr + 'T00:00:00') : new Date(dateStr);
    return {
      iso: d.toISOString(),
      locale: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });
  console.log('Header compute for 2026-02-26:', JSON.stringify(headerCompute));
});
