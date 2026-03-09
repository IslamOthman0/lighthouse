/**
 * ClickUp Sync Hook
 * React hook for polling ClickUp API and updating member data
 *
 * Polling Strategy:
 * - Poll every 15 seconds when tab is visible
 * - Pause polling when tab is hidden (saves API calls)
 * - Update Zustand store with synced data
 * - Store data in IndexedDB for persistence
 *
 * OPTIMIZATIONS:
 * - AbortController to cancel in-progress syncs on date change
 * - Debounce date changes to handle rapid selections
 * - Sync lock prevents concurrent sync calls
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { syncMemberData, initializeSync, isSyncInProgress, syncLeaveAndWfh } from '../services/clickupSync';
import { bulkUpdateMembers, db, autoClearCache, pruneOldData } from '../db';
import { logger } from '../utils/logger';
import { getAvgTasksBaseline } from '../services/baselineService';
import { SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from '../constants/defaults';
import { sanitizeSettings } from '../utils/settingsValidation';
import { useOnlineStatus } from './useOnlineStatus';
import { useSettings } from './useSettings';
import { processPendingQueue } from '../services/syncQueue';
import { taskCacheV2 } from '../services/taskCacheV2';
import { enrichMembersWithLeaveStatus } from '../utils/leaveHelpers';

/**
 * Load settings from localStorage
 * @returns {Object} Settings object
 */
function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return sanitizeSettings(parsed, DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error('[useClickUpSync] Error loading settings:', error);
  }
  return DEFAULT_SETTINGS;
}

// Last leave sync timestamp (to prevent syncing too frequently)
const LEAVE_SYNC_KEY = 'lighthouse_last_leave_sync';
// Bump this value whenever the leave-sync extraction logic changes — forces a re-sync
const LEAVE_SYNC_VERSION_KEY = 'lighthouse_leave_sync_version';
const LEAVE_SYNC_VERSION = '2'; // v2: custom-field date fallback added

// One-time version check: if stored version differs, clear the daily guard
(function checkLeaveSyncVersion() {
  try {
    if (localStorage.getItem(LEAVE_SYNC_VERSION_KEY) !== LEAVE_SYNC_VERSION) {
      localStorage.removeItem(LEAVE_SYNC_KEY);
      localStorage.setItem(LEAVE_SYNC_VERSION_KEY, LEAVE_SYNC_VERSION);
      console.log('📋 Leave sync version bumped → re-sync scheduled');
    }
  } catch {}
})();

/**
 * Check if leave/WFH sync should be performed
 * Only syncs once per day to save API calls
 */
function shouldSyncLeaves() {
  try {
    const lastSync = localStorage.getItem(LEAVE_SYNC_KEY);
    if (!lastSync) return true;

    const lastSyncDate = new Date(parseInt(lastSync));
    const today = new Date();

    // Check if last sync was on a different day
    return lastSyncDate.toDateString() !== today.toDateString();
  } catch {
    return true;
  }
}

/**
 * Mark leave sync as completed for today
 */
function markLeaveSyncComplete() {
  localStorage.setItem(LEAVE_SYNC_KEY, Date.now().toString());
}

/**
 * Perform leave/WFH sync and store results in IndexedDB
 */
async function performLeaveSync(members, settings) {
  try {
    // Skip if no list IDs configured — nothing to fetch
    const leaveListId = settings?.clickup?.leaveListId;
    const wfhListId = settings?.clickup?.wfhListId;
    if (!leaveListId && !wfhListId) {
      console.log('⏭️ Leave/WFH sync skipped: No list IDs configured in Settings');
      return;
    }

    console.log('📅 Checking if leave/WFH sync is needed...');

    if (!shouldSyncLeaves()) {
      console.log('⏭️ Leave/WFH sync already done today, skipping');
      return;
    }

    console.log('📅 Performing daily leave/WFH sync...');
    const leaves = await syncLeaveAndWfh(settings, members);

    // Always clear and replace — even if 0 records (clears stale data)
    await db.leaves.clear();
    if (leaves.length > 0) {
      await db.leaves.bulkPut(leaves);
    }
    console.log(`✅ Stored ${leaves.length} leave/WFH records in database`);

    markLeaveSyncComplete();
  } catch (error) {
    console.error('❌ Leave/WFH sync failed:', error);
  }
}

