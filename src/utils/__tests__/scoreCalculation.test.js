import { calculateMemberScore, SCORE_WEIGHTS, WORK_SCHEDULE } from '../scoreCalculation';

// Default weights in camelCase format as expected by calculateMemberScore
const defaultWeights = {
  trackedTime: 0.40,
  tasksWorked: 0.20,
  tasksDone: 0.30,
  compliance: 0.10,
};

describe('calculateMemberScore', () => {
  it('calculates perfect score (100)', () => {
    const result = calculateMemberScore({
      tracked: 6.5,
      tasks: 3,
      done: 3,
      complianceHours: 6.5,
      weights: defaultWeights,
    });
    expect(result.total).toBe(100);
  });

  it('calculates zero score with no activity', () => {
    const result = calculateMemberScore({
      tracked: 0,
      tasks: 0,
      done: 0,
      complianceHours: 0,
      weights: defaultWeights,
    });
    expect(result.total).toBe(0);
  });

  it('caps tracked time at 100% (no overtime bonus)', () => {
    const result = calculateMemberScore({
      tracked: 10,
      tasks: 3,
      done: 3,
      complianceHours: 6.5,
      weights: defaultWeights,
    });
    expect(result.total).toBe(100);
    expect(result.breakdown.tracked.ratio).toBe(100);
  });

  it('calculates partial scores correctly', () => {
    const result = calculateMemberScore({
      tracked: 3.25,
      tasks: 3,
      done: 0,
      complianceHours: 3.25,
      weights: defaultWeights,
    });
    expect(result.total).toBe(45);
  });

  it('uses custom weights', () => {
    const customWeights = {
      trackedTime: 0.25,
      tasksWorked: 0.25,
      tasksDone: 0.25,
      compliance: 0.25,
    };
    const result = calculateMemberScore({
      tracked: 6.5,
      tasks: 3,
      done: 3,
      complianceHours: 6.5,
      weights: customWeights,
    });
    expect(result.total).toBe(100);
  });

  it('uses completionDenominator when provided', () => {
    const result = calculateMemberScore({
      tracked: 6.5,
      tasks: 5,
      done: 3,
      completionDenominator: 4,
      complianceHours: 6.5,
      weights: defaultWeights,
    });
    expect(result.breakdown.tasksDone.score).toBe(22.5);
  });

  it('uses custom target hours', () => {
    const result = calculateMemberScore({
      tracked: 4,
      tasks: 3,
      done: 3,
      complianceHours: 4,
      targetHours: 4,
      weights: defaultWeights,
    });
    expect(result.breakdown.tracked.score).toBe(40);
    expect(result.breakdown.compliance.score).toBe(10);
  });

  it('handles zero task baseline gracefully', () => {
    const result = calculateMemberScore({
      tracked: 6.5,
      tasks: 3,
      done: 3,
      complianceHours: 6.5,
      avgTasksBaseline: 0,
      weights: defaultWeights,
    });
    expect(result.breakdown.tasksWorked.score).toBe(0);
  });

  it('returns breakdown with correct weights', () => {
    const result = calculateMemberScore({
      tracked: 6.5,
      tasks: 3,
      done: 3,
      complianceHours: 6.5,
      weights: defaultWeights,
    });
    expect(result.breakdown.tracked.weight).toBe(40);
    expect(result.breakdown.tasksWorked.weight).toBe(20);
    expect(result.breakdown.tasksDone.weight).toBe(30);
    expect(result.breakdown.compliance.weight).toBe(10);
  });

  // Multi-day range tests
  describe('multi-day date ranges', () => {
    it('calculates perfect score for 2-day range', () => {
      const result = calculateMemberScore({
        tracked: 13,           // 2 × 6.5h
        tasks: 6,              // 2 × 3 tasks
        done: 6,
        complianceHours: 13,
        avgTasksBaseline: 3,
        weights: defaultWeights,
        workingDays: 2,
      });
      expect(result.total).toBe(100);
    });

    it('calculates perfect score for 5-day range (week)', () => {
      const result = calculateMemberScore({
        tracked: 32.5,         // 5 × 6.5h
        tasks: 15,             // 5 × 3 tasks
        done: 15,
        complianceHours: 32.5,
        avgTasksBaseline: 3,
        weights: defaultWeights,
        workingDays: 5,
      });
      expect(result.total).toBe(100);
    });

    it('calculates partial score for 2-day range with half effort', () => {
      const result = calculateMemberScore({
        tracked: 6.5,          // Half of 2 × 6.5h
        tasks: 3,              // Half of 2 × 3 tasks
        done: 3,
        complianceHours: 6.5,
        avgTasksBaseline: 3,
        weights: defaultWeights,
        workingDays: 2,
      });
      // 6.5/13 = 50% → 20 points
      // 3/6 = 50% → 10 points
      // 3/3 = 100% → 30 points
      // 6.5/13 = 50% → 5 points
      // Total = 65 points
      expect(result.total).toBe(65);
    });

    it('normalizes scores correctly when exceeding single-day target in multi-day range', () => {
      const result = calculateMemberScore({
        tracked: 8,            // More than single-day 6.5h but less than 2×6.5h
        tasks: 4,              // More than single-day 3 but less than 2×3
        done: 4,
        complianceHours: 8,
        avgTasksBaseline: 3,
        weights: defaultWeights,
        workingDays: 2,
      });
      // Without workingDays, this would cap at 100%
      // With workingDays=2: 8/13 = 61.5%, 4/6 = 66.7%
      expect(result.breakdown.tracked.ratio).toBeLessThan(100);
      expect(result.breakdown.tasksWorked.ratio).toBeLessThan(100);
      expect(result.total).toBeLessThan(100);
    });

    it('handles custom target hours with multi-day ranges', () => {
      const result = calculateMemberScore({
        tracked: 8,            // 2 × 4h
        tasks: 4,
        done: 4,
        complianceHours: 8,
        avgTasksBaseline: 2,
        targetHours: 4,        // Custom 4h/day target
        weights: defaultWeights,
        workingDays: 2,
      });
      expect(result.total).toBe(100);
    });

    it('defaults to 1 working day when not specified', () => {
      const resultWithDefault = calculateMemberScore({
        tracked: 6.5,
        tasks: 3,
        done: 3,
        complianceHours: 6.5,
        weights: defaultWeights,
        // workingDays not specified - should default to 1
      });

      const resultExplicit = calculateMemberScore({
        tracked: 6.5,
        tasks: 3,
        done: 3,
        complianceHours: 6.5,
        weights: defaultWeights,
        workingDays: 1,
      });

      expect(resultWithDefault.total).toBe(resultExplicit.total);
      expect(resultWithDefault.total).toBe(100);
    });
  });

  // --- completionDenominator edge cases ---

  it('completionDenominator=0 → tasksDone score is 0, not NaN or Infinity', () => {
    const result = calculateMemberScore({
      tracked: 6.5,
      tasks: 3,
      done: 2,
      completionDenominator: 0,
      complianceHours: 6.5,
      weights: defaultWeights,
    });
    expect(result.breakdown.tasksDone.score).toBe(0);
    expect(Number.isFinite(result.breakdown.tasksDone.score)).toBe(true);
    expect(Number.isNaN(result.breakdown.tasksDone.score)).toBe(false);
    // Total without tasksDone: 40 + 20 + 10 = 70
    expect(result.total).toBe(70);
  });

  it('tasks=0 and completionDenominator not provided → tasksDone score is 0 (fallback denominator=tasks=0)', () => {
    const result = calculateMemberScore({
      tracked: 6.5,
      tasks: 0,
      done: 0,
      complianceHours: 6.5,
      weights: defaultWeights,
    });
    expect(result.breakdown.tasksDone.score).toBe(0);
    expect(Number.isNaN(result.breakdown.tasksDone.score)).toBe(false);
  });

  // --- zero tracked hours: tracked component is 0 ---

  it('zero tracked hours → tracked.score = 0 and tracked.ratio = 0 (component level)', () => {
    const result = calculateMemberScore({
      tracked: 0,
      tasks: 3,
      done: 3,
      complianceHours: 0,
      weights: defaultWeights,
    });
    expect(result.breakdown.tracked.score).toBe(0);
    expect(result.breakdown.tracked.ratio).toBe(0);
  });

  // --- default weights (40/20/30/10) produce correct per-component breakdown ---

  it('default weights produce correct per-component scores for a known input', () => {
    // tracked=3.25h (50% of 6.5h), tasks=3 (100% of baseline 3), done=3/3 (100%), compliance=0
    const result = calculateMemberScore({
      tracked: 3.25,
      tasks: 3,
      done: 3,
      complianceHours: 0,
      weights: defaultWeights,
    });
    expect(result.breakdown.tracked.score).toBe(20);     // 50% × 40 = 20
    expect(result.breakdown.tasksWorked.score).toBe(20); // 100% × 20 = 20
    expect(result.breakdown.tasksDone.score).toBe(30);   // 100% × 30 = 30
    expect(result.breakdown.compliance.score).toBe(0);   // 0% × 10 = 0
    expect(result.total).toBe(70);
  });

  // --- workingDays > 1 scales target correctly (explicit 3-day test) ---

  it('workingDays=3 scales both time target and task baseline correctly', () => {
    // 3-day range: target = 3 × 6.5 = 19.5h; baseline = 3 × 3 = 9 tasks
    const result = calculateMemberScore({
      tracked: 19.5,
      tasks: 9,
      done: 9,
      complianceHours: 19.5,
      avgTasksBaseline: 3,
      weights: defaultWeights,
      workingDays: 3,
    });
    expect(result.total).toBe(100);
    expect(result.breakdown.tracked.ratio).toBe(100);
    expect(result.breakdown.tasksWorked.ratio).toBe(100);
  });

  it('workingDays=3 partial effort: tracked=9.75h (50% of 19.5h target)', () => {
    const result = calculateMemberScore({
      tracked: 9.75,
      tasks: 4,
      done: 4,
      completionDenominator: 4,
      complianceHours: 9.75,
      avgTasksBaseline: 3,
      weights: defaultWeights,
      workingDays: 3,
    });
    // tracked: 9.75/19.5 = 50% → 20 pts
    // compliance: 9.75/19.5 = 50% → 5 pts
    // done: 4/4 = 100% → 30 pts
    expect(result.breakdown.tracked.ratio).toBe(50);
    expect(result.breakdown.compliance.ratio).toBe(50);
    expect(result.breakdown.tasksDone.score).toBe(30);
    expect(result.total).toBeLessThan(100);
  });

  // --- weights that don't sum to 1.0: documents current behavior (no normalization) ---

  it('weights summing to less than 1.0 → max achievable total is less than 100 (no normalization)', () => {
    // 0.20 + 0.10 + 0.15 + 0.05 = 0.50 → max score = 50
    const underWeights = {
      trackedTime: 0.20,
      tasksWorked: 0.10,
      tasksDone:   0.15,
      compliance:  0.05,
    };
    const result = calculateMemberScore({
      tracked: 6.5,
      tasks: 3,
      done: 3,
      complianceHours: 6.5,
      weights: underWeights,
    });
    expect(result.total).toBe(50);
    expect(result.total).toBeLessThan(100);
  });

  it('weights summing to more than 1.0 → total is capped at 100 (cap still applies)', () => {
    // 0.50 + 0.30 + 0.40 + 0.20 = 1.40 → raw sum = 140, capped at 100
    const overWeights = {
      trackedTime: 0.50,
      tasksWorked: 0.30,
      tasksDone:   0.40,
      compliance:  0.20,
    };
    const result = calculateMemberScore({
      tracked: 6.5,
      tasks: 3,
      done: 3,
      complianceHours: 6.5,
      weights: overWeights,
    });
    expect(result.total).toBe(100);
  });
});

describe('SCORE_WEIGHTS', () => {
  it('weights sum to 1.0', () => {
    const sum = SCORE_WEIGHTS.TRACKED_TIME + SCORE_WEIGHTS.TASKS_WORKED +
                SCORE_WEIGHTS.TASKS_DONE + SCORE_WEIGHTS.COMPLIANCE;
    expect(sum).toBeCloseTo(1.0);
  });
});

describe('WORK_SCHEDULE', () => {
  it('has correct defaults', () => {
    expect(WORK_SCHEDULE.TARGET_HOURS).toBe(6.5);
    expect(WORK_SCHEDULE.START_HOUR).toBe(8);
    expect(WORK_SCHEDULE.END_HOUR).toBe(18);
  });
});
