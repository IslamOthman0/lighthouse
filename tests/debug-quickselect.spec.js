import { test } from '@playwright/test';

test('debug: quick select container', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);
  
  // Open date picker
  const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
  await calBtn.click();
  await page.waitForTimeout(500);
  
  // Check exact text content with filtering
  const exactMatch = await page.locator('div').filter({ hasText: /^Quick Select$/ }).count();
  console.log('Exact "Quick Select" divs:', exactMatch);
  
  // Check with any whitespace
  const anyMatch = await page.locator('div').filter({ hasText: 'Quick Select' }).count();
  console.log('Any "Quick Select" divs:', anyMatch);
  
  // Get inner text of all matching divs  
  const allDivs = page.locator('div').filter({ hasText: 'Quick Select' });
  for (let i = 0; i < Math.min(await allDivs.count(), 5); i++) {
    const text = await allDivs.nth(i).textContent();
    const btnCount = await allDivs.nth(i).locator('button').count();
    console.log(`div[${i}] text="${text.substring(0,50)}" buttons=${btnCount}`);
  }
  
  // Check if Today button is inside the Quick Select section
  const todayBtn = page.locator('div').filter({ hasText: 'Quick Select' }).first().locator('button').filter({ hasText: 'Today' });
  console.log('Today button inside Quick Select:', await todayBtn.count());
});
