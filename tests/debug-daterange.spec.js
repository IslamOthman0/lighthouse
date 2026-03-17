import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test.setTimeout(120000);

test('debug: date range passed to sync', async ({ page }) => {
  const syncRangeLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🕐') || text.includes('Time range')) {
      syncRangeLogs.push(text);
    }
  });
  
  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForTimeout(3000);

  // Read the initial time range
  console.log('Initial range logged:', syncRangeLogs.join(' | '));
  
  // Click Yesterday
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  await page.locator('button').filter({ hasText: /^Yesterday$/ }).first().click();
  
  // Wait a bit for sync to start
  await page.waitForTimeout(3000);
  
  console.log('After yesterday click ranges:', syncRangeLogs.join('\n'));
  
  // Also print the store state
  const storeState = await page.evaluate(() => {
    // Try to read from the app's window store
    const state = window.__appStore?.getState?.() || {};
    return JSON.stringify({
      selectedDate: state.selectedDate,
      dateRange: state.dateRange,
    }, null, 2);
  });
  console.log('Store state:', storeState);
});
