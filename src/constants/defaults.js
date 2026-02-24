/**
 * Default Settings Configuration
 *
 * These are the default values for all application settings.
 * Used when no user settings exist in localStorage.
 */

import { SCORE_WEIGHTS, WORK_SCHEDULE } from '../utils/scoreCalculation';

export const DEFAULT_SETTINGS = {
  // Team Management
  team: {
    // Pre-configure the 8 core team members to activate member filtering
    // This reduces API calls from ~100+ to ~16 per sync cycle
    membersToMonitor: [
      '87657591', // Dina Ibrahim
      '93604849', // Alaa Soliman
      '93604850', // Nada Meshref
      '93604848', // Nada Amr
      '87650455', // Islam Othman
      '87657592', // Riham
      '87657593', // Samar Magdy
      '87708246', // Merit Fouad
    ],
    leaveQuotas: {}, // Per member annual leave days (per year)
    wfhQuotas: {}, // Per member WFH days (per month)
  },

  // ClickUp Integration
  clickup: {
    apiKey: '', // User must set this
    teamId: '', // User must set this
    projectsToTrack: [], // Lists/folders to monitor
    leaveListId: '', // ClickUp list for leave tracking
    wfhListId: '', // ClickUp list for WFH tracking
    customFields: {}, // { "list_id": ["Publisher", "Genre"], ... }
  },

  // Score Configuration
  score: {
    weights: {
      trackedTime: SCORE_WEIGHTS.TRACKED_TIME, // 0.40 (40%)
      tasksWorked: SCORE_WEIGHTS.TASKS_WORKED, // 0.20 (20%)
      tasksDone: SCORE_WEIGHTS.TASKS_DONE, // 0.30 (30%)
      compliance: SCORE_WEIGHTS.COMPLIANCE, // 0.10 (10%)
    },
    taskBaseline: 3, // Average tasks per day for scoring
  },

  // Thresholds
  thresholds: {
    breakMinutes: 15, // Minutes before "break" status (0 = immediate)
    offlineMinutes: 60, // Minutes before "offline" status
    breakGapMinutes: 5, // Minimum gap (minutes) between time entries to count as a break
  },

  // Sync & Cache
  sync: {
    intervalMs: 30000, // 30 seconds (default)
    autoClearCache: 'weekly', // 'never' | 'daily' | 'weekly' | 'monthly'
    dataRetentionDays: 30, // How long to keep historical data
    batchSize: 10, // Max concurrent API requests when fetching task details
    batchDelayMs: 150, // Delay (ms) between batches to stay under rate limits
  },

  // Calendar & Schedule
  schedule: {
    startTime: '08:00', // Work start time (24h format)
    endTime: '18:00', // Work end time (24h format)
    workDays: [0, 1, 2, 3, 4], // 0=Sunday, 1=Monday, ..., 6=Saturday
    dailyTargetHours: WORK_SCHEDULE.TARGET_HOURS, // 6.5
    publicHolidays: [], // Array of date strings: ["2026-01-01", "2026-04-25", ...]
  },

  // Display Preferences
  display: {
    theme: 'trueBlack', // 'trueBlack' | 'noirGlass'
    defaultView: 'grid', // 'grid' | 'list'
    showProfilePictures: true, // Show avatars or initials
    developerMode: false, // Show debug info (request counts, sync timing, etc.)
  },
};

/**
 * Default member quotas (applied when adding new members)
 */
export const DEFAULT_MEMBER_QUOTAS = {
  annualLeave: 30, // Days per year
  wfhDays: 2, // Days per month
};

/**
 * Sync interval options (in milliseconds)
 */
export const SYNC_INTERVAL_OPTIONS = [
  { label: '15 seconds', value: 15000 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '2 minutes', value: 120000 },
];

/**
 * Cache auto-clear options
 */
export const CACHE_CLEAR_OPTIONS = [
  { label: 'Never', value: 'never' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

/**
 * Work days configuration
 */
export const WORK_DAYS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

/**
 * Settings storage key in localStorage
 */
export const SETTINGS_STORAGE_KEY = 'lighthouse_settings';
