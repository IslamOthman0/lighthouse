/**
 * Score Calculation Utility
 *
 * Global score formula (100 points max):
 * - Tracked Time: 40% (tracked / 6.5h target)
 * - Tasks Worked: 20% (tasks / 3-month average)
 * - Tasks Done: 30% (done / tasks)
 * - Compliance: 10% (time within 8AM-6PM / 6.5h target)
 */

// Work schedule constants
export const WORK_SCHEDULE = {
  TARGET_HOURS: 6.5,
  START_HOUR: 8,   // 8:00 AM
  END_HOUR: 18,    // 6:00 PM
};

// Score weights
export const SCORE_WEIGHTS = {
  TRACKED_TIME: 0.40,    // 40%
  TASKS_WORKED: 0.20,    // 20%
  TASKS_DONE: 0.30,      // 30%
  COMPLIANCE: 0.10,      // 10%
};

/**
 * Calculate individual score components for a member
 *
 * @param {Object} params
 * @param {number} params.tracked - Hours tracked (decimal)
 * @param {number} params.tasks - Number of unique tasks worked on
 * @param {number} params.done - Number of completed tasks
 * @param {number} params.complianceHours - Hours tracked within 8AM-6PM window
 * @param {number} params.avgTasksBaseline - 3-month average tasks per day (team or individual)
 * @param {Object} params.weights - Optional custom score weights (defaults to SCORE_WEIGHTS)
 * @param {number} params.targetHours - Optional target hours (defaults to WORK_SCHEDULE.TARGET_HOURS)
 * @param {number} params.workingDays - Number of working days in the date range (defaults to 1)
 * @returns {Object} Score breakdown with total and individual components
 */
export function calculateMemberScore({
  tracked = 0,
  tasks = 0,
  done = 0,
  completionDenominator,
  complianceHours = 0,
  avgTasksBaseline = 3, // Default fallback if no history
  weights = null, // Optional custom weights from settings
  targetHours = null, // Optional target hours from settings
  workingDays = 1, // Number of working days (for multi-day ranges)
}) {
  const TARGET_HOURS = targetHours || WORK_SCHEDULE.TARGET_HOURS;
  const WEIGHTS = weights || SCORE_WEIGHTS;
  const { trackedTime: TRACKED_TIME, tasksWorked: TASKS_WORKED, tasksDone: TASKS_DONE, compliance: COMPLIANCE } = WEIGHTS;

  // Normalize targets by working days for multi-day ranges
  const effectiveTarget = TARGET_HOURS * workingDays;
  const effectiveTaskBaseline = avgTasksBaseline * workingDays;

  // 1. Tracked Time Score (40%)
  // min(tracked / (6.5 × workingDays), 1) × 40
  const trackedRatio = Math.min(tracked / effectiveTarget, 1);
  const trackedScore = trackedRatio * (TRACKED_TIME * 100);

  // 2. Tasks Worked Score (20%)
  // min(tasks / (avgBaseline × workingDays), 1) × 20  — uses ALL tasks including excluded
  const tasksRatio = effectiveTaskBaseline > 0
    ? Math.min(tasks / effectiveTaskBaseline, 1)
    : 0;
  const tasksWorkedScore = tasksRatio * (TASKS_WORKED * 100);

  // 3. Tasks Done Score (30%)
  // Completion ratio: done / completionDenominator (excludes stopped/hold/help from denominator)
  // Falls back to done / tasks for backward compatibility
  const denominator = completionDenominator ?? tasks;
  const doneRatio = denominator > 0 ? done / denominator : 0;
  const tasksDoneScore = doneRatio * (TASKS_DONE * 100);

  // 4. Compliance Score (10%)
  // min(complianceHours / (6.5 × workingDays), 1) × 10
  const complianceRatio = Math.min(complianceHours / effectiveTarget, 1);
  const complianceScore = complianceRatio * (COMPLIANCE * 100);

  // Total score (max 100)
  const totalScore = trackedScore + tasksWorkedScore + tasksDoneScore + complianceScore;

  return {
    total: Math.round(totalScore * 10) / 10, // Round to 1 decimal
    breakdown: {
      tracked: {
        score: Math.round(trackedScore * 10) / 10,
        ratio: Math.round(trackedRatio * 100),
        weight: TRACKED_TIME * 100,
      },
      tasksWorked: {
        score: Math.round(tasksWorkedScore * 10) / 10,
        ratio: Math.round(tasksRatio * 100),
        weight: TASKS_WORKED * 100,
      },
      tasksDone: {
        score: Math.round(tasksDoneScore * 10) / 10,
        ratio: Math.round(doneRatio * 100),
        weight: TASKS_DONE * 100,
      },
      compliance: {
        score: Math.round(complianceScore * 10) / 10,
        ratio: Math.round(complianceRatio * 100),
        weight: COMPLIANCE * 100,
      },
    },
  };
}

/**
 * Calculate compliance hours from time entries
 * Counts only time tracked within work hours window (default 8:00 AM - 6:00 PM)
 *
 * @param {Array} timeEntries - Array of time entry objects with start/end timestamps
 * @param {Object} workSchedule - Optional work schedule from settings { startTime: "08:00", endTime: "18:00" }
 * @returns {number} Hours tracked within compliance window
 */
