/**
 * TaskCacheV2 - IndexedDB-backed task cache with background sync
 *
 * Architecture:
 * - Initial load: Fetch all team tasks (paginated) and store in IndexedDB
 * - Background sync (30s interval): Fetch only updated tasks using date_updated_gt
 * - Read operations: Synchronous reads from in-memory cache (fast!)
 * - Write operations: Update both memory and IndexedDB (persistent)
 *
 * Benefits:
 * - Eliminates 600+ individual task API calls
 * - Tasks always fresh via background incremental sync
 * - Instant reads from memory cache
 * - Persistent across page reloads
 */

import { db } from '../db/index.js';
import { clickup } from './clickup.js';

// Cache TTL for full sync (30 days in milliseconds)
const CACHE_HISTORY_DAYS = 30;
const CACHE_TTL = CACHE_HISTORY_DAYS * 24 * 60 * 60 * 1000;

// Background sync interval (30 seconds)
const BACKGROUND_SYNC_INTERVAL = 30000;

class TaskCacheV2 {
  constructor() {
    this.cache = new Map(); // In-memory cache for fast reads
    this.isInitialized = false;
    this.isSyncing = false;
    this.syncInterval = null;
    this.lastFullSync = null;
    this.lastIncrementalSync = null;
    this.onProgressCallback = null;
    this.cachedAssigneeIds = []; // Store assignee IDs for incremental sync

    this.stats = {
      hits: 0,
      misses: 0,
      cacheSize: 0,
      lastSyncDuration: 0
    };
  }

