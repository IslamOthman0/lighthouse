/**
 * ClickUp Sync - Member Transformation
 * Transforms ClickUp API data into Lighthouse member schema
 */

import { calculateMemberScore, calculateComplianceHours, calculateAverageWorkTimes } from '../../utils/scoreCalculation';
import {
  deriveStatus,
  calculateTimer,
  calculateTrackedHours,
  calculateBreaks,
  calculateTasksAndDone,
  calculateLastSeen,
  calculateStartTime,
  calculateEndTime,
  calculatePreviousTimer,
  extractCustomFields,
  extractStatus,
  extractStatusColor,
  extractPriority
} from './calculations';

/**
 * Transform ClickUp data to Lighthouse member schema
 * @param {Object} member - Current member data from database
 * @param {Object|null} runningEntry - Running timer data
 * @param {Object|null} taskDetails - Task details from cache (current task)
 * @param {Array} timeEntries - Today's time entries
 * @param {Object} taskDetailsCache - Map of taskId to task details for all tasks in time entries
 * @param {number} avgTasksBaseline - 3-month average tasks per day for score calculation
 * @param {Object|null} settings - User settings (for thresholds, weights, etc.)
 * @param {number} workingDays - Number of working days in the date range (defaults to 1)
 * @returns {Object} Transformed member data
 */