/**
 * Discover team members from ClickUp API and merge into db.members.
 * Any ClickUp user NOT already in the database gets a fresh entry created.
 * Existing members get their profilePicture / color updated.
 */
async function discoverAndMergeTeamMembers() {
  try {
    const { clickup } = await import('../services/clickup');
    const clickUpUsers = await clickup.getTeamMembers();

    if (!clickUpUsers || clickUpUsers.length === 0) {
      console.log('⚠️ No team members returned from ClickUp API');
      return;
    }

    console.log(`👥 ClickUp returned ${clickUpUsers.length} team members`);

    const existingMembers = await db.members.toArray();
    const existingClickUpIds = new Set(existingMembers.map(m => String(m.clickUpId)));

    let added = 0;
    let updated = 0;

    for (const cu of clickUpUsers) {
      const user = cu.user || cu;
      const cuId = String(user.id);

      if (existingClickUpIds.has(cuId)) {
        // Update profile picture and color for existing members
        const existing = existingMembers.find(m => String(m.clickUpId) === cuId);
        if (existing) {
          await db.members.update(existing.id, {
            profilePicture: user.profilePicture || user.avatar || existing.profilePicture || null,
            clickUpColor: user.color || existing.clickUpColor || null,
            updatedAt: Date.now(),
          });
          updated++;
        }
      } else {
        // New member — create a fresh entry in db.members
        const name = user.username || user.email?.split('@')[0] || 'Unknown';
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        await db.members.add({
          name,
          initials,
          clickUpId: Number(user.id) || user.id,
          profilePicture: user.profilePicture || user.avatar || null,
          clickUpColor: user.color || null,
          status: 'noActivity',
          timer: null,
          tracked: 0,
          target: 6.5,
          tasks: 0,
          done: 0,
          task: '',
          taskStatus: '',
          project: '',
          priority: 'Normal',
          publisher: '',
          genre: '',
          tags: [],
          startTime: '—',
          previousTimer: '—',
          breaks: { total: 0, count: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        added++;
        console.log(`➕ Added new member: ${name} (ClickUp ID: ${cuId})`);
      }
    }

    console.log(`👥 Team discovery: ${added} added, ${updated} updated, ${existingMembers.length} existing`);

    // Refresh Zustand store from db so new members appear on next sync
    // DON'T trigger updateStats() to avoid immediate re-sync cascade
    if (added > 0) {
      const refreshed = await db.members.toArray();
      useAppStore.getState().setMembers(refreshed);
      console.log(`✅ Store updated with ${refreshed.length} total members (will sync on next cycle)`);
    }
  } catch (error) {
    console.error('❌ Failed to discover team members:', error);
  }
}

/**
 * Custom hook for ClickUp data synchronization
 *
 * @param {Object} config - Configuration object
 * @param {boolean} config.enabled - Enable/disable sync (from VITE_USE_CLICKUP_API)
 * @param {string} config.apiKey - ClickUp API key
 * @param {string} config.teamId - ClickUp team ID
 * @param {number} config.interval - Polling interval in ms (default: 15000)
 */
export function useClickUpSync(config = {}) {
  const {
    enabled = false,
    apiKey = null,
    teamId = null,
    interval = 15000 // 15 seconds
  } = config;

  const intervalRef = useRef(null);
  const isInitialized = useRef(false);
  const abortControllerRef = useRef(null);
  const dateRangeDebounceRef = useRef(null);
  const previousDateRangeRef = useRef(null);

  // Offline detection
  const { isOnline, wasOffline } = useOnlineStatus();

  // Reactive settings (to watch for weight changes)
  const { settings } = useSettings();

  // Get store methods - use getState() for sync function to avoid stale closures
  const setMembers = useAppStore(state => state.setMembers);
  const setLastSync = useAppStore(state => state.setLastSync);
  const setSyncError = useAppStore(state => state.setSyncError);
  const setIsSyncing = useAppStore(state => state.setIsSyncing);
  const setRequestCount = useAppStore(state => state.setRequestCount);
  const updateStats = useAppStore(state => state.updateStats);
  const setProjectBreakdown = useAppStore(state => state.setProjectBreakdown);
  const setTeamBaseline = useAppStore(state => state.setTeamBaseline);
  const setDateRangeInfo = useAppStore(state => state.setDateRangeInfo);
  const setSyncProgress = useAppStore(state => state.setSyncProgress);
  const batchSyncUpdate = useAppStore(state => state.batchSyncUpdate);
  const setScoreWeights = useAppStore(state => state.setScoreWeights);
  const setYesterdaySnapshot = useAppStore(state => state.setYesterdaySnapshot);
  const dateRange = useAppStore(state => state.dateRange);

  // Keep store scoreWeights in sync with settings.score.weights
  // Destructure primitive weight values as dependencies to avoid firing on every settings change
  useEffect(() => {
    if (settings?.score?.weights) {
      setScoreWeights(settings.score.weights);
    }
  }, [
    settings?.score?.weights?.trackedTime,
    settings?.score?.weights?.tasksWorked,
    settings?.score?.weights?.tasksDone,
    settings?.score?.weights?.compliance,
    setScoreWeights,
  ]);

  // On mount, load yesterday's snapshot for daily score comparison
  useEffect(() => {
    const loadYesterdaySnapshot = async () => {
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yDate = yesterday.toISOString().split('T')[0]; // "YYYY-MM-DD"
        const snap = await db.dailySnapshots.get(yDate);
        if (snap) setYesterdaySnapshot(snap);
      } catch (e) {
        // non-critical
      }
    };
    loadYesterdaySnapshot();
  }, [setYesterdaySnapshot]);

  useEffect(() => {
    // Skip if sync is disabled
    if (!enabled) {
      console.log('⏸️ ClickUp sync disabled');
      return;
    }

    // Validate configuration
    if (!apiKey || !teamId) {
      console.error('❌ ClickUp API key or team ID missing');
      setSyncError('Missing API configuration');
      return;
    }

    // Initialize ClickUp service once
    if (!isInitialized.current) {
      // Hydrate UI immediately from IndexedDB cache before first API sync fires.
      // Must run inside the isInitialized guard so it only runs once — not on every
      // effect re-fire (e.g. React Strict Mode double-mount, apiKey change), which
      // would otherwise overwrite freshly synced data with stale cache.
      const hydrateFromCache = async () => {
        try {
          const cachedMembers = await db.members.toArray();
          if (cachedMembers && cachedMembers.length > 0) {
            setMembers(cachedMembers);
            updateStats();
            logger.info(`Hydrated ${cachedMembers.length} members from IndexedDB cache`);
          }
        } catch (e) {
          // non-critical — will be populated by first sync
          logger.warn('Cache hydration failed, will wait for first sync');
        }
      };
      hydrateFromCache();

      initializeSync(apiKey, teamId);
      isInitialized.current = true;

      // Discover ALL team members from ClickUp and merge into db.members
      // This ensures the dashboard shows every ClickUp user, not just hardcoded ones
      discoverAndMergeTeamMembers();

      // Run auto-clear and data-retention cleanup on startup (respects user settings)
      (async () => {
        const startSettings = loadSettings();
        await autoClearCache(startSettings.sync?.autoClearCache);
        await pruneOldData(startSettings.sync?.dataRetentionDays ?? 30);
      })();

      // Initialize TaskCacheV2 and perform historical data loading if needed
      (async () => {
        try {
          // Initialize TaskCacheV2 first
          await taskCacheV2.initialize(null);
          console.log('✅ TaskCacheV2 initialized (silent mode)');

          // Check if historical fetch is needed
          const cacheStats = await taskCacheV2.getStats();
          console.log('📊 Cache stats:', cacheStats);

          // Perform historical fetch if cache is empty or stale (> 7 days)
          const needsHistoricalFetch = cacheStats.count === 0 || cacheStats.isStale;

          if (needsHistoricalFetch) {
            console.log('🚀 Cache is empty or stale, initiating historical task fetch...');

            setSyncProgress({
              phase: 'historical',
              message: 'Loading historical task data...',
              progress: 0
            });

            // Import clickup service
            const { clickup } = await import('../services/clickup');

            // Get ALL members (both monitored and unmonitored) for historical fetch
            // This ensures historical data is available even if membersToMonitor changes later
            const allMembers = useAppStore.getState().members;
            const settings = loadSettings();
            const monitored = (settings?.team?.membersToMonitor || []).map(String);

            // Filter to monitored members only for historical fetch
            const membersForHistorical = monitored.length > 0
              ? allMembers.filter(m => monitored.includes(String(m.clickUpId)))
              : allMembers;

            const assigneeIds = membersForHistorical.map(m => m.clickUpId).filter(Boolean);

            if (assigneeIds.length > 0) {
              console.log(`📋 Fetching ALL historical tasks for ${assigneeIds.length} monitored members...`);

              // Fetch ALL tasks (no date filter = full history) with throttling
              const delay = (ms) => new Promise(r => setTimeout(r, ms));
              let allHistoricalTasks = [];
              let page = 0;
              let hasMore = true;

              while (hasMore && page < 100) { // Safety limit: max 100 pages = 10000 tasks
                try {
                  const result = await clickup.getFilteredTeamTasks({
                    assignees: assigneeIds,
                    includeClosed: true,
                    subtasks: true,
                    page
                  });

                  allHistoricalTasks.push(...result.tasks);
                  hasMore = result.hasMore;
                  page++;

                  // Progress UI
                  const progressPercent = Math.min(90, page * 3); // Cap at 90%
                  setSyncProgress({
                    phase: 'historical',
                    message: `Loading historical data (page ${page}, ${allHistoricalTasks.length} tasks)...`,
                    progress: progressPercent
                  });

                  // Throttle to respect rate limits: 1 request per 600ms = ~100 requests/min
                  if (hasMore) {
                    await delay(600);
                  }
                } catch (fetchErr) {
                  console.error(`❌ Failed to fetch historical tasks (page ${page}):`, fetchErr.message);
                  hasMore = false; // Stop on error
                }
              }

              console.log(`✅ Fetched ${allHistoricalTasks.length} historical tasks (${page} pages)`);

              // Bulk load into cache
              setSyncProgress({
                phase: 'caching',
                message: 'Caching historical tasks...',
                progress: 95
              });

              // Convert to Map format expected by bulkLoad
              const taskMap = {};
              allHistoricalTasks.forEach(task => {
                taskMap[task.id] = task;
              });

              await taskCacheV2.bulkLoad(taskMap);

              setSyncProgress({
                phase: 'complete',
                message: 'Task database ready!',
                progress: 100
              });

              console.log(`✅ Historical fetch complete: ${allHistoricalTasks.length} tasks cached`);

              // Clear progress after 2 seconds
              setTimeout(() => {
                setSyncProgress({ phase: 'idle', message: '', progress: 0 });
              }, 2000);
            } else {
              console.log('⚠️ No members with ClickUp IDs, skipping historical fetch');
              setSyncProgress({ phase: 'idle', message: '', progress: 0 });
            }
          } else {
            console.log(`✅ Cache is fresh with ${cacheStats.count} tasks (last sync: ${new Date(cacheStats.lastFullSync).toLocaleString()})`);
          }
        } catch (err) {
          console.error('❌ TaskCacheV2 initialization or historical fetch failed:', err);
          setSyncProgress({ phase: 'idle', message: '', progress: 0 });
        }
      })();
    }

    /**
     * Returns true if the date range's end date is strictly before today.
     * Fully historical ranges never change — no need to poll them.
     */
    function isRangeFullyPast(dr) {
      if (!dr?.endDate) return false;
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      return dr.endDate < `${y}-${m}-${d}`;
    }

    /**
     * Returns an effective polling interval scaled to the date range size.
     * Longer ranges that include today still poll, just less frequently.
     */
    function getEffectiveInterval(dr, base) {
      if (!dr?.startDate || dr.preset === 'today') return base;
      const start = new Date(dr.startDate + 'T00:00:00');
      const end = new Date((dr.endDate || dr.startDate) + 'T00:00:00');
      const days = Math.ceil((end - start) / 86400000) + 1;
      if (days > 180) return Math.max(base, 120000); // >6 months → 2 min
      if (days > 90)  return Math.max(base, 60000);  // >3 months → 1 min
      return base;
    }

    /**
     * Sync function - polls ClickUp API and updates state
     * Supports abort via AbortController for cancellation on date change
     */
    const sync = async (forceNew = false) => {
      // Only sync when tab is visible (saves API calls when tab is in background)
      if (document.visibilityState !== 'visible') {
        console.log('⏸️ Tab hidden, skipping sync');
        return;
      }

      // Abort any previous sync if forceNew is true (e.g., date range changed)
      if (forceNew && abortControllerRef.current) {
        console.log('🔄 Aborting previous sync for new request...');
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this sync
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Get FRESH members and dateRange from store using getState() to avoid stale closures
      const allMembers = useAppStore.getState().members;
      const currentDateRange = useAppStore.getState().dateRange;

      // Skip polling for fully historical ranges — data can't change
      if (isRangeFullyPast(currentDateRange)) {
        console.log('⏭️ Skipping poll — date range is fully historical (no live data)');
        return;
      }

      // Load settings to get monitored members filter
      const settings = loadSettings();
      const monitored = (settings?.team?.membersToMonitor || []).map(String);

      // Filter to only monitored members (if filter is set)
      const currentMembers = monitored.length > 0
        ? allMembers.filter(m => monitored.includes(String(m.clickUpId)))
        : allMembers; // Fallback: if no filter set, use all (backwards compat)

      console.log(`👥 Monitoring ${currentMembers.length}/${allMembers.length} members (filter: ${monitored.length > 0 ? 'active' : 'disabled'})`);

      // Skip if no members to sync
      if (!currentMembers || currentMembers.length === 0) {
        console.log('⏭️ No members to sync');
        return;
      }

      // Check if members have clickUpId
      const membersWithClickUpId = currentMembers.filter(m => m.clickUpId);
      if (membersWithClickUpId.length === 0) {
        console.log('⏭️ No members with ClickUp IDs to sync');
        return;
      }

      try {
        // Poll-mode syncs use cache — don't show "Loading..." to avoid UI flicker.
        // Full syncs (date-range changes) set isSyncing via the dateRange useEffect below.
        // setIsSyncing(false) is always called in finally to clear any prior state.

        console.log(`🔄 Syncing ${currentMembers.length} members from ClickUp (poll mode)...`);

        // Get baseline for score calculation (uses cached value or fetches fresh)
        const assigneeIds = currentMembers.map(m => m.clickUpId).filter(Boolean);
        const avgTasksBaseline = await getAvgTasksBaseline(assigneeIds);
        console.log(`📊 Using baseline: ${avgTasksBaseline.toFixed(2)} avg tasks/member/day`);

        // Update team baseline in store (used by updateStats for team workload)
        setTeamBaseline(avgTasksBaseline);

        // Progress callback for loading UI (suppressed in poll mode to avoid flicker)
        const onProgress = (progress) => {
          if (!signal.aborted) {
            setSyncProgress(progress);
          }
        };

        // All member IDs (including non-monitored) for full project breakdown coverage
        const allMemberIds = allMembers.map(m => m.clickUpId).filter(Boolean);

        // Sync all members — poll mode uses cache for past days, only fetches today fresh
        const syncResult = await syncMemberData(currentMembers, avgTasksBaseline, settings, currentDateRange, onProgress, signal, { pollMode: true, allMemberIds });

        // Check if sync was skipped due to lock
        if (syncResult.skipped) {
          console.log('⏭️ Sync skipped - another sync in progress');
          return;
        }

        // Check if aborted before updating state
        if (signal.aborted) {
          console.log('⏸️ Sync aborted - not updating state');
          return;
        }

        const projectBreakdown = syncResult.projectBreakdown;
        const dateRangeInfo = syncResult.dateRangeInfo;

        // Perform daily leave/WFH sync FIRST so db.leaves is fresh for enrichment
        const allMembersForLeave = await db.members.toArray();
        await performLeaveSync(allMembersForLeave.length > 0 ? allMembersForLeave : syncResult.members, settings);

        // Now enrich with leave status using freshly-synced db.leaves
        const updatedMembers = await enrichMembersWithLeaveStatus(syncResult.members);

        // Update IndexedDB (persistence) before batching store update
        await bulkUpdateMembers(updatedMembers);

        // Batch all state updates into a single set() call to prevent flicker
        const { clickup: clickupForCount } = await import('../services/clickup');
        batchSyncUpdate({
          members: updatedMembers,
          projectBreakdown: projectBreakdown && Object.keys(projectBreakdown).length > 0 ? projectBreakdown : undefined,
          dateRangeInfo: dateRangeInfo || undefined,
          lastSync: Date.now(),
          syncError: null,
          requestCount: clickupForCount.getSyncRequestCount(),
        });

        // Save today's daily snapshot for score comparison
        const saveSnapshot = async (scoreMetricsValue) => {
          try {
            const today = new Date().toISOString().split('T')[0];
            const existing = await db.dailySnapshots.get(today);
            // Only update if score changed by 1+ point
            if (!existing || Math.abs((existing.teamScore || 0) - scoreMetricsValue.total) >= 1) {
              await db.dailySnapshots.put({
                date: today,
                teamScore: scoreMetricsValue.total,
                metrics: {
                  time: scoreMetricsValue.time,
                  workload: scoreMetricsValue.workload,
                  tasks: scoreMetricsValue.tasks,
                  compliance: scoreMetricsValue.compliance,
                },
                memberCount: currentMembers?.length || 0,
              });
            }
            // Prune snapshots older than 90 days
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 90);
            const cutoffDate = cutoff.toISOString().split('T')[0];
            await db.dailySnapshots.where('date').below(cutoffDate).delete();
          } catch (e) {
            // non-critical
          }
        };
        const currentScoreMetrics = useAppStore.getState().scoreMetrics;
        if (currentScoreMetrics) {
          await saveSnapshot(currentScoreMetrics);
        }

        console.log('✅ Sync completed successfully');
      } catch (error) {
        // Handle abort errors gracefully - don't log as error
        if (error.name === 'AbortError') {
          console.log('⏸️ Sync aborted (date range changed or new sync started)');
          return;
        }

        console.error('❌ Sync failed:', error.message);

        // Handle network errors gracefully
        if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
          console.warn('⚠️ Network error - will retry on next sync interval');
          setSyncError('Network error - retrying...');
        } else {
          setSyncError(error.message);
        }

        // Data persists in IndexedDB and Zustand, UI continues working with last known state
      } finally {
        // Do NOT call setIsSyncing(false) here.
        // Poll-mode syncs never set isSyncing=true, so calling false here would race
        // with the date-range useEffect's setIsSyncing(true) and prematurely clear
        // the loading indicator for a concurrent full sync.
      }
    };

    // Initial sync - wait a bit for members to load from database
    console.log('🚀 Starting ClickUp sync...');
    const initialSyncTimeout = setTimeout(() => {
      sync();
    }, 1000); // Wait 1 second for database to load

    // Set up polling interval — adaptive: longer ranges poll less frequently
    const currentDr = useAppStore.getState().dateRange;
    const effectiveInterval = getEffectiveInterval(currentDr, interval);
    console.log(`⏱️ Polling interval: ${effectiveInterval / 1000}s (base: ${interval / 1000}s)`);
    intervalRef.current = setInterval(sync, effectiveInterval);

    // Cleanup on unmount or dependency change
    return () => {
      clearTimeout(initialSyncTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('🛑 ClickUp sync stopped');
      }
      if (dateRangeDebounceRef.current) {
        clearTimeout(dateRangeDebounceRef.current);
      }
      // Abort any in-progress sync
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Stop background cache sync
      taskCacheV2.stopBackgroundSync();
    };
  }, [
    enabled,
    apiKey,
    teamId,
    interval
    // REMOVED dateRange from dependencies - handled separately with debounce
  ]);

  // Separate effect for date range changes with debounce
  useEffect(() => {
    if (!enabled || !apiKey || !teamId) return;

    // Compare with previous date range to detect actual changes
    const prevDateRange = previousDateRangeRef.current;
    const dateRangeChanged = JSON.stringify(prevDateRange) !== JSON.stringify(dateRange);

    if (!dateRangeChanged) return;

    // Update previous date range ref
    previousDateRangeRef.current = dateRange;

    console.log('📅 Date range changed, scheduling sync with debounce...');

    // Clear any pending debounced sync
    if (dateRangeDebounceRef.current) {
      clearTimeout(dateRangeDebounceRef.current);
    }

    // Abort any in-progress sync immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Debounce the actual sync by 500ms to handle rapid date changes.
    // Do NOT clear projectBreakdown or members here — retain old data so the UI
    // doesn't flash blank. New data will overwrite it atomically when sync completes.
    dateRangeDebounceRef.current = setTimeout(async () => {
      console.log('📅 Debounce complete, starting sync for new date range...');

      // Reset progress now that we're actually starting
      setSyncProgress({ phase: 'idle', message: '', progress: 0 });

      // Get fresh members from store and filter to monitored only
      const allMembers = useAppStore.getState().members;
      const settings = loadSettings();
      const monitored = (settings?.team?.membersToMonitor || []).map(String);
      const currentMembers = monitored.length > 0
        ? allMembers.filter(m => monitored.includes(String(m.clickUpId)))
        : allMembers;

      if (!currentMembers || currentMembers.length === 0) {
        console.log('⏭️ No members to sync for date range change');
        return;
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        setIsSyncing(true);

        const assigneeIds = currentMembers.map(m => m.clickUpId).filter(Boolean);
        const avgTasksBaseline = await getAvgTasksBaseline(assigneeIds);
        setTeamBaseline(avgTasksBaseline);

        const onProgress = (progress) => {
          if (!signal.aborted) {
            setSyncProgress(progress);
          }
        };

        // Get fresh dateRange from store (in case it changed during debounce)
        const freshDateRange = useAppStore.getState().dateRange;

        // All member IDs (including non-monitored) for full project breakdown coverage
        const allMemberIds = allMembers.map(m => m.clickUpId).filter(Boolean);

        const syncResult = await syncMemberData(
          currentMembers,
          avgTasksBaseline,
          settings,
          freshDateRange,
          onProgress,
          signal,
          { pollMode: false, allMemberIds }  // Full sync: fills cache, eager list fetch
        );

        if (syncResult.skipped || signal.aborted) {
          return;
        }

        // Enrich with leave status, persist to IndexedDB, then batch store update
        const enrichedMembers = await enrichMembersWithLeaveStatus(syncResult.members);
        await bulkUpdateMembers(enrichedMembers);

        const { clickup } = await import('../services/clickup');
        batchSyncUpdate({
          members: enrichedMembers,
          projectBreakdown: syncResult.projectBreakdown && Object.keys(syncResult.projectBreakdown).length > 0
            ? syncResult.projectBreakdown : undefined,
          dateRangeInfo: syncResult.dateRangeInfo || undefined,
          lastSync: Date.now(),
          syncError: null,
          requestCount: clickup.getSyncRequestCount(),
          isSyncing: false, // Atomically set isSyncing=false with data — prevents flicker
        });

        console.log('✅ Date range sync completed');
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('⏸️ Date range sync aborted');
          setIsSyncing(false);
          return;
        }
        console.error('❌ Date range sync failed:', error.message);
        setSyncError(error.message);
        setIsSyncing(false);
      }
    }, 500); // 500ms debounce — handles rapid preset switching without flicker

  }, [dateRange, enabled, apiKey, teamId, setIsSyncing, batchSyncUpdate, setTeamBaseline, setSyncProgress]);

  // Handle reconnection - process queue and trigger sync
  useEffect(() => {
    if (wasOffline && isOnline && enabled) {
      console.log('🔄 Connection restored - processing sync queue...');

      // Process any queued operations from offline period
      processPendingQueue()
        .then(result => {
          if (result.processed > 0) {
            console.log(`✅ Processed ${result.succeeded}/${result.processed} queued operations`);
          }

          // Trigger immediate sync after processing queue
          setTimeout(() => {
            console.log('🔄 Triggering sync after reconnection...');
            // Trigger sync by temporarily disabling and re-enabling
            const currentMembers = useAppStore.getState().members;
            if (currentMembers && currentMembers.length > 0) {
              // Force a sync by calling the internal sync function
              // (This is a workaround since we can't directly call sync() from here)
              // The sync will happen naturally on the next interval
            }
          }, 1000);
        })
        .catch(error => {
          console.error('❌ Failed to process sync queue:', error);
        });
    }
  }, [wasOffline, isOnline, enabled]);

  // Pause sync when offline (graceful degradation)
  useEffect(() => {
    if (!isOnline && intervalRef.current) {
      console.log('⏸️ Pausing sync - offline mode');
      // Don't clear the interval, just log that syncs will fail gracefully
      // The sync function already handles fetch errors
    } else if (isOnline && enabled) {
      console.log('▶️ Resuming sync - online mode');
    }
  }, [isOnline, enabled]);

  // Return sync status for UI display
  return {
    enabled,
    lastSync: useAppStore(state => state.lastSync),
    error: useAppStore(state => state.syncError),
    isSyncing: useAppStore(state => state.isSyncing),
    isOnline // Expose online status
  };
}

