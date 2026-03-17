import { test } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test.setTimeout(180000);

test('debug: full sync cycle after yesterday click', async ({ page }) => {
  const allLogs = [];
  page.on('console', msg => {
    allLogs.push('[' + msg.type() + '] ' + msg.text());
  });
  
  await addMemberSeedScript(page);
  await page.goto('/');
  
  // Wait for first sync to fully complete
  await page.waitForTimeout(15000);
  console.log('--- After initial sync ---');
  const logs1 = allLogs.filter(l => l.includes('✅') || l.includes('❌') || l.includes('🕐'));
  console.log(logs1.join('\n'));
  allLogs.length = 0;
  
  // Now switch to yesterday
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  await page.locator('button').filter({ hasText: /^Yesterday$/ }).first().click();
  await page.waitForTimeout(300);
  await page.locator('button').filter({ hasText: /^Apply$/ }).first().click();
  
  // Wait for second sync to complete
  await page.waitForTimeout(30000);
  
  console.log('--- After yesterday sync ---');
  console.log('All logs (' + allLogs.length + '):');
  console.log(allLogs.join('\n'));
  
  const pills = await page.locator('[data-testid^="status-pill-"]').count();
  console.log('Final pill count:', pills);
});
