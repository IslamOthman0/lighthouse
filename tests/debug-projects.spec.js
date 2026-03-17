import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test.setTimeout(120000);

test('debug: check projects breakdown content', async ({ page }) => {
  const syncLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Lighthouse]') || text.includes('Sync') || text.includes('task') || text.includes('project')) {
      syncLogs.push(text);
    }
  });
  
  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForTimeout(2000);

  // Click Yesterday
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  await page.locator('button').filter({ hasText: /^Yesterday$/ }).first().click();
  await page.waitForTimeout(15000); // wait 15s for sync
  
  // Check ProjectBreakdownCard text
  const projText = await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    const proj = els.find(el => el.textContent.includes('Projects Breakdown') && el.children.length > 0);
    return proj ? proj.textContent.trim().substring(0, 1000) : 'Not found';
  });
  console.log('Projects card text:', projText.substring(0, 500));
  
  // Pill count
  const pillCount = await page.locator('[data-testid^="status-pill-"]').count();
  console.log('Pill count:', pillCount);
  
  // Print sync logs
  console.log('Sync logs:', syncLogs.slice(-20).join('\n'));
});
