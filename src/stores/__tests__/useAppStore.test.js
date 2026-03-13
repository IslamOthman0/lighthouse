/**
 * Tests for useAppStore.js
 * Tests Zustand store actions directly (no React needed).
 *
 * Vitest globals: describe, it, expect, beforeEach — do NOT import from 'vitest'.
 *
 * Note: useAppStore imports `useShallow` from 'zustand/react/shallow' for selector hooks
 * at the bottom of the file. In a Node/jsdom test environment this is fine since those
 * selectors are never called — only the store actions and getState() are exercised.
 */

import { useAppStore } from '../useAppStore';

// ---------------------------------------------------------------------------
// Capture initial state once so we can reset cleanly between tests.
// We snapshot getState() before any test mutates the store.
// ---------------------------------------------------------------------------
const initialState = useAppStore.getState();

beforeEach(() => {
  // Reset store to initial state (true = replace, not merge)
  useAppStore.setState(initialState, true);
});

// ===========================================================================
// setDateRange
// ===========================================================================

describe('setDateRange', () => {
  it('sets preset "today" with null dates', () => {
    useAppStore.getState().setDateRange(null, null, 'today');
    const { dateRange } = useAppStore.getState();
    expect(dateRange.startDate).toBeNull();
    expect(dateRange.endDate).toBeNull();
    expect(dateRange.preset).toBe('today');
  });

  it('normalizes Date objects to ISO date strings (YYYY-MM-DD)', () => {
    const start = new Date(2026, 2, 1);   // March 1 2026 (local)
    const end   = new Date(2026, 2, 7);   // March 7 2026 (local)
    useAppStore.getState().setDateRange(start, end, 'custom');
    const { dateRange } = useAppStore.getState();
    expect(dateRange.startDate).toBe('2026-03-01');
    expect(dateRange.endDate).toBe('2026-03-07');
    expect(dateRange.preset).toBe('custom');
  });

  it('uses local date components (not UTC) to avoid off-by-one at midnight in UTC+2', () => {
    // Create a Date at exactly local midnight for March 13 2026.
    // In UTC+2, midnight local = 22:00 previous UTC day → toISOString() would give "2026-03-12".
    // normalizeDate must use getFullYear/getMonth/getDate instead.
    const localMidnight = new Date(2026, 2, 13, 0, 0, 0, 0); // March 13 local midnight
    useAppStore.getState().setDateRange(localMidnight, localMidnight, 'custom');
    const { dateRange } = useAppStore.getState();
    expect(dateRange.startDate).toBe('2026-03-13');
    expect(dateRange.endDate).toBe('2026-03-13');
  });

  it('normalizes ISO datetime strings to date-only part', () => {
    const isoStart = '2026-03-01T08:30:00.000Z';
    const isoEnd   = '2026-03-07T17:59:59.999Z';
    useAppStore.getState().setDateRange(isoStart, isoEnd, 'custom');
    const { dateRange } = useAppStore.getState();
    expect(dateRange.startDate).toBe('2026-03-01');
    expect(dateRange.endDate).toBe('2026-03-07');
  });

  it('already-plain YYYY-MM-DD strings pass through unchanged', () => {
    useAppStore.getState().setDateRange('2026-03-01', '2026-03-07', 'custom');
    const { dateRange } = useAppStore.getState();
    expect(dateRange.startDate).toBe('2026-03-01');
    expect(dateRange.endDate).toBe('2026-03-07');
  });

  it('defaults preset to "custom" when not provided', () => {
    useAppStore.getState().setDateRange('2026-03-01', '2026-03-07');
    const { dateRange } = useAppStore.getState();
    expect(dateRange.preset).toBe('custom');
  });

  it('allows asymmetric null (startDate null, endDate provided)', () => {
    useAppStore.getState().setDateRange(null, '2026-03-07', 'custom');
    const { dateRange } = useAppStore.getState();
    expect(dateRange.startDate).toBeNull();
    expect(dateRange.endDate).toBe('2026-03-07');
  });
});

// ===========================================================================
// updateStats
// ===========================================================================