export function calculateComplianceHours(timeEntries, workSchedule = null) {
  if (!timeEntries || timeEntries.length === 0) {
    return 0;
  }

  // Parse work hours from settings or use defaults
  let START_HOUR = WORK_SCHEDULE.START_HOUR;
  let END_HOUR = WORK_SCHEDULE.END_HOUR;

  if (workSchedule?.startTime && workSchedule?.endTime) {
    // Parse "HH:MM" format to hour number
    const startParts = workSchedule.startTime.split(':');
    const endParts = workSchedule.endTime.split(':');
    START_HOUR = parseInt(startParts[0], 10);
    END_HOUR = parseInt(endParts[0], 10);
  }

  let totalComplianceMs = 0;

  timeEntries.forEach(entry => {
    const startMs = parseInt(entry.start);
    const endMs = entry.end ? parseInt(entry.end) : Date.now();

    if (isNaN(startMs) || isNaN(endMs)) return;

    const startDate = new Date(startMs);
    const endDate = new Date(endMs);

    // Get work window boundaries for this entry's date
    const workStart = new Date(startDate);
    workStart.setHours(START_HOUR, 0, 0, 0);

    const workEnd = new Date(startDate);
    workEnd.setHours(END_HOUR, 0, 0, 0);

    // Calculate overlap with work window
    const effectiveStart = Math.max(startMs, workStart.getTime());
    const effectiveEnd = Math.min(endMs, workEnd.getTime());

    if (effectiveEnd > effectiveStart) {
      totalComplianceMs += effectiveEnd - effectiveStart;
    }
  });

  // Convert to hours
  return totalComplianceMs / (1000 * 60 * 60);
}

/**
 * Calculate average start/end times from time entries
 *
 * @param {Array} timeEntries - Array of time entry objects
 * @returns {Object} { avgStartTime, avgEndTime, startDelta, endDelta }
 */
export function calculateAverageWorkTimes(timeEntries) {
  if (!timeEntries || timeEntries.length === 0) {
    return {
      avgStartTime: null,
      avgEndTime: null,
      startDelta: 0,
      endDelta: 0,
    };
  }

  const { START_HOUR, END_HOUR } = WORK_SCHEDULE;

  // Group entries by date to find first start and last end per day
  const dayStats = {};

  timeEntries.forEach(entry => {
    const startMs = parseInt(entry.start);
    const endMs = entry.end ? parseInt(entry.end) : Date.now();

    if (isNaN(startMs)) return;

    const startDate = new Date(startMs);
    const dateKey = startDate.toDateString();

    if (!dayStats[dateKey]) {
      dayStats[dateKey] = {
        firstStart: startMs,
        lastEnd: endMs,
      };
    } else {
      if (startMs < dayStats[dateKey].firstStart) {
        dayStats[dateKey].firstStart = startMs;
      }
      if (endMs > dayStats[dateKey].lastEnd) {
        dayStats[dateKey].lastEnd = endMs;
      }
    }
  });

  const days = Object.values(dayStats);
  if (days.length === 0) {
    return {
      avgStartTime: null,
      avgEndTime: null,
      startDelta: 0,
      endDelta: 0,
    };
  }

  // Calculate average start/end times (in minutes from midnight)
  let totalStartMinutes = 0;
  let totalEndMinutes = 0;

  days.forEach(day => {
    const startDate = new Date(day.firstStart);
    const endDate = new Date(day.lastEnd);

    totalStartMinutes += startDate.getHours() * 60 + startDate.getMinutes();
    totalEndMinutes += endDate.getHours() * 60 + endDate.getMinutes();
  });

  const avgStartMinutes = Math.round(totalStartMinutes / days.length);
  const avgEndMinutes = Math.round(totalEndMinutes / days.length);

  // Convert to time strings
  const avgStartHour = Math.floor(avgStartMinutes / 60);
  const avgStartMin = avgStartMinutes % 60;
  const avgEndHour = Math.floor(avgEndMinutes / 60);
  const avgEndMin = avgEndMinutes % 60;

  // Calculate delta from expected (8:00 AM and 6:00 PM)
  const expectedStartMinutes = START_HOUR * 60; // 8:00 = 480 minutes
  const expectedEndMinutes = END_HOUR * 60;     // 18:00 = 1080 minutes

  const startDelta = avgStartMinutes - expectedStartMinutes; // positive = late, negative = early
  const endDelta = avgEndMinutes - expectedEndMinutes;       // positive = late, negative = early

  // Format time strings
  const formatTime = (hours, minutes) => {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return {
    avgStartTime: formatTime(avgStartHour, avgStartMin),
    avgEndTime: formatTime(avgEndHour, avgEndMin),
    startDelta, // in minutes (+ = late, - = early)
    endDelta,   // in minutes (+ = late, - = early)
  };
}

/**
 * Format delta minutes for display
 *
 * @param {number} deltaMinutes - Delta in minutes (positive = late/after, negative = early/before)
 * @returns {string} Formatted delta string (e.g., "-12m", "+22m")
 */
export function formatDeltaMinutes(deltaMinutes) {
  if (deltaMinutes === 0) return '';

  const sign = deltaMinutes > 0 ? '+' : '-';
  const absMinutes = Math.abs(deltaMinutes);

  if (absMinutes >= 60) {
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return mins > 0 ? `${sign}${hours}h ${mins}m` : `${sign}${hours}h`;
  }

  return `${sign}${absMinutes}m`;
}

/**
 * Get score color based on percentage
 *
 * @param {number} percentage - Score percentage (0-100)
 * @param {Object} theme - Theme object with color definitions
 * @returns {string} Color value
 */
export function getScoreColor(percentage, theme) {
  if (percentage >= 80) {
    return theme.success || '#22c55e';
  } else if (percentage >= 50) {
    return theme.warning || '#f59e0b';
  } else {
    return theme.danger || '#ef4444';
  }
}
