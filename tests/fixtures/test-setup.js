/**
 * Shared Playwright Test Setup Helpers — Lighthouse UI Testing
 *
 * Provides a single-call bootstrap (setupMockApp) plus UI interaction
 * helpers used across all Phase 1-6 visual tests.
 *
 * Bootstrap strategy:
 *   1. injectSettings()  → writes to localStorage before app reads it
 *   2. mockClickUpAPI()  → intercepts all ClickUp API routes
 *   3. injectMembers()   → intercepts indexedDB.open() to seed auth + members
 *   4. page.goto('/')    → navigate
 *   5. waitForDashboard() → wait for overview cards to appear
 *
 * No src/ modifications needed — this pattern is proven in core-flow.spec.js.
 */

import { test as base, expect } from '@playwright/test';
import {
  MOCK_AUTH_USER,
  MOCK_MEMBERS,
  MOCK_SETTINGS,
} from './mock-data.js';

// ─── DB Schema ────────────────────────────────────────────────────────────────
// Must match db/index.js v21 exactly. Used by injectMembers() to create stores.
const DB_NAME = 'LighthouseDB';
const DB_VERSION = 21;

const DB_STORES = [
  { name: 'members',        keyPath: 'id',       autoIncrement: true  },
  { name: 'sessions',       keyPath: 'id',       autoIncrement: true  },
  { name: 'breaks',         keyPath: 'id',       autoIncrement: true  },
  { name: 'tasks',          keyPath: 'id',       autoIncrement: true  },
  { name: 'leaves',         keyPath: 'id',       autoIncrement: true  },
  { name: 'syncQueue',      keyPath: 'id',       autoIncrement: true  },
  { name: 'baselines',      keyPath: 'key',      autoIncrement: false },
  { name: 'clickUpTasks',   keyPath: 'id',       autoIncrement: false },
  { name: 'taskSyncMeta',   keyPath: 'key',      autoIncrement: false },
  { name: 'dailySnapshots', keyPath: 'date',     autoIncrement: false },
  { name: 'timeEntryCache', keyPath: 'dateKey',  autoIncrement: false },
  { name: 'authUser',       keyPath: 'user_id',  autoIncrement: false },
  { name: 'auditLogs',      keyPath: 'id',       autoIncrement: true  },
];

// ─── Viewport Constants ───────────────────────────────────────────────────────

export const VIEWPORTS = {
  MOBILE:  { width: 375,  height: 812  }, // iPhone SE / 13 mini
  TABLET:  { width: 768,  height: 1024 }, // iPad
  LAPTOP:  { width: 1024, height: 768  }, // Small laptop
  DESKTOP: { width: 1440, height: 900  }, // Standard monitor
};

// ─── Core Setup Functions ─────────────────────────────────────────────────────

/**
 * setupMockApp(page, options?)
 *
 * Full app bootstrap for visual testing. Call this in beforeEach.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {Array}  options.members      - Members to seed (default: MOCK_MEMBERS)
 * @param {Object} options.settings     - Settings to inject (default: MOCK_SETTINGS.DEFAULT)
 * @param {Object} options.authUser     - Auth user to seed (default: MOCK_AUTH_USER)
 * @param {Array}  options.leaves       - Leave records to seed into db.leaves (default: null)
 * @param {Object} options.apiResponses - Custom API mock responses
 * @param {string} options.waitFor      - Selector to wait for (default: overview-card)
 */
export async function setupMockApp(page, options = {}) {
  const {
    members    = MOCK_MEMBERS,
    settings   = MOCK_SETTINGS.DEFAULT,
    authUser   = MOCK_AUTH_USER,
    leaves     = null,
    apiResponses = {},
    waitFor    = '[data-testid^="overview-card"]',
  } = options;

  // Step 1: Inject settings into localStorage (runs before app reads it)
  await injectSettings(page, settings);

  // Step 2: Mock all ClickUp API routes
  await mockClickUpAPI(page, apiResponses);

  // Step 3: Seed auth + members into IndexedDB via addInitScript
  await injectMembers(page, members, authUser, leaves);

  // Step 4: Navigate to app
  await page.goto('/');

  // Step 5: Wait for dashboard to render
  await waitForDashboard(page, waitFor);
}

/**
 * injectSettings(page, settings)
 *
 * Writes settings object to localStorage before the app's useSettings() hook reads it.
 * Must be called BEFORE page.goto().
 */
export async function injectSettings(page, settings) {
  await page.addInitScript((settingsObj) => {
    localStorage.setItem('lighthouse_settings', JSON.stringify(settingsObj));
  }, settings);
}

