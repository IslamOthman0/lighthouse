/**
 * ClickUp Sync - Project Breakdown Calculations
 * Aggregates task and time data by project (ClickUp list)
 */

import { taskCacheV2 } from '../taskCacheV2';

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
 * Time entries DON'T include task.list.name, so we MUST use cache for project info
 * @param {Array} timeEntries - Time entries array
 * @returns {Object} Project breakdown with status pills
 */
export function calculateFastProjectBreakdown(timeEntries) {
  const projects = {};

  // Debug: Log first time entry structure
  if (timeEntries.length > 0) {
    console.log('📋 Sample time entry structure:', {
      taskId: timeEntries[0].task?.id,
      taskName: timeEntries[0].task?.name,
      projectName: timeEntries[0].task_location?.list_name,  // CORRECT PATH
      status: timeEntries[0].task?.status?.status,
      statusType: timeEntries[0].task?.status?.type,
      statusColor: timeEntries[0].task?.status?.color
    });
  }

  timeEntries.forEach(entry => {
    const duration = parseInt(entry.duration, 10);
    const taskId = entry.task?.id;
    const taskName = entry.task?.name || 'Unknown Task';

    if (duration <= 0 || !taskId) return;

    // Use time entry directly - has all needed data via task_location and task.status
    const projectName = entry.task_location?.list_name || 'Unknown';
    const statusName = entry.task?.status?.status || 'unknown';
    const statusType = entry.task?.status?.type || '';

    // CRITICAL FIX: Generate consistent color from status name if ClickUp doesn't provide one
    // ClickUp sometimes returns:
    // - empty string or null
    // - CSS variable reference like "var(--cu-status-azure-blue)" which won't work in our app
    const rawStatusColor = entry.task?.status?.color;
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

          // Try to get task details from cache for additional fields
          const cachedTask = taskCacheV2.get(taskId);

          // Extract assignee from entry.user (the person who tracked time) or cached task
          let assignee = null;
          if (entry.user) {
            assignee = {
              id: entry.user.id,
              name: entry.user.username || entry.user.email || 'Unknown',
              avatar: entry.user.profilePicture || null,
              initials: entry.user.initials || (entry.user.username?.substring(0, 2).toUpperCase() || '??')
            };
          } else if (cachedTask?.assignees && cachedTask.assignees.length > 0) {
            const firstAssignee = cachedTask.assignees[0];
            assignee = {
              id: firstAssignee.id,
              name: firstAssignee.username || firstAssignee.email || 'Unknown',
              avatar: firstAssignee.profilePicture || null,
              initials: firstAssignee.initials || (firstAssignee.username?.substring(0, 2).toUpperCase() || '??')
            };
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
                genre = field.value || null;
              } else if (fieldName === 'publisher' || fieldName === 'الناشر') {
                publisher = field.value || null;
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

      // Collect unique assignees from time entry user
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
    }
  });

  // Convert task Sets to counts
  Object.values(projects).forEach(project => {
    project.totalTasks = project.totalTasks.size;
  });

  return projects;
}
