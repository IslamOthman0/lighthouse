/**
 * ClickUp Sync - Calculation Functions
 * Pure calculation helper functions for deriving member metrics and states
 */

import { clickup } from '../clickup';
import { extractCustomFields, extractPriority, extractStatus, extractStatusColor } from '../taskCache';

/**
 * Derive member status from running timer and time entries
 * @param {Object|null} runningEntry - Running timer data
 * @param {Array} timeEntries - Today's time entries for this member
 * @param {Object} settings - Settings object with thresholds
 * @returns {string} Status: 'working', 'break', 'offline', 'noActivity', or 'leave'
 *
 * Status definitions:
 * - working: Currently has an active timer running
 * - break: No active timer but had activity within breakThreshold minutes
 * - offline: Had time entries today but inactive for offlineThreshold+ minutes
 * - noActivity: No time entries at all today (never started working)
 * - leave: On approved leave (handled elsewhere, not in this function)
 */
export function deriveStatus(runningEntry, timeEntries, settings = null) {
  // Get thresholds from settings or use defaults
  const breakThreshold = settings?.thresholds?.breakMinutes || 15;
  const offlineThreshold = settings?.thresholds?.offlineMinutes || 60;

  // Working: Has active timer (negative duration means running)
  if (runningEntry && runningEntry.duration < 0) {
    return 'working';
  }

  // No Activity: No time entries at all today (never started working)
  if (!timeEntries || timeEntries.length === 0) {
    return 'noActivity';
  }

  // Find the most recent completed time entry
  const completedEntries = timeEntries.filter(e => e.duration > 0 && e.end);
  if (completedEntries.length === 0) {
    // Has time entries but none are completed (edge case)
    return 'noActivity';
  }

  // Sort by end time descending to get most recent
  completedEntries.sort((a, b) => parseInt(b.end) - parseInt(a.end));
  const lastEntry = completedEntries[0];
  const lastEndTime = parseInt(lastEntry.end);

  // Calculate minutes since last activity
  const minutesSinceActivity = (Date.now() - lastEndTime) / 60000;

  // Break: No timer but had activity within break threshold
  if (minutesSinceActivity < breakThreshold) {
    return 'break';
  }

  // Offline: Had activity today but inactive for offline threshold+ minutes
  return 'offline';
}

/**
 * Calculate timer value for LiveTimer component
 * @param {Object|null} runningEntry - Running timer data
 * @returns {number|null} Elapsed seconds or null
 */
export function calculateTimer(runningEntry) {
  return clickup.calculateElapsedSeconds(runningEntry);
}

/**
 * Calculate tracked hours from time entries
 * @param {Array} timeEntries - Array of time entry objects
 * @returns {number} Total tracked hours (decimal)
 */
export function calculateTrackedHours(timeEntries, runningEntry = null) {
  let totalMs = 0;

  // Add completed time entries
  if (timeEntries && timeEntries.length > 0) {
    totalMs = timeEntries.reduce((sum, entry) => {
      // ClickUp duration is in milliseconds (but comes as STRING from API)
      // Parse as integer to avoid string concatenation
      const duration = parseInt(entry.duration, 10);

      // Skip running timers (negative duration) and invalid values
      if (duration > 0) {
        return sum + duration;
      }
      return sum;
    }, 0);
  }

  // Add running timer's elapsed time
  if (runningEntry && runningEntry.start) {
    const startMs = parseInt(runningEntry.start);
    const now = Date.now();
    const elapsedMs = now - startMs;

    if (elapsedMs > 0) {
      totalMs += elapsedMs;
    }
  }

  // Convert ms to hours
  return totalMs / (1000 * 60 * 60);
}

/**
 * Calculate break information from time entries
 * Breaks are gaps > 5 minutes between consecutive completed time entries
 * @param {Array} timeEntries - Array of time entry objects
 * @param {Object} [settings] - User settings (for breakGapMinutes)
 * @returns {Object} Break stats {total: minutes, count: number}
 */
