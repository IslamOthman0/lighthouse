import { test } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test('debug: direct test of toDate in browser context', async ({ page }) => {
  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForTimeout(2000);
  
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  
  await page.locator('button').filter({ hasText: 'Yesterday' }).first().click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('button').filter({ hasText: 'Apply' }).first().click();
  await page.waitForTimeout(500);
  
  // Read the actual localStorage dateRange to see what's stored
  const stored = await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem('lighthouse_settings') || '{}');
    const storeRaw = localStorage.getItem('useAppStore');
    return {
      settings: 'keys: ' + Object.keys(settings).join(','),
      storeRaw: storeRaw ? storeRaw.substring(0, 200) : 'null',
    };
  });
  console.log('Stored:', JSON.stringify(stored, null, 2));
  
  // Also try to read Zustand state via window dev tools
  const zustandState = await page.evaluate(() => {
    // In development mode, Zustand might expose state
    const state = window.__LIGHTHOUSE_STORE__ || {};
    return state;
  });
  console.log('Zustand:', JSON.stringify(zustandState));
  
  // Try to intercept the react component
  const headerDateDebug = await page.evaluate(() => {
    // Try reading from React internals
    const dateBtn = document.querySelector('button[title*="Viewing"], button[title*="Select"]');
    if (!dateBtn) return 'no date button found';
    return {
      title: dateBtn.title,
      text: dateBtn.textContent,
      style_bg: dateBtn.style.background,
    };
  });
  console.log('Header btn:', JSON.stringify(headerDateDebug));
});
