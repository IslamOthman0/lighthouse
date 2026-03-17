import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test.setTimeout(120000);

test('debug: time entries after yesterday change', async ({ page }) => {
  const allLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    allLogs.push(text);
  });
  
  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForTimeout(3000);

  // Click Yesterday
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  await page.locator('button').filter({ hasText: /^Yesterday$/ }).first().click();
  await page.waitForTimeout(15000);
  
  // Print relevant logs
  const relevant = allLogs.filter(l => 
    l.includes('time entries') || l.includes('Got ') || 
    l.includes('Filtered') || l.includes('projects') ||
    l.includes('Sync') || l.includes('entries')
  );
  console.log('Relevant logs:', relevant.join('\n'));
});