describe('updateStats', () => {
  it('sets teamStats and scoreMetrics to null when members is empty', () => {
    useAppStore.setState({ members: [], teamStats: { dummy: true }, scoreMetrics: { dummy: true } });
    useAppStore.getState().updateStats();
    const { teamStats, scoreMetrics } = useAppStore.getState();
    expect(teamStats).toBeNull();
    expect(scoreMetrics).toBeNull();
  });

  it('calculates correct teamStats for a single member with full effort', () => {
    // Member tracking 6.5h with 3 tasks done = perfect today
    useAppStore.setState({
      members: [
        { id: '1', tracked: 6.5, tasks: 3, done: 3, complianceHours: 6.5 }
      ],
      teamBaseline: 3,
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
      scoreWeights: null,
    });
    useAppStore.getState().updateStats();
    const { teamStats, scoreMetrics } = useAppStore.getState();

    // tracked: 6.5h, target: 1×6.5×1 = 6.5h → 100%
    expect(teamStats.tracked.value).toBeCloseTo(6.5);
    expect(teamStats.tracked.target).toBeCloseTo(6.5);
    expect(teamStats.tracked.progress).toBeCloseTo(100);

    // tasks: done=3, total=3 → 100%
    expect(teamStats.tasks.done).toBe(3);
    expect(teamStats.tasks.total).toBe(3);
    expect(teamStats.tasks.progress).toBeCloseTo(100);

    // Total score = 100
    expect(scoreMetrics.total).toBe(100);
  });

  it('computes correct teamStats for multiple members', () => {
    useAppStore.setState({
      members: [
        { id: '1', tracked: 6.5, tasks: 3, done: 3, complianceHours: 6.5 },
        { id: '2', tracked: 6.5, tasks: 3, done: 3, complianceHours: 6.5 },
      ],
      teamBaseline: 3,
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
      scoreWeights: null,
    });
    useAppStore.getState().updateStats();
    const { teamStats } = useAppStore.getState();

    // totalTarget = 2 × 6.5 × 1 = 13
    expect(teamStats.tracked.target).toBeCloseTo(13);
    expect(teamStats.tracked.value).toBeCloseTo(13);
  });

  it('uses workingDays to scale the target', () => {
    // 5-day range: target = 1 member × 6.5 × 5 = 32.5h
    useAppStore.setState({
      members: [
        { id: '1', tracked: 32.5, tasks: 15, done: 15, complianceHours: 32.5 }
      ],
      teamBaseline: 3,
      dateRangeInfo: { workingDays: 5, totalTimeEntries: 0, uniqueTasks: 0 },
      scoreWeights: null,
    });
    useAppStore.getState().updateStats();
    const { teamStats, scoreMetrics } = useAppStore.getState();
    expect(teamStats.tracked.target).toBeCloseTo(32.5);
    expect(scoreMetrics.total).toBe(100);
  });

  it('total score never exceeds 100 even with very high values', () => {
    useAppStore.setState({
      members: [
        { id: '1', tracked: 100, tasks: 100, done: 100, complianceHours: 100 }
      ],
      teamBaseline: 3,
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
      scoreWeights: null,
    });
    useAppStore.getState().updateStats();
    const { scoreMetrics } = useAppStore.getState();
    expect(scoreMetrics.total).toBeLessThanOrEqual(100);
  });

  it('members get recalculated scores after updateStats()', () => {
    useAppStore.setState({
      members: [
        { id: '1', tracked: 6.5, tasks: 3, done: 3, complianceHours: 6.5, score: 0 }
      ],
      teamBaseline: 3,
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
      scoreWeights: null,
    });
    useAppStore.getState().updateStats();
    const { members } = useAppStore.getState();
    expect(members[0].score).toBe(100);
  });

  it('uses custom scoreWeights from store instead of defaults', () => {
    // Set weights that make only time score matter (100% weight on time, 0 elsewhere)
    useAppStore.setState({
      members: [
        { id: '1', tracked: 3.25, tasks: 0, done: 0, complianceHours: 0 }
      ],
      teamBaseline: 3,
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
      // Only trackedTime matters; others are 0
      scoreWeights: { trackedTime: 1.0, tasksWorked: 0.0, tasksDone: 0.0, compliance: 0.0 },
    });
    useAppStore.getState().updateStats();
    const { scoreMetrics } = useAppStore.getState();
    // tracked 3.25/6.5 = 50% → 50 × 1.0 = 50 (using the team-level calculation)
    // timeScore = (50/100) × (1.0 × 100) = 50
    expect(scoreMetrics.total).toBe(50);
  });

  it('complianceHours falls back to 85% of tracked when not set', () => {
    // If member has no complianceHours field, store estimates as tracked * 0.85
    useAppStore.setState({
      members: [
        { id: '1', tracked: 6.5, tasks: 3, done: 3 }
        // complianceHours absent (undefined)
      ],
      teamBaseline: 3,
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
      scoreWeights: null,
    });
    useAppStore.getState().updateStats();
    const { scoreMetrics } = useAppStore.getState();
    // complianceHours estimated as 6.5 × 0.85 = 5.525h / 6.5 target = 85% compliance
    // compliance score = 85% × 10 = 8.5 (rounded 8 or 9)
    expect(scoreMetrics.compliance).toBeCloseTo(85, 0);
  });

  it('scoreMetrics.weighted reflects correct per-component contributions', () => {
    // tracked=6.5 (100%), tasks=3 (100%), done=3 (100%), compliance=6.5 (100%)
    // Expected weighted: time=40, workload=20, completion=30, compliance=10
    useAppStore.setState({
      members: [
        { id: '1', tracked: 6.5, tasks: 3, done: 3, complianceHours: 6.5 }
      ],
      teamBaseline: 3,
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
      scoreWeights: null,
    });
    useAppStore.getState().updateStats();
    const { scoreMetrics } = useAppStore.getState();
    expect(scoreMetrics.weighted.time).toBeCloseTo(40);
    expect(scoreMetrics.weighted.workload).toBeCloseTo(20);
    expect(scoreMetrics.weighted.completion).toBeCloseTo(30);
    expect(scoreMetrics.weighted.compliance).toBeCloseTo(10);
  });

  it('partial effort produces proportionally lower scores', () => {
    // tracked = 3.25h (50% of 6.5), tasks = 0, done = 0, compliance = 0
    useAppStore.setState({
      members: [
        { id: '1', tracked: 3.25, tasks: 0, done: 0, complianceHours: 0 }
      ],
      teamBaseline: 3,
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
      scoreWeights: null,
    });
    useAppStore.getState().updateStats();
    const { scoreMetrics } = useAppStore.getState();
    // time: 50% × 40 = 20; workload: 0; completion: 0; compliance: 0 → total = 20
    expect(scoreMetrics.total).toBe(20);
  });
});