export function transformMember(member, runningEntry, taskDetails, timeEntries, taskDetailsCache = {}, avgTasksBaseline = 3, settings = null, workingDays = 1) {
  // Extract custom fields with defaults
  const customFields = taskDetails
    ? extractCustomFields(taskDetails)
    : { publisher: null, genre: null, project: null, tags: [] };

  // Calculate tracked hours from time entries
  const tracked = calculateTrackedHours(timeEntries, runningEntry);

  // Derive status based on running timer and time entries
  const status = deriveStatus(runningEntry, timeEntries, settings);

  // Calculate timer (null if not working)
  const timer = status === 'working' ? calculateTimer(runningEntry) : null;

  // Calculate lastSeen for break/offline members
  const lastSeen = calculateLastSeen(timeEntries);

  // Calculate start time from first entry or running timer
  const startTime = calculateStartTime(timeEntries, runningEntry);

  // Calculate end time (shows "Now" if working, otherwise last completed entry)
  const endTime = calculateEndTime(timeEntries, runningEntry);

  // Calculate previous timer - use taskDetails to get total historical time
  const previousTimer = calculatePreviousTimer(taskDetails);

  // Get task information
  // If working: use running timer task
  // If break/offline: use last task from time entries
  let task = '';
  let project = '';

  if (runningEntry) {
    // Working - use running timer
    task = runningEntry.task?.name || '';
    project = runningEntry.task_location?.list_name || customFields.project || '';
  } else if (timeEntries.length > 0) {
    // Break/Offline - get last task from time entries
    const sortedEntries = [...timeEntries].sort((a, b) => parseInt(b.end || b.start) - parseInt(a.end || a.start));
    const lastEntry = sortedEntries[0];

    task = lastEntry.task?.name || '';
    project = lastEntry.task_location?.list_name || customFields.project || '';
  }

  // Debug logging
  console.log(`👤 ${member.name}: status=${status}, timer=${timer}s, lastSeen=${lastSeen}m, startTime=${startTime}, endTime=${endTime}, previousTimer=${previousTimer}, task=${task ? task.substring(0, 30) + '...' : 'none'}`);

  // Task status: Use actual ClickUp status if available, otherwise show Paused
  const taskStatus = taskDetails ? extractStatus(taskDetails) : (runningEntry ? 'Active' : 'Paused');

  // Task status color: Extract from ClickUp task status
  const taskStatusColor = taskDetails ? extractStatusColor(taskDetails) : null;

  // Safely get tags array from ClickUp
  const tags = (customFields.tags && customFields.tags.length > 0)
    ? customFields.tags
    : [];

  // Extract assignees from task details
  const assignees = taskDetails && taskDetails.assignees && taskDetails.assignees.length > 0
    ? taskDetails.assignees.map(assignee => ({
        name: assignee.username || assignee.email || 'Unknown',
        initials: assignee.initials || (assignee.username ? assignee.username.substring(0, 2).toUpperCase() : '??'),
        color: assignee.color || '#6B7280',
        profilePicture: assignee.profilePicture || null
      }))
    : [];

  // Calculate tasks and done from time entries (no cache needed!)
  const { tasks: totalTasks, done: completedTasks, completionDenominator } = calculateTasksAndDone(timeEntries);

  // Calculate compliance hours (time within work hours window from settings)
  const complianceHours = calculateComplianceHours(timeEntries, settings?.schedule);

  // Calculate average work times for this member
  const workTimes = calculateAverageWorkTimes(timeEntries);

  // Calculate member score using formula with custom weights from settings
  // Score uses completionDenominator (excludes stopped/hold/help) for completion ratio
  const scoreResult = calculateMemberScore({
    tracked,
    tasks: totalTasks,
    done: completedTasks,
    completionDenominator,
    complianceHours,
    avgTasksBaseline,
    weights: settings?.score?.weights,
    targetHours: settings?.schedule?.dailyTargetHours,
    workingDays, // Normalize score by working days for multi-day ranges
  });

  // Detect overwork (tracked exceeds target)
  const target = member.target || settings?.schedule?.dailyTargetHours || 6.5;
  const isOverworking = tracked > target;
  const overtimeMinutes = isOverworking ? Math.round((tracked - target) * 60) : 0;

  return {
    // Preserve only essential member identity fields
    id: member.id,
    name: member.name,
    initials: member.initials,
    clickUpId: member.clickUpId,
    profilePicture: member.profilePicture || null,
    clickUpColor: member.clickUpColor || null,
    target: member.target || 6.5,
    // Reset all synced fields to prevent stale data
    status,
    timer,
    tracked: parseFloat(tracked.toFixed(2)),
    task,
    taskStatus,
    taskStatusColor,
    project,
    startTime,
    endTime,
    lastSeen,
    previousTimer,
    publisher: customFields.publisher || '',
    genre: customFields.genre || '',
    tags,
    assignees,
    priority: taskDetails ? extractPriority(taskDetails) : 'Normal',
    breaks: calculateBreaks(timeEntries, settings),
    // Tasks count from ClickUp
    tasks: totalTasks,
    done: completedTasks,
    // Score metrics (new global score system)
    score: scoreResult.total,
    scoreBreakdown: scoreResult.breakdown,
    complianceHours: parseFloat(complianceHours.toFixed(2)),
    // Overwork detection
    isOverworking,
    overtimeMinutes,
    // Last active date — computed from actual time entry timestamps
    // For noActivity: preserve from previous sync (backfill populates it on first sync)
    // For active members: use latest time entry end (or start if still running)
    lastActiveDate: (() => {
      if (status === 'noActivity') {
        return member.lastActiveDate || null;
      }
      // Use any time entry — prefer end timestamp, fall back to start (for running timers)
      if (timeEntries.length > 0) {
        const latestTs = Math.max(
          ...timeEntries.map(e => {
            const end = parseInt(e.end || 0);
            const start = parseInt(e.start || 0);
            return end > 0 ? end : start;
          })
        );
        if (latestTs > 0) {
          return new Date(latestTs).toISOString();
        }
      }
      // No time entries at all — preserve previous value or null
      return member.lastActiveDate || null;
    })(),
    // Average work times for ranking table
    avgStartTime: workTimes.avgStartTime,
    avgEndTime: workTimes.avgEndTime,
    startDelta: workTimes.startDelta,
    endDelta: workTimes.endDelta,
    updatedAt: Date.now()
  };
}