/**
 * injectMembers(page, members, authUser, leaves?)
 *
 * Intercepts indexedDB.open() to seed auth + members before app code runs.
 * Does NOT create object stores — lets Dexie handle schema upgrades.
 * We only inject data into stores AFTER Dexie creates them.
 * Handles both fresh DB (upgradeneeded) and pre-existing DB (success).
 * Must be called BEFORE page.goto().
 *
 * Directly based on the proven pattern in tests/e2e/core-flow.spec.js.
 */
export async function injectMembers(page, members, authUser, leaves = null) {
  // Clear membersToMonitor so all seeded members display (unless settings override it)
  await page.addInitScript(() => {
    const key = 'lighthouse_settings';
    const stored = localStorage.getItem(key);
    if (stored) {
      const s = JSON.parse(stored);
      if (s?.team?.membersToMonitor?.length > 0) {
        s.team.membersToMonitor = [];
        localStorage.setItem(key, JSON.stringify(s));
      }
    }
  });

  await page.addInitScript(
    ({ dbName, authUser, members, leaves }) => {
      const origOpen = indexedDB.open.bind(indexedDB);

      indexedDB.open = function(name, version) {
        const req = origOpen(name, version);

        if (name !== dbName) return req;

        // ── Fresh DB: Dexie creates stores in upgradeneeded, then we seed ──
        req.addEventListener('upgradeneeded', (event) => {
          const db = event.target.result;
          const tx = event.target.transaction;

          // Seed authUser if Dexie created the store
          try {
            if (db.objectStoreNames.contains('authUser')) {
              tx.objectStore('authUser').put(authUser);
            }
          } catch (e) { /* store may not exist in this schema version */ }

          // Seed members if Dexie created the store
          try {
            if (db.objectStoreNames.contains('members')) {
              const memberStore = tx.objectStore('members');
              const countReq = memberStore.count();
              countReq.onsuccess = () => {
                if (countReq.result === 0) {
                  members.forEach(m => memberStore.put(m));
                }
              };
            }
          } catch (e) { /* ignore */ }

          // Seed leaves if provided and store exists
          if (leaves && leaves.length > 0) {
            try {
              if (db.objectStoreNames.contains('leaves')) {
                leaves.forEach(l => tx.objectStore('leaves').put(l));
              }
            } catch (e) { /* ignore */ }
          }
        });

        // ── Pre-existing DB: success fires, seed into existing stores ──
        req.addEventListener('success', (event) => {
          const db = event.target.result;
          try {
            const tx = db.transaction(['authUser', 'members'], 'readwrite');

            // Seed authUser if empty
            const authStore = tx.objectStore('authUser');
            const authCount = authStore.count();
            authCount.onsuccess = () => {
              if (authCount.result === 0) authStore.put(authUser);
            };

            // Seed members if empty
            const memberStore = tx.objectStore('members');
            const memberCount = memberStore.count();
            memberCount.onsuccess = () => {
              if (memberCount.result === 0) {
                members.forEach(m => memberStore.put(m));
              }
            };
          } catch (e) { /* may fail if stores don't exist */ }

          // Seed leaves in a separate transaction (optional store)
          if (leaves && leaves.length > 0) {
            try {
              const leaveTx = db.transaction(['leaves'], 'readwrite');
              const leavesStore = leaveTx.objectStore('leaves');
              const leavesCount = leavesStore.count();
              leavesCount.onsuccess = () => {
                if (leavesCount.result === 0) {
                  leaves.forEach(l => leavesStore.put(l));
                }
              };
            } catch (e) { /* leaves store may not exist */ }
          }
        });

        return req;
      };
    },
    { dbName: DB_NAME, authUser, members, leaves }
  );
}

/**
 * mockClickUpAPI(page, responses?)
 *
 * Intercepts all ClickUp API routes to prevent real network calls.
 * Optionally returns custom mock data for specific endpoints.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} responses - Custom responses for specific endpoints
 * @param {Array}  responses.timeEntries - Time entries data (default: [])
 * @param {Array}  responses.tasks       - Tasks data (default: [])
 * @param {Object} responses.team        - Team data (default: { members: [] })
 * @param {Object} responses.user        - User data (default: mock user)
 */
export async function mockClickUpAPI(page, responses = {}) {
  const {
    timeEntries = [],
    tasks = [],
    team = { members: [] },
    user = { id: 87650455, username: 'islamothman', email: 'islam@test.com', profilePicture: null },
  } = responses;

  const handleRoute = (route) => {
    const url = route.request().url();

    if (url.includes('/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user }),
      });
    }
    if (url.includes('/time_entries')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: timeEntries }),
      });
    }
    if (url.includes('/task')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tasks, last_page: true }),
      });
    }
    // Default: team/member endpoints
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        team: { id: '9011234567', members: team.members || [] },
        teams: [],
        ...team,
      }),
    });
  };

  await page.route('**/api/v2/**', (route) => {
    if (!route.request().url().includes('clickup.com')) return route.continue();
    return handleRoute(route);
  });

  await page.route('https://api.clickup.com/**', handleRoute);
}

