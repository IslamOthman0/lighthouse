/**
 * ClickUp API Service
 * Handles all API requests to ClickUp with rate limiting and error handling
 *
 * Rate Limit: 100 requests/minute
 * Architecture: Two-level polling system
 *   - Level 1: Running timers (15s interval, per-user)
 *   - Level 2: Task details (on-demand + 60s cache)
 */

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

// List IDs for bulk fetching (all workspace lists)
// These will be populated dynamically from time entries or can be configured manually
const LIST_IDS = {
  // Main work lists
  digitizationQueue: '901205218510',
  // HR lists will be added dynamically from time entries
};

class ClickUpService {
  constructor() {
    this.apiKey = null;
    this.teamId = null;
    this.headers = {};
    this.requestCount = 0;        // Requests in current 60-second window
    this.requestWindow = Date.now();
    this.syncRequestCount = 0;    // Requests in current sync cycle (reset per sync)
  }

  /**
   * Initialize the service with API credentials
   * @param {string} apiKey - ClickUp API key
   * @param {string} teamId - ClickUp team ID
   */
  initialize(apiKey, teamId) {
    this.apiKey = apiKey;
    this.teamId = teamId;
    this.headers = {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    };
    console.log('✅ ClickUp service initialized');
  }

  /**
   * Rate limiting check
   * Tracks requests per minute and warns if approaching limit
   * Also tracks per-sync request count
   */
  checkRateLimit() {
    const now = Date.now();
    const elapsed = now - this.requestWindow;

    // Reset counter every minute
    if (elapsed >= 60000) {
      console.log(`📊 Rate limit: ${this.requestCount} requests in last minute`);
      this.requestCount = 0;
      this.requestWindow = now;
    }

    this.requestCount++;
    this.syncRequestCount++; // Track per-sync

    // Warn if approaching limit (80 req/min = 80% of 100)
    if (this.requestCount >= 80) {
      console.warn('⚠️ Approaching rate limit! Current:', this.requestCount, '/100 per minute');
    }
  }

  /**
   * Reset the per-sync request counter
   * Call this at the start of each sync cycle
   */
  resetSyncCounter() {
    this.syncRequestCount = 0;
  }

  /**
   * Get the per-sync request count
   * @returns {number} Number of requests in current sync
   */
  getSyncRequestCount() {
    return this.syncRequestCount;
  }