export function calculateBreaks(timeEntries, settings = null) {
  if (!timeEntries || timeEntries.length < 2) {
    return {
      total: 0,
      count: 0
    };
  }

  // Get completed entries only and sort by start time
  const completedEntries = timeEntries
    .filter(e => {
      const duration = parseInt(e.duration, 10);
      return duration > 0 && e.start && e.end;
    })
    .sort((a, b) => parseInt(a.start) - parseInt(b.start));

  if (completedEntries.length < 2) {
    return {
      total: 0,
      count: 0
    };
  }

  let totalBreakMinutes = 0;
  let breakCount = 0;
  const breakGapMin = settings?.thresholds?.breakGapMinutes ?? 5;
  const maxBreakMin = 180; // Hardcoded: gaps > 3h are not breaks (overnight/multi-day)
  const BREAK_THRESHOLD_MS = breakGapMin * 60 * 1000;
  const MAX_BREAK_MS = maxBreakMin * 60 * 1000;

  // Calculate gaps between consecutive entries
  for (let i = 0; i < completedEntries.length - 1; i++) {
    const currentEntry = completedEntries[i];
    const nextEntry = completedEntries[i + 1];

    const currentEnd = parseInt(currentEntry.end);
    const nextStart = parseInt(nextEntry.start);

    // Calculate gap between end of current entry and start of next
    const gapMs = nextStart - currentEnd;

    // If gap is > 5 minutes AND < 3 hours, count it as a break
    // Gaps longer than 3 hours are likely overnight/multi-day gaps, not breaks
    if (gapMs > BREAK_THRESHOLD_MS && gapMs < MAX_BREAK_MS) {
      const gapMinutes = Math.floor(gapMs / (1000 * 60));
      totalBreakMinutes += gapMinutes;
      breakCount++;
      // Optional debug logging (disabled in production)
      // if (gapMinutes > 60) {
      //   console.log(`⚠️  Long break detected: ${gapMinutes}m (${Math.floor(gapMinutes/60)}h ${gapMinutes%60}m) between ${new Date(currentEnd).toLocaleTimeString()} and ${new Date(nextStart).toLocaleTimeString()}`);
      // }
    } else if (gapMs >= MAX_BREAK_MS) {
      // Skip overnight/multi-day gaps silently
      // console.log(`🚫 Skipping ${Math.floor(gapMs / (1000 * 60 * 60))}h gap (overnight/multi-day)`);
    }
  }

  return {
    total: totalBreakMinutes,
    count: breakCount
  };
}

/**
 * Calculate tasks and done counts from time entries
 * NEW FORMULA: completion = ready / (ready + inProgress)
 * Excludes stopped/hold/help/blocked tasks (outside member's control)
 *
 * @param {Array} timeEntries - Time entries for the date range (today by default)
 * @returns {Object} { tasks: number, done: number }
 */
export function calculateTasksAndDone(timeEntries) {
  if (!timeEntries || timeEntries.length === 0) {
    return { tasks: 0, done: 0, completionDenominator: 0 };
  }

  // Track unique tasks categorized by status
  const taskStatusMap = new Map(); // taskId -> { isReady, isExcluded }

  timeEntries.forEach(entry => {
    if (entry.task?.id) {
      const taskId = entry.task.id;

      // Only process each task once
      if (!taskStatusMap.has(taskId)) {
        const statusType = entry.task?.status?.type || '';
        const statusName = (entry.task?.status?.status || '').toLowerCase();

        // Excluded from completion ratio: stopped, hold, help, blocked (outside member's control)
        const isExcluded = statusName.includes('stop') ||
                           statusName.includes('hold') ||
                           statusName.includes('help') ||
                           statusName.includes('block');

        // Ready: completed/done tasks
        const isReady = statusType === 'closed' ||
                        statusName.includes('complete') ||
                        statusName.includes('done') ||
                        statusName.includes('ready');

        taskStatusMap.set(taskId, { isReady, isExcluded });
      }
    }
  });

  // Count tasks by category
  let ready = 0;
  let inProgress = 0;
  let excluded = 0;

  taskStatusMap.forEach(({ isReady, isExcluded }) => {
    if (isExcluded) { excluded++; return; }
    if (isReady) ready++;
    else inProgress++;
  });

  return {
    // Display: total = ALL unique tasks worked on (including excluded)
    tasks: ready + inProgress + excluded,
    // Display: done = completed/ready tasks only
    done: ready,
    // Score: completion ratio excludes stopped/hold/help from denominator
    // completion = ready / (ready + inProgress), ignoring excluded
    completionDenominator: ready + inProgress,
  };
}