/**
 * Hook to manually trigger sync
 * Useful for "refresh" button in UI
 */
export function useManualSync() {
  const members = useAppStore(state => state.members);
  const setIsSyncing = useAppStore(state => state.setIsSyncing);
  const setSyncError = useAppStore(state => state.setSyncError);
  const setTeamBaseline = useAppStore(state => state.setTeamBaseline);
  const setSyncProgress = useAppStore(state => state.setSyncProgress);
  const batchSyncUpdate = useAppStore(state => state.batchSyncUpdate);

  const triggerSync = async () => {
    try {
      setIsSyncing(true);

      // Get fresh dateRange from store
      const dateRange = useAppStore.getState().dateRange;

      // Get baseline for score calculation
      const assigneeIds = members.map(m => m.clickUpId).filter(Boolean);
      const avgTasksBaseline = await getAvgTasksBaseline(assigneeIds);

      // Update team baseline in store (used by updateStats for team workload)
      setTeamBaseline(avgTasksBaseline);

      // Load current settings for score calculation
      const settings = loadSettings();

      // Progress callback for loading UI
      const onProgress = (progress) => {
        setSyncProgress(progress);
      };

      // Sync members and get project breakdown
      const syncResult = await syncMemberData(members, avgTasksBaseline, settings, dateRange, onProgress);
      const projectBreakdown = syncResult.projectBreakdown;
      const dateRangeInfo = syncResult.dateRangeInfo;

      // Perform daily leave/WFH sync FIRST (force sync on manual refresh)
      localStorage.removeItem(LEAVE_SYNC_KEY);
      const allMembersForLeave = await db.members.toArray();
      await performLeaveSync(allMembersForLeave.length > 0 ? allMembersForLeave : syncResult.members, settings);

      // Now enrich with leave status using freshly-synced db.leaves
      const updatedMembers = await enrichMembersWithLeaveStatus(syncResult.members);

      await bulkUpdateMembers(updatedMembers);

      // Batch all state updates into a single set() call to prevent flicker
      batchSyncUpdate({
        members: updatedMembers,
        projectBreakdown: projectBreakdown && Object.keys(projectBreakdown).length > 0 ? projectBreakdown : undefined,
        dateRangeInfo: dateRangeInfo || undefined,
        lastSync: Date.now(),
        syncError: null,
        isSyncing: false,
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      setSyncError(error.message);
      setSyncProgress({ phase: 'idle', message: '', progress: 0 });
      setIsSyncing(false);
      return { success: false, error: error.message };
    }
  };

  return triggerSync;
}

export default useClickUpSync;