  /**
   * Generic API request handler with error handling
   * @param {string} endpoint - API endpoint path
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, options = {}) {
    if (!this.apiKey) {
      throw new Error('ClickUp API not initialized. Call initialize() first.');
    }

    this.checkRateLimit();

    const url = `${CLICKUP_API_BASE}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: this.headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `ClickUp API error: ${response.status} - ${errorData.err || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('❌ ClickUp API request failed:', error);
      throw error;
    }
  }

  /**
   * Get running timer for a specific user
   * Endpoint: GET /team/{team_id}/time_entries/current?assignee={user_id}
   *
   * CRITICAL: Returns duration as NEGATIVE number when timer is active
   * Example: duration = -1702900000000 (negative timestamp)
   *
   * @param {string} userId - ClickUp user ID
   * @returns {Promise<Object|null>} Running timer data or null
   */
  async getRunningTimer(userId) {
    try {
      const data = await this.request(
        `/team/${this.teamId}/time_entries/current?assignee=${userId}`
      );

      // ClickUp returns { data: { ... } } or { data: null }
      return data.data || null;
    } catch (error) {
      console.error(`❌ Failed to get running timer for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get running timers for all users (sequential per-user requests)
   * @param {Array<string>} userIds - Array of ClickUp user IDs
   * @returns {Promise<Map>} Map of userId -> timer data
   */
  async getRunningTimers(userIds) {
    const timers = new Map();

    // Sequential requests (can't be batched - API limitation)
    for (const userId of userIds) {
      const timer = await this.getRunningTimer(userId);
      timers.set(userId, timer);

      // Small delay to avoid bursting (optional, helps with rate limits)
      await this.delay(100);
    }

    return timers;
  }

  /**
   * Get detailed task information including custom fields
   * Endpoint: GET /task/{task_id}
   *
   * Returns:
   * - custom_fields: Publisher, Genre, Project
   * - tags: Array of tag objects
   * - priority: Task priority
   * - status: Task status
   * - list: List information (project)
   *
   * @param {string} taskId - ClickUp task ID
   * @returns {Promise<Object>} Task details
   */
  async getTaskDetails(taskId) {
    try {
      const data = await this.request(`/task/${taskId}`);
      return data;
    } catch (error) {
      console.error(`❌ Failed to get task details for ${taskId}:`, error);
      return null;
    }
  }

  /**
   * Get time entries for the team within a date range
   * Endpoint: GET /team/{team_id}/time_entries?start_date={start}&end_date={end}
   *
   * @param {number} startDate - Start timestamp in SECONDS (Unix timestamp)
   * @param {number} endDate - End timestamp in SECONDS (Unix timestamp)
   * @param {Array<number>} assigneeIds - Array of ClickUp user IDs to fetch entries for
   * @returns {Promise<Array>} Array of time entries
   */
  async getTimeEntries(startDate, endDate, assigneeIds = []) {
    // Build assignee parameter (comma-separated IDs)
    const assigneeParam = assigneeIds.length > 0
      ? `&assignee=${assigneeIds.join(',')}`
      : '';

    const endpoint = `/team/${this.teamId}/time_entries?start_date=${startDate}&end_date=${endDate}${assigneeParam}&include_task_tags=true&include_location_names=true`;
    console.log(`📡 Fetching time entries: GET ${endpoint}`);

    try {
      const data = await this.request(endpoint);
      console.log(`📥 Received ${data.data?.length || 0} time entries from ClickUp`);

      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to get time entries:', error);
      return [];
    }
  }

  /**
   * Get team members
   * Endpoint: GET /team/{team_id}
   *
   * @returns {Promise<Array>} Array of team members
   */
  async getTeamMembers() {
    try {
      const data = await this.request(`/team/${this.teamId}`);
      return data.team?.members || [];
    } catch (error) {
      console.error('❌ Failed to get team members:', error);
      return [];
    }
  }

  /**
   * Get tasks from a list
   * Endpoint: GET /list/{list_id}/task
   *
   * @param {string} listId - ClickUp list ID
   * @param {Object} filters - Query filters (assignees, statuses, etc.)
   * @returns {Promise<Array>} Array of tasks
   */
  async getTasks(listId, filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = `/list/${listId}/task${queryParams ? `?${queryParams}` : ''}`;

      const data = await this.request(endpoint);
      return data.tasks || [];
    } catch (error) {
      console.error(`❌ Failed to get tasks for list ${listId}:`, error);
      return [];
    }
  }

  /**
   * Get filtered team tasks (bulk fetch)
   * Endpoint: GET /team/{team_id}/task
   *
   * Supports pagination (100 tasks per page) and filtering by:
   * - assignees[] - Array of user IDs
   * - date_updated_gt - Unix timestamp in milliseconds (tasks updated after this time)
   * - include_closed - Include closed tasks (default: true)
   * - subtasks - Include subtasks (default: true)
   *
   * @param {Object} options - Query options
   * @param {Array<string>} options.assignees - Array of ClickUp user IDs to filter by
   * @param {number} options.dateUpdatedGt - Unix timestamp in milliseconds (filter tasks updated after this)
   * @param {boolean} options.includeClosed - Include closed tasks (default: true)
   * @param {boolean} options.subtasks - Include subtasks (default: true)
   * @param {number} options.page - Page number (starts at 0, default: 0)
   * @returns {Promise<Object>} { tasks: Array, hasMore: boolean }
   */
  async getFilteredTeamTasks(options = {}) {
    try {
      const {
        assignees = [],
        dateUpdatedGt = null,
        includeClosed = true,
        subtasks = true,
        page = 0
      } = options;

      // Build query parameters
      const params = new URLSearchParams();

      // Add assignees (array parameter)
      assignees.forEach(assigneeId => {
        params.append('assignees[]', assigneeId);
      });

      // Add date filter
      if (dateUpdatedGt) {
        params.append('date_updated_gt', dateUpdatedGt);
      }

      // Add flags
      params.append('include_closed', includeClosed);
      params.append('subtasks', subtasks);
      params.append('page', page);

      const endpoint = `/team/${this.teamId}/task?${params.toString()}`;

      const data = await this.request(endpoint);
      const tasks = data.tasks || [];

      // Check if there are more pages (ClickUp returns 100 tasks per page)
      const hasMore = tasks.length === 100;

      return { tasks, hasMore };
    } catch (error) {
      console.error('❌ Failed to get filtered team tasks:', error);
      return { tasks: [], hasMore: false };
    }
  }

  /**
   * Helper: Delay execution for rate limiting
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch all tasks from a single list with pagination
   * @param {string} listId - List ID
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<Array>} All tasks from the list
   */
  async fetchAllListTasks(listId, onProgress = null) {
    const allTasks = [];
    let page = 0;
    let hasMore = true;

    console.log(`📦 Starting bulk fetch for list ${listId}...`);

    while (hasMore) {
      try {
        const response = await this.getTasks(listId, { page });
        allTasks.push(...response.tasks);

        // ClickUp returns 100 tasks per page by default
        hasMore = response.tasks.length === 100;
        page++;

        // Progress logging
        console.log(`📦 List ${listId}: Fetched page ${page}, total ${allTasks.length} tasks`);

        if (onProgress) {
          onProgress({ page, totalFetched: allTasks.length });
        }

        // Small delay between pages to respect rate limits
        if (hasMore) {
          await this.delay(100);
        }
      } catch (error) {
        console.error(`❌ Error fetching page ${page} for list ${listId}:`, error);
        break;
      }
    }

    console.log(`✅ Completed bulk fetch for list ${listId}: ${allTasks.length} tasks`);
    return allTasks;
  }

  /**
   * Bulk fetch all tasks from all configured lists
   * @param {Array<string>} listIds - Array of list IDs to fetch
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Map of taskId -> task
   */
  async bulkFetchAllTasks(listIds, onProgress = null) {
    const taskMap = {};
    let completedLists = 0;
    const totalLists = listIds.length;

    console.log(`🚀 Starting bulk fetch for ${totalLists} lists...`);

    for (const listId of listIds) {
      try {
        const tasks = await this.fetchAllListTasks(listId, (pageProgress) => {
          if (onProgress) {
            onProgress({
              phase: 'bulk-fetch',
              message: `Fetching list ${completedLists + 1}/${totalLists} (page ${pageProgress.page})...`,
              progress: Math.floor((completedLists / totalLists) * 100),
              currentList: completedLists + 1,
              totalLists,
              currentListTasks: pageProgress.totalFetched
            });
          }
        });

        // Add tasks to map
        tasks.forEach(task => {
          taskMap[task.id] = task;
        });

        completedLists++;

        // Update progress after completing a list
        if (onProgress) {
          onProgress({
            phase: 'bulk-fetch',
            message: `Completed ${completedLists}/${totalLists} lists`,
            progress: Math.floor((completedLists / totalLists) * 100),
            currentList: completedLists,
            totalLists
          });
        }

        // Delay between lists to respect rate limits
        if (completedLists < totalLists) {
          await this.delay(500);
        }
      } catch (error) {
        console.error(`❌ Failed to fetch list ${listId}:`, error);
      }
    }

    console.log(`✅ Bulk fetch complete: ${Object.keys(taskMap).length} tasks from ${totalLists} lists`);
    return taskMap;
  }

  /**
   * Discover all unique list IDs from time entries
   * @param {Array} timeEntries - Time entries array
   * @returns {Array<string>} Array of unique list IDs
   */
  discoverListIds(timeEntries) {
    const listIds = new Set();

    timeEntries.forEach(entry => {
      if (entry.task_location?.list_id) {
        listIds.add(entry.task_location.list_id);
      }
    });

    const idsArray = Array.from(listIds);
    console.log(`🔍 Discovered ${idsArray.length} unique lists from time entries`);
    return idsArray;
  }

  /**
   * Calculate elapsed seconds from running timer
   * CRITICAL: ClickUp stores active timers with NEGATIVE duration
   *
   * @param {Object} runningEntry - Running timer data from API
   * @returns {number|null} Elapsed seconds or null if no active timer
   */
  calculateElapsedSeconds(runningEntry) {
    if (!runningEntry || runningEntry.duration >= 0) {
      return null; // No active timer
    }

    // Use 'start' field which contains the correct start timestamp in milliseconds
    // Example: "start": "1766069876386" = timestamp when timer started
    const startTimestamp = parseInt(runningEntry.start);
    const elapsedMs = Date.now() - startTimestamp;

    return Math.floor(elapsedMs / 1000);
  }

  /**
   * Get user initials from name
   * @param {string} name - Full name
   * @returns {string} Initials (2-3 chars)
   */
  getInitials(name) {
    if (!name) return '??';

    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Get current request count for rate limit display
   * @returns {number} Number of requests in current window
   */
  getRequestCount() {
    return this.requestCount;
  }
}

// Export singleton instance
export const clickup = new ClickUpService();

// Export class for testing
export default ClickUpService;
