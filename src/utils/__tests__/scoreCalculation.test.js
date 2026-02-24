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
