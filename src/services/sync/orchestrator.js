/**
 * ClickUp Sync - Orchestrator
 * Main sync orchestration logic and member syncing
 *
 * Two-level polling architecture for real-time dashboard updates
 *
 * Level 1: Running timers (15s interval)
 * - Per-user GET /team/{team_id}/time_entries/current?assignee={user_id}
 * - Returns: duration (negative = active), task.id, start time
 *
 * Level 2: Task details (on-demand + 60s cache)
 * - GET /task/{task_id} when running timer found
 * - Returns: custom fields, tags, priority
 * - Cached for 60 seconds to reduce API calls
 *
 * Rate Limiting: ClickUp allows ~100 requests/minute
 * - For date ranges, we batch task detail requests
 * - Max 10 concurrent requests at a time
 * - 100ms delay between batches
 *
 * SYNC LOCK: Prevents concurrent syncs and supports abort via AbortController
 */

import { clickup } from '../clickup';
import { taskCacheV2 } from '../taskCacheV2';
import { timeEntryCache } from '../timeEntryCacheService';
import { db } from '../../db';
import { transformMember } from './transform';
import { calculateFastProjectBreakdown } from './projects';
import { calculateWorkingDays, countLeaveDaysInRange } from './calculations';

// ========== SYNC LOCK (prevents concurrent syncs) ==========
let syncLock = {
  inProgress: false,
  currentSyncId: null
};

// Track whether lastActiveDate backfill has run this session
let lastActiveDateBackfilled = false;

/**
 * Generate a unique sync ID for tracking
 */
