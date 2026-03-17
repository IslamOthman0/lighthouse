import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test.setTimeout(120000);

test('debug: store state after yesterday click', async ({ page }) => {
  const allLogs = [];
  page.on('console', msg => allLogs.push(msg.text()));
  
  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForTimeout(3000);

  // Before click
  const storeBefore = await page.evaluate(() => {
    try {
      // Try Zustand devtools
      const keys = Object.keys(window).filter(k => k.includes('zustand') || k.includes('store'));
      // Try to find the store by checking React fiber
      const root = document.getElementById('root') || document.querySelector('#root, [data-reactroot]');
      if (root && root._reactFiber) return 'found fiber';
      return 'no store found: ' + keys.join(', ');
    } catch(e) { return 'error: ' + e.message; }
  });
  console.log('Store before:', storeBefore);

  // Click Yesterday
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  
  // Read date buttons to understand DatePickerModal structure
  const dateButtons = await page.locator('button').all();
  const btns = [];
  for (const btn of dateButtons) {
    const text = await btn.textContent().catch(() => '');
    if (text.trim()) btns.push(text.trim().substring(0, 30));
  }
  console.log('Available buttons when picker open:', btns.join(' | '));
  
  // Click Yesterday  
  const yBtn = page.locator('button').filter({ hasText: /^Yesterday$/ }).first();
  const yBtnCount = await page.locator('button').filter({ hasText: /^Yesterday$/ }).count();
  console.log('Yesterday button count:', yBtnCount);
  await yBtn.click();
  
  await page.waitForTimeout(15000);
  
  // Filter logs
  const timeLogs = allLogs.filter(l => l.includes('🕐') || l.includes('Time range') || l.includes('Filtered'));
  console.log('Time range logs:', timeLogs.join('\n'));
  
  const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
  console.log('Pill count:', pillCount);
  
  // Check header text  
  const headerText = await page.locator('button').filter({ hasText: '📅' }).first().textContent();
  console.log('Header date button text:', headerText);
});
