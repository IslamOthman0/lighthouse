import { test, expect } from '@playwright/test';
import { addMemberSeedScript } from './scripts/fixtures.js';

test.setTimeout(120000);

test('debug: navigate to yesterday and check for pills', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('[ERROR] ' + msg.text());
    if (msg.text().includes('[Lighthouse]')) console.log(msg.text());
  });
  
  await addMemberSeedScript(page);
  await page.goto('/');
  
  // Wait for initial load
  await page.waitForSelector('[data-testid^="overview-card-"]', { timeout: 20000 })
    .catch(() => console.log('Overview card not found'));
  await page.waitForTimeout(2000);

  // Count pills before date change
  const pillsBefore = await page.locator('[data-testid^="status-pill-"]').count();
  console.log('Pills before date change:', pillsBefore);
  
  // Try to open date picker
  let calBtn = page.locator('[data-testid="date-picker-button"]');
  const hasByTestId = await calBtn.isVisible().catch(() => false);
  console.log('Date picker by testid visible:', hasByTestId);
  
  if (!hasByTestId) {
    calBtn = page.locator('button').filter({ hasText: '📅' }).first();
    const hasByEmoji = await calBtn.isVisible().catch(() => false);
    console.log('Date picker by emoji visible:', hasByEmoji);
  }
  
  const calBtnText = await calBtn.textContent().catch(() => 'N/A');
  console.log('Cal button text:', calBtnText);
  
  await calBtn.click();
  await page.waitForTimeout(1000);
  
  // Check if date picker modal opened
  const datepickerVisible = await page.locator('button').filter({ hasText: /^Yesterday$/ }).isVisible().catch(() => false);
  console.log('Yesterday button visible:', datepickerVisible);
  
  if (datepickerVisible) {
    await page.locator('button').filter({ hasText: /^Yesterday$/ }).first().click();
    console.log('Clicked Yesterday');
    await page.waitForTimeout(10000); // wait longer for sync
    
    const pillsAfter = await page.locator('[data-testid^="status-pill-"]').count();
    console.log('Pills after date change:', pillsAfter);
    
    // Also check ProjectBreakdownCard
    const projectCard = await page.locator('text=Projects Breakdown').isVisible().catch(() => false);
    console.log('Projects Breakdown visible:', projectCard);
    const projectText = await page.locator('text=Projects Breakdown').first().evaluate(el => el.closest('.project-breakdown-card')?.textContent || 'no parent found').catch(() => 'N/A');
  } else {
    console.log('Page content:', await page.locator('body').textContent().then(t => t.substring(0, 500)));
  }
  
  if (errors.length > 0) console.log('Console errors:', errors.join('\n'));
});