  /**
   * Initialize cache from IndexedDB
   * Loads tasks into memory and starts background sync
   * @param {Function} onProgress - Optional progress callback
   */
  async initialize(onProgress = null) {
    if (this.isInitialized) {
      console.log('✅ TaskCacheV2 already initialized');
      return;
    }

    this.onProgressCallback = onProgress;
    console.log('🔄 Initializing TaskCacheV2...');

    try {
      // Load sync metadata
      await this.loadSyncMeta();

      // Load tasks from IndexedDB into memory
      const tasks = await db.clickUpTasks.toArray();
      tasks.forEach(task => {
        this.cache.set(task.id, task);
      });

      console.log(`✅ Loaded ${tasks.length} tasks from IndexedDB`);
      this.stats.cacheSize = tasks.length;

      // Check if we need a full sync
      const needsFullSync = this.shouldPerformFullSync();

      if (needsFullSync) {
        console.log('🔄 Cache empty or stale, will perform full sync when assignee IDs available...');
        // Full sync will be triggered by startBackgroundSync() with assignee IDs
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ TaskCacheV2 initialization failed:', error);
      this.isInitialized = true; // Continue anyway, fallback to old method
    }
  }

  /**
   * Load sync metadata from IndexedDB
   */
  async loadSyncMeta() {
    try {
      const lastFullSyncMeta = await db.taskSyncMeta.get('lastFullSync');
      const lastIncrementalSyncMeta = await db.taskSyncMeta.get('lastIncrementalSync');

      this.lastFullSync = lastFullSyncMeta?.value || null;
      this.lastIncrementalSync = lastIncrementalSyncMeta?.value || null;

      console.log('📊 Sync metadata:', {
        lastFullSync: this.lastFullSync ? new Date(this.lastFullSync).toLocaleString() : 'Never',
        lastIncrementalSync: this.lastIncrementalSync ? new Date(this.lastIncrementalSync).toLocaleString() : 'Never'
      });
    } catch (error) {
      console.error('❌ Failed to load sync metadata:', error);
    }
  }

  /**
   * Check if we should perform a full sync
   * @returns {boolean} True if cache is empty or older than 7 days (weekly refresh)
   */
  shouldPerformFullSync() {
    if (this.cache.size === 0) return true;
    if (!this.lastFullSync) return true;

    // Weekly refresh: 7 days = 604800000ms
    const WEEKLY_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
    const age = Date.now() - this.lastFullSync;

    if (age > WEEKLY_REFRESH_MS) {
      console.log(`📅 Cache is ${Math.floor(age / (24 * 60 * 60 * 1000))} days old (weekly refresh needed)`);
      return true;
    }

    return false;
  }

  /**
   * Perform full sync - fetch all team tasks (paginated)
   * @param {Array<string>} assigneeIds - Team member ClickUp IDs
   */
  async fullSync(assigneeIds = []) {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Starting full task sync...');
      let allTasks = [];
      let page = 0;
      let hasMore = true;
      let totalFetched = 0;

      while (hasMore) {
        this.emitProgress({
          phase: 'full-sync',
          message: `Fetching tasks page ${page + 1}...`,
          progress: Math.min(90, (page * 100) / 10) // Cap at 90% until done
        });

        const { tasks, hasMore: more } = await clickup.getFilteredTeamTasks({
          assignees: assigneeIds,
          includeClosed: true,
          subtasks: true,
          page
        });

        allTasks = allTasks.concat(tasks);
        totalFetched += tasks.length;
        hasMore = more;
        page++;

        console.log(`📥 Fetched page ${page}: ${tasks.length} tasks (total: ${totalFetched})`);

        // Safety limit: max 10 pages (1000 tasks)
        if (page >= 10) {
          if (import.meta.env.DEV) console.debug('[Lighthouse] Reached page limit (10 pages), stopping full sync');
          break;
        }
      }

      // Store tasks in IndexedDB and memory
      await this.storeTasks(allTasks);

      // Update lastFullSync timestamp
      this.lastFullSync = Date.now();
      await db.taskSyncMeta.put({ key: 'lastFullSync', value: this.lastFullSync });

      const duration = Date.now() - startTime;
      this.stats.lastSyncDuration = duration;

      console.log(`✅ Full sync complete: ${allTasks.length} tasks in ${duration}ms`);
      this.emitProgress({ phase: 'idle', message: '', progress: 100 });
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      this.emitProgress({ phase: 'error', message: 'Sync failed', progress: 0 });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Perform incremental sync - fetch only updated tasks since last sync
   * @param {Array<string>} assigneeIds - Team member ClickUp IDs (optional, uses cached IDs if not provided)
   */
  async incrementalSync(assigneeIds = null) {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping incremental sync...');
      return;
    }

    // Use lastIncrementalSync or lastFullSync as the baseline
    const sinceTimestamp = this.lastIncrementalSync || this.lastFullSync;

    if (!sinceTimestamp) {
      console.log('⚠️ No baseline timestamp, performing full sync instead');
      return;
    }

    // Use cached assignee IDs if not provided
    const idsToUse = assigneeIds || this.cachedAssigneeIds || [];

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      console.log(`🔄 Starting incremental sync (since ${new Date(sinceTimestamp).toLocaleString()}) for ${idsToUse.length} assignees...`);

      const { tasks } = await clickup.getFilteredTeamTasks({
        assignees: idsToUse, // CRITICAL FIX: Include assignee filter
        dateUpdatedGt: sinceTimestamp,
        includeClosed: true,
        subtasks: true,
        page: 0 // Only fetch first page for incremental
      });

      if (tasks.length > 0) {
        console.log(`📥 Incremental sync: ${tasks.length} updated tasks`);
        await this.storeTasks(tasks);
      } else {
        console.log('✅ Incremental sync: No updates');
      }

      // Update lastIncrementalSync timestamp
      this.lastIncrementalSync = Date.now();
      await db.taskSyncMeta.put({ key: 'lastIncrementalSync', value: this.lastIncrementalSync });

      const duration = Date.now() - startTime;
      console.log(`✅ Incremental sync complete in ${duration}ms`);
    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Store tasks in both IndexedDB and memory cache
   * @param {Array} tasks - Array of task objects from ClickUp API
   */
  async storeTasks(tasks) {
    if (!tasks || tasks.length === 0) return;

    try {
      // Transform tasks for storage
      const tasksToStore = tasks.map(task => ({
        id: task.id,
        data: task, // Store full task data
        dateUpdated: task.date_updated ? parseInt(task.date_updated) : Date.now(),
        assigneeIds: task.assignees ? task.assignees.map(a => a.id.toString()) : []
      }));

      // Bulk update IndexedDB
      await db.clickUpTasks.bulkPut(tasksToStore);

      // Update memory cache
      tasksToStore.forEach(task => {
        this.cache.set(task.id, task);
      });

      this.stats.cacheSize = this.cache.size;
      console.log(`💾 Stored ${tasks.length} tasks (cache size: ${this.cache.size})`);
    } catch (error) {
      console.error('❌ Failed to store tasks:', error);
    }
  }

  /**
   * Bulk load all tasks into IndexedDB (for startup bulk fetch)
   * More efficient than storeTasks for large batches
   * @param {Object} taskMap - Map of taskId -> task data
   * @returns {Promise<void>}
   */
  async bulkLoad(taskMap) {
    const tasks = Object.values(taskMap);

    if (tasks.length === 0) {
      console.log('⚠️ No tasks to bulk load');
      return;
    }

    console.log(`🚀 Bulk loading ${tasks.length} tasks into cache...`);
    const startTime = Date.now();

    try {
      // Transform tasks for storage
      const tasksToStore = tasks.map(task => ({
        id: task.id,
        data: task,
        dateUpdated: task.date_updated ? parseInt(task.date_updated) : Date.now(),
        assigneeIds: task.assignees ? task.assignees.map(a => a.id.toString()) : []
      }));

      // Bulk insert into IndexedDB (efficient!)
      await db.clickUpTasks.bulkPut(tasksToStore);

      // Update memory cache
      tasksToStore.forEach(task => {
        this.cache.set(task.id, task);
      });

      this.stats.cacheSize = this.cache.size;

      // Update sync metadata
      this.lastFullSync = Date.now();
      await db.taskSyncMeta.put({ key: 'lastFullSync', value: this.lastFullSync });

      const duration = Date.now() - startTime;
      console.log(`✅ Bulk loaded ${tasks.length} tasks in ${duration}ms (cache size: ${this.cache.size})`);
    } catch (error) {
      console.error('❌ Bulk load failed:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getStats() {
    const count = await db.clickUpTasks.count();
    const isStale = this.shouldPerformFullSync();

    return {
      count,
      isStale,
      lastFullSync: this.lastFullSync,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
        : 0
    };
  }

  /**
   * Get task from cache (synchronous)
   * @param {string} taskId - ClickUp task ID
   * @returns {Object|null} Task data or null if not found
   */
  get(taskId) {
    const cached = this.cache.get(taskId);

    if (cached) {
      this.stats.hits++;
      return cached.data; // Return full task data
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Check if task exists in cache
   * @param {string} taskId - ClickUp task ID
   * @returns {boolean} True if task is cached
   */
  has(taskId) {
    return this.cache.has(taskId);
  }

  /**
   * Start background sync (30s interval)
   * @param {Array<string>} assigneeIds - Team member ClickUp IDs
   */
  startBackgroundSync(assigneeIds = []) {
    if (this.syncInterval) {
      console.log('✅ Background sync already running');
      return;
    }

    // Cache assignee IDs for incremental sync
    this.cachedAssigneeIds = assigneeIds;
    console.log(`🔄 Starting background sync (every ${BACKGROUND_SYNC_INTERVAL / 1000}s) for ${assigneeIds.length} assignees...`);

    // ALWAYS perform full sync on startup to ensure cache is fresh
    if (assigneeIds.length > 0) {
      const needsFullSync = this.shouldPerformFullSync();
      console.log(`🔍 Cache status: size=${this.cache.size}, needsFullSync=${needsFullSync}`);

      if (needsFullSync) {
        console.log('🔄 Performing initial full sync with assignee IDs...');
      } else {
        console.log('🔄 Cache exists, performing full sync to update with latest tasks...');
      }

      // Always do full sync on startup
      this.fullSync(assigneeIds).then(() => {
        console.log('✅ Startup full sync completed');
      }).catch(err => {
        console.error('❌ Startup full sync failed:', err);
      });
    } else {
      console.warn('⚠️ No assignee IDs provided, skipping full sync');
    }

    // Start incremental sync interval (pass assignee IDs)
    this.syncInterval = setInterval(async () => {
      try {
        await this.incrementalSync(this.cachedAssigneeIds);
      } catch (error) {
        console.error('❌ Background sync error:', error);
      }
    }, BACKGROUND_SYNC_INTERVAL);
  }

  /**
   * Stop background sync
   */
  stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Background sync stopped');
    }
  }

  /**
   * Cleanup old tasks (older than CACHE_TTL)
   */
  async cleanup() {
    try {
      const cutoffTime = Date.now() - CACHE_TTL;
      let removedCount = 0;

      // Remove from memory cache
      for (const [taskId, task] of this.cache.entries()) {
        if (task.dateUpdated < cutoffTime) {
          this.cache.delete(taskId);
          removedCount++;
        }
      }

      // Remove from IndexedDB
      await db.clickUpTasks.where('dateUpdated').below(cutoffTime).delete();

      this.stats.cacheSize = this.cache.size;

      if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} old tasks (older than ${CACHE_HISTORY_DAYS} days)`);
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clear() {
    this.cache.clear();
    await db.clickUpTasks.clear();
    await db.taskSyncMeta.clear();
    this.lastFullSync = null;
    this.lastIncrementalSync = null;
    this.stats = { hits: 0, misses: 0, cacheSize: 0, lastSyncDuration: 0 };
    console.log('🗑️ TaskCacheV2 cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate),
      lastFullSync: this.lastFullSync ? new Date(this.lastFullSync).toLocaleString() : 'Never',
      lastIncrementalSync: this.lastIncrementalSync ? new Date(this.lastIncrementalSync).toLocaleString() : 'Never'
    };
  }

  /**
   * Log cache statistics
   */
  logStats() {
    const stats = this.getStats();
    console.log('📊 TaskCacheV2 Stats:', {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${stats.hitRate}%`,
      cacheSize: stats.cacheSize,
      lastFullSync: stats.lastFullSync,
      lastIncrementalSync: stats.lastIncrementalSync,
      lastSyncDuration: `${stats.lastSyncDuration}ms`
    });
  }

  /**
   * Emit progress event to callback
   * @param {Object} progress - Progress object { phase, message, progress }
   */
  emitProgress(progress) {
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
  }
}

// Export singleton instance
export const taskCacheV2 = new TaskCacheV2();

// Start cleanup interval (every 2 hours)
setInterval(() => {
  taskCacheV2.cleanup();
}, 2 * 60 * 60 * 1000);

// Log stats every 5 minutes in dev mode
if (import.meta.env.DEV) {
  setInterval(() => {
    taskCacheV2.logStats();
  }, 300000);
}

export default TaskCacheV2;