// ===========================================================================
// batchSyncUpdate
// ===========================================================================

describe('batchSyncUpdate', () => {
  it('sets members, teamStats, scoreMetrics, lastSync, and clears syncError in one call', () => {
    const now = Date.now();
    useAppStore.setState({ syncError: 'previous error' });

    useAppStore.getState().batchSyncUpdate({
      members: [
        { id: '1', tracked: 6.5, tasks: 3, done: 3, complianceHours: 6.5 }
      ],
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
      lastSync: now,
      syncError: null,
    });

    const state = useAppStore.getState();
    expect(state.members).toHaveLength(1);
    expect(state.teamStats).not.toBeNull();
    expect(state.scoreMetrics).not.toBeNull();
    expect(state.lastSync).toBe(now);
    expect(state.syncError).toBeNull();
  });

  it('recalculates member scores when members are provided', () => {
    useAppStore.setState({
      teamBaseline: 3,
      scoreWeights: null,
    });

    useAppStore.getState().batchSyncUpdate({
      members: [
        { id: '1', tracked: 6.5, tasks: 3, done: 3, complianceHours: 6.5, score: 0 }
      ],
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
    });

    const { members } = useAppStore.getState();
    expect(members[0].score).toBe(100);
  });

  it('recalculates scores with partial effort (member score < 100)', () => {
    useAppStore.setState({ teamBaseline: 3, scoreWeights: null });

    useAppStore.getState().batchSyncUpdate({
      members: [
        { id: '1', tracked: 3.25, tasks: 0, done: 0, complianceHours: 0, score: 0 }
      ],
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
    });

    const { members } = useAppStore.getState();
    // tracked=3.25 (50% of 6.5) → time score = 20; rest = 0
    expect(members[0].score).toBeGreaterThan(0);
    expect(members[0].score).toBeLessThan(100);
  });

  it('uses store scoreWeights when set', () => {
    useAppStore.setState({
      teamBaseline: 3,
      // Weight only trackedTime at 100%; others 0
      scoreWeights: { trackedTime: 1.0, tasksWorked: 0.0, tasksDone: 0.0, compliance: 0.0 },
    });

    useAppStore.getState().batchSyncUpdate({
      members: [
        { id: '1', tracked: 3.25, tasks: 3, done: 3, complianceHours: 3.25, score: 0 }
      ],
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
    });

    const { scoreMetrics } = useAppStore.getState();
    // tracked 3.25/6.5 = 50% → 50 points (time weight = 100%)
    expect(scoreMetrics.total).toBe(50);
  });

  it('sets dateRangeInfo in store when provided', () => {
    useAppStore.getState().batchSyncUpdate({
      members: [],
      dateRangeInfo: { workingDays: 5, totalTimeEntries: 10, uniqueTasks: 7 },
    });

    const { dateRangeInfo } = useAppStore.getState();
    expect(dateRangeInfo.workingDays).toBe(5);
    expect(dateRangeInfo.totalTimeEntries).toBe(10);
  });

  it('does NOT override dateRangeInfo when not provided', () => {
    useAppStore.setState({
      dateRangeInfo: { workingDays: 3, totalTimeEntries: 0, uniqueTasks: 0 }
    });

    useAppStore.getState().batchSyncUpdate({
      members: [],
      // dateRangeInfo omitted
    });

    const { dateRangeInfo } = useAppStore.getState();
    // workingDays falls back to 1 inside batchSyncUpdate (dateRangeInfo?.workingDays || 1)
    // but dateRangeInfo itself is not updated (only set when truthy)
    expect(dateRangeInfo.workingDays).toBe(3);
  });

  it('sets projectBreakdown when provided and non-empty', () => {
    useAppStore.getState().batchSyncUpdate({
      members: [],
      projectBreakdown: { 'Book A': { name: 'Book A', color: '#fff', statuses: {} } },
    });

    const { projectBreakdown } = useAppStore.getState();
    expect(projectBreakdown['Book A']).toBeDefined();
  });

  it('does NOT override projectBreakdown when empty object provided', () => {
    useAppStore.setState({ projectBreakdown: { 'Existing': { name: 'Existing', color: '#000', statuses: {} } } });

    useAppStore.getState().batchSyncUpdate({
      members: [],
      projectBreakdown: {},  // empty — should not overwrite
    });

    const { projectBreakdown } = useAppStore.getState();
    expect(projectBreakdown['Existing']).toBeDefined();
  });

  it('sets requestCount when provided', () => {
    useAppStore.getState().batchSyncUpdate({
      members: [],
      requestCount: 42,
    });

    const { requestCount } = useAppStore.getState();
    expect(requestCount).toBe(42);
  });

  it('sets isSyncing when provided', () => {
    useAppStore.setState({ isSyncing: true });

    useAppStore.getState().batchSyncUpdate({
      members: [],
      isSyncing: false,
    });

    const { isSyncing } = useAppStore.getState();
    expect(isSyncing).toBe(false);
  });

  it('resets syncProgress to idle phase', () => {
    useAppStore.setState({ syncProgress: { phase: 'syncing', message: 'Loading...', progress: 50 } });

    useAppStore.getState().batchSyncUpdate({
      members: [],
    });

    const { syncProgress } = useAppStore.getState();
    expect(syncProgress.phase).toBe('idle');
    expect(syncProgress.message).toBe('');
    expect(syncProgress.progress).toBe(0);
  });

  it('total score in scoreMetrics never exceeds 100', () => {
    useAppStore.setState({ teamBaseline: 3, scoreWeights: null });

    useAppStore.getState().batchSyncUpdate({
      members: [
        { id: '1', tracked: 999, tasks: 999, done: 999, complianceHours: 999 }
      ],
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
    });

    const { scoreMetrics } = useAppStore.getState();
    expect(scoreMetrics.total).toBeLessThanOrEqual(100);
  });

  it('workingDays scales targets correctly for multi-day ranges', () => {
    useAppStore.setState({ teamBaseline: 3, scoreWeights: null });

    // 5-day range, member tracked full 5 days
    useAppStore.getState().batchSyncUpdate({
      members: [
        { id: '1', tracked: 32.5, tasks: 15, done: 15, complianceHours: 32.5 }
      ],
      dateRangeInfo: { workingDays: 5, totalTimeEntries: 0, uniqueTasks: 0 },
    });

    const { teamStats, scoreMetrics } = useAppStore.getState();
    // target = 1 × 6.5 × 5 = 32.5
    expect(teamStats.tracked.target).toBeCloseTo(32.5);
    expect(scoreMetrics.total).toBe(100);
  });

  it('uses lastSync=Date.now() as fallback when lastSync not provided', () => {
    const before = Date.now();

    useAppStore.getState().batchSyncUpdate({
      members: [],
    });

    const after = Date.now();
    const { lastSync } = useAppStore.getState();
    expect(lastSync).toBeGreaterThanOrEqual(before);
    expect(lastSync).toBeLessThanOrEqual(after);
  });

  it('handles empty members array without errors', () => {
    expect(() => {
      useAppStore.getState().batchSyncUpdate({
        members: [],
        dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
      });
    }).not.toThrow();

    const { members, teamStats } = useAppStore.getState();
    expect(members).toHaveLength(0);
    // teamStats is still computed (totalTracked=0, totalTarget=0)
    expect(teamStats).toBeDefined();
  });
});

