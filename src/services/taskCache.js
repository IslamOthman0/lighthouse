/**
 * Task Cache Service
 * Caches task details to avoid redundant API calls
 *
 * Strategy:
 * - Cache TTL: 60 seconds
 * - Cache task details when fetched from running timer
 * - Return cached data if fresh (< 60s old)
 * - Automatically refetch after TTL expires
 */

const CACHE_TTL = 60000; // 60 seconds

class TaskCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      fetches: 0
    };
  }

  /**
   * Get task from cache or fetch if not cached/expired
   * @param {string} taskId - ClickUp task ID
   * @param {Function} fetchFn - Function to fetch task (clickup.getTaskDetails)
   * @returns {Promise<Object|null>} Task details
   */
  async get(taskId, fetchFn) {
    const cached = this.cache.get(taskId);
    const now = Date.now();

    // Return cached if fresh
    if (cached && (now - cached.fetchedAt) < CACHE_TTL) {
      this.stats.hits++;
      return cached.data;
    }

    // Cache miss or expired - fetch fresh data
    this.stats.misses++;
    this.stats.fetches++;

    try {
      const data = await fetchFn(taskId);

      if (data) {
        this.cache.set(taskId, {
          data,
          fetchedAt: now
        });
      }

      return data;
    } catch (error) {
      console.error(`❌ Task cache fetch failed for ${taskId}:`, error);

      // Return stale cache if available (better than nothing)
      if (cached) {
        console.warn(`⚠️ Using stale cache for task ${taskId}`);
        return cached.data;
      }

      return null;
    }
  }

  /**
   * Manually set a task in cache
   * @param {string} taskId - ClickUp task ID
   * @param {Object} data - Task data
   */
  set(taskId, data) {
    this.cache.set(taskId, {
      data,
      fetchedAt: Date.now()
    });
  }

  /**
   * Check if task is cached and fresh
   * @param {string} taskId - ClickUp task ID
   * @returns {boolean} True if cached and fresh
   */
  has(taskId) {
    const cached = this.cache.get(taskId);
    if (!cached) return false;

    const age = Date.now() - cached.fetchedAt;
    return age < CACHE_TTL;
  }

  /**
   * Clear expired entries from cache
   * Called periodically to free memory
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [taskId, entry] of this.cache.entries()) {
      const age = now - entry.fetchedAt;
      if (age >= CACHE_TTL) {
        this.cache.delete(taskId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Task cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear();
    console.log('🗑️ Task cache cleared');
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
      size: this.cache.size
    };
  }

  /**
   * Log cache statistics
   */
  logStats() {
    const stats = this.getStats();
    console.log('📊 Task Cache Stats:', {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${stats.hitRate}%`,
      size: stats.size,
      fetches: stats.fetches
    });
  }
}

/**
 * Extract custom fields from ClickUp task response
 * @param {Object} task - Task data from ClickUp API
 * @returns {Object} Extracted custom fields
 */
export function extractCustomFields(task) {
  if (!task) {
    return {
      publisher: null,
      genre: null,
      project: null,
      tags: []
    };
  }

  const fields = {
    publisher: null,
    genre: null,
    project: null,
    tags: []
  };

  // Extract custom fields
  if (task.custom_fields) {
    task.custom_fields.forEach(field => {
      const name = field.name?.toLowerCase();

      if (name === 'publisher') {
        fields.publisher = field.value || null;
      } else if (name === 'genre') {
        fields.genre = field.value || null;
      } else if (name === 'project') {
        fields.project = field.value || null;
      }
    });
  }

  // Extract tags
  if (task.tags && Array.isArray(task.tags)) {
    fields.tags = task.tags.map(tag => tag.name).filter(Boolean);
  }

  // Extract project from list if not in custom fields
  if (!fields.project && task.list?.name) {
    fields.project = task.list.name;
  }

  return fields;
}

/**
 * Extract priority from ClickUp task
 * @param {Object} task - Task data from ClickUp API
 * @returns {string} Priority level
 */
export function extractPriority(task) {
  if (!task || !task.priority) {
    return 'Normal';
  }

  const priorityMap = {
    1: 'Urgent',
    2: 'High',
    3: 'Normal',
    4: 'Low'
  };

  return priorityMap[task.priority.id] || 'Normal';
}

/**
 * Extract task status
 * @param {Object} task - Task data from ClickUp API
 * @returns {string} Task status (returns actual ClickUp status, capitalized)
 */
export function extractStatus(task) {
  if (!task || !task.status) {
    return 'Paused';
  }

  // Return the actual ClickUp status with proper capitalization
  const status = task.status.status || 'Active';

  // Capitalize first letter of each word
  return status
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extract task status color from ClickUp
 * @param {Object} task - Task data from ClickUp API
 * @returns {string|null} Status color (hex code like #6f42c1) or null
 */
export function extractStatusColor(task) {
  if (!task || !task.status || !task.status.color) {
    return null;
  }

  return task.status.color;
}

// Export singleton instance
export const taskCache = new TaskCache();

// Start cleanup interval (every 2 minutes)
setInterval(() => {
  taskCache.cleanup();
}, 120000);

// Log stats every 5 minutes (optional, for debugging)
if (import.meta.env.DEV) {
  setInterval(() => {
    taskCache.logStats();
  }, 300000);
}

export default TaskCache;
