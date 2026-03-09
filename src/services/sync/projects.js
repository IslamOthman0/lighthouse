/**
 * ClickUp Sync - Project Breakdown Calculations
 * Aggregates task and time data by project (ClickUp list)
 */

import { taskCacheV2 } from '../taskCacheV2';

/**
 * Resolve a ClickUp custom field value to a human-readable string.
 * For dropdown fields the raw value is an orderindex; look it up via type_config.options.
 * @param {Object} f - A single custom_fields entry from a ClickUp task
 * @returns {string|null}
 */
function resolveFieldValue(f) {
  if (f.value == null) return null;
  if (f.type === 'drop_down' && f.type_config?.options?.length > 0) {
    const opt = f.type_config.options.find(
      o => String(o.orderindex) === String(f.value) || o.id === f.value
    );
    return opt?.name || null;
  }
  if (typeof f.value === 'object') return f.value?.name || null;
  const str = String(f.value).trim();
  return str.length > 0 ? str : null;
}

/**
 * Calculate project breakdown from today's time entries
 * Groups tasks by project (list) and status
 *
 * OPTIMIZED: Uses only globalTaskCache - NO fallback API calls
 * Missing task details will be handled by TaskCacheV2 background sync
 *
 * @param {Array} timeEntries - Today's time entries
 * @param {Object} globalTaskCache - Pre-fetched task details cache (avoids duplicate API calls)
 * @returns {Promise<Object>} Project breakdown with statuses
 */