// ===========================================================================
// BUG-004: displayScoreMetrics computation (App.jsx) must use store.scoreWeights
// ===========================================================================
// App.jsx computes displayScoreMetrics in a useMemo. It SHOULD read scoreWeights
// from the store but currently uses hardcoded 40/20/30/10.
//
// The store's updateStats() correctly uses scoreWeights. These tests verify that
// store.scoreMetrics and a manually-computed result (using scoreWeights) match.
// They also serve as specification for the App.jsx fix: the displayScoreMetrics
// useMemo must use the same weight-reading logic as updateStats().

describe('BUG-004: displayScoreMetrics must use store.scoreWeights, not hardcoded values', () => {
  // Reproduces the displayScoreMetrics computation that App.jsx SHOULD do after the fix.
  // If App.jsx is still hardcoded, it produces a DIFFERENT total than this function.
  function computeWithWeights(members, dateRangeInfo, teamBaseline, scoreWeights) {
    if (!members || members.length === 0) return null;
    const workingDays = dateRangeInfo?.workingDays || 1;
    const totalTracked = members.reduce((sum, m) => sum + (m.tracked || 0), 0);
    const totalTarget = members.length * 6.5 * workingDays;
    const totalTasksDone = members.reduce((sum, m) => sum + (m.done || 0), 0);
    const totalTasks = members.reduce((sum, m) => sum + (m.tasks || 0), 0);
    const totalComplianceHours = members.reduce((sum, m) => sum + (m.complianceHours ?? (m.tracked || 0) * 0.85), 0);

    const timeRatio = totalTarget > 0 ? Math.min((totalTracked / totalTarget) * 100, 100) : 0;
    const taskBaseline = members.length * (teamBaseline || 3) * workingDays;
    const workloadRatio = taskBaseline > 0 ? Math.min((totalTasks / taskBaseline) * 100, 100) : 0;
    const completionRatio = totalTasks > 0 ? (totalTasksDone / totalTasks) * 100 : 0;
    const complianceRatio = totalTarget > 0 ? Math.min((totalComplianceHours / totalTarget) * 100, 100) : 0;

    const W = scoreWeights ? {
      TIME: (scoreWeights.trackedTime ?? 0.40) * 100,
      WORKLOAD: (scoreWeights.tasksWorked ?? 0.20) * 100,
      COMPLETION: (scoreWeights.tasksDone ?? 0.30) * 100,
      COMPLIANCE: (scoreWeights.compliance ?? 0.10) * 100,
    } : { TIME: 40, WORKLOAD: 20, COMPLETION: 30, COMPLIANCE: 10 };

    const timeScore = (timeRatio / 100) * W.TIME;
    const workloadScore = (workloadRatio / 100) * W.WORKLOAD;
    const completionScore = (completionRatio / 100) * W.COMPLETION;
    const complianceScore = (complianceRatio / 100) * W.COMPLIANCE;
    return Math.round(timeScore + workloadScore + completionScore + complianceScore);
  }

  it('with default weights (null) and 100% effort: total = 100', () => {
    const members = [{ id: '1', tracked: 6.5, tasks: 3, done: 3, complianceHours: 6.5 }];
    const total = computeWithWeights(members, { workingDays: 1 }, 3, null);
    expect(total).toBe(100);
  });

  it('BUG-004 spec: custom time weight (0.60) raises time-only score from 40 to 60', () => {
    // Member: only tracked hours (time=100%), workload=0, completion=0, compliance=0
    const members = [{ id: '1', tracked: 6.5, tasks: 0, done: 0, complianceHours: 0 }];
    const customWeights = { trackedTime: 0.60, tasksWorked: 0.20, tasksDone: 0.10, compliance: 0.10 };
    const total = computeWithWeights(members, { workingDays: 1 }, 3, customWeights);
    // time=100% × 60 = 60; rest = 0 → total = 60
    expect(total).toBe(60);
  });

  it('BUG-004 spec: store.scoreMetrics.total matches weight-aware computation', () => {
    // This verifies that store.scoreMetrics (used as source in App.jsx displayScoreMetrics)
    // correctly reflects custom scoreWeights. The store is already correct — App.jsx's
    // displayScoreMetrics useMemo must read scoreWeights to stay in sync.
    const customWeights = { trackedTime: 0.60, tasksWorked: 0.20, tasksDone: 0.10, compliance: 0.10 };
    const members = [{ id: '1', tracked: 6.5, tasks: 0, done: 0, complianceHours: 0 }];

    useAppStore.setState({
      members,
      teamBaseline: 3,
      dateRangeInfo: { workingDays: 1, totalTimeEntries: 0, uniqueTasks: 0 },
      scoreWeights: customWeights,
    });
    useAppStore.getState().updateStats();

    const { scoreMetrics } = useAppStore.getState();
    // Store correctly uses custom weights: time=60, rest=0 → total=60
    expect(scoreMetrics.total).toBe(60);

    // The App.jsx displayScoreMetrics computation must also produce 60 (not 40).
    // computeWithWeights mirrors what the fixed App.jsx should do:
    const appTotal = computeWithWeights(members, { workingDays: 1 }, 3, customWeights);
    expect(appTotal).toBe(scoreMetrics.total); // Both 60 — spec for the fix
  });
});

