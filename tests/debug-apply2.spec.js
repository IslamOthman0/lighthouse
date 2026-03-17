import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test.setTimeout(120000);

test('debug: yesterday + apply shows pills (long wait)', async ({ page }) => {
  const allLogs = [];
  page.on('console', msg => allLogs.push(msg.text()));
  
  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForTimeout(5000); // wait for initial sync to complete
  
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  
  await page.locator('button').filter({ hasText: /^Yesterday$/ }).first().click();
  await page.waitForTimeout(300);
  
  const applyText = await page.locator('button').filter({ hasText: /^Apply$/ }).first().textContent().catch(() => 'not found');
  console.log('Apply button text:', applyText);
  
  await page.locator('button').filter({ hasText: /^Apply$/ }).first().click();
  
  // Wait for sync (up to 20s)
  await page.waitForTimeout(20000);
  
  const pills = await page.locator('[data-testid^="status-pill-"]').count();
  const headerText = await page.locator('button').filter({ hasText: '📅' }).first().textContent();
  
  const relevantLogs = allLogs.filter(l => 
    l.includes('🕐') || l.includes('Filtered') || l.includes('projects') || 
    l.includes('Sync') || l.includes('AbortError') || l.includes('abort') || 
    l.includes('Date range') || l.includes('📅')
  );
  
  console.log('Pills:', pills);
  console.log('Header:', headerText);
  console.log('Logs (', relevantLogs.length, '):\n', relevantLogs.slice(-20).join('\n'));
});