/**
 * Calculate lastSeen (minutes since last activity)
 * @param {Array} timeEntries - Today's time entries
 * @returns {number} Minutes since last activity, or 0 if no entries
 */
export function calculateLastSeen(timeEntries) {
  if (!timeEntries || timeEntries.length === 0) {
    return 0;
  }

  // Find the most recent completed time entry
  const completedEntries = timeEntries.filter(e => e.duration > 0 && e.end);
  if (completedEntries.length === 0) {
    return 0;
  }

  // Sort by end time descending to get most recent
  completedEntries.sort((a, b) => parseInt(b.end) - parseInt(a.end));
  const lastEndTime = parseInt(completedEntries[0].end);

  return Math.floor((Date.now() - lastEndTime) / 60000);
}

/**
 * Calculate start time from first time entry of the day or running timer
 * @param {Array} timeEntries - Today's time entries
 * @param {Object|null} runningEntry - Running timer entry
 * @returns {string} Formatted start time (e.g., "8:30 AM")
 */
export function calculateStartTime(timeEntries, runningEntry) {
  // Collect all entries including running timer
  const allStarts = [];

  // Add completed entries
  if (timeEntries && timeEntries.length > 0) {
    timeEntries.forEach(e => {
      if (e.start) allStarts.push(parseInt(e.start));
    });
  }

  // Add running timer start
  if (runningEntry?.start) {
    allStarts.push(parseInt(runningEntry.start));
  }

  if (allStarts.length === 0) {
    return '—';
  }

  // Get the earliest start time
  const firstStart = Math.min(...allStarts);
  const startDate = new Date(firstStart);

  return startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Calculate end time - shows most recent activity time
 * @param {Array} timeEntries - Today's time entries
 * @param {Object|null} runningEntry - Running timer data (if working)
 * @returns {string} Formatted end time (e.g., "5:45 PM") or "Now" if currently working
 */
export function calculateEndTime(timeEntries, runningEntry = null) {
  // If currently working, show "Now" to indicate ongoing activity
  if (runningEntry && runningEntry.duration < 0) {
    return 'Now';
  }

  if (!timeEntries || timeEntries.length === 0) {
    return '—';
  }

  // Find the most recent completed time entry
  const completedEntries = timeEntries.filter(e => parseInt(e.duration, 10) > 0 && e.end);
  if (completedEntries.length === 0) {
    return '—';
  }

  // Sort by end time descending to get most recent
  completedEntries.sort((a, b) => parseInt(b.end) - parseInt(a.end));
  const lastEntry = completedEntries[0];

  if (!lastEntry?.end) {
    return '—';
  }

  const endDate = new Date(parseInt(lastEntry.end));
  return endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Calculate total historical tracked time for current task
 * @param {Object} taskDetails - Task details object from ClickUp
 * @returns {string} Formatted total tracked time for task (e.g., "4h 8m")
 */
export function calculatePreviousTimer(taskDetails) {
  // Use task's total time_spent from ClickUp (includes all historical time)
  if (!taskDetails || !taskDetails.time_spent) {
    return '—';
  }

  const timeSpentMs = parseInt(taskDetails.time_spent, 10);

  if (!timeSpentMs || timeSpentMs <= 0) {
    return '—';
  }

  // Convert total ms to hours and minutes
  const totalMinutes = Math.floor(timeSpentMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Calculate the number of working days in a date range
 * (Excludes weekends - Friday/Saturday for Egypt work week)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of working days
 */
export function calculateWorkingDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Sunday = 0, Friday = 5, Saturday = 6
    // Egypt work week: Sunday-Thursday (skip Friday & Saturday)
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return Math.max(count, 1); // At least 1 day
}

// Re-export task cache extractors for convenience
export { extractCustomFields, extractPriority, extractStatus, extractStatusColor };