function generateSyncId() {
  return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if sync is currently in progress
 * @returns {boolean}
 */
export function isSyncInProgress() {
  return syncLock.inProgress;
}

/**
 * Check if abort signal is triggered
 * @param {AbortSignal|null} signal
 * @throws {DOMException} if aborted
 */
function checkAbort(signal) {
  if (signal?.aborted) {
    throw new DOMException('Sync aborted', 'AbortError');
  }
}

/**
 * Fetch task details in batches to avoid rate limiting
 * OPTIMIZED: Uses TaskCacheV2 for instant reads from IndexedDB-backed cache
 * NO FALLBACK: Trusts cache completely - missing tasks will be fetched by background sync
 *
 * @param {Set|Array} taskIds - Set or array of task IDs to fetch
 * @param {Object} globalTaskCache - Cache object to populate
 * @param {number} batchSize - Max concurrent requests (default: 10) - DEPRECATED, kept for compatibility
 * @param {number} delayMs - Delay between batches in ms (default: 150) - DEPRECATED, kept for compatibility
 * @param {Function} onProgress - Optional progress callback (fetched, total)
 */
async function fetchTaskDetailsInBatches(taskIds, globalTaskCache, batchSize = 10, delayMs = 150, onProgress = null) {
  const taskIdsArray = Array.from(taskIds);
  const totalTasks = taskIdsArray.length;

  if (totalTasks === 0) return;

  console.log(`📦 Reading ${totalTasks} task details from cache...`);
  const fetchStart = Date.now();
  let cacheHits = 0;
  let cacheMisses = 0;
  let alreadyCached = 0;

  // Read all tasks from TaskCacheV2 (instant, no API calls)
  // NO FALLBACK to individual API calls - trust the cache completely
  for (const taskId of taskIdsArray) {
    // Skip if already in global cache
    if (globalTaskCache[taskId]) {
      alreadyCached++;
      continue;
    }

    // Try TaskCacheV2 only - no fallback
    const cachedTask = taskCacheV2.get(taskId);

    if (cachedTask) {
      globalTaskCache[taskId] = cachedTask;
      cacheHits++;
    } else {
      cacheMisses++;
      // NO FALLBACK: Don't make individual API calls
      // Missing tasks will be fetched by TaskCacheV2 background sync
    }

    // Report progress
    if (onProgress) {
      onProgress(alreadyCached + cacheHits + cacheMisses, totalTasks);
    }
  }

  const duration = Date.now() - fetchStart;
  console.log(`✅ Task details loaded in ${duration}ms: ${cacheHits} from cache, ${alreadyCached} already cached`);

  if (cacheMisses > 0) {
    console.log(`ℹ️ ${cacheMisses} tasks not in cache - will be fetched by background sync`);
  }

  console.log(`📊 TaskCacheV2 stats:`, {
    cacheHits,
    cacheMisses,
    alreadyCached,
    totalTasks: taskIdsArray.length,
    cacheHitRate: `${(((cacheHits + alreadyCached) / taskIdsArray.length) * 100).toFixed(1)}%`
  });
}

/**
 * Sync a single member's data from ClickUp
 * @param {Object} member - Member object from database
 * @param {Array} todayTimeEntries - All time entries for today (filtered later)
 * @param {number} avgTasksBaseline - 3-month average tasks per day for score calculation
 * @param {Object|null} settings - User settings (for thresholds, weights, etc.)
 * @param {Object|null} runningEntry - Pre-fetched running timer (for parallel optimization)
 * @param {Object} globalTaskCache - Shared task details cache across all members
 * @param {number} workingDays - Number of working days in the date range (defaults to 1)
 * @returns {Promise<Object>} Updated member data
 */
async function syncSingleMember(member, todayTimeEntries, avgTasksBaseline = 3, settings = null, runningEntry = null, globalTaskCache = {}, workingDays = 1, startDate = null, endDate = null) {
  try {
    // Skip if no ClickUp ID
    if (!member.clickUpId) {
      return member;
    }

    // Filter time entries for this member (compare as strings to handle type mismatch)
    const memberClickUpId = String(member.clickUpId);
    const memberTimeEntries = todayTimeEntries.filter(
      entry => String(entry.user?.id) === memberClickUpId
    );

    console.log(`📋 ${member.name}: Found ${memberTimeEntries.length} time entries today`);

    // Level 2: Get task details for current task and all unique tasks in time entries
    // Use global cache to avoid duplicate fetches
    const taskDetailsCache = {};
    const uniqueTaskIds = new Set();

    // Add running task
    if (runningEntry?.task?.id) {
      uniqueTaskIds.add(runningEntry.task.id);
    }

    // Add all tasks from time entries
    memberTimeEntries.forEach(entry => {
      if (entry.task?.id) {
        uniqueTaskIds.add(entry.task.id);
      }
    });

    // Get task details from global cache only (NO fallback API calls)
    // Task details should already be in globalTaskCache from fetchTaskDetailsInBatches
    const taskIdsArray = Array.from(uniqueTaskIds);
    taskIdsArray.forEach((taskId) => {
      // Check global cache first (shared across members)
      if (globalTaskCache[taskId]) {
        taskDetailsCache[taskId] = globalTaskCache[taskId];
      }
      // NO FALLBACK: If not in cache, skip it - will be fetched by TaskCacheV2 background sync
      // This eliminates individual API calls that were causing rate limit issues
    });

    // Get current task details (for display in member card)
    // Critical for publisher/genre/tags — fallback to direct API if cache miss
    let taskDetails = null;
    let currentTaskId = null;

    if (runningEntry?.task?.id) {
      currentTaskId = runningEntry.task.id;
      taskDetails = taskDetailsCache[currentTaskId];
    } else if (memberTimeEntries.length > 0) {
      // Break/Offline - get last task details
      const sortedEntries = [...memberTimeEntries].sort((a, b) => parseInt(b.end || b.start) - parseInt(a.end || a.start));
      const lastEntry = sortedEntries[0];
      if (lastEntry?.task?.id) {
        currentTaskId = lastEntry.task.id;
        taskDetails = taskDetailsCache[currentTaskId];
      }
    }

    // Fallback: if current task not in cache, fetch directly from API
    // This ensures publisher/genre/tags always display for active members
    if (!taskDetails && currentTaskId) {
      try {
        taskDetails = await clickup.getTaskDetails(currentTaskId);
        if (taskDetails) {
          // Store in caches for future use
          globalTaskCache[currentTaskId] = taskDetails;
          taskDetailsCache[currentTaskId] = taskDetails;
          taskCacheV2.cache.set(currentTaskId, { id: currentTaskId, data: taskDetails, dateUpdated: Date.now() });
        }
      } catch (fetchErr) {
        console.warn(`⚠️ Failed to fetch task ${currentTaskId} for ${member.name}:`, fetchErr.message);
      }
    }

    // Deduct personal leave days from working days for accurate per-member target
    let memberWorkingDays = workingDays;
    if (member.id && startDate && endDate) {
      try {
        const memberLeaves = await db.leaves.where('memberId').equals(member.id).toArray();
        const leaveDays = countLeaveDaysInRange(memberLeaves, startDate, endDate, settings);
        memberWorkingDays = Math.max(workingDays - leaveDays, 1);
        if (leaveDays > 0) {
          console.log(`📅 ${member.name}: ${leaveDays} leave day(s) in range → memberWorkingDays=${memberWorkingDays}`);
        }
      } catch (leaveErr) {
        // Non-critical — fall back to team working days
        console.warn(`⚠️ Could not load leaves for ${member.name}:`, leaveErr.message);
      }
    }

    // Transform and return updated member data
    return transformMember(member, runningEntry, taskDetails, memberTimeEntries, taskDetailsCache, avgTasksBaseline, settings, memberWorkingDays);
  } catch (error) {
    console.error(`❌ Failed to sync member ${member.name}:`, error);
    // Return member unchanged on error
    return member;
  }
}

/**
 * Fetch running timers for all members in PARALLEL
 * @param {Array} members - Array of member objects
 * @returns {Promise<Object>} Map of clickUpId -> runningEntry
 */
async function fetchAllRunningTimers(members) {
  const membersWithClickUpId = members.filter(m => m.clickUpId);

  // Fetch all running timers in parallel
  const timerPromises = membersWithClickUpId.map(async (member) => {
    try {
      const runningEntry = await clickup.getRunningTimer(member.clickUpId);
      return { clickUpId: member.clickUpId, runningEntry };
    } catch (error) {
      console.warn(`⚠️ Failed to get running timer for ${member.name}:`, error.message);
      return { clickUpId: member.clickUpId, runningEntry: null };
    }
  });

  const results = await Promise.all(timerPromises);

  // Build map of clickUpId -> runningEntry (use string keys for consistency)
  const runningTimersMap = {};
  results.forEach(({ clickUpId, runningEntry }) => {
    if (runningEntry) {
      const key = String(clickUpId);
      runningTimersMap[key] = runningEntry;
    }
  });

  return runningTimersMap;
}

/**
 * Sync all members' data from ClickUp
 * Main sync function called by the polling hook
 *
 * OPTIMIZED: Uses parallel fetches for running timers and member sync
 * - First sync: Sequential phases (discover task IDs)
 * - Subsequent syncs: ALL API calls in parallel (use cached task IDs)
 * - For date ranges > 1 day: Skip unnecessary task detail fetches
 *
 * @param {Array} members - Array of member objects from database
 * @param {number} avgTasksBaseline - 3-month average tasks per day (default 3 if no history)
 * @param {Object|null} settings - User settings
 * @param {Object|null} dateRange - Date range object { startDate, endDate, preset } or null for today
 * @param {Function|null} onProgress - Optional progress callback for loading UI
 * @param {AbortSignal|null} signal - Optional AbortSignal to cancel sync
 * @returns {Promise<Object>} { members: Array, projectBreakdown: Object, dateRangeInfo: Object }
 */
export async function syncMemberData(members, avgTasksBaseline = 3, settings = null, dateRange = null, onProgress = null, signal = null, options = {}) {
  const syncStartTime = Date.now();
  const syncId = generateSyncId();
  const { pollMode = false } = options;

  // Check if already aborted before starting
  checkAbort(signal);

  // Acquire sync lock (prevent concurrent syncs)
  if (syncLock.inProgress) {
    console.log(`⏳ [${syncId}] Another sync in progress, waiting...`);
    // Don't start a new sync if one is in progress - let the caller handle retry
    return { members, projectBreakdown: {}, dateRangeInfo: { workingDays: 1 }, skipped: true };
  }

  syncLock.inProgress = true;
  syncLock.currentSyncId = syncId;
  console.log(`🔒 [${syncId}] Sync lock acquired`);

  // Reset per-sync request counter
  clickup.resetSyncCounter();

  try {
    // Get time entries for selected date range (defaults to today if dateRange is null)
    // Use LOCAL time (Egypt: 12:00 AM to 11:59 PM local)
    let startOfDay, endOfDay;

    if (!dateRange || (!dateRange.startDate && dateRange.preset === 'today')) {
      // Today only (default)
      const today = new Date();
      startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
    } else {
      // Date range
      startOfDay = new Date(dateRange.startDate);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date(dateRange.endDate || dateRange.startDate);
      endOfDay.setHours(23, 59, 59, 999);
    }

    // Check if the date range includes today (needed to decide whether to fetch timers)
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const rangeIncludesToday = endOfDay >= todayMidnight;

    // Calculate working days for dynamic target calculation
    // Uses settings for work-day mask and public holidays (e.g. Egyptian holidays)
    const workingDays = calculateWorkingDays(startOfDay, endOfDay, settings);
    const isMultiDay = workingDays > 1;

    // ClickUp API expects Unix timestamps in SECONDS, not milliseconds
    const startSeconds = Math.floor(startOfDay.getTime() / 1000);
    const endSeconds = Math.floor(endOfDay.getTime() / 1000);

    console.log(`🕐 [${syncId}] Time range: ${startOfDay.toLocaleString()} to ${endOfDay.toLocaleString()} (${workingDays} working days)`);

    // Check abort before proceeding
    checkAbort(signal);

    // Report progress: Starting sync
    if (onProgress) {
      onProgress({ phase: 'starting', message: 'Starting sync...', progress: 0 });
    }

    // Extract all member ClickUp IDs for the assignee parameter
    const assigneeIds = members.map(m => m.clickUpId).filter(Boolean);
    console.log(`👥 Fetching data for ${assigneeIds.length} members...`);

    const globalTaskCache = {};

    // Phase 1: Fetch time entries (with cache) + running timers
    // POLL MODE: use cache for past days, only fetch today if range includes it
    // FULL MODE: fetch all chunks, then cache the results

    let allTimeEntries = [];
    let runningTimersMap;

    if (pollMode) {
      // Use cache: get cached entries + chunks that still need fetching
      const { cached, uncachedChunks } = await timeEntryCache.getEntries(startOfDay, endOfDay);

      // Fetch only uncached chunks (typically just today's chunk) + running timers
      const freshPromises = uncachedChunks.map(({ startSec, endSec }) =>
        clickup.getTimeEntries(startSec, endSec, assigneeIds)
      );

      // Only fetch running timers if range includes today
      const [timersMap, ...freshChunks] = await Promise.all([
        rangeIncludesToday ? fetchAllRunningTimers(members) : Promise.resolve({}),
        ...freshPromises
      ]);

      const freshEntries = freshChunks.flat();
      allTimeEntries = [...cached, ...freshEntries];
      runningTimersMap = timersMap;

      // Cache today's new entries won't store today (storeEntries skips today by design)
      if (freshEntries.length > 0) {
        await timeEntryCache.storeEntries(freshEntries);
      }

      console.log(`📊 [${syncId}] Poll mode: ${cached.length} cached + ${freshEntries.length} fresh entries, ${uncachedChunks.length} chunks fetched`);
    } else {
      // FULL MODE: fetch all chunks in parallel, then cache them
      const spanDays = Math.ceil((endOfDay.getTime() - startOfDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const chunkSizeDays = 30;
      const numChunks = Math.ceil(spanDays / chunkSizeDays);

      if (onProgress) {
        onProgress({ phase: 'fetching', message: `Fetching time entries (${numChunks} chunk${numChunks > 1 ? 's' : ''})...`, progress: 10 });
      }

      console.log(`📊 Fetching time entries for date range (${spanDays} days, ${numChunks} chunks) and running timers...`);

      // Generate chunks of at most 30 days covering [startOfDay, endOfDay]
      const timeEntryPromises = [];
      for (let i = 0; i < numChunks; i++) {
        const chunkStart = new Date(startOfDay.getTime() + i * chunkSizeDays * 24 * 60 * 60 * 1000);
        chunkStart.setHours(0, 0, 0, 0);
        const chunkEnd = new Date(Math.min(
          chunkStart.getTime() + (chunkSizeDays - 1) * 24 * 60 * 60 * 1000,
          endOfDay.getTime()
        ));
        chunkEnd.setHours(23, 59, 59, 999);
        const chunkStartSeconds = Math.floor(chunkStart.getTime() / 1000);
        const chunkEndSeconds = Math.floor(chunkEnd.getTime() / 1000);
        timeEntryPromises.push(clickup.getTimeEntries(chunkStartSeconds, chunkEndSeconds, assigneeIds));
      }

      // Fetch all chunks + running timers in parallel
      // Skip running timers for fully past ranges (they can't be active)
      const [timersMap, ...entryChunks] = await Promise.all([
        rangeIncludesToday ? fetchAllRunningTimers(members) : Promise.resolve({}),
        ...timeEntryPromises
      ]);

      allTimeEntries = entryChunks.flat();
      runningTimersMap = timersMap;

      // Cache historical entries for future polls
      if (allTimeEntries.length > 0) {
        await timeEntryCache.storeEntries(allTimeEntries);
      }

      console.log(`📊 [${syncId}] Full mode: Got ${allTimeEntries.length} time entries (${numChunks} chunks), ${Object.keys(runningTimersMap).length} running timers`);
    }

    // Filter time entries for selected date range (for scoring/display)
    // Use overlap check: include entry if it overlaps with the date range
    const todayTimeEntries = allTimeEntries.filter(entry => {
      const entryStart = parseInt(entry.start || 0);
      const entryEnd = parseInt(entry.end || Date.now()); // Running timers use current time

      // Entry overlaps if: start <= rangeEnd AND end >= rangeStart
      return entryStart <= endSeconds * 1000 && entryEnd >= startSeconds * 1000;
    });

    console.log(`📊 [${syncId}] Filtered to ${todayTimeEntries.length} entries for date range`);

    // Check abort after fetching data
    checkAbort(signal);

    if (onProgress) {
      onProgress({ phase: 'processing', message: `Processing ${todayTimeEntries.length} time entries...`, progress: 30 });
    }

    // Check abort before task fetching
    checkAbort(signal);

    // Phase 2: Fetch fresh tasks from filtered /task endpoint for the selected date range
    if (onProgress) {
      onProgress({ phase: 'tasks', message: 'Fetching fresh task data...', progress: 50 });
    }

    // Use the selected range start so tasks for the full period are included.
    // Fall back to 90 days ago only for "today" (rolling live view).
    const taskFetchSinceMs = startOfDay.getTime();
    let allTasks = [];
    let page = 0;
    let hasMore = true;

    console.log(`📦 Fetching fresh tasks for ${assigneeIds.length} members (since ${startOfDay.toLocaleDateString()})...`);

    // Fetch first page to determine if there are more pages
    try {
      const firstResult = await clickup.getFilteredTeamTasks({
        assignees: assigneeIds,
        dateUpdatedGt: taskFetchSinceMs,
        includeClosed: true,
        subtasks: true,
        page: 0
      });
      allTasks.push(...(firstResult.tasks || []));
      hasMore = firstResult.hasMore;
      page = 1;

      if (onProgress && hasMore) {
        onProgress({ phase: 'tasks', message: `Fetching tasks (page 1)...`, progress: 52 });
      }
    } catch (taskFetchErr) {
      if (taskFetchErr.name === 'AbortError') throw taskFetchErr;
      console.error(`❌ Failed to fetch tasks (page 0):`, taskFetchErr.message);
      hasMore = false;
    }

    // Check abort between page 0 completing and starting the parallel batch loop.
    // If cancelled while page 0 was in-flight, skip the 3 parallel batch requests.
    checkAbort(signal);

    if (hasMore) {
      // Fetch remaining pages in parallel batches of 3
      let nextPage = 1;

      while (hasMore && nextPage < 20) {
        // Build a batch of up to 3 page numbers
        const batchSize = 3;
        const batchPages = [];
        for (let i = 0; i < batchSize && nextPage + i < 20; i++) {
          batchPages.push(nextPage + i);
        }

        const batchResults = await Promise.all(
          batchPages.map(p => clickup.getFilteredTeamTasks({
            assignees: assigneeIds,
            dateUpdatedGt: taskFetchSinceMs,
            includeClosed: true,
            subtasks: true,
            page: p
          }).catch(() => ({ tasks: [], hasMore: false })) // graceful per-page failure
          )
        );

        for (const result of batchResults) {
          if (result.tasks?.length > 0) {
            allTasks.push(...result.tasks);
          }
        }
        // Only the last fetched page's hasMore is authoritative — ORing all results
        // would wrongly continue pagination when only lower-numbered pages had data.
        const lastBatchResult = batchResults[batchResults.length - 1];
        hasMore = lastBatchResult?.hasMore ?? false;

        page += batchPages.length;

        if (onProgress && hasMore) {
          onProgress({ phase: 'tasks', message: `Fetching tasks (page ${page})...`, progress: 50 + (page * 2) });
        }

        nextPage += batchSize;
      }
    }

    console.log(`✅ Fetched ${allTasks.length} fresh tasks from ClickUp (${page} pages)`);

    // Populate globalTaskCache from fresh task results
    allTasks.forEach(task => {
      globalTaskCache[task.id] = task;
    });

    // Update taskCacheV2 memory cache for faster lookups
    if (allTasks.length > 0) {
      await taskCacheV2.storeTasks(allTasks);
      console.log(`✅ Updated taskCacheV2 with ${allTasks.length} fresh tasks`);
    }

    // Eager background fetch: populate taskCacheV2 from /list/{id}/task for richer task details
    // This fires and forgets — doesn't block the sync result
    if (!pollMode && allTimeEntries.length > 0) {
      const discoveredListIds = clickup.discoverListIds(allTimeEntries);
      if (discoveredListIds.length > 0) {
        console.log(`🔍 Starting eager background fetch for ${discoveredListIds.length} lists...`);
        // Fire and forget — don't await, don't block sync
        (async () => {
          for (const listId of discoveredListIds) {
            if (signal?.aborted) break;
            try {
              const listTasks = await clickup.fetchAllListTasks(listId);
              if (listTasks.length > 0) {
                const taskMap = {};
                listTasks.forEach(t => { taskMap[t.id] = t; });
                await taskCacheV2.bulkLoad(taskMap);
                console.log(`✅ Eager fetch: cached ${listTasks.length} tasks from list ${listId}`);
              }
            } catch (err) {
              console.warn(`⚠️ Eager fetch failed for list ${listId}:`, err.message);
            }
            await clickup.delay(200); // Rate limit safety between lists
          }
          console.log(`✅ Eager background list fetch complete`);
        })();
      }
    }

    // Check abort before member processing
    checkAbort(signal)

    if (onProgress) {
      onProgress({ phase: 'members', message: 'Processing member data...', progress: 85 });
    }

    // OPTIMIZATION 3: Sync ALL members in parallel (no chunking needed - tasks already cached)
    const memberPromises = members.map(member => {
      // Use string key for consistency
      const key = String(member.clickUpId);
      const runningEntry = runningTimersMap[key] || null;
      return syncSingleMember(member, todayTimeEntries, avgTasksBaseline, settings, runningEntry, globalTaskCache, workingDays, startOfDay, endOfDay);
    });

    const results = await Promise.all(memberPromises);

    // Populate lastActiveDate for noActivity members from 90-day time entries (already fetched)
    // No extra API calls needed - use allTimeEntries already fetched
    const noActivityWithoutDate = lastActiveDateBackfilled
      ? results.filter(m => m.status === 'noActivity' && !m.lastActiveDate)
      : results.filter(m => m.status === 'noActivity');

    if (noActivityWithoutDate.length > 0) {
      console.log(`📅 Backfilling lastActiveDate for ${noActivityWithoutDate.length} members from 90-day entries...`);

      for (const member of noActivityWithoutDate) {
        // Filter allTimeEntries (90 days) for this member
        const memberEntries = allTimeEntries.filter(e => String(e.user?.id) === String(member.clickUpId));

        if (memberEntries.length > 0) {
          // Sort by end time descending, get most recent
          const sorted = [...memberEntries].sort((a, b) => parseInt(b.end || b.start || 0) - parseInt(a.end || a.start || 0));
          const lastEndMs = parseInt(sorted[0].end || sorted[0].start || 0);

          if (lastEndMs > 0) {
            member.lastActiveDate = new Date(lastEndMs).toISOString();
            console.log(`📅 ${member.name}: last active ${member.lastActiveDate}`);
          }
        } else {
          console.log(`📅 ${member.name}: no entries found in last 90 days`);
        }
      }

      console.log(`📅 Backfilled lastActiveDate for ${noActivityWithoutDate.filter(m => m.lastActiveDate).length}/${noActivityWithoutDate.length} noActivity members`);
      lastActiveDateBackfilled = true;
    }

    // ALWAYS use fast project breakdown from time entries (no dependency on cache)
    // Time entries already contain task.list.name (project), task.status, task.name
    let projectBreakdown = calculateFastProjectBreakdown(todayTimeEntries, globalTaskCache);
    console.log(`📂 Project breakdown from time entries: ${Object.keys(projectBreakdown).length} projects`)

    if (onProgress) {
      onProgress({ phase: 'complete', message: 'Sync complete!', progress: 100 });
    }

    const syncDuration = Date.now() - syncStartTime;
    console.log(`✅ [${syncId}] Synced ${results.length} members in ${syncDuration}ms`);
    console.log(`📂 [${syncId}] Found ${Object.keys(projectBreakdown).length} projects`);

    // Return date range info for dynamic target calculation
    return {
      members: results,
      projectBreakdown,
      dateRangeInfo: {
        startDate: startOfDay,
        endDate: endOfDay,
        workingDays,
        totalTimeEntries: todayTimeEntries.length,
        uniqueTasks: allTasks.length
      }
    };
  } catch (error) {
    // Handle abort errors gracefully
    if (error.name === 'AbortError') {
      console.log(`⏸️ [${syncId}] Sync aborted`);
      throw error; // Re-throw so caller can handle
    }
    console.error(`❌ [${syncId}] Sync failed:`, error);
    // Return members unchanged on error
    return { members, projectBreakdown: {}, dateRangeInfo: { workingDays: 1 } };
  } finally {
    // Always release the lock
    syncLock.inProgress = false;
    syncLock.currentSyncId = null;
    console.log(`🔓 [${syncId}] Sync lock released`);
  }
}

/**
 * Initialize ClickUp sync with configuration
 * @param {string} apiKey - ClickUp API key
 * @param {string} teamId - ClickUp team ID
 */
export function initializeSync(apiKey, teamId) {
  clickup.initialize(apiKey, teamId);
  console.log('🚀 ClickUp sync initialized');
}

/**
 * Map ClickUp user IDs to database member IDs
 * Call this once after fetching team members from ClickUp
 *
 * @param {Array} members - Members from database
 * @param {Array} clickUpUsers - Users from ClickUp API
 * @returns {Array} Members with clickUpId filled in
 */
export async function mapClickUpUsers(members, clickUpUsers) {
  const mapped = members.map(member => {
    // Try to match by name (case-insensitive)
    const clickUpUser = clickUpUsers.find(u =>
      u.user?.username?.toLowerCase() === member.name?.toLowerCase() ||
      u.user?.email?.toLowerCase().includes(member.name?.toLowerCase())
    );

    if (clickUpUser) {
      return {
        ...member,
        clickUpId: clickUpUser.user.id,
        profilePicture: clickUpUser.user.profilePicture || null,
        clickUpColor: clickUpUser.user.color || null,
        updatedAt: Date.now()
      };
    }

    return member;
  });

  console.log(`🔗 Mapped ${mapped.filter(m => m.clickUpId).length}/${members.length} members to ClickUp users`);
  return mapped;
}

/**
 * Sync Leave and WFH data from configured ClickUp lists
 * Fetches tasks from leaveListId and wfhListId, parses them to extract leave records
 *
 * Expected task structure in Leave/WFH lists:
 * - Task name: Contains leave description
 * - Assignees: The member(s) on leave
 * - Start date (start_date): Leave start date
 * - Due date (due_date): Leave end date
 * - Status: Approved/Pending/Rejected
 *
 * @param {Object} settings - Settings object with clickup.leaveListId and clickup.wfhListId
 * @param {Array} members - Array of member objects (to match clickUpId)
 * @returns {Promise<Array>} Array of leave records for db.leaves
 */
export async function syncLeaveAndWfh(settings, members) {
  const leaves = [];

  const leaveListId = settings?.clickup?.leaveListId;
  const wfhListId = settings?.clickup?.wfhListId;

  if (!leaveListId && !wfhListId) {
    console.log('⏭️ Leave/WFH sync skipped: No list IDs configured');
    return leaves;
  }

  console.log(`📅 Starting Leave/WFH sync...`);

  // Helper: parse a ClickUp custom-field date value (timestamp ms, timestamp s, or ISO string)
  const parseFieldDate = (value) => {
    if (!value) return null;
    const str = String(value).trim();
    if (!str) return null;
    // Numeric → treat as Unix timestamp
    if (/^\d+$/.test(str)) {
      const num = parseInt(str, 10);
      // If > 1e12 it's already milliseconds; otherwise seconds
      const d = new Date(num > 1e12 ? num : num * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    // Otherwise try ISO / date string parse
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  // Helper: search task.custom_fields for a date value matching any of the given name patterns
  // Returns a Date object or null
  const getCustomFieldDate = (task, namePatterns) => {
    const fields = task?.custom_fields || [];
    for (const field of fields) {
      const name = (field.name || '').toLowerCase();
      if (namePatterns.some(p => name.includes(p))) {
        const d = parseFieldDate(field.value);
        if (d) return d;
      }
    }
    return null;
  };

  // Helper: search task.custom_fields for a numeric value matching any of the given name patterns
  const getCustomFieldNumber = (task, namePatterns) => {
    const fields = task?.custom_fields || [];
    for (const field of fields) {
      const name = (field.name || '').toLowerCase();
      if (namePatterns.some(p => name.includes(p))) {
        const num = parseFloat(field.value);
        if (!isNaN(num)) return num;
      }
    }
    return null;
  };

  // Helper to map ClickUp status to our status
  const mapLeaveStatus = (clickUpStatus) => {
    const statusLower = (clickUpStatus?.status || '').toLowerCase();
    if (statusLower.includes('approved') || statusLower.includes('complete') || statusLower.includes('closed')) {
      return 'approved';
    }
    if (statusLower.includes('reject') || statusLower.includes('cancel')) {
      return 'rejected';
    }
    return 'pending';
  };

  // Helper to find member by ClickUp assignee
  const findMemberByAssignee = (assignee) => {
    if (!assignee?.id) return null;
    return members.find(m => String(m.clickUpId) === String(assignee.id));
  };

  // Fetch Leave tasks
  if (leaveListId) {
    try {
      console.log(`📋 Fetching tasks from Leave list: ${leaveListId}`);
      const leaveTasks = await clickup.getTasks(leaveListId, { include_closed: true });
      console.log(`✅ Found ${leaveTasks.length} leave tasks`);
      // Debug: log custom_fields of first task so field names are visible in console
      if (leaveTasks.length > 0 && leaveTasks[0].custom_fields?.length) {
        console.log('📋 Leave task custom_fields sample:', JSON.stringify(leaveTasks[0].custom_fields.map(f => ({ name: f.name, value: f.value, type: f.type }))));
      }

      leaveTasks.forEach(task => {
        // Get the assignee (first one if multiple)
        const assignee = task.assignees?.[0];
        const member = findMemberByAssignee(assignee);

        if (!member) {
          console.log(`⚠️ Leave task "${task.name}" has no matching member`);
          return;
        }

        // Parse dates — prefer task start_date/due_date; fall back to custom fields
        // Common leave custom-field names: "start of time-off", "time-off start", "leave start", "requested days"
        let startDate = task.start_date ? new Date(parseInt(task.start_date)) : null;
        let endDate   = task.due_date   ? new Date(parseInt(task.due_date))   : null;

        if (!startDate) {
          startDate = getCustomFieldDate(task, ['start of time', 'leave start', 'time-off start', 'time off start', 'start date']);
        }
        if (!endDate) {
          endDate = getCustomFieldDate(task, ['end of time', 'leave end', 'time-off end', 'time off end', 'end date']);
        }
        // If still no end date, default to start date (single-day leave)
        if (!endDate) endDate = startDate;

        if (!startDate) {
          console.log(`⚠️ Leave task "${task.name}" has no start date (checked start_date + custom fields)`);
          return;
        }

        // Extract "Requested Days" custom field if available
        const requestedDays = getCustomFieldNumber(task, ['requested day', 'requested days', 'days requested', 'number of days']);

        leaves.push({
          id: `leave_${task.id}`,
          clickUpTaskId: task.id,
          memberId: member.id,
          memberClickUpId: member.clickUpId,
          memberName: member.name,
          type: 'annual', // Default type for leave list
          description: task.name,
          requestedDays: requestedDays, // From "Requested Days" custom field
          startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
          endDate: endDate ? endDate.toISOString().split('T')[0] : null,
          status: mapLeaveStatus(task.status),
          createdAt: task.date_created ? new Date(parseInt(task.date_created)) : new Date(),
          updatedAt: Date.now()
        });
      });
    } catch (error) {
      console.error(`❌ Failed to fetch leave tasks:`, error);
    }
  }

  // Fetch WFH tasks
  if (wfhListId) {
    try {
      console.log(`🏠 Fetching tasks from WFH list: ${wfhListId}`);
      const wfhTasks = await clickup.getTasks(wfhListId, { include_closed: true });
      console.log(`✅ Found ${wfhTasks.length} WFH tasks`);
      if (wfhTasks.length > 0 && wfhTasks[0].custom_fields?.length) {
        console.log('🏠 WFH task custom_fields sample:', JSON.stringify(wfhTasks[0].custom_fields.map(f => ({ name: f.name, value: f.value, type: f.type }))));
      }

      wfhTasks.forEach(task => {
        const assignee = task.assignees?.[0];
        const member = findMemberByAssignee(assignee);

        if (!member) {
          console.log(`⚠️ WFH task "${task.name}" has no matching member`);
          return;
        }

        // Parse dates — prefer task start_date/due_date; fall back to custom fields
        // Common WFH custom-field names: "wfh date", "wfh date request", "work from home"
        let startDate = task.start_date ? new Date(parseInt(task.start_date)) : null;
        let endDate   = task.due_date   ? new Date(parseInt(task.due_date))   : null;

        if (!startDate) {
          startDate = getCustomFieldDate(task, ['wfh date', 'work from home', 'wfh start', 'remote date']);
        }
        if (!endDate) {
          endDate = getCustomFieldDate(task, ['wfh end', 'end date']);
        }
        if (!endDate) endDate = startDate;

        if (!startDate) {
          console.log(`⚠️ WFH task "${task.name}" has no start date (checked start_date + custom fields)`);
          return;
        }

        leaves.push({
          id: `wfh_${task.id}`,
          clickUpTaskId: task.id,
          memberId: member.id,
          memberClickUpId: member.clickUpId,
          memberName: member.name,
          type: 'wfh',
          description: task.name,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate ? endDate.toISOString().split('T')[0] : null,
          status: mapLeaveStatus(task.status),
          createdAt: task.date_created ? new Date(parseInt(task.date_created)) : new Date(),
          updatedAt: Date.now()
        });
      });
    } catch (error) {
      console.error(`❌ Failed to fetch WFH tasks:`, error);
    }
  }

  console.log(`📅 Leave/WFH sync complete: ${leaves.length} records`);
  return leaves;
}