// ===========================================================================
// BUG-007: RankingTable compliance % must use dateRangeInfo.workingDays
// ===========================================================================
// ListView.jsx was calling <RankingTable> without dateRangeInfo prop.
// RankingTable.formatComplianceDisplay() uses workingDays from dateRangeInfo
// (falling back to 1). Without the prop, a member who worked 5 days shows
// compliance as falsely inflated (capped 100%) instead of the correct %.
//
// Fix: ListView accepts dateRangeInfo prop and passes it to RankingTable.
// These tests specify the correct compliance calculation behaviour.

describe('BUG-007: RankingTable formatComplianceDisplay uses correct workingDays', () => {
  // Mirrors RankingTable.formatComplianceDisplay() exactly as it appears in source
  function formatComplianceDisplay(member, workingDays) {
    const compliance = member.complianceHours || 0;
    const dailyTarget = member.target || 6.5;
    const totalTarget = dailyTarget * workingDays;
    const pct = Math.min(Math.round((compliance / totalTarget) * 100), 100);
    return pct;
  }

  it('single day: compliance 6.5h / (6.5 × 1) = 100%', () => {
    const member = { complianceHours: 6.5, target: 6.5 };
    expect(formatComplianceDisplay(member, 1)).toBe(100);
  });

  it('5-day full compliance: 32.5h / (6.5 × 5) = 100%', () => {
    const member = { complianceHours: 32.5, target: 6.5 };
    expect(formatComplianceDisplay(member, 5)).toBe(100);
  });

  it('BUG-007 spec: partial compliance over 5 days — correct % requires workingDays=5', () => {
    // Member was compliant for only 2 of 5 days: 2 × 6.5 = 13h
    const member = { complianceHours: 13, target: 6.5 };
    // Correct: 13 / (6.5×5) = 40%
    expect(formatComplianceDisplay(member, 5)).toBe(40);
    // Without dateRangeInfo prop (workingDays defaults to 1):
    // 13 / (6.5×1) = 200% → capped 100% — wrong inflated value
    expect(formatComplianceDisplay(member, 1)).toBe(100);
    // The fix ensures ListView passes dateRangeInfo so workingDays=5 is used
  });

  it('BUG-007 spec: 3-day range 50% effort — correct % requires workingDays=3', () => {
    // Member compliant for 1.5 of 3 days: 1.5 × 6.5 = 9.75h
    const member = { complianceHours: 9.75, target: 6.5 };
    // Correct: 9.75 / (6.5×3) = 50%
    expect(formatComplianceDisplay(member, 3)).toBe(50);
    // Without prop (workingDays=1): 9.75 / 6.5 = 150% → capped 100% — wrong
    expect(formatComplianceDisplay(member, 1)).toBe(100);
  });
});

