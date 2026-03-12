/**
 * Tests for src/services/sync/calculations.js
 *
 * BUG-013 NOTE: One test in deriveStatus is intentionally written to FAIL
 * because offlineThreshold is declared but never used in calculations.js:26.
 * That test is labelled clearly below.
 */

// Mock dependencies that calculations.js imports at module level.
// The functions under test do not call these — only calculateTimer and
// re-exported extractors use them — but the module will fail to load in
// the test environment without these mocks.
vi.mock('../../clickup', () => ({
  clickup: {
    calculateElapsedSeconds: vi.fn(() => null),
  },
}));

vi.mock('../../taskCache', () => ({
  extractCustomFields: vi.fn(),
  extractPriority: vi.fn(),
  extractStatus: vi.fn(),
  extractStatusColor: vi.fn(),
}));

import {
  deriveStatus,
  calculateTrackedHours,
  calculateTasksAndDone,
  calculateWorkingDays,
  calculateBreaks,
} from '../calculations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a completed time entry with duration as STRING (ClickUp API format). */
function makeEntry({ id = '1', taskId = 'task-1', durationMs, startMs, endMs } = {}) {
  const now = Date.now();
  const resolvedEnd = endMs ?? now;
  const resolvedStart = startMs ?? (resolvedEnd - durationMs);
  return {
    id,
    duration: String(durationMs),         // ClickUp returns duration as string
    start: String(resolvedStart),
    end: String(resolvedEnd),
    task: { id: taskId, status: { type: 'open', status: 'in progress' } },
  };
}

/** Build a running entry (negative duration = start timestamp negated). */
function makeRunningEntry({ startMs } = {}) {
  const start = startMs ?? (Date.now() - 60_000); // default: started 1 min ago
  return {
    duration: String(-start),   // ClickUp running timer convention
    start: String(start),
  };
}

// ---------------------------------------------------------------------------
// deriveStatus()
// ---------------------------------------------------------------------------

describe('deriveStatus()', () => {
  it('returns "working" when runningEntry has negative duration', () => {
    const running = makeRunningEntry();
    expect(deriveStatus(running, [])).toBe('working');
  });

  it('returns "noActivity" when timeEntries is null', () => {
    expect(deriveStatus(null, null)).toBe('noActivity');
  });

  it('returns "noActivity" when timeEntries is empty', () => {
    expect(deriveStatus(null, [])).toBe('noActivity');
  });

  it('returns "noActivity" when all entries have duration 0 (no completed entries)', () => {
    // Entries with duration "0" are skipped by completedEntries filter (duration > 0)
    const entries = [
      { id: '1', duration: '0', start: String(Date.now() - 3_600_000), end: String(Date.now() - 1_000), task: { id: 'x' } },
    ];
    expect(deriveStatus(null, entries)).toBe('noActivity');
  });

  it('returns "break" when last activity is within breakThreshold (default 15 min)', () => {
    // Entry ended 5 minutes ago — within the 15-minute break threshold
    const endMs = Date.now() - 5 * 60_000;
    const entry = makeEntry({ durationMs: 3_600_000, endMs });
    expect(deriveStatus(null, [entry])).toBe('break');
  });

  it('returns "offline" when last activity exceeds breakThreshold (default 15 min)', () => {
    // Entry ended 20 minutes ago — past the 15-minute break threshold
    const endMs = Date.now() - 20 * 60_000;
    const entry = makeEntry({ durationMs: 3_600_000, endMs });
    const result = deriveStatus(null, [entry]);
    // With the bug present the function returns 'offline' for ANY entry past
    // breakThreshold, so this test passes with both correct and buggy code.
    expect(result).toBe('offline');
  });

  it('respects custom breakThreshold from settings', () => {
    // Entry ended 5 minutes ago; custom breakMinutes = 3 → should be 'offline'
    const endMs = Date.now() - 5 * 60_000;
    const entry = makeEntry({ durationMs: 3_600_000, endMs });
    const settings = { thresholds: { breakMinutes: 3, offlineMinutes: 60 } };
    // 5 min > 3 min break threshold → past break → offline
    expect(deriveStatus(null, [entry], settings)).toBe('offline');
  });

  // BUG-013: this test should FAIL — offlineThreshold is declared but never used.
  // The function unconditionally returns 'offline' once minutesSinceActivity >= breakThreshold,
  // regardless of whether it's also past the offlineThreshold.
  // Correct behaviour: a member inactive for 20 min should stay 'break' when
  // breakMinutes=15 AND offlineMinutes=60, because 20 < 60.
  it('[BUG-013] stays "break" when inactive between breakThreshold and offlineThreshold', () => {
    // Entry ended 20 minutes ago
    const endMs = Date.now() - 20 * 60_000;
    const entry = makeEntry({ durationMs: 3_600_000, endMs });
    const settings = { thresholds: { breakMinutes: 15, offlineMinutes: 60 } };
    // 20 min > 15 (past break) but 20 min < 60 (not yet offline)
    // EXPECTED (correct): 'break'   ← this test will FAIL with current buggy code
    expect(deriveStatus(null, [entry], settings)).toBe('break');
  });
});

