import {
  validateScoreWeights,
  balanceScoreWeights,
  validateTimeFormat,
  validateDateFormat,
  validatePositiveInteger,
  validateRange,
  sanitizeSettings,
} from '../settingsValidation';
import { DEFAULT_SETTINGS } from '../../constants/defaults';

describe('validateScoreWeights', () => {
  it('returns true for valid weights summing to 1.0', () => {
    expect(validateScoreWeights({
      trackedTime: 0.4, tasksWorked: 0.2, tasksDone: 0.3, compliance: 0.1,
    })).toBe(true);
  });

  it('returns false for weights not summing to 1.0', () => {
    expect(validateScoreWeights({
      trackedTime: 0.5, tasksWorked: 0.2, tasksDone: 0.3, compliance: 0.1,
    })).toBe(false);
  });

  it('handles floating point precision', () => {
    expect(validateScoreWeights({
      trackedTime: 0.33, tasksWorked: 0.33, tasksDone: 0.33, compliance: 0.01,
    })).toBe(true);
  });
});

describe('balanceScoreWeights', () => {
  const defaultWeights = {
    trackedTime: 0.4, tasksWorked: 0.2, tasksDone: 0.3, compliance: 0.1,
  };

  it('redistributes proportionally when one weight changes', () => {
    const result = balanceScoreWeights(defaultWeights, 'trackedTime', 0.6);
    expect(result.trackedTime).toBe(0.6);
    const sum = result.trackedTime + result.tasksWorked + result.tasksDone + result.compliance;
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  it('handles setting a weight to 0', () => {
    const result = balanceScoreWeights(defaultWeights, 'compliance', 0);
    expect(result.compliance).toBe(0);
    const sum = result.trackedTime + result.tasksWorked + result.tasksDone + result.compliance;
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  it('handles setting a weight to 1 (all others become 0)', () => {
    const result = balanceScoreWeights(defaultWeights, 'trackedTime', 1);
    expect(result.trackedTime).toBe(1);
    expect(result.tasksWorked).toBeCloseTo(0);
    expect(result.tasksDone).toBeCloseTo(0);
    expect(result.compliance).toBeCloseTo(0);
  });

  it('clamps values above 1', () => {
    const result = balanceScoreWeights(defaultWeights, 'trackedTime', 1.5);
    expect(result.trackedTime).toBe(1);
  });

  it('clamps values below 0', () => {
    const result = balanceScoreWeights(defaultWeights, 'trackedTime', -0.5);
    expect(result.trackedTime).toBe(0);
  });

  it('distributes equally when all others are 0', () => {
    const zeroWeights = { trackedTime: 1, tasksWorked: 0, tasksDone: 0, compliance: 0 };
    const result = balanceScoreWeights(zeroWeights, 'trackedTime', 0.4);
    expect(result.trackedTime).toBe(0.4);
    expect(result.tasksWorked).toBeCloseTo(0.2);
    expect(result.tasksDone).toBeCloseTo(0.2);
    expect(result.compliance).toBeCloseTo(0.2);
  });
});

describe('validateTimeFormat', () => {
  it('accepts valid 24h times', () => {
    expect(validateTimeFormat('08:00')).toBe(true);
    expect(validateTimeFormat('18:00')).toBe(true);
    expect(validateTimeFormat('0:00')).toBe(true);
    expect(validateTimeFormat('23:59')).toBe(true);
  });

  it('rejects invalid times', () => {
    expect(validateTimeFormat('25:00')).toBe(false);
    expect(validateTimeFormat('12:60')).toBe(false);
    expect(validateTimeFormat('abc')).toBe(false);
    expect(validateTimeFormat('')).toBe(false);
  });
});

describe('validateDateFormat', () => {
  it('accepts valid YYYY-MM-DD dates', () => {
    expect(validateDateFormat('2026-02-15')).toBe(true);
    expect(validateDateFormat('2026-12-31')).toBe(true);
  });

  it('rejects invalid dates', () => {
    expect(validateDateFormat('15-02-2026')).toBe(false);
    expect(validateDateFormat('2026/02/15')).toBe(false);
    expect(validateDateFormat('abc')).toBe(false);
  });
});

describe('validatePositiveInteger', () => {
  it('accepts positive integers', () => {
    expect(validatePositiveInteger(1)).toBe(true);
    expect(validatePositiveInteger(100)).toBe(true);
  });

  it('rejects zero and negatives', () => {
    expect(validatePositiveInteger(0)).toBe(false);
    expect(validatePositiveInteger(-1)).toBe(false);
  });

  it('rejects floats', () => {
    expect(validatePositiveInteger(1.5)).toBe(false);
  });
});

describe('validateRange', () => {
  it('accepts values within range', () => {
    expect(validateRange(5, 0, 10)).toBe(true);
    expect(validateRange(0, 0, 10)).toBe(true);
    expect(validateRange(10, 0, 10)).toBe(true);
  });

  it('rejects values outside range', () => {
    expect(validateRange(-1, 0, 10)).toBe(false);
    expect(validateRange(11, 0, 10)).toBe(false);
  });

  it('rejects non-numbers', () => {
    expect(validateRange('5', 0, 10)).toBe(false);
  });
});

describe('sanitizeSettings', () => {
  const defaults = {
    team: { membersToMonitor: [] },
    score: { weights: { trackedTime: 0.4 } },
    display: { theme: 'trueBlack' },
  };

  it('fills missing settings with defaults', () => {
    const result = sanitizeSettings({}, defaults);
    expect(result.team.membersToMonitor).toEqual([]);
    expect(result.display.theme).toBe('trueBlack');
  });

  it('preserves user settings over defaults', () => {
    const result = sanitizeSettings({
      display: { theme: 'noirGlass' },
    }, defaults);
    expect(result.display.theme).toBe('noirGlass');
  });

  it('merges nested objects', () => {
    const result = sanitizeSettings({
      score: { taskBaseline: 5 },
    }, defaults);
    expect(result.score.weights).toEqual({ trackedTime: 0.4 });
    expect(result.score.taskBaseline).toBe(5);
  });
});

describe('sanitizeSettings with DEFAULT_SETTINGS', () => {
  it('empty object returns all DEFAULT_SETTINGS fields', () => {
    const result = sanitizeSettings({}, DEFAULT_SETTINGS);
    // Top-level keys all present
    expect(result).toHaveProperty('team');
    expect(result).toHaveProperty('clickup');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('thresholds');
    expect(result).toHaveProperty('sync');
    expect(result).toHaveProperty('schedule');
    expect(result).toHaveProperty('display');
    // Spot-check nested defaults
    expect(result.display.theme).toBe('trueBlack');
    expect(result.schedule.dailyTargetHours).toBe(6.5);
    expect(result.thresholds.offlineMinutes).toBe(60);
    expect(result.sync.intervalMs).toBe(30000);
    expect(result.team.membersToMonitor).toHaveLength(8);
  });

  it('only team.membersToMonitor changed — all other fields remain default', () => {
    const customMembers = ['111', '222'];
    const result = sanitizeSettings(
      { team: { membersToMonitor: customMembers } },
      DEFAULT_SETTINGS
    );
    expect(result.team.membersToMonitor).toEqual(customMembers);
    // All other top-level sections unchanged
    expect(result.display.theme).toBe('trueBlack');
    expect(result.schedule.startTime).toBe('08:00');
    expect(result.schedule.endTime).toBe('18:00');
    expect(result.score.taskBaseline).toBe(3);
    expect(result.thresholds.breakMinutes).toBe(15);
    expect(result.sync.intervalMs).toBe(30000);
  });

  it('nested null value falls back to defaults for that key', () => {
    // When a top-level key is null, (null || {}) = {} → returns defaults for that section
    const result = sanitizeSettings({ display: null }, DEFAULT_SETTINGS);
    expect(result.display.theme).toBe('trueBlack');
    expect(result.display.defaultView).toBe('grid');
  });

  it('primitive value at nested key is kept as-is (no type validation)', () => {
    // sanitizeSettings does deep-merge but does NOT validate types — invalid
    // primitive values for nested object fields are kept (documents current behavior)
    const result = sanitizeSettings({ schedule: { dailyTargetHours: 'invalid' } }, DEFAULT_SETTINGS);
    // The invalid string is kept — sanitizeSettings does not reset invalid primitives to defaults
    expect(result.schedule.dailyTargetHours).toBe('invalid');
    // Other schedule fields unaffected
    expect(result.schedule.startTime).toBe('08:00');
  });
});
