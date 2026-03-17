import { test } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test('debug: header date with reload', async ({ page }) => {
  await addMemberSeedScript(page);
  await page.goto('/');
  await page.waitForTimeout(2000);
  
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  
  await page.locator('button').filter({ hasText: 'Yesterday' }).first().click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('button').filter({ hasText: 'Apply' }).first().click();
  await page.waitForTimeout(2000);
  
  // Hard reload to clear module cache
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const headerAfterReload = await page.locator('button').filter({ hasText: '📅' }).first().textContent();
  console.log('Header after reload:', headerAfterReload);
  
  // Also check: what does the Header render in the page source?
  const headerTitle = await page.evaluate(() => {
    const btn = document.querySelector('button[title*="Viewing"]');
    return btn ? btn.title + ' | ' + btn.textContent : 'not found';
  });
  console.log('Header button:', headerTitle);
});