export async function calculateProjectBreakdown(timeEntries, globalTaskCache = {}) {
  const projects = {};
  const projectTimeMap = {}; // Track time per project

  console.log(`📊 Processing ${timeEntries.length} time entries for project breakdown...`);

  // Get unique task IDs
  const uniqueTaskIds = new Set();
  timeEntries.forEach(entry => {
    if (entry.task?.id) {
      uniqueTaskIds.add(entry.task.id);
    }
  });

  const taskIdsArray = Array.from(uniqueTaskIds);

  // NO FALLBACK: Only use tasks that are already in globalTaskCache
  // Missing tasks will be fetched by TaskCacheV2 background sync
  const cachedTaskIds = taskIdsArray.filter(id => globalTaskCache[id]);
  const missingTaskIds = taskIdsArray.filter(id => !globalTaskCache[id]);

  if (missingTaskIds.length > 0) {
    console.log(`ℹ️ Project breakdown: ${missingTaskIds.length} tasks not in cache - using time entry data`);
  }

  // Track processed task IDs to avoid duplicates
  const processedTaskIds = new Set();

  // Calculate tracked time per project using time entry data (works for all tasks)
  timeEntries.forEach(entry => {
    const taskId = entry.task?.id;
    // Use time entry's task_location.list_name directly (more reliable than cache lookup)
    const projectName = entry.task_location?.list_name || 'Unknown';
    const duration = parseInt(entry.duration, 10);

    if (duration > 0) {
      if (!projectTimeMap[projectName]) {
        projectTimeMap[projectName] = 0;
      }
      // Convert milliseconds to hours (decimal)
      const hours = duration / (1000 * 60 * 60);
      projectTimeMap[projectName] += hours;
    }
  });
  console.log(`📈 Project time map:`, projectTimeMap);

  // Process tasks from cache first (has full details)
  for (const taskId of uniqueTaskIds) {
    const taskDetails = globalTaskCache[taskId];

    if (taskDetails) {
      processedTaskIds.add(taskId);

      // Get project name from list
      const projectName = taskDetails.list?.name || 'Unknown';
      // Get status name and color (dynamic from ClickUp)
      const statusName = taskDetails.status?.status || 'unknown';
      const statusColor = taskDetails.status?.color || '#6b7280';

      // Initialize project if not exists
      if (!projects[projectName]) {
        projects[projectName] = {
          name: projectName,
          color: taskDetails.list?.status?.color || '#3b82f6', // List color or default blue
          statuses: {},
          totalTasks: 0,
          completedTasks: 0,
          trackedToday: projectTimeMap[projectName] || 0,
          assignees: [] // Will be populated below
        };
      }

      // Initialize status if not exists
      if (!projects[projectName].statuses[statusName]) {
        projects[projectName].statuses[statusName] = {
          name: statusName,
          color: statusColor, // Dynamic color from ClickUp
          count: 0,
          tasks: []
        };
      }

      // Add task to status
      projects[projectName].statuses[statusName].count++;
      projects[projectName].statuses[statusName].tasks.push({
        id: taskDetails.id,
        name: taskDetails.name,
        status: statusName,
        statusColor: statusColor,
        project: projectName,
        assignee: taskDetails.assignees?.[0] || null,
        dueDate: taskDetails.due_date,
        dateClosed: taskDetails.date_closed
      });

      // Count total tasks
      projects[projectName].totalTasks++;

      // Count completed tasks (check if status indicates completion)
      const isCompleted = statusName.toLowerCase().includes('complete') ||
                         statusName.toLowerCase().includes('closed') ||
                         taskDetails.date_closed;
      if (isCompleted) {
        projects[projectName].completedTasks++;
      }

      // Collect unique assignees
      if (taskDetails.assignees && taskDetails.assignees.length > 0) {
        taskDetails.assignees.forEach(assignee => {
          const assigneeExists = projects[projectName].assignees.some(a => a.id === assignee.id);
          if (!assigneeExists) {
            projects[projectName].assignees.push({
              id: assignee.id,
              name: assignee.username,
              profilePicture: assignee.profilePicture || null,
              initials: assignee.initials || assignee.username?.substring(0, 2).toUpperCase() || '?'
            });
          }
        });
      }
    }
  }

  // Process uncached tasks using time entry data (fallback - less detailed)
  // This ensures all tasks are counted even when cache misses occur
  timeEntries.forEach(entry => {
    const taskId = entry.task?.id;
    if (!taskId || processedTaskIds.has(taskId)) return;

    processedTaskIds.add(taskId);

    const projectName = entry.task_location?.list_name || 'Unknown';
    const taskName = entry.task?.name || 'Unknown Task';
    // Get status from time entry (may be available)
    const statusName = entry.task?.status?.status || 'unknown';
    const statusColor = entry.task?.status?.color || '#6b7280';

    // Initialize project if not exists
    if (!projects[projectName]) {
      projects[projectName] = {
        name: projectName,
        color: '#3b82f6',
        statuses: {},
        totalTasks: 0,
        completedTasks: 0,
        trackedToday: projectTimeMap[projectName] || 0,
        assignees: []
      };
    }

    // Initialize status if not exists
    if (!projects[projectName].statuses[statusName]) {
      projects[projectName].statuses[statusName] = {
        name: statusName,
        color: statusColor,
        count: 0,
        tasks: []
      };
    }

    // Add task to status
    projects[projectName].statuses[statusName].count++;
    projects[projectName].statuses[statusName].tasks.push({
      id: taskId,
      name: taskName,
      status: statusName,
      statusColor: statusColor,
      project: projectName,
      assignee: null
    });

    // Count total tasks
    projects[projectName].totalTasks++;

    // Count completed tasks
    const isCompleted = statusName.toLowerCase().includes('complete') ||
                       statusName.toLowerCase().includes('closed');
    if (isCompleted) {
      projects[projectName].completedTasks++;
    }

    // Add user from time entry as assignee
    if (entry.user) {
      const assigneeExists = projects[projectName].assignees.some(a => a.id === entry.user.id);
      if (!assigneeExists) {
        projects[projectName].assignees.push({
          id: entry.user.id,
          name: entry.user.username || entry.user.email,
          profilePicture: entry.user.profilePicture || null,
          initials: entry.user.initials || (entry.user.username?.substring(0, 2).toUpperCase() || '?')
        });
      }
    }
  });

  console.log(`📊 Project breakdown: ${Object.keys(projects).length} projects, ${processedTaskIds.size} unique tasks`);

  return projects;
}

/**
 * Fast project breakdown calculation from time entries + TaskCacheV2
 * Uses entry.task_location.list_name for project info and enriches tasks from cache.
 * @param {Array} timeEntries - Time entries array
 * @param {Object} globalTaskCache - Pre-fetched task details cache (avoids duplicate API calls)
 * @returns {Object} Project breakdown with status pills
 */
