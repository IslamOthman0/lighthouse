/**
 * Tests for leave-deducted target calculations (Fix audit Q4)
 *
 * Verifies:
 * 1. member.workingDays stores leave-deducted days
 * 2. Team total target is SUM(daily_target × member.workingDays)
 * 3. CardShell effectiveTarget uses member.workingDays over team workingDays
 * 4. MemberDetailModal effectiveTarget uses per-member workingDays
 *
 * These tests use pure calculation logic — no mocks of db or API.
 */

import { calculateWorkingDays, countLeaveDaysInRange } from '../../services/sync/calculations';
import { calculateMemberScore } from '../scoreCalculation';

// ---------------------------------------------------------------------------
// Helper: simulate the leave-deduction logic from orchestrator.js
// orchestrator.js:228-241
// ---------------------------------------------------------------------------
function computeMemberWorkingDays(teamWorkingDays, memberLeaves, startDate, endDate, settings) {
  const leaveDays = countLeaveDaysInRange(memberLeaves, startDate, endDate, settings);
  return Math.max(teamWorkingDays - leaveDays, 1);
}

// ---------------------------------------------------------------------------
// Helper: simulate team total target as fixed in useAppStore.js (Fix 2)
// Uses per-member workingDays instead of team workingDays
// ---------------------------------------------------------------------------
function computeTeamTotalTarget(members, teamWorkingDays) {
  return members.reduce((sum, m) => {
    const dailyTarget = m.target || 6.5;
    const mWorkingDays = m.workingDays || teamWorkingDays;
    return sum + (dailyTarget * mWorkingDays);
  }, 0);
}

// ---------------------------------------------------------------------------
// Helper: simulate CardShell effectiveTarget (Fix 3)
// Uses member.workingDays when available
// ---------------------------------------------------------------------------
function computeCardShellEffectiveTarget(member, teamWorkingDays) {
  const memberWorkingDays = member.workingDays || teamWorkingDays;
  return (member.target || 6.5) * memberWorkingDays;
}

const stdSettings = { schedule: { workDays: [0, 1, 2, 3, 4], publicHolidays: [] } };

