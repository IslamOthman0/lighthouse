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
import { transformMember } from './transform';
import { calculateFastProjectBreakdown } from './projects';
import { calculateWorkingDays } from './calculations';

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
async function syncSingleMember(member, todayTimeEntries, avgTasksBaseline = 3, settings = null, runningEntry = null, globalTaskCache = {}, workingDays = 1) {
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

    // Transform and return updated member data
    return transformMember(member, runningEntry, taskDetails, memberTimeEntries, taskDetailsCache, avgTasksBaseline, settings, workingDays);
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
export async function syncMemberData(members, avgTasksBaseline = 3, settings = null, dateRange = null, onProgress = null, signal = null) {
  const syncStartTime = Date.now();
  const syncId = generateSyncId();

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

    // Calculate working days for dynamic target calculation
    const workingDays = calculateWorkingDays(startOfDay, endOfDay);
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

    let allTimeEntries = [];
    let runningTimersMap;
    const globalTaskCache = {};

    // Phase 1: Fetch 90-day time entries and running timers
    // ClickUp time entry API max: 30 days per request → fetch in 3 chunks
    if (onProgress) {
      onProgress({ phase: 'fetching', message: 'Fetching 90-day time entries...', progress: 10 });
    }

    console.log(`📊 Fetching 90-day time entries (3 chunks) and running timers...`);

    // Fetch time entries in 3 × 30-day chunks (ClickUp limitation)
    const now = new Date();
    const timeEntryChunks = [
      { start: 90, end: 61 }, // Days 90-61 ago
      { start: 60, end: 31 }, // Days 60-31 ago
      { start: 30, end: 0 }   // Days 30-0 ago (most recent)
    ];

    const timeEntryPromises = timeEntryChunks.map(chunk => {
      const chunkStart = new Date(now);
      chunkStart.setDate(chunkStart.getDate() - chunk.start);
      chunkStart.setHours(0, 0, 0, 0);

      const chunkEnd = new Date(now);
      chunkEnd.setDate(chunkEnd.getDate() - chunk.end);
      chunkEnd.setHours(23, 59, 59, 999);

      const chunkStartSeconds = Math.floor(chunkStart.getTime() / 1000);
      const chunkEndSeconds = Math.floor(chunkEnd.getTime() / 1000);

      return clickup.getTimeEntries(chunkStartSeconds, chunkEndSeconds, assigneeIds);
    });

    // Fetch time entries (3 chunks) and running timers in parallel
    const [chunk1, chunk2, chunk3, timersMap] = await Promise.all([
      ...timeEntryPromises,
      fetchAllRunningTimers(members)
    ]);

    allTimeEntries = [...chunk1, ...chunk2, ...chunk3];
    runningTimersMap = timersMap;

    console.log(`📊 [${syncId}] Got ${allTimeEntries.length} time entries (90 days), ${Object.keys(runningTimersMap).length} running timers`);

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

    // Phase 2: Fetch fresh tasks from filtered /task endpoint (90-day window)
    // This replaces the old cache-based approach and provides always-fresh task data
    if (onProgress) {
      onProgress({ phase: 'tasks', message: 'Fetching fresh task data...', progress: 50 });
    }

    const ninetyDaysAgoMs = Date.now() - (90 * 24 * 60 * 60 * 1000);
    let allTasks = [];
    let page = 0;
    let hasMore = true;

    console.log(`📦 Fetching fresh tasks for ${assigneeIds.length} members (90-day window)...`);

    while (hasMore && page < 20) { // Safety limit: max 20 pages = 2000 tasks
      try {
        const result = await clickup.getFilteredTeamTasks({
          assignees: assigneeIds,
          dateUpdatedGt: ninetyDaysAgoMs,
          includeClosed: true,
          subtasks: true,
          page
        });

        allTasks.push(...result.tasks);
        hasMore = result.hasMore;
        page++;

        if (onProgress && hasMore) {
          onProgress({ phase: 'tasks', message: `Fetching tasks (page ${page})...`, progress: 50 + (page * 2) });
        }
      } catch (taskFetchErr) {
        console.error(`❌ Failed to fetch tasks (page ${page}):`, taskFetchErr.message);
        hasMore = false; // Stop on error
      }
    }

    console.log(`✅ Fetched ${allTasks.length} fresh tasks from ClickUp (${page} pages)`);

    // Populate globalTaskCache from fresh task results
    allTasks.forEach(task => {
      globalTaskCache[task.id] = task;
    });

    // Update taskCacheV2 memory cache for faster lookups
    if (allTasks.length > 0) {
      taskCacheV2.storeTasks(allTasks);
      console.log(`✅ Updated taskCacheV2 with ${allTasks.length} fresh tasks`);
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
      return syncSingleMember(member, todayTimeEntries, avgTasksBaseline, settings, runningEntry, globalTaskCache, workingDays);
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
    let projectBreakdown = calculateFastProjectBreakdown(todayTimeEntries);
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
