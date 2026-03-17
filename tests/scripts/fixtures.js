/**
 * Shared Playwright fixtures for QA test suite.
 *
 * seedMembers: Injects team members directly into IndexedDB before the app
 * loads, bypassing the ClickUp API call. This prevents rate-limit timeouts
 * when running many tests sequentially.
 */
import { test as base, expect } from '@playwright/test';

// The 8 monitored team members (from CLAUDE.md)
const TEAM_MEMBERS = [
  { id: 1, clickUpId: '87657591', name: 'Dina Ibrahim', initials: 'DI', color: '#6366f1', status: 'offline', trackedToday: 0, profilePicture: null, annualLeaveQuota: 30, wfhDaysPerMonth: 2 },
  { id: 2, clickUpId: '93604849', name: 'Alaa Soliman', initials: 'AS', color: '#8b5cf6', status: 'offline', trackedToday: 0, profilePicture: null, annualLeaveQuota: 30, wfhDaysPerMonth: 2 },
  { id: 3, clickUpId: '93604850', name: 'Nada Meshref', initials: 'NM', color: '#ec4899', status: 'offline', trackedToday: 0, profilePicture: null, annualLeaveQuota: 30, wfhDaysPerMonth: 2 },
  { id: 4, clickUpId: '93604848', name: 'Nada Amr', initials: 'NA', color: '#f59e0b', status: 'offline', trackedToday: 0, profilePicture: null, annualLeaveQuota: 30, wfhDaysPerMonth: 2 },
  { id: 5, clickUpId: '87650455', name: 'Islam Othman', initials: 'IO', color: '#10b981', status: 'offline', trackedToday: 0, profilePicture: null, annualLeaveQuota: 30, wfhDaysPerMonth: 2 },
  { id: 6, clickUpId: '87657592', name: 'Riham', initials: 'RI', color: '#3b82f6', status: 'offline', trackedToday: 0, profilePicture: null, annualLeaveQuota: 30, wfhDaysPerMonth: 2 },
  { id: 7, clickUpId: '87657593', name: 'Samar Magdy', initials: 'SA', color: '#ef4444', status: 'offline', trackedToday: 0, profilePicture: null, annualLeaveQuota: 30, wfhDaysPerMonth: 2 },
  { id: 8, clickUpId: '87708246', name: 'Merit Fouad', initials: 'MF', color: '#14b8a6', status: 'offline', trackedToday: 0, profilePicture: null, annualLeaveQuota: 30, wfhDaysPerMonth: 2 },
];

/**
 * Adds an init script to the page that seeds IndexedDB with team members
 * before the app's Dexie code runs. This prevents the app from showing the
 * skeleton loading state while waiting for the ClickUp API.
 *
 * Must be called BEFORE page.goto().
 */
async function addMemberSeedScript(page) {
  await page.addInitScript((members) => {
    // This runs in the browser before any page scripts
    // Open (or create) LighthouseDB at version 19 and seed members
    const DB_NAME = 'LighthouseDB';
    const DB_VERSION = 19;

    const openReq = indexedDB.open(DB_NAME, DB_VERSION);

    openReq.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Create all stores that Dexie schema v19 expects
      const stores = [
        { name: 'members', keyPath: 'id', autoIncrement: true },
        { name: 'sessions', keyPath: 'id', autoIncrement: true },
        { name: 'breaks', keyPath: 'id', autoIncrement: true },
        { name: 'tasks', keyPath: 'id', autoIncrement: true },
        { name: 'leaves', keyPath: 'id', autoIncrement: true },
        { name: 'syncQueue', keyPath: 'id', autoIncrement: true },
        { name: 'baselines', keyPath: 'key' },
        { name: 'clickUpTasks', keyPath: 'id' },
        { name: 'taskSyncMeta', keyPath: 'key' },
        { name: 'dailySnapshots', keyPath: 'date' },
      ];

      stores.forEach(({ name, keyPath, autoIncrement }) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath, autoIncrement: !!autoIncrement });
        }
      });

      // Seed members in the upgrade transaction
      const tx = event.target.transaction;
      const store = tx.objectStore('members');
      members.forEach((m) => store.put(m));
    };

    openReq.onsuccess = (event) => {
      const db = event.target.result;
      // DB already exists — check if members need seeding
      const tx = db.transaction('members', 'readwrite');
      const store = tx.objectStore('members');
      const countReq = store.count();
      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          // Empty members table — seed it
          members.forEach((m) => store.put(m));
        }
      };
      tx.oncomplete = () => db.close();
    };
  }, TEAM_MEMBERS);
}

const test = base.extend({
  /**
   * seedPage: Like `page` but with members pre-seeded into IndexedDB.
   * Use this as { seedPage } in beforeEach to get fast dashboard loading.
   */
  seedPage: async ({ page }, use) => {
    await addMemberSeedScript(page);
    await use(page);
  },
});

export { test, expect, addMemberSeedScript, TEAM_MEMBERS };
