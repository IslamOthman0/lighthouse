/**
 * Baseline Service
 * Fetches and caches 3-month historical data for score calculations
 *
 * Stored in IndexedDB baselines table:
 * - avgTasksPerMember: Average tasks per member per day (team-wide)
 * - lastUpdated: Timestamp of last fetch
 *
 * Refresh: Once per day (24 hours)
 */

import { db } from '../db';
import { clickup } from './clickup';

// Cache duration: 24 hours
const BASELINE_CACHE_DURATION = 24 * 60 * 60 * 1000;

// Default baseline if no history available
const DEFAULT_AVG_TASKS = 3;

/**
 * Get baseline value from IndexedDB
 * @param {string} key - Baseline key
 * @returns {Promise<any>} Baseline value or null
 */
async function getBaseline(key) {
  try {
    const record = await db.baselines.get(key);
    return record?.value ?? null;
  } catch (error) {
    console.error(`❌ Error getting baseline ${key}:`, error);
    return null;
  }
}

/**
 * Set baseline value in IndexedDB
 * @param {string} key - Baseline key
 * @param {any} value - Value to store
 */
async function setBaseline(key, value) {
  try {
    await db.baselines.put({
      key,
      value,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error(`❌ Error setting baseline ${key}:`, error);
  }
}

/**
 * Check if baseline needs refresh (older than 24 hours)
 * @returns {Promise<boolean>} True if refresh needed
 */
async function needsRefresh() {
  try {
    const record = await db.baselines.get('lastUpdated');
    if (!record) return true;

    const elapsed = Date.now() - record.value;
    return elapsed > BASELINE_CACHE_DURATION;
  } catch (error) {
    console.error('❌ Error checking baseline refresh:', error);
    return true;
  }
}

/**
 * Fetch 3-month historical time entries from ClickUp
 * ClickUp API limitation: max 30 days per request → fetch in 3 chunks
 * @param {Array<number>} assigneeIds - Array of ClickUp user IDs
 * @returns {Promise<Array>} Array of time entries
 */
async function fetch3MonthTimeEntries(assigneeIds) {
  const now = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  console.log(`📊 Fetching 3-month baseline: ${startDate.toLocaleDateString()} to ${now.toLocaleDateString()}`);

  try {
    // Fetch in 3 × 30-day chunks due to ClickUp API limitation
    const chunks = [
      { start: 90, end: 61 }, // Days 90-61 ago
      { start: 60, end: 31 }, // Days 60-31 ago
      { start: 30, end: 0 }   // Days 30-0 ago (most recent)
    ];

    const chunkPromises = chunks.map(chunk => {
      const chunkStart = new Date(now);
      chunkStart.setDate(chunkStart.getDate() - chunk.start);
      chunkStart.setHours(0, 0, 0, 0);

      const chunkEnd = new Date(now);
      chunkEnd.setDate(chunkEnd.getDate() - chunk.end);
      chunkEnd.setHours(23, 59, 59, 999);

      const startSeconds = Math.floor(chunkStart.getTime() / 1000);
      const endSeconds = Math.floor(chunkEnd.getTime() / 1000);

      return clickup.getTimeEntries(startSeconds, endSeconds, assigneeIds);
    });

    const [chunk1, chunk2, chunk3] = await Promise.all(chunkPromises);
    const allTimeEntries = [...chunk1, ...chunk2, ...chunk3];

    console.log(`📥 Received ${allTimeEntries.length} time entries for baseline calculation (3 chunks)`);
    return allTimeEntries;
  } catch (error) {
    console.error('❌ Failed to fetch 3-month time entries:', error);
    return [];
  }
}

/**
 * Calculate average tasks per member per day from time entries
 * @param {Array} timeEntries - Array of time entry objects
 * @param {number} memberCount - Number of team members
 * @returns {number} Average tasks per member per day
 */
function calculateAvgTasksPerMember(timeEntries, memberCount) {
  if (!timeEntries || timeEntries.length === 0 || memberCount === 0) {
    return DEFAULT_AVG_TASKS;
  }

  // Group entries by member and date
  const memberDayTasks = {}; // { memberId: { date: Set<taskId> } }

  timeEntries.forEach(entry => {
    const memberId = entry.user?.id;
    const taskId = entry.task?.id;

    if (!memberId || !taskId) return;

    // Get date string (YYYY-MM-DD)
    const entryDate = new Date(parseInt(entry.start)).toISOString().split('T')[0];

    if (!memberDayTasks[memberId]) {
      memberDayTasks[memberId] = {};
    }
    if (!memberDayTasks[memberId][entryDate]) {
      memberDayTasks[memberId][entryDate] = new Set();
    }

    memberDayTasks[memberId][entryDate].add(taskId);
  });

  // Calculate average tasks per day across all members
  let totalTaskDays = 0;
  let totalDays = 0;

  Object.values(memberDayTasks).forEach(memberDays => {
    Object.values(memberDays).forEach(taskSet => {
      totalTaskDays += taskSet.size;
      totalDays++;
    });
  });

  if (totalDays === 0) {
    return DEFAULT_AVG_TASKS;
  }

  const avgTasksPerDay = totalTaskDays / totalDays;
  console.log(`📊 Baseline calculated: ${avgTasksPerDay.toFixed(2)} avg tasks/member/day from ${totalDays} member-days`);

  return avgTasksPerDay;
}

/**
 * Refresh baseline data from ClickUp (called once per day)
 * @param {Array<number>} assigneeIds - Array of ClickUp user IDs
 * @returns {Promise<number>} Average tasks per member per day
 */
export async function refreshBaseline(assigneeIds) {
  if (!assigneeIds || assigneeIds.length === 0) {
    console.warn('⚠️ No assignee IDs provided for baseline refresh');
    return DEFAULT_AVG_TASKS;
  }

  try {
    // Fetch 3-month history
    const timeEntries = await fetch3MonthTimeEntries(assigneeIds);

    // Calculate average tasks per member per day
    const avgTasks = calculateAvgTasksPerMember(timeEntries, assigneeIds.length);

    // Store in IndexedDB
    await setBaseline('avgTasksPerMember', avgTasks);
    await setBaseline('lastUpdated', Date.now());

    console.log(`✅ Baseline refreshed: avgTasksPerMember = ${avgTasks.toFixed(2)}`);
    return avgTasks;
  } catch (error) {
    console.error('❌ Failed to refresh baseline:', error);
    return DEFAULT_AVG_TASKS;
  }
}

/**
 * Get average tasks baseline (from cache or fetch fresh)
 * @param {Array<number>} assigneeIds - Array of ClickUp user IDs (for refresh)
 * @returns {Promise<number>} Average tasks per member per day
 */
export async function getAvgTasksBaseline(assigneeIds = []) {
  try {
    // Check if we need to refresh
    const shouldRefresh = await needsRefresh();

    if (shouldRefresh && assigneeIds.length > 0) {
      // Refresh in background - don't block sync
      refreshBaseline(assigneeIds).catch(err => {
        console.error('❌ Background baseline refresh failed:', err);
      });
    }

    // Return cached value or default
    const cached = await getBaseline('avgTasksPerMember');
    return cached ?? DEFAULT_AVG_TASKS;
  } catch (error) {
    console.error('❌ Error getting avg tasks baseline:', error);
    return DEFAULT_AVG_TASKS;
  }
}

/**
 * Force refresh baseline (for manual refresh button)
 * @param {Array<number>} assigneeIds - Array of ClickUp user IDs
 * @returns {Promise<number>} Average tasks per member per day
 */
export async function forceRefreshBaseline(assigneeIds) {
  console.log('🔄 Force refreshing baseline...');
  return refreshBaseline(assigneeIds);
}

export default {
  getAvgTasksBaseline,
  refreshBaseline,
  forceRefreshBaseline,
  DEFAULT_AVG_TASKS
};
