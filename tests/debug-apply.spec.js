import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test.setTimeout(120000);

test('debug: yesterday + apply shows pills', async ({ page }) => {
  const timeLogs = [];
  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('🕐') || t.includes('Filtered') || t.includes('projects') || t.includes('pill')) timeLogs.push(t);
  });
  
  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForTimeout(2000);
  
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  
  await page.locator('button').filter({ hasText: /^Yesterday$/ }).first().click();
  await page.waitForTimeout(300);
  
  await page.locator('button').filter({ hasText: /^Apply$/ }).first().click();
  
  // Wait for sync
  await page.waitForTimeout(12000);
  
  const pills = await page.locator('[data-testid^="status-pill-"]').count();
  const headerText = await page.locator('button').filter({ hasText: '📅' }).first().textContent();
  
  console.log('Pills:', pills);
  console.log('Header:', headerText);
  console.log('Logs:', timeLogs.join('\n'));
});