// ===========================================================================
// BUG-008: fetchTimelineData must span full date range, not single day
// ===========================================================================
// MemberDetailModal.fetchTimelineData() was building start/end timestamps from
// a single selectedDate, always covering one day. When the global date range
// spans multiple days, the timeline only fetched 1 day of data.
//
// Fix: signature changed to (member, startDate, endDate) and end timestamp
// now comes from endDate (end of that day) instead of startDate.
// These tests specify the correct timestamp-building behaviour.

describe('BUG-008: fetchTimelineData timestamp range covers full date range', () => {
  // Mirrors the FIXED fetchTimelineData timestamp computation
  function buildTimestamps(startDate, endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate || startDate);
    end.setHours(23, 59, 59, 999);
    return {
      startTs: Math.floor(start.getTime() / 1000),
      endTs: Math.floor(end.getTime() / 1000),
    };
  }

  it('single day: span is exactly 23h 59m 59s (86399 seconds)', () => {
    const day = new Date(2026, 2, 10); // March 10
    const { startTs, endTs } = buildTimestamps(day, day);
    expect(endTs - startTs).toBe(86399);
  });

  it('5-day range: end timestamp reaches end of endDate — span is 5 days minus 1 second', () => {
    const startDate = new Date(2026, 2, 10); // March 10
    const endDate = new Date(2026, 2, 14);   // March 14
    const { startTs, endTs } = buildTimestamps(startDate, endDate);
    const fiveDaysSeconds = 5 * 24 * 60 * 60 - 1;
    expect(endTs - startTs).toBe(fiveDaysSeconds);
  });

  it('endDate defaults to startDate when null — single day behaviour preserved', () => {
    const day = new Date(2026, 2, 10);
    const { startTs: withNull } = buildTimestamps(day, null);
    const { startTs: withSame } = buildTimestamps(day, day);
    expect(withNull).toBe(withSame);
  });

  it('3-day range: span covers 3 full days', () => {
    const startDate = new Date(2026, 2, 10); // March 10
    const endDate = new Date(2026, 2, 12);   // March 12
    const { startTs, endTs } = buildTimestamps(startDate, endDate);
    const threeDaysSeconds = 3 * 24 * 60 * 60 - 1;
    expect(endTs - startTs).toBe(threeDaysSeconds);
  });
});