/**
 * waitForDashboard(page, selector?)
 *
 * Navigates to the app and waits for it to render.
 * Does NOT navigate — call page.goto('/') before this if needed separately.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - Element to wait for (default: overview-card)
 */
export async function waitForDashboard(page, selector = '[data-testid^="overview-card"]') {
  // Wait for at least one overview card (confirms dashboard loaded)
  await page.waitForSelector(selector, { timeout: 25000 });

  // Also wait for member data (any member element = data loaded from IDB)
  await page.waitForFunction(() => {
    const fullCards    = document.querySelectorAll('[data-testid="member-card"]');
    const compactRows  = document.querySelectorAll('[data-testid="member-compact-row"]');
    const memberGrid   = document.querySelector('[data-testid="member-grid"]');
    return (
      fullCards.length > 0 ||
      compactRows.length > 0 ||
      (memberGrid && memberGrid.children.length > 0)
    );
  }, { timeout: 15000, polling: 300 }).catch(() => {
    // noActivity members may render with no testid — that's OK
    // Overview cards confirmed dashboard is running
  });

  // Small settle for React to flush renders
  await page.waitForTimeout(300);
}

// ─── UI Interaction Helpers ───────────────────────────────────────────────────

/**
 * changeDateRange(page, preset)
 *
 * Opens the date picker, selects a preset, and applies the selection.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'today'|'yesterday'|'last7'|'last30'|string} preset - Preset button label
 */
export async function changeDateRange(page, preset) {
  // Find the date button (calendar emoji or button near header)
  const dateBtn = page.locator('button').filter({ hasText: '📅' }).first();
  const headerDateBtn = page.locator('[data-testid="date-picker-button"]').first();

  let opened = false;
  if (await headerDateBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await headerDateBtn.click();
    opened = true;
  } else if (await dateBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dateBtn.click();
    opened = true;
  }

  if (!opened) {
    // Try clicking any button that looks like a date display
    const possibleButtons = page.locator('button').filter({ hasText: /Today|Yesterday|Last \d+/i });
    await possibleButtons.first().click({ timeout: 3000 });
  }

  await page.waitForTimeout(300);

  // Click the preset button (case-insensitive match)
  const presetLabels = {
    today: 'Today',
    yesterday: 'Yesterday',
    last7: 'Last 7 Days',
    last14: 'Last 14 Days',
    last30: 'Last 30 Days',
  };
  const presetLabel = presetLabels[preset] || preset;

  const presetBtn = page.locator('button').filter({ hasText: presetLabel }).first();
  await expect(presetBtn).toBeVisible({ timeout: 5000 });
  await presetBtn.click();
  await page.waitForTimeout(200);

  // Click Apply
  const applyBtn = page.locator('button').filter({ hasText: 'Apply' }).first();
  if (await applyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await applyBtn.click();
  }

  await page.waitForTimeout(800); // Wait for store update + re-render
}

/**
 * openSettingsModal(page)
 *
 * Clicks the settings button to open the settings modal.
 * Tries multiple selectors in order.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} true if modal opened
 */
export async function openSettingsModal(page) {
  // Step 1: Open the avatar dropdown (the settings is nested inside it)
  // Desktop: button[title="Account & Settings"]
  // Mobile: similar avatar button in MobileBottomNav
  const avatarBtn = page.locator('button[title="Account & Settings"]').first();
  if (await avatarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await avatarBtn.click();
    await page.waitForTimeout(300);
    // Step 2: Click "Settings" inside the dropdown
    const settingsItem = page.locator('button').filter({ hasText: 'Settings' }).first();
    if (await settingsItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsItem.click();
      await page.waitForTimeout(400);
      return true;
    }
  }

  // Mobile fallback: look for avatar button in bottom nav that opens a menu with Settings
  const mobileMenuBtns = page.locator('button').filter({ hasText: /^(IS|Me|islam)/i });
  const mobileCount = await mobileMenuBtns.count();
  for (let i = 0; i < mobileCount; i++) {
    const btn = mobileMenuBtns.nth(i);
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(300);
      const settingsItem = page.locator('button').filter({ hasText: 'Settings' }).first();
      if (await settingsItem.isVisible({ timeout: 1500 }).catch(() => false)) {
        await settingsItem.click();
        await page.waitForTimeout(400);
        return true;
      }
    }
  }

  // Last resort: look for direct data-testid or gear button
  const selectors = [
    '[data-testid="settings-button"]',
    'button[aria-label*="Settings" i]',
  ];
  for (const selector of selectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(400);
      return true;
    }
  }

  return false;
}

