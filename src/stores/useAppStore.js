import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Global application state store using Zustand
 * Replaces component-level useState to eliminate props drilling
 */
export const useAppStore = create(devtools((set, get) => ({
  // ===== Team Baseline (for workload calculation) =====
  teamBaseline: 3, // Default: 3 tasks per member per day

  setTeamBaseline: (baseline) => set({ teamBaseline: baseline }, false, 'setTeamBaseline'),
  // ===== Navigation State =====
  activeMainTab: 'dashboard',
  activeView: 'grid',

  setActiveMainTab: (tab) => set({ activeMainTab: tab }, false, 'setActiveMainTab'),
  setActiveView: (view) => set({ activeView: view }, false, 'setActiveView'),

  // ===== Member Filter & Sort State =====
  memberFilter: 'all',     // 'all' | 'working' | 'break' | 'offline' | 'leave' | 'noActivity'
  memberSort: 'activity',  // 'activity' | 'rank' | 'hours' | 'tasks' | 'name'

  setMemberFilter: (filter) => set({ memberFilter: filter }, false, 'setMemberFilter'),
  setMemberSort: (sort) => set({ memberSort: sort }, false, 'setMemberSort'),

  // ===== Date Filter State (supports ranges) =====
  // For single day: startDate = endDate = that day
  // For ranges: startDate = first day, endDate = last day
  // null values = today only
  // Dates stored as ISO strings (YYYY-MM-DD) for reliable comparison
  dateRange: {
    startDate: null,  // null = today, or ISO date string
    endDate: null,    // null = today, or ISO date string
    preset: 'today',  // Preset label for display
  },

  setDateRange: (startDate, endDate, preset = 'custom') => {
    // Normalize Date objects to ISO date strings for reliable comparison
    const normalizeDate = (date) => {
      if (!date) return null;
      if (date instanceof Date) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      if (typeof date === 'string') {
        // Already a string - extract just the date part if it's ISO datetime
        return date.split('T')[0];
      }
      return date;
    };

    set({
      dateRange: {
        startDate: normalizeDate(startDate),
        endDate: normalizeDate(endDate),
        preset
      }
    }, false, 'setDateRange');
  },

  // Legacy support - single date (maps to both start and end)
  selectedDate: null, // Deprecated - use dateRange instead
  setSelectedDate: (date) => set({
    selectedDate: date,
    dateRange: { startDate: date, endDate: date, preset: date ? 'custom' : 'today' }
  }, false, 'setSelectedDate'),

  // ===== Modal State =====
  selectedMember: null,
  isMemberModalOpen: false,
  dashboardDetailType: null,
  isDashboardDetailOpen: false,
  isTaskListModalOpen: false,
  taskListFilter: null,

  openMemberModal: (member) => set({
    selectedMember: member,
    isMemberModalOpen: true
  }, false, 'openMemberModal'),

  closeMemberModal: () => set({
    selectedMember: null,
    isMemberModalOpen: false
  }, false, 'closeMemberModal'),

  openDashboardDetail: (type) => set({
    dashboardDetailType: type,
    isDashboardDetailOpen: true
  }, false, 'openDashboardDetail'),

  closeDashboardDetail: () => set({
    dashboardDetailType: null,
    isDashboardDetailOpen: false
  }, false, 'closeDashboardDetail'),

  openTaskListModal: (filter) => set({
    taskListFilter: filter,
    isTaskListModalOpen: true
  }, false, 'openTaskListModal'),

  closeTaskListModal: () => set({
    taskListFilter: null,
    isTaskListModalOpen: false
  }, false, 'closeTaskListModal'),

  // ===== Members Data =====
  members: [],
  setMembers: (members) => set({ members }, false, 'setMembers'),

  updateMember: (id, updates) => set((state) => ({
    members: state.members.map(m =>
      m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
    )
  }), false, 'updateMember'),

  // ===== Team Stats (Computed) =====
  teamStats: null,
  scoreMetrics: null,

  // ===== Date Range Info (from sync) =====
  // Stores working days count for dynamic target calculation
  dateRangeInfo: {
    workingDays: 1,
    totalTimeEntries: 0,
    uniqueTasks: 0
  },

  setDateRangeInfo: (info) => set({ dateRangeInfo: info }, false, 'setDateRangeInfo'),

  // ===== Sync Progress (for loading UX) =====
  syncProgress: {
    phase: 'idle',
    message: '',
    progress: 0
  },

  setSyncProgress: (progress) => set({ syncProgress: progress }, false, 'setSyncProgress'),

  /**
   * Calculate and update team statistics
   * Called after members data changes
   *
   * Score Formula (40/20/30/10 weights):
   * - Time Tracked: 40% - How much of target hours tracked
   * - Workload: 20% - Tasks worked vs team baseline (3-month average per member)
   * - Completion: 30% - Tasks done / tasks total
   * - Compliance: 10% - Time tracked within work hours (8AM-6PM)
   *
   * Workload Baseline: Uses team historical average (3-month total / days / members)
   * This ensures all members are compared to the same team baseline, not individual averages.
   *
   * DYNAMIC TARGET: Target hours = members.length × 6.5 × workingDays
   */
  updateStats: () => {
    const { members, teamBaseline, dateRangeInfo } = get();

    if (!members || members.length === 0) {
      set({ teamStats: null, scoreMetrics: null }, false, 'updateStats');
      return;
    }

    // Get working days from date range info (default 1 for "today")
    const workingDays = dateRangeInfo?.workingDays || 1;

    // ===== RAW DATA =====
    const totalTracked = members.reduce((sum, m) => sum + (m.tracked || 0), 0);
    // DYNAMIC TARGET: members × 6.5h daily target × working days in range
    const totalTarget = members.length * 6.5 * workingDays;
    const totalTasksDone = members.reduce((sum, m) => sum + (m.done || 0), 0);
    const totalTasks = members.reduce((sum, m) => sum + (m.tasks || 0), 0);

    // Compliance hours (time tracked within 8AM-6PM window)
    // Use complianceHours from member if available, otherwise estimate as 85% of tracked
    const totalComplianceHours = members.reduce((sum, m) => {
      return sum + (m.complianceHours ?? (m.tracked || 0) * 0.85);
    }, 0);

    // ===== RAW RATIOS (0-100%) =====
    // These show "how well are we doing" in each category

    // 1. Time Tracked Ratio: tracked / target (capped at 100%)
    const timeRatio = totalTarget > 0
      ? Math.min((totalTracked / totalTarget) * 100, 100)
      : 0;

    // 2. Workload Ratio: tasks worked / team baseline
    // Team baseline = avg tasks per member per day from 3-month history
    // Total expected = teamBaseline * number of members
    const taskBaseline = members.length * teamBaseline;
    const workloadRatio = taskBaseline > 0
      ? Math.min((totalTasks / taskBaseline) * 100, 100)
      : 0;

    // 3. Completion Ratio: done / total tasks
    const completionRatio = totalTasks > 0
      ? (totalTasksDone / totalTasks) * 100
      : 0;

    // 4. Compliance Ratio: compliance hours / target (time within 8AM-6PM)
    const complianceRatio = totalTarget > 0
      ? Math.min((totalComplianceHours / totalTarget) * 100, 100)
      : 0;

    // ===== WEIGHTED SCORES (contribution to total) =====
    const WEIGHTS = {
      TIME: 0.40,       // 40%
      WORKLOAD: 0.20,   // 20%
      COMPLETION: 0.30, // 30%
      COMPLIANCE: 0.10  // 10%
    };

    const timeScore = (timeRatio / 100) * (WEIGHTS.TIME * 100);           // Max 40 points
    const workloadScore = (workloadRatio / 100) * (WEIGHTS.WORKLOAD * 100); // Max 20 points
    const completionScore = (completionRatio / 100) * (WEIGHTS.COMPLETION * 100); // Max 30 points
    const complianceScore = (complianceRatio / 100) * (WEIGHTS.COMPLIANCE * 100); // Max 10 points

    // Total score (max 100)
    const totalScore = timeScore + workloadScore + completionScore + complianceScore;

    // ===== TEAM STATS (for overview cards) =====
    const teamStats = {
      tracked: {
        value: totalTracked,
        target: totalTarget,
        progress: timeRatio
      },
      tasks: {
        done: totalTasksDone,
        total: totalTasks,
        progress: completionRatio
      }
    };

    // ===== SCORE METRICS (for score breakdown card) =====
    // Raw ratios shown in UI (more intuitive)
    // Weighted scores used for total calculation
    const scoreMetrics = {
      // Total team score (weighted sum)
      total: Math.round(totalScore),

      // Raw ratios for display in 4 boxes (0-100%)
      time: Math.round(timeRatio),           // "Time Tracked: 44%"
      workload: Math.round(workloadRatio),   // "Workload: 96%"
      tasks: Math.round(completionRatio),    // "Completion: 57%"
      compliance: Math.round(complianceRatio), // "Compliance: 38%"

      // Weighted scores (for debugging/details)
      weighted: {
        time: Math.round(timeScore * 10) / 10,
        workload: Math.round(workloadScore * 10) / 10,
        completion: Math.round(completionScore * 10) / 10,
        compliance: Math.round(complianceScore * 10) / 10
      },

      // Weights for reference
      weights: WEIGHTS
    };

    set({ teamStats, scoreMetrics }, false, 'updateStats');
  },

  // ===== Sync Status =====
  lastSync: null,
  syncError: null,
  isSyncing: false,
  requestCount: 0, // API requests consumed in current window

  setLastSync: (timestamp) => set({ lastSync: timestamp }, false, 'setLastSync'),
  setSyncError: (error) => set({ syncError: error }, false, 'setSyncError'),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }, false, 'setIsSyncing'),
  setRequestCount: (count) => set({ requestCount: count }, false, 'setRequestCount'),

  // ===== ClickUp API Config =====
  apiConfig: {
    enabled: false,
    teamId: null,
    apiKey: null
  },

  setApiConfig: (config) => set((state) => ({
    apiConfig: { ...state.apiConfig, ...config }
  }), false, 'setApiConfig'),

  // ===== Project Breakdown Data =====
  // Dynamic structure from ClickUp:
  // { projectName: { name, color, statuses: { statusName: { name, color, count, tasks } } } }
  projectBreakdown: {},

  setProjectBreakdown: (breakdown) => set({ projectBreakdown: breakdown }, false, 'setProjectBreakdown'),

  // Legacy function for backwards compatibility (no longer used when ClickUp sync is enabled)
  updateProjectBreakdown: () => {
    const { members, projectBreakdown } = get();

    // If we already have real ClickUp data, don't overwrite with member-based calculation
    if (Object.keys(projectBreakdown).length > 0) {
      return;
    }

    // Fallback: Basic breakdown from member data (for non-ClickUp mode)
    const breakdown = {};

    members.forEach(member => {
      const project = member.project || 'Unknown';
      const status = member.taskStatus || 'Active';

      if (!breakdown[project]) {
        breakdown[project] = {
          name: project,
          color: '#3b82f6',
          statuses: {}
        };
      }

      if (!breakdown[project].statuses[status]) {
        breakdown[project].statuses[status] = {
          name: status,
          color: '#6b7280',
          count: 0,
          tasks: []
        };
      }

      breakdown[project].statuses[status].count++;
    });

    set({ projectBreakdown: breakdown }, false, 'updateProjectBreakdown');
  }
})));

/**
 * Selector hooks for optimized component rendering
 * Use these instead of accessing the full store
 */

// Navigation selectors
export const useActiveMainTab = () => useAppStore(state => state.activeMainTab);
export const useActiveView = () => useAppStore(state => state.activeView);
export const useSelectedDate = () => useAppStore(state => state.selectedDate);

// Modal selectors
export const useMemberModal = () => useAppStore(state => ({
  selectedMember: state.selectedMember,
  isOpen: state.isMemberModalOpen,
  open: state.openMemberModal,
  close: state.closeMemberModal
}));

export const useDashboardDetailModal = () => useAppStore(state => ({
  type: state.dashboardDetailType,
  isOpen: state.isDashboardDetailOpen,
  open: state.openDashboardDetail,
  close: state.closeDashboardDetail
}));

// Members data selectors
export const useMembers = () => useAppStore(state => state.members);
export const useTeamStats = () => useAppStore(state => state.teamStats);
export const useScoreMetrics = () => useAppStore(state => state.scoreMetrics);

// Sync status selectors
export const useSyncStatus = () => useAppStore(state => ({
  lastSync: state.lastSync,
  error: state.syncError,
  isSyncing: state.isSyncing
}));