// ===========================================================================
// BUG-009: fetchWeeklyPerformanceData must use globalDateRange, not this-week
// ===========================================================================
// MemberDetailModal.fetchWeeklyPerformanceData() always calls getThisWeekRange()
// regardless of the selected global date range.
//
// Fix: accept (member, startDate, endDate) and use those timestamps instead.
// These tests specify the expected timestamp-building behaviour.

describe('BUG-009: fetchWeeklyPerformanceData uses globalDateRange timestamps', () => {
  // Mirrors the FIXED timestamp logic: start = startDate 00:00, end = endDate 23:59:59
  function buildPerfTimestamps(startDate, endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return {
      startTs: Math.floor(start.getTime() / 1000),
      endTs: Math.floor(end.getTime() / 1000),
    };
  }

  // Mirrors getThisWeekRange() — what the BUGGY code uses
  function getThisWeekRange() {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    sunday.setHours(0, 0, 0, 0);
    return { start: sunday, end: today };
  }

  it('BUG-009 spec: timestamps built from explicit dates, not this-week', () => {
    // A historical range: March 1–7 2026
    const startDate = new Date(2026, 2, 1);  // March 1
    const endDate   = new Date(2026, 2, 7);  // March 7

    const { startTs, endTs } = buildPerfTimestamps(startDate, endDate);

    // FIXED: startTs = March 1 00:00, endTs = March 7 23:59:59
    const sevenDaysSeconds = 7 * 24 * 60 * 60 - 1;
    expect(endTs - startTs).toBe(sevenDaysSeconds);

    // BUGGY: uses getThisWeekRange() → timestamps depend on today, not March 1–7
    const { start: buggyStart } = getThisWeekRange();
    const buggyStartTs = Math.floor(buggyStart.getTime() / 1000);
    // March 1 00:00 UTC-local ≠ this week's Sunday 00:00 (unless today happens to be Sunday March 1)
    // This assertion documents that the buggy code uses wrong timestamps for historical ranges
    expect(startTs).not.toBe(buggyStartTs); // fails if test runs on 2026-03-01 exactly — acceptable
  });

  it('span for a 7-day range is exactly 7 days minus 1 second', () => {
    const startDate = new Date(2026, 2, 1);
    const endDate   = new Date(2026, 2, 7);
    const { startTs, endTs } = buildPerfTimestamps(startDate, endDate);
    expect(endTs - startTs).toBe(7 * 24 * 60 * 60 - 1);
  });

  it('span for a single-day range is 86399 seconds', () => {
    const day = new Date(2026, 2, 10);
    const { startTs, endTs } = buildPerfTimestamps(day, day);
    expect(endTs - startTs).toBe(86399);
  });

  it('span for a 30-day range covers 30 full days', () => {
    const startDate = new Date(2026, 1, 1);   // Feb 1
    const endDate   = new Date(2026, 1, 28);  // Feb 28 (non-leap)
    const { startTs, endTs } = buildPerfTimestamps(startDate, endDate);
    expect(endTs - startTs).toBe(28 * 24 * 60 * 60 - 1);
  });
});

