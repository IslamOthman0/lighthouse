import { test, expect } from '@playwright/test';

test('debug settings modal', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);
  
  // Check button by title
  const byTitle = page.locator('button[title="Settings"]');
  console.log('byTitle count:', await byTitle.count());
  console.log('byTitle visible:', await byTitle.isVisible().catch(() => 'error'));
  
  if (await byTitle.count() > 0) {
    await byTitle.click();
    await page.waitForTimeout(500);
  }
  
  // Check if modal appeared
  const h2 = page.locator('h2', { hasText: 'Settings' });
  console.log('Settings h2 visible:', await h2.isVisible().catch(() => 'error'));
  console.log('Settings h2 count:', await h2.count());
  
  // Check all tabs rendered  
  const tabs = page.locator('button').filter({ hasText: /^🔗/ });
  console.log('ClickUp tab count:', await tabs.count());
  
  const modal = page.locator('div').filter({ has: page.locator('h2', { hasText: 'Settings' }) }).last();
  const modalTabBtns = modal.locator('button').filter({ hasText: /^🔗/ });
  console.log('Modal ClickUp tab count:', await modalTabBtns.count());
});