// ---------------------------------------------------------------------------
// calculateTrackedHours()
// ---------------------------------------------------------------------------

describe('calculateTrackedHours()', () => {
  it('sums completed entries (duration as STRING in ms)', () => {
    const entries = [
      makeEntry({ durationMs: 3_600_000 }),   // 1 hour
      makeEntry({ id: '2', taskId: 'task-2', durationMs: 1_800_000 }), // 0.5 hour
    ];
    expect(calculateTrackedHours(entries)).toBeCloseTo(1.5);
  });

  it('handles empty array → returns 0', () => {
    expect(calculateTrackedHours([])).toBe(0);
  });

  it('handles null → returns 0', () => {
    expect(calculateTrackedHours(null)).toBe(0);
  });

  it('does not count negative-duration entries in the sum', () => {
    const negativeEntry = {
      id: '99',
      duration: String(-(Date.now() - 60_000)), // running timer (negative)
      start: String(Date.now() - 60_000),
      end: null,
    };
    const completedEntry = makeEntry({ durationMs: 3_600_000 });
    const total = calculateTrackedHours([negativeEntry, completedEntry]);
    // Should only count the completed 1-hour entry
    expect(total).toBeCloseTo(1);
  });

  it('adds running timer elapsed time when runningEntry provided', () => {
    const startMs = Date.now() - 30 * 60_000; // started 30 min ago
    const runningEntry = { duration: String(-startMs), start: String(startMs) };
    // 30 minutes = 0.5 hours elapsed
    const result = calculateTrackedHours([], runningEntry);
    expect(result).toBeGreaterThan(0.49);
    expect(result).toBeLessThan(0.51);
  });

  it('combines completed entries + running timer', () => {
    const startMs = Date.now() - 30 * 60_000; // 30 min elapsed
    const runningEntry = { duration: String(-startMs), start: String(startMs) };
    const entries = [makeEntry({ durationMs: 3_600_000 })]; // 1 hour
    const result = calculateTrackedHours(entries, runningEntry);
    // 1h (completed) + ~0.5h (running) ≈ 1.5h
    expect(result).toBeGreaterThan(1.49);
    expect(result).toBeLessThan(1.51);
  });
});

// ---------------------------------------------------------------------------
// calculateTasksAndDone()
// ---------------------------------------------------------------------------

describe('calculateTasksAndDone()', () => {
  it('returns zeros for empty array', () => {
    const result = calculateTasksAndDone([]);
    expect(result).toEqual({ tasks: 0, done: 0, completionDenominator: 0 });
  });

  it('returns zeros for null', () => {
    const result = calculateTasksAndDone(null);
    expect(result).toEqual({ tasks: 0, done: 0, completionDenominator: 0 });
  });

  it('counts unique tasks by task.id (deduplicates multiple entries for same task)', () => {
    const entries = [
      { task: { id: 'task-1', status: { type: 'open', status: 'in progress' } } },
      { task: { id: 'task-1', status: { type: 'open', status: 'in progress' } } }, // duplicate
      { task: { id: 'task-2', status: { type: 'open', status: 'in progress' } } },
    ];
    const result = calculateTasksAndDone(entries);
    expect(result.tasks).toBe(2); // 2 unique tasks, not 3
  });

  it('identifies "ready" tasks — status type "closed"', () => {
    const entries = [
      { task: { id: 'task-1', status: { type: 'closed', status: 'ready' } } },
      { task: { id: 'task-2', status: { type: 'open', status: 'in progress' } } },
    ];
    const result = calculateTasksAndDone(entries);
    expect(result.done).toBe(1);
    expect(result.tasks).toBe(2);
    expect(result.completionDenominator).toBe(2);
  });

  it('identifies "ready" tasks — status name includes "ready"', () => {
    const entries = [
      { task: { id: 'task-1', status: { type: 'custom', status: 'ready for review' } } },
    ];
    const result = calculateTasksAndDone(entries);
    expect(result.done).toBe(1);
  });

  it('identifies "ready" tasks — status name includes "complete"', () => {
    const entries = [
      { task: { id: 'task-1', status: { type: 'custom', status: 'complete' } } },
    ];
    const result = calculateTasksAndDone(entries);
    expect(result.done).toBe(1);
  });

  it('identifies "ready" tasks — status name includes "done"', () => {
    const entries = [
      { task: { id: 'task-1', status: { type: 'custom', status: 'done' } } },
    ];
    const result = calculateTasksAndDone(entries);
    expect(result.done).toBe(1);
  });

  it('excludes stopped tasks from completionDenominator', () => {
    const entries = [
      { task: { id: 'task-1', status: { type: 'open', status: 'in progress' } } },
      { task: { id: 'task-2', status: { type: 'open', status: 'stopped' } } },
      { task: { id: 'task-3', status: { type: 'closed', status: 'ready' } } },
    ];
    const result = calculateTasksAndDone(entries);
    expect(result.tasks).toBe(3);            // all 3 unique tasks counted in display
    expect(result.done).toBe(1);             // only ready
    expect(result.completionDenominator).toBe(2); // ready + inProgress (stopped excluded)
  });

  it('excludes hold tasks from completionDenominator', () => {
    const entries = [
      { task: { id: 'task-1', status: { type: 'open', status: 'hold' } } },
      { task: { id: 'task-2', status: { type: 'closed', status: 'ready' } } },
    ];
    const result = calculateTasksAndDone(entries);
    expect(result.tasks).toBe(2);
    expect(result.completionDenominator).toBe(1); // only ready counts (hold excluded)
  });

  it('excludes help tasks from completionDenominator', () => {
    const entries = [
      { task: { id: 'task-1', status: { type: 'open', status: 'help needed' } } },
    ];
    const result = calculateTasksAndDone(entries);
    expect(result.completionDenominator).toBe(0); // help excluded
  });

  it('handles entries without task property gracefully', () => {
    const entries = [
      { id: 'entry-1' }, // no task property
      { task: { id: 'task-2', status: { type: 'open', status: 'in progress' } } },
    ];
    const result = calculateTasksAndDone(entries);
    expect(result.tasks).toBe(1); // only the entry with a task is counted
  });
});