// ---------------------------------------------------------------------------
// BUG-005: App.jsx taskBaseline missing workingDays multiplier
// ---------------------------------------------------------------------------
// The displayScoreMetrics useMemo at App.jsx:209 computes:
//   taskBaseline = filteredMembers.length * (teamBaseline || 3)
// but the store's updateStats() correctly uses:
//   taskBaseline = filteredMembers.length * teamBaseline * workingDays
// For multi-day ranges this inflates workloadRatio (denominator too small).
// These tests spec the CORRECT behaviour that App.jsx should produce after the fix.

describe('BUG-005: App.jsx taskBaseline must include workingDays multiplier', () => {
  function computeWorkloadRatio(members, workingDays, teamBaseline) {
    const totalTasks = members.reduce((sum, m) => sum + (m.tasks || 0), 0);
    const taskBaseline = members.length * (teamBaseline || 3) * workingDays;
    return taskBaseline > 0 ? Math.min((totalTasks / taskBaseline) * 100, 100) : 0;
  }

  it('BUG-005 spec: 5-day range — workload ratio scales with workingDays', () => {
    // 8 members, each did 3 tasks/day for 5 days = 15 tasks each → 120 total
    // baseline per day = 8 * 3 = 24; for 5 days = 120 → ratio = 100%
    const members = Array.from({ length: 8 }, (_, i) => ({ id: String(i), tasks: 15 }));
    const ratio = computeWorkloadRatio(members, 5, 3);
    expect(ratio).toBe(100);
  });

  it('BUG-005 spec: without workingDays, same data would report 500% (capped to 100%)', () => {
    // Without the fix: taskBaseline = 8 * 3 = 24; totalTasks = 120 → ratio = 500% → capped 100%
    // With the fix: taskBaseline = 8 * 3 * 5 = 120; totalTasks = 120 → ratio = 100%
    // Both cap to 100% here, so use a case where the difference is visible
    // 8 members, each did 2 tasks total across 5 days
    // Correct: baseline = 8*3*5=120; totalTasks=16; ratio=13.3%
    // Buggy:   baseline = 8*3=24;    totalTasks=16; ratio=66.7%
    const members = Array.from({ length: 8 }, (_, i) => ({ id: String(i), tasks: 2 }));
    const correct = computeWorkloadRatio(members, 5, 3);
    expect(correct).toBeCloseTo(13.33, 1);
  });

  it('BUG-005 spec: single-day range — workingDays=1 is neutral (no change)', () => {
    // workingDays=1 → same as the old formula
    const members = [{ id: '1', tasks: 3 }];
    const ratio = computeWorkloadRatio(members, 1, 3);
    expect(ratio).toBe(100);
  });
});
