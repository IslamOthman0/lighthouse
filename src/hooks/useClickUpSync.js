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
import { getAvgTasksBaseline } from '../services/baselineService';
import { SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from '../constants/defaults';
import { sanitizeSettings } from '../utils/settingsValidation';
import { useOnlineStatus } from './useOnlineStatus';
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
    console.log('📅 Checking if leave/WFH sync is needed...');

    if (!shouldSyncLeaves()) {
      console.log('⏭️ Leave/WFH sync already done today, skipping');
      return;
    }

    console.log('📅 Performing daily leave/WFH sync...');
    const leaves = await syncLeaveAndWfh(settings, members);

    if (leaves.length > 0) {
      // Clear existing leaves and add new ones
      await db.leaves.clear();
      await db.leaves.bulkPut(leaves);
      console.log(`✅ Stored ${leaves.length} leave/WFH records in database`);
    }

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
            profilePicture: user.profilePicture || existing.profilePicture || null,
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
          profilePicture: user.profilePicture || null,
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
  const dateRange = useAppStore(state => state.dateRange);

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
        setIsSyncing(true);

        console.log(`🔄 Syncing ${currentMembers.length} members from ClickUp...`);

        // Get baseline for score calculation (uses cached value or fetches fresh)
        const assigneeIds = currentMembers.map(m => m.clickUpId).filter(Boolean);
        const avgTasksBaseline = await getAvgTasksBaseline(assigneeIds);
        console.log(`📊 Using baseline: ${avgTasksBaseline.toFixed(2)} avg tasks/member/day`);

        // Update team baseline in store (used by updateStats for team workload)
        setTeamBaseline(avgTasksBaseline);

        // Progress callback for loading UI
        const onProgress = (progress) => {
          // Only update progress if not aborted
          if (!signal.aborted) {
            setSyncProgress(progress);
          }
        };

        // Sync all members (two-level polling) - now returns { members, projectBreakdown, dateRangeInfo }
        // Pass dateRange (null = today, object with startDate/endDate = date range) and abort signal
        const syncResult = await syncMemberData(currentMembers, avgTasksBaseline, settings, currentDateRange, onProgress, signal);

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

        const updatedMembers = await enrichMembersWithLeaveStatus(syncResult.members);
        const projectBreakdown = syncResult.projectBreakdown;
        const dateRangeInfo = syncResult.dateRangeInfo;

        // Update date range info for dynamic target calculation
        if (dateRangeInfo) {
          setDateRangeInfo(dateRangeInfo);
        }

        // Update Zustand store
        setMembers(updatedMembers);

        // Update project breakdown with real ClickUp data
        if (projectBreakdown && Object.keys(projectBreakdown).length > 0) {
          setProjectBreakdown(projectBreakdown);
        }

        // Update IndexedDB (persistence)
        await bulkUpdateMembers(updatedMembers);

        // Update computed stats (will use dateRangeInfo for dynamic target)
        updateStats();

        // Reset sync progress
        setSyncProgress({ phase: 'idle', message: '', progress: 0 });

        // Update sync status
        setLastSync(Date.now());
        setSyncError(null);

        // Update request count from ClickUp service (per-sync count, not rolling window)
        const { clickup } = await import('../services/clickup');
        setRequestCount(clickup.getSyncRequestCount());

        // NOTE: TaskCacheV2 background sync removed - tasks now fetched fresh each sync via filtered endpoint

        // Perform daily leave/WFH sync (once per day)
        await performLeaveSync(updatedMembers, settings);

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
        setIsSyncing(false);
      }
    };

    // Initial sync - wait a bit for members to load from database
    console.log('🚀 Starting ClickUp sync...');
    const initialSyncTimeout = setTimeout(() => {
      sync();
    }, 1000); // Wait 1 second for database to load

    // Set up polling interval
    intervalRef.current = setInterval(sync, interval);

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

    // Clear progress immediately to show we're preparing new sync
    setSyncProgress({ phase: 'idle', message: '', progress: 0 });

    // Debounce the actual sync by 300ms to handle rapid date changes
    dateRangeDebounceRef.current = setTimeout(async () => {
      console.log('📅 Debounce complete, starting sync for new date range...');

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

        const syncResult = await syncMemberData(
          currentMembers,
          avgTasksBaseline,
          settings,
          freshDateRange,
          onProgress,
          signal
        );

        if (syncResult.skipped || signal.aborted) {
          return;
        }

        // Enrich with leave status and update state
        const enrichedMembers = await enrichMembersWithLeaveStatus(syncResult.members);
        if (syncResult.dateRangeInfo) {
          setDateRangeInfo(syncResult.dateRangeInfo);
        }
        setMembers(enrichedMembers);
        if (syncResult.projectBreakdown && Object.keys(syncResult.projectBreakdown).length > 0) {
          setProjectBreakdown(syncResult.projectBreakdown);
        }
        await bulkUpdateMembers(enrichedMembers);
        updateStats();
        setSyncProgress({ phase: 'idle', message: '', progress: 0 });
        setLastSync(Date.now());
        setSyncError(null);

        const { clickup } = await import('../services/clickup');
        setRequestCount(clickup.getSyncRequestCount());

        console.log('✅ Date range sync completed');
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('⏸️ Date range sync aborted');
          return;
        }
        console.error('❌ Date range sync failed:', error.message);
        setSyncError(error.message);
      } finally {
        setIsSyncing(false);
      }
    }, 300); // 300ms debounce

  }, [dateRange, enabled, apiKey, teamId, setMembers, setLastSync, setSyncError, setIsSyncing, setRequestCount, updateStats, setProjectBreakdown, setTeamBaseline, setDateRangeInfo, setSyncProgress]);

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
  const setMembers = useAppStore(state => state.setMembers);
  const setLastSync = useAppStore(state => state.setLastSync);
  const setSyncError = useAppStore(state => state.setSyncError);
  const setIsSyncing = useAppStore(state => state.setIsSyncing);
  const updateStats = useAppStore(state => state.updateStats);
  const setProjectBreakdown = useAppStore(state => state.setProjectBreakdown);
  const setTeamBaseline = useAppStore(state => state.setTeamBaseline);
  const setDateRangeInfo = useAppStore(state => state.setDateRangeInfo);
  const setSyncProgress = useAppStore(state => state.setSyncProgress);

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
      const updatedMembers = await enrichMembersWithLeaveStatus(syncResult.members);
      const projectBreakdown = syncResult.projectBreakdown;
      const dateRangeInfo = syncResult.dateRangeInfo;

      // Update date range info for dynamic target calculation
      if (dateRangeInfo) {
        setDateRangeInfo(dateRangeInfo);
      }

      setMembers(updatedMembers);

      // Update project breakdown with real ClickUp data
      if (projectBreakdown && Object.keys(projectBreakdown).length > 0) {
        setProjectBreakdown(projectBreakdown);
      }

      await bulkUpdateMembers(updatedMembers);

      updateStats();

      // Reset sync progress
      setSyncProgress({ phase: 'idle', message: '', progress: 0 });

      // Perform daily leave/WFH sync (force sync on manual refresh)
      localStorage.removeItem(LEAVE_SYNC_KEY); // Force sync on manual refresh
      await performLeaveSync(updatedMembers, settings);

      setLastSync(Date.now());
      setSyncError(null);

      return { success: true };
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      setSyncError(error.message);
      setSyncProgress({ phase: 'idle', message: '', progress: 0 });
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  };

  return triggerSync;
}

export default useClickUpSync;