export function calculateFastProjectBreakdown(timeEntries, globalTaskCache = {}, monitoredMemberIds = null) {
  const projects = {};

  // Debug: Log ALL unique list names seen in time entries to diagnose missing projects
  if (timeEntries.length > 0) {
    const debugMap = {};
    timeEntries.forEach(e => {
      const listName = e.task_location?.list_name ?? '⚠️ MISSING';
      const taskId = e.task?.id ?? 'no-task-id';
      const duration = parseInt(e.duration, 10);
      if (!debugMap[listName]) debugMap[listName] = { count: 0, sampleTaskId: taskId, sampleDuration: duration, hasMissingList: !e.task_location?.list_name };
      debugMap[listName].count++;
    });
    console.log('📋 All list_names in time entries:', debugMap);
    console.log('📋 globalTaskCache keys:', Object.keys(globalTaskCache).length, '| taskCacheV2 size:', taskCacheV2.cache?.size ?? 'n/a');
  }

  timeEntries.forEach(entry => {
    const duration = parseInt(entry.duration, 10);
    const taskId = entry.task?.id;
    const taskName = entry.task?.name || 'Unknown Task';

    if (duration <= 0 || !taskId) return;

    // Use time entry directly - has all needed data via task_location and task.status
    // Fall back to cached task's list name if task_location is missing (some ClickUp lists omit it)
    const cachedTaskForProject = globalTaskCache[taskId] || taskCacheV2.get(taskId);
    const projectName = entry.task_location?.list_name
      || cachedTaskForProject?.list?.name
      || 'Unknown';
    const statusName = entry.task?.status?.status || cachedTaskForProject?.status?.status || 'unknown';
    const statusType = entry.task?.status?.type || cachedTaskForProject?.status?.type || '';

    // CRITICAL FIX: Generate consistent color from status name if ClickUp doesn't provide one
    // ClickUp sometimes returns:
    // - empty string or null
    // - CSS variable reference like "var(--cu-status-azure-blue)" which won't work in our app
    // Also fall back to cached task status color when time entry status color is missing
    const rawStatusColor = entry.task?.status?.color || cachedTaskForProject?.status?.color;
    let statusColor;

    // Check if color is valid (not empty, not a CSS variable, is a proper hex color)
    const isValidColor = rawStatusColor &&
                         rawStatusColor.trim() !== '' &&
                         !rawStatusColor.includes('var(') &&
                         !rawStatusColor.startsWith('--') &&
                         (rawStatusColor.startsWith('#') || rawStatusColor.startsWith('rgb'));

    if (isValidColor) {
      statusColor = rawStatusColor;
    } else {
      // Generate consistent color from status name using hash algorithm
      const colors = [
        '#3b82f6', // blue
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#f59e0b', // amber
        '#10b981', // emerald
        '#06b6d4', // cyan
        '#6366f1', // indigo
        '#ef4444', // red
        '#14b8a6', // teal
      ];
      let hash = 0;
      for (let i = 0; i < statusName.length; i++) {
        hash = statusName.charCodeAt(i) + ((hash << 5) - hash);
      }
      statusColor = colors[Math.abs(hash) % colors.length];
      console.log(`🎨 [clickupSync] Generated color for "${statusName}": ${statusColor}`);
    }

    if (duration > 0) {
      if (!projects[projectName]) {
        projects[projectName] = {
          name: projectName,
          color: '#3b82f6',
          trackedToday: 0,
          totalTasks: new Set(),
          completedTasks: 0,
          statuses: {},
          assignees: []
        };
      }

      // Add time (convert ms to hours)
      projects[projectName].trackedToday += duration / (1000 * 60 * 60);

      // Track unique tasks
      if (taskId) {
        // Only add task to status if it's a new unique task
        if (!projects[projectName].totalTasks.has(taskId)) {
          projects[projectName].totalTasks.add(taskId);

          // Initialize status if not exists
          if (!projects[projectName].statuses[statusName]) {
            projects[projectName].statuses[statusName] = {
              name: statusName,
              color: statusColor,
              count: 0,
              tasks: []
            };
          }

          // Use already-resolved cache lookup (cachedTaskForProject from above)
          const cachedTask = cachedTaskForProject;

          // Extract assignee from entry.user (the person who tracked time) or cached task
          // Only use monitored members as the displayed assignee
          let assignee = null;
          const entryUserId = String(entry.user?.id);
          const entryUserIsMonitored = !monitoredMemberIds || monitoredMemberIds.has(entryUserId);
          if (entry.user && entryUserIsMonitored) {
            assignee = {
              id: entry.user.id,
              name: entry.user.username || entry.user.email || 'Unknown',
              avatar: entry.user.profilePicture || null,
              initials: entry.user.initials || (entry.user.username?.substring(0, 2).toUpperCase() || '??')
            };
          } else if (cachedTask?.assignees && cachedTask.assignees.length > 0) {
            // Find first monitored assignee from cached task
            const monitoredAssignee = cachedTask.assignees.find(a =>
              !monitoredMemberIds || monitoredMemberIds.has(String(a.id))
            );
            if (monitoredAssignee) {
              assignee = {
                id: monitoredAssignee.id,
                name: monitoredAssignee.username || monitoredAssignee.email || 'Unknown',
                avatar: monitoredAssignee.profilePicture || null,
                initials: monitoredAssignee.initials || (monitoredAssignee.username?.substring(0, 2).toUpperCase() || '??')
              };
            }
          }

          // Extract priority from cached task
          let priority = null;
          if (cachedTask?.priority) {
            const p = cachedTask.priority.priority;
            if (p === 'urgent' || p === 1) priority = 'Urgent';
            else if (p === 'high' || p === 2) priority = 'High';
            else if (p === 'normal' || p === 3) priority = 'Normal';
            else if (p === 'low' || p === 4) priority = 'Low';
          }

          // Extract custom fields (genre, publisher) from cached task
          let genre = null;
          let publisher = null;
          if (cachedTask?.custom_fields) {
            cachedTask.custom_fields.forEach(field => {
              const fieldName = field.name?.toLowerCase();
              if (fieldName === 'genre' || fieldName === 'النوع') {
                genre = resolveFieldValue(field);
              } else if (fieldName === 'publisher' || fieldName === 'الناشر') {
                publisher = resolveFieldValue(field);
              }
            });
          }

          // Extract dates from cached task
          const dueDate = cachedTask?.due_date || null;
          const dateClosed = cachedTask?.date_closed || null;
          const dateCreated = cachedTask?.date_created || null;
          const dateUpdated = cachedTask?.date_updated || null;

          // Extract tags from cached task
          const tags = cachedTask?.tags?.map(t => t.name) || [];

          // Calculate tracked time for this task (sum all durations for this task)
          const trackedTime = Math.floor(duration / (1000 * 60)); // Convert ms to minutes

          // Add task to status
          projects[projectName].statuses[statusName].count++;
          projects[projectName].statuses[statusName].tasks.push({
            id: taskId,
            name: taskName,
            status: statusName,
            statusColor: statusColor,
            project: projectName,
            assignee: assignee,
            priority: priority,
            dueDate: dueDate,
            dateClosed: dateClosed,
            closedDate: dateClosed, // Alias for compatibility
            date_created: dateCreated,
            date_updated: dateUpdated,
            date_closed: dateClosed,
            trackedTime: trackedTime,
            genre: genre,
            publisher: publisher,
            tags: tags,
            clickUpUrl: cachedTask?.url || `https://app.clickup.com/t/${taskId}`
          });

          // Count completed tasks - use status.type === 'closed' as definitive indicator
          const isCompleted = statusType === 'closed' ||
                              statusName.toLowerCase().includes('complete') ||
                              statusName.toLowerCase().includes('closed');
          if (isCompleted) {
            projects[projectName].completedTasks++;
          }
        }
      }

      // Collect unique assignees from time entry user — only monitored members
      const userId = entry.user?.id;
      const isMonitored = !monitoredMemberIds || monitoredMemberIds.has(String(userId));
      if (entry.user && isMonitored) {
        const assigneeExists = projects[projectName].assignees.some(a => a.id === entry.user.id);
        if (!assigneeExists) {
          projects[projectName].assignees.push({
            id: entry.user.id,
            name: entry.user.username || entry.user.email,
            profilePicture: entry.user.profilePicture || null,
            initials: entry.user.initials || (entry.user.username?.substring(0, 2).toUpperCase() || '?')
          });
        }
      }
    }
  });

  // Convert task Sets to counts
  Object.values(projects).forEach(project => {
    project.totalTasks = project.totalTasks.size;
  });

  return projects;
}