/**
 * switchView(page, view)
 *
 * Switches between grid and list views.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'grid'|'list'} view
 */
export async function switchView(page, view) {
  const btn = page.locator(`[data-testid="${view}-view-toggle"]`).first();
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * clickMember(page, memberName)
 *
 * Clicks a member to open their detail modal.
 * Tries full card first, then ranking table row, then text search.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} memberName - Full name or first name of the member
 */
export async function clickMember(page, memberName) {
  const firstName = memberName.split(' ')[0];

  // Try full member card containing the name
  const memberCard = page.locator('[data-testid="member-card"]')
    .filter({ hasText: firstName }).first();
  if (await memberCard.isVisible({ timeout: 1000 }).catch(() => false)) {
    await memberCard.click();
    await page.waitForSelector('[data-testid="member-detail-modal"]', { timeout: 5000 });
    return;
  }

  // Try ranking table row
  const tableRow = page.locator('table tbody tr').filter({ hasText: firstName }).first();
  if (await tableRow.isVisible({ timeout: 1000 }).catch(() => false)) {
    await tableRow.click();
    await page.waitForSelector('[data-testid="member-detail-modal"]', { timeout: 5000 });
    return;
  }

  // Last resort: click any element with the member name
  const nameEl = page.getByText(firstName).first();
  if (await nameEl.isVisible({ timeout: 1000 }).catch(() => false)) {
    await nameEl.click();
    await page.waitForTimeout(500);
  }
}

/**
 * closeModal(page)
 *
 * Closes an open modal by pressing Escape.
 */
export async function closeModal(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

/**
 * getScreenData(page)
 *
 * Extracts visible data from the current dashboard screen.
 * Used for cross-screen consistency checks.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Object>} Extracted screen data
 */
export async function getScreenData(page) {
  return await page.evaluate(() => {
    // Member card count (full cards only — noActivity uses compact rows)
    const memberCardCount = document.querySelectorAll('[data-testid="member-card"]').length;
    const compactRowCount = document.querySelectorAll('[data-testid="member-compact-row"]').length;

    // Team score
    const scoreEl = document.querySelector('[data-testid="overview-card-team-score"]');
    const teamScoreText = scoreEl ? scoreEl.textContent.trim() : null;

    // Tracked hours (first overview card with "tracked" in testid)
    const trackedEl = document.querySelector('[data-testid*="team-tracked"]');
    const trackedText = trackedEl ? trackedEl.textContent.trim() : null;

    // Member names visible in DOM
    const memberCards = document.querySelectorAll('[data-testid="member-card"]');
    const memberNames = Array.from(memberCards).map(card => {
      // Try to find name element within the card
      const nameEl = card.querySelector('[class*="name"]') || card.querySelector('h3') || card.querySelector('h4');
      return nameEl ? nameEl.textContent.trim() : null;
    }).filter(Boolean);

    // Ranking table rows
    const tableRows = document.querySelectorAll('table tbody tr');
    const tableRowCount = tableRows.length;

    return {
      memberCardCount,
      compactRowCount,
      totalMemberElements: memberCardCount + compactRowCount,
      teamScoreText,
      trackedText,
      memberNames,
      tableRowCount,
    };
  });
}

/**
 * collectConsoleErrors(page)
 *
 * Sets up a listener that collects real JS errors (filters benign ones).
 * Call BEFORE page.goto(). Returns a function that returns the errors array.
 *
 * Usage:
 *   const getErrors = collectConsoleErrors(page);
 *   // ... run test ...
 *   expect(getErrors()).toHaveLength(0);
 */
export function collectConsoleErrors(page) {
  const errors = [];
  const BENIGN = ['ResizeObserver', 'favicon.ico', '429', 'Rate limit', 'net::ERR_ABORTED'];

  page.on('pageerror', (err) => {
    if (!BENIGN.some(b => err.message.includes(b))) {
      errors.push(err.message);
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!BENIGN.some(b => text.includes(b))) {
        errors.push(text);
      }
    }
  });

  return () => errors;
}

// ─── Custom Fixtures ──────────────────────────────────────────────────────────

/**
 * mockPage: page with full mock app pre-loaded (all 8 MOCK_MEMBERS).
 * Use as: test('my test', async ({ mockPage }) => { ... })
 */
export const test = base.extend({
  mockPage: async ({ page }, use) => {
    await setupMockApp(page);
    await use(page);
  },
});

export { expect };