// ---------------------------------------------------------------------------
// calculateWorkingDays()
// ---------------------------------------------------------------------------

describe('calculateWorkingDays()', () => {
  it('returns 1 for same start and end date (Sunday — Egyptian work day)', () => {
    // 2026-02-15 is a Sunday
    const d = new Date('2026-02-15T00:00:00');
    expect(calculateWorkingDays(d, d)).toBe(1);
  });

  it('returns 1 (minimum enforced) for same start and end date that is a Saturday (weekend)', () => {
    // 2026-02-21 is a Saturday
    const d = new Date('2026-02-21T00:00:00');
    expect(calculateWorkingDays(d, d)).toBe(1);
  });

  it('respects custom workDays [0,1,2,3,4] (Sun-Thu Egyptian work week)', () => {
    // Sun 2026-02-15 through Sat 2026-02-21: 5 work days (Sun–Thu), 2 weekend days
    const start = new Date('2026-02-15T00:00:00');
    const end = new Date('2026-02-21T23:59:59');
    const settings = { schedule: { workDays: [0, 1, 2, 3, 4] } };
    expect(calculateWorkingDays(start, end, settings)).toBe(5);
  });

  it('excludes publicHolidays from count', () => {
    // Full work week Sun–Thu (5 days), but one day is a holiday
    const start = new Date('2026-02-15T00:00:00'); // Sunday
    const end = new Date('2026-02-19T23:59:59');   // Thursday
    const settings = {
      schedule: {
        workDays: [0, 1, 2, 3, 4],
        publicHolidays: ['2026-02-16'], // Monday is a holiday
      },
    };
    expect(calculateWorkingDays(start, end, settings)).toBe(4);
  });

  it('returns correct count for a multi-week range', () => {
    // Feb 2026: starts Sunday Feb 1 — 20 working days (Sun–Thu × 4 weeks)
    const start = new Date('2026-02-01T00:00:00');
    const end = new Date('2026-02-28T23:59:59');
    const settings = { schedule: { workDays: [0, 1, 2, 3, 4] } };
    // Feb 1 (Sun), 2–5 (Mon-Thu), 8–12, 15–19, 22–26 = 1+4+5+5+5 = 20
    expect(calculateWorkingDays(start, end, settings)).toBe(20);
  });

  it('uses default Sun-Thu work week when settings is null', () => {
    // Mon–Fri 2026-02-16 to 2026-02-20 (Mon–Fri)
    // Egyptian default: Sun(0), Mon(1), Tue(2), Wed(3), Thu(4) are work days
    // Mon-Thu = 4 working days (Fri=5 is excluded); Sun is not in this range
    const start = new Date('2026-02-16T00:00:00'); // Monday
    const end = new Date('2026-02-20T23:59:59');   // Friday
    // Mon(1), Tue(2), Wed(3), Thu(4) = 4 — Fri(5) excluded by default
    expect(calculateWorkingDays(start, end, null)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// calculateBreaks()
// ---------------------------------------------------------------------------

describe('calculateBreaks()', () => {
  it('returns { total: 0, count: 0 } for null input', () => {
    expect(calculateBreaks(null)).toEqual({ total: 0, count: 0 });
  });

  it('returns { total: 0, count: 0 } for a single entry (< 2 entries)', () => {
    const entry = makeEntry({ durationMs: 3_600_000 });
    expect(calculateBreaks([entry])).toEqual({ total: 0, count: 0 });
  });

  it('counts a gap > breakGapMinutes (default 5) as a break', () => {
    const baseTime = Date.now() - 4 * 3_600_000; // 4 hours ago
    const entry1 = makeEntry({
      id: '1', taskId: 'task-1',
      startMs: baseTime,
      endMs: baseTime + 3_600_000,      // ended 1h later
      durationMs: 3_600_000,
    });
    const entry2 = makeEntry({
      id: '2', taskId: 'task-2',
      startMs: baseTime + 3_600_000 + 10 * 60_000,  // 10-min gap after entry1
      endMs: baseTime + 3_600_000 + 10 * 60_000 + 3_600_000,
      durationMs: 3_600_000,
    });
    const result = calculateBreaks([entry1, entry2]);
    expect(result.count).toBe(1);
    expect(result.total).toBe(10); // 10 minute gap
  });

  it('does NOT count a gap <= breakGapMinutes as a break', () => {
    const baseTime = Date.now() - 4 * 3_600_000;
    const entry1 = makeEntry({
      id: '1', taskId: 'task-1',
      startMs: baseTime,
      endMs: baseTime + 3_600_000,
      durationMs: 3_600_000,
    });
    const entry2 = makeEntry({
      id: '2', taskId: 'task-2',
      startMs: baseTime + 3_600_000 + 3 * 60_000, // only 3-min gap (< default 5)
      endMs: baseTime + 3_600_000 + 3 * 60_000 + 3_600_000,
      durationMs: 3_600_000,
    });
    const result = calculateBreaks([entry1, entry2]);
    expect(result.count).toBe(0);
    expect(result.total).toBe(0);
  });

  it('does NOT count gaps > 180 minutes (treated as offline, not break)', () => {
    const baseTime = Date.now() - 8 * 3_600_000;
    const entry1 = makeEntry({
      id: '1', taskId: 'task-1',
      startMs: baseTime,
      endMs: baseTime + 3_600_000,
      durationMs: 3_600_000,
    });
    const entry2 = makeEntry({
      id: '2', taskId: 'task-2',
      // 200-minute gap — exceeds 180-minute max break threshold
      startMs: baseTime + 3_600_000 + 200 * 60_000,
      endMs: baseTime + 3_600_000 + 200 * 60_000 + 3_600_000,
      durationMs: 3_600_000,
    });
    const result = calculateBreaks([entry1, entry2]);
    expect(result.count).toBe(0);
    expect(result.total).toBe(0);
  });

  it('respects custom breakGapMinutes from settings', () => {
    const baseTime = Date.now() - 4 * 3_600_000;
    const entry1 = makeEntry({
      id: '1', taskId: 'task-1',
      startMs: baseTime,
      endMs: baseTime + 3_600_000,
      durationMs: 3_600_000,
    });
    const entry2 = makeEntry({
      id: '2', taskId: 'task-2',
      startMs: baseTime + 3_600_000 + 8 * 60_000, // 8-min gap
      endMs: baseTime + 3_600_000 + 8 * 60_000 + 3_600_000,
      durationMs: 3_600_000,
    });
    // With custom breakGapMinutes = 10, the 8-min gap is NOT a break
    const resultWith10min = calculateBreaks([entry1, entry2], { thresholds: { breakGapMinutes: 10 } });
    expect(resultWith10min.count).toBe(0);

    // With default breakGapMinutes = 5, the 8-min gap IS a break
    const resultDefault = calculateBreaks([entry1, entry2]);
    expect(resultDefault.count).toBe(1);
  });

  it('accumulates multiple breaks correctly', () => {
    const baseTime = Date.now() - 6 * 3_600_000;
    const entry1 = makeEntry({ id: '1', taskId: 'task-1', startMs: baseTime, endMs: baseTime + 3_600_000, durationMs: 3_600_000 });
    const entry2 = makeEntry({ id: '2', taskId: 'task-2', startMs: baseTime + 3_600_000 + 10 * 60_000, endMs: baseTime + 3_600_000 + 10 * 60_000 + 3_600_000, durationMs: 3_600_000 });
    const entry3 = makeEntry({ id: '3', taskId: 'task-3', startMs: baseTime + 2 * 3_600_000 + 10 * 60_000 + 15 * 60_000, endMs: baseTime + 2 * 3_600_000 + 10 * 60_000 + 15 * 60_000 + 3_600_000, durationMs: 3_600_000 });
    const result = calculateBreaks([entry1, entry2, entry3]);
    expect(result.count).toBe(2);
    expect(result.total).toBe(25); // 10 + 15 minutes
  });
});
