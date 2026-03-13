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
