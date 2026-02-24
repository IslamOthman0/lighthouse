import { getMemberLeaveToday, calculateReturnDate, calculateLeaveDays } from '../leaveHelpers';

describe('getMemberLeaveToday', () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const leaves = [
    { memberId: '100', memberClickUpId: '200', type: 'annual', status: 'approved', startDate: today, endDate: today },
    { memberId: '101', memberClickUpId: '201', type: 'wfh', status: 'approved', startDate: today, endDate: today },
    { memberId: '102', memberClickUpId: '202', type: 'sick', status: 'rejected', startDate: today, endDate: today },
    { memberId: '103', memberClickUpId: '203', type: 'annual', status: 'approved', startDate: yesterday, endDate: yesterday },
    { memberId: '104', memberClickUpId: '204', type: 'annual', status: 'approved', startDate: yesterday, endDate: tomorrow },
  ];

  it('finds leave by memberId', () => {
    const result = getMemberLeaveToday('100', leaves);
    expect(result).not.toBeNull();
    expect(result.type).toBe('annual');
  });

  it('finds leave by memberClickUpId', () => {
    const result = getMemberLeaveToday('200', leaves);
    expect(result).not.toBeNull();
    expect(result.type).toBe('annual');
  });

  it('finds WFH today', () => {
    const result = getMemberLeaveToday('101', leaves);
    expect(result).not.toBeNull();
    expect(result.type).toBe('wfh');
  });

  it('skips rejected leaves', () => {
    const result = getMemberLeaveToday('102', leaves);
    expect(result).toBeNull();
  });

  it('returns null for past leaves', () => {
    const result = getMemberLeaveToday('103', leaves);
    expect(result).toBeNull();
  });

  it('matches date range leaves spanning today', () => {
    const result = getMemberLeaveToday('104', leaves);
    expect(result).not.toBeNull();
  });

  it('returns null for unknown member', () => {
    const result = getMemberLeaveToday('999', leaves);
    expect(result).toBeNull();
  });
});

describe('calculateReturnDate', () => {
  it('returns next day for mid-week leave', () => {
    // Wednesday 2026-02-11 → Thursday 2026-02-12
    const result = calculateReturnDate('2026-02-11', [0, 1, 2, 3, 4]);
    expect(result).toBe('2026-02-12');
  });

  it('skips non-working days (Fri/Sat)', () => {
    // Thursday 2026-02-12 → Sunday 2026-02-15
    const result = calculateReturnDate('2026-02-12', [0, 1, 2, 3, 4]);
    expect(result).toBe('2026-02-15');
  });

  it('returns null for empty input', () => {
    expect(calculateReturnDate(null)).toBeNull();
    expect(calculateReturnDate('')).toBeNull();
  });
});

describe('calculateLeaveDays', () => {
  it('counts single day', () => {
    expect(calculateLeaveDays('2026-02-15', '2026-02-15', [0, 1, 2, 3, 4])).toBe(1);
  });

  it('counts working days only (Sun-Thu)', () => {
    // Sun Feb 15 to Sat Feb 21 = Sun,Mon,Tue,Wed,Thu = 5 working days
    expect(calculateLeaveDays('2026-02-15', '2026-02-21', [0, 1, 2, 3, 4])).toBe(5);
  });

  it('returns 0 for no start date', () => {
    expect(calculateLeaveDays(null, '2026-02-15')).toBe(0);
    expect(calculateLeaveDays('', '2026-02-15')).toBe(0);
  });

  it('uses startDate as endDate when no end provided', () => {
    expect(calculateLeaveDays('2026-02-16', null, [0, 1, 2, 3, 4])).toBe(1); // Monday
  });

  it('returns 0 for weekend-only range', () => {
    // Fri Feb 20 to Sat Feb 21 (with Sun-Thu workdays) = 0 working days
    expect(calculateLeaveDays('2026-02-20', '2026-02-21', [0, 1, 2, 3, 4])).toBe(0);
  });
});