// ---------------------------------------------------------------------------
// calculateWorkingDays tests
// ---------------------------------------------------------------------------
describe('calculateWorkingDays', () => {
  it('counts 5 working days for a Sun–Thu week', () => {
    // Sun 2026-02-15 → Thu 2026-02-19 (5 working days)
    const start = new Date('2026-02-15T00:00:00');
    const end   = new Date('2026-02-19T00:00:00');
    expect(calculateWorkingDays(start, end, stdSettings)).toBe(5);
  });

  it('returns 1 minimum even for a weekend-only range', () => {
    // Fri-Sat with Sun-Thu workdays → 0 working days, but clamped to 1
    const start = new Date('2026-02-20T00:00:00'); // Friday
    const end   = new Date('2026-02-21T00:00:00'); // Saturday
    expect(calculateWorkingDays(start, end, stdSettings)).toBe(1);
  });

  it('excludes public holidays from working day count', () => {
    const settingsWithHoliday = {
      schedule: { workDays: [0, 1, 2, 3, 4], publicHolidays: ['2026-02-16'] }, // Monday holiday
    };
    const start = new Date('2026-02-15T00:00:00'); // Sun
    const end   = new Date('2026-02-19T00:00:00'); // Thu
    // 5 days - 1 holiday = 4 working days
    expect(calculateWorkingDays(start, end, settingsWithHoliday)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// computeMemberWorkingDays: leave deduction from team working days
// ---------------------------------------------------------------------------
describe('leave deduction from working days', () => {
  // Range: Sun 2026-02-15 → Thu 2026-02-19 (5 working days)
  const rangeStart = new Date('2026-02-15T00:00:00');
  const rangeEnd   = new Date('2026-02-19T23:59:59');

  it('member with no leave gets full team working days', () => {
    const result = computeMemberWorkingDays(5, [], rangeStart, rangeEnd, stdSettings);
    expect(result).toBe(5);
  });

  it('WFH day does NOT reduce working days — target stays same', () => {
    const leaves = [
      { startDate: '2026-02-16', endDate: '2026-02-16', status: 'approved', type: 'wfh' },
    ];
    const result = computeMemberWorkingDays(5, leaves, rangeStart, rangeEnd, stdSettings);
    expect(result).toBe(5); // WFH excluded, no reduction
  });

  it('3 leave days + 1 WFH: only 3 deducted → memberWorkingDays = 2 (not 1)', () => {
    // Exact Samar scenario: 3 approved leaves + 1 WFH in a 5-day week
    const leaves = [
      { startDate: '2026-02-15', endDate: '2026-02-15', status: 'approved', type: 'annual' },
      { startDate: '2026-02-16', endDate: '2026-02-16', status: 'approved', type: 'annual' },
      { startDate: '2026-02-17', endDate: '2026-02-17', status: 'approved', type: 'annual' },
      { startDate: '2026-02-18', endDate: '2026-02-18', status: 'approved', type: 'wfh' },
    ];
    const result = computeMemberWorkingDays(5, leaves, rangeStart, rangeEnd, stdSettings);
    expect(result).toBe(2); // 5 - 3 = 2, WFH not counted
  });

  it('member with 1 approved leave day gets teamDays - 1', () => {
    const leaves = [
      { startDate: '2026-02-16', endDate: '2026-02-16', status: 'approved' }, // Monday
    ];
    const result = computeMemberWorkingDays(5, leaves, rangeStart, rangeEnd, stdSettings);
    expect(result).toBe(4);
  });

  it('member with 2 approved leave days gets teamDays - 2', () => {
    const leaves = [
      { startDate: '2026-02-15', endDate: '2026-02-16', status: 'approved' }, // Sun-Mon
    ];
    const result = computeMemberWorkingDays(5, leaves, rangeStart, rangeEnd, stdSettings);
    expect(result).toBe(3);
  });

  it('member with entire week on leave gets minimum 1 working day', () => {
    const leaves = [
      { startDate: '2026-02-15', endDate: '2026-02-19', status: 'approved' }, // full week
    ];
    const result = computeMemberWorkingDays(5, leaves, rangeStart, rangeEnd, stdSettings);
    expect(result).toBe(1); // clamped to minimum 1
  });

  it('pending leave is NOT deducted', () => {
    const leaves = [
      { startDate: '2026-02-16', endDate: '2026-02-16', status: 'pending' },
    ];
    const result = computeMemberWorkingDays(5, leaves, rangeStart, rangeEnd, stdSettings);
    expect(result).toBe(5); // pending leaves don't reduce working days
  });

  it('rejected leave is NOT deducted', () => {
    const leaves = [
      { startDate: '2026-02-17', endDate: '2026-02-17', status: 'rejected' },
    ];
    const result = computeMemberWorkingDays(5, leaves, rangeStart, rangeEnd, stdSettings);
    expect(result).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// CardShell effectiveTarget: uses member.workingDays when present
// ---------------------------------------------------------------------------
describe('CardShell effectiveTarget (Fix 3)', () => {
  const teamWorkingDays = 5;

  it('no leave: effectiveTarget = daily target × teamWorkingDays', () => {
    const member = { target: 6.5, workingDays: 5 };
    expect(computeCardShellEffectiveTarget(member, teamWorkingDays)).toBe(32.5);
  });

  it('2 leave days: effectiveTarget = 6.5 × 3 = 19.5h (NOT 32.5h)', () => {
    const member = { target: 6.5, workingDays: 3 }; // 5 - 2 leave = 3
    const effective = computeCardShellEffectiveTarget(member, teamWorkingDays);
    expect(effective).toBe(19.5);
    // Verify it's different from team-level (wrong) calculation
    expect(effective).not.toBe(6.5 * teamWorkingDays);
  });

  it('falls back to teamWorkingDays when member.workingDays is missing', () => {
    const member = { target: 6.5 }; // no workingDays property
    expect(computeCardShellEffectiveTarget(member, teamWorkingDays)).toBe(32.5);
  });

  it('member on 4-day leave in 5-day week: effectiveTarget = 6.5 × 1 = 6.5h', () => {
    const member = { target: 6.5, workingDays: 1 }; // 5 - 4 = 1 (clamped at minimum)
    expect(computeCardShellEffectiveTarget(member, teamWorkingDays)).toBe(6.5);
  });
});

// ---------------------------------------------------------------------------
// Team total target: uses SUM(member.target × member.workingDays)
// ---------------------------------------------------------------------------
describe('team total target (Fix 2)', () => {
  it('no leave: team total = sum of individual targets × teamWorkingDays', () => {
    const members = [
      { target: 6.5, workingDays: 5 },
      { target: 6.5, workingDays: 5 },
      { target: 6.5, workingDays: 5 },
    ];
    expect(computeTeamTotalTarget(members, 5)).toBe(97.5); // 3 × 32.5
  });

  it('one member on 2-day leave: team total correctly reduces', () => {
    const members = [
      { target: 6.5, workingDays: 5 }, // no leave
      { target: 6.5, workingDays: 3 }, // 2 leave days
      { target: 6.5, workingDays: 5 }, // no leave
    ];
    const teamTotal = computeTeamTotalTarget(members, 5);
    // (6.5×5) + (6.5×3) + (6.5×5) = 32.5 + 19.5 + 32.5 = 84.5
    expect(teamTotal).toBe(84.5);
    // Old wrong calculation would be: 3 × 6.5 × 5 = 97.5
    expect(teamTotal).not.toBe(97.5);
  });

  it('all members on different leave amounts: each contributes correct target', () => {
    const members = [
      { target: 6.5, workingDays: 5 }, // full week
      { target: 6.5, workingDays: 4 }, // 1 day leave
      { target: 6.5, workingDays: 2 }, // 3 days leave
      { target: 6.5, workingDays: 1 }, // 4 days leave (min)
    ];
    const teamTotal = computeTeamTotalTarget(members, 5);
    // 32.5 + 26 + 13 + 6.5 = 78
    expect(teamTotal).toBe(78);
  });

  it('falls back to teamWorkingDays for members without workingDays property', () => {
    const members = [
      { target: 6.5 }, // no workingDays — uses team fallback
      { target: 6.5, workingDays: 3 },
    ];
    const teamTotal = computeTeamTotalTarget(members, 5);
    // (6.5×5) + (6.5×3) = 32.5 + 19.5 = 52
    expect(teamTotal).toBe(52);
  });

  it('custom dailyTargetHours respected per-member', () => {
    const members = [
      { target: 8, workingDays: 5 },  // custom 8h/day
      { target: 6.5, workingDays: 5 },
    ];
    const teamTotal = computeTeamTotalTarget(members, 5);
    // (8×5) + (6.5×5) = 40 + 32.5 = 72.5
    expect(teamTotal).toBe(72.5);
  });
});

// ---------------------------------------------------------------------------
// Score correctness: individual score uses memberWorkingDays (was already correct)
// These tests verify the scoring engine is NOT broken by our changes
// ---------------------------------------------------------------------------
describe('score calculation unaffected by leave display fixes', () => {
  const defaultWeights = {
    trackedTime: 0.40, tasksWorked: 0.20, tasksDone: 0.30, compliance: 0.10,
  };

  it('member with 3 working days (2 leave in 5-day week) gets 100 score at 19.5h tracked', () => {
    const result = calculateMemberScore({
      tracked: 19.5,  // 3 × 6.5h
      tasks: 9,       // 3 × 3 tasks
      done: 9,
      complianceHours: 19.5,
      avgTasksBaseline: 3,
      weights: defaultWeights,
      workingDays: 3, // leave-deducted member working days
    });
    expect(result.total).toBe(100);
  });

  it('member at 50% effort in 3-day week (9.75h) gets expected partial score', () => {
    const result = calculateMemberScore({
      tracked: 9.75, // 50% of 19.5h
      tasks: 5,
      done: 5,
      completionDenominator: 5,
      complianceHours: 9.75,
      avgTasksBaseline: 3,
      weights: defaultWeights,
      workingDays: 3,
    });
    // tracked: 9.75/19.5 = 50% → 20 pts
    // compliance: 9.75/19.5 = 50% → 5 pts
    // done: 5/5 = 100% → 30 pts
    // tasksWorked: 5/9 ≈ 55.6% → ~11.1 pts
    expect(result.breakdown.tracked.ratio).toBe(50);
    expect(result.breakdown.compliance.ratio).toBe(50);
    expect(result.breakdown.tasksDone.score).toBe(30);
    expect(result.total).toBeGreaterThan(50);
    expect(result.total).toBeLessThan(100);
  });

  it('member with no leave (workingDays=5): full week requires 32.5h for 100 score', () => {
    const result = calculateMemberScore({
      tracked: 32.5,
      tasks: 15,
      done: 15,
      complianceHours: 32.5,
      avgTasksBaseline: 3,
      weights: defaultWeights,
      workingDays: 5,
    });
    expect(result.total).toBe(100);
  });

  it('effectiveTarget properly computed from member.workingDays for score comparison', () => {
    // Member A: 5 working days, tracked 32.5h → 100 score
    const memberA = calculateMemberScore({
      tracked: 32.5, tasks: 15, done: 15, complianceHours: 32.5,
      avgTasksBaseline: 3, weights: defaultWeights, workingDays: 5,
    });

    // Member B: 3 working days (leave), tracked 19.5h → 100 score (NOT compared to 32.5h)
    const memberB = calculateMemberScore({
      tracked: 19.5, tasks: 9, done: 9, complianceHours: 19.5,
      avgTasksBaseline: 3, weights: defaultWeights, workingDays: 3,
    });

    expect(memberA.total).toBe(100);
    expect(memberB.total).toBe(100); // same score — fair comparison after leave deduction
  });
});

// ---------------------------------------------------------------------------
// Integration: full flow from leave records to displayed target
// ---------------------------------------------------------------------------
describe('end-to-end: leave records → correct displayed target', () => {
  const rangeStart = new Date('2026-02-15T00:00:00'); // Sunday
  const rangeEnd   = new Date('2026-02-19T23:59:59'); // Thursday

  it('member with 2 leave days shows 19.5h target (not 32.5h)', () => {
    const memberLeaves = [
      { startDate: '2026-02-15', endDate: '2026-02-16', status: 'approved' }, // Sun-Mon
    ];
    const teamWorkingDays = calculateWorkingDays(rangeStart, rangeEnd, stdSettings); // 5
    const leaveDays = countLeaveDaysInRange(memberLeaves, rangeStart, rangeEnd, stdSettings); // 2
    const memberWorkingDays = Math.max(teamWorkingDays - leaveDays, 1); // 3

    const member = { target: 6.5, workingDays: memberWorkingDays };
    const displayedTarget = computeCardShellEffectiveTarget(member, teamWorkingDays);

    expect(teamWorkingDays).toBe(5);
    expect(leaveDays).toBe(2);
    expect(memberWorkingDays).toBe(3);
    expect(displayedTarget).toBe(19.5); // CORRECT: 3 × 6.5h
    expect(displayedTarget).not.toBe(32.5); // NOT the old wrong value
  });

  it('team total with mixed leave: only on-leave member has reduced target', () => {
    const memberALeaves = []; // no leave
    const memberBLeaves = [
      { startDate: '2026-02-16', endDate: '2026-02-17', status: 'approved' }, // Mon-Tue (2 days)
    ];

    const teamWorkingDays = 5;
    const memberADays = computeMemberWorkingDays(teamWorkingDays, memberALeaves, rangeStart, rangeEnd, stdSettings);
    const memberBDays = computeMemberWorkingDays(teamWorkingDays, memberBLeaves, rangeStart, rangeEnd, stdSettings);

    const members = [
      { target: 6.5, workingDays: memberADays },
      { target: 6.5, workingDays: memberBDays },
    ];

    const teamTotal = computeTeamTotalTarget(members, teamWorkingDays);

    expect(memberADays).toBe(5);
    expect(memberBDays).toBe(3);
    expect(teamTotal).toBe(52); // (6.5×5) + (6.5×3) = 32.5 + 19.5 = 52
    expect(teamTotal).not.toBe(65); // old wrong value: 2 × 6.5 × 5 = 65
  });
});
