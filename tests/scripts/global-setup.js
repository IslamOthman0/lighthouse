/**
 * Playwright Global Setup
 *
 * Pre-warms the Lighthouse app by navigating to it once and waiting for the
 * full sync to complete (members + overview cards loaded from ClickUp API).
 * Saves the browser storage state (localStorage) so all tests start with
 * consistent settings (theme, schedule, etc.).
 *
 * NOTE: IndexedDB is NOT persisted by storageState() — members are seeded
 * via the ClickUp API on each test's first load. The 45s waitForDashboard
 * timeout in each spec handles rate-limited API responses.
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_STATE_PATH = path.join(__dirname, '../../tests/results/storage-state.json');

export default async function globalSetup() {
  console.log('\n[global-setup] Pre-warming app — waiting for first API sync...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173');

    // Wait for overview cards — requires first API sync to complete.
    // This populates IndexedDB with member data on this browser instance.
    await page.waitForSelector('[data-testid^="overview-card-team-tracked"]', {
      timeout: 120000, // 2 minutes max
    });

    await page.waitForTimeout(2000);

    // Save localStorage (settings, theme preferences) — IndexedDB not captured
    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log(`[global-setup] Storage state saved (localStorage). Tests will re-sync from API.`);
  } catch (error) {
    // If pre-warm fails, save an empty state so the config doesn't break
    console.warn('[global-setup] Warning: Could not pre-warm app:', error.message);
    console.warn('[global-setup] Saving empty storage state — tests will load from scratch.');
    try {
      await context.storageState({ path: STORAGE_STATE_PATH });
    } catch {
      // Create a minimal valid state file
      const fs = await import('fs');
      fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify({ cookies: [], origins: [] }));
    }
  } finally {
    await browser.close();
  }
}
