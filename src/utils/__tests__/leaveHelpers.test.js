// Mock the db module — enrichMembersWithLeaveStatus calls db.leaves.toArray() internally
vi.mock('../../db', () => ({
  db: {
    leaves: {
      toArray: vi.fn(),
    },
  },
}));

// Mock calculations.js transitive deps so it can be imported here
vi.mock('../../services/clickup', () => ({
  clickup: { calculateElapsedSeconds: vi.fn(() => null) },
}));

vi.mock('../../services/taskCache', () => ({
  extractCustomFields: vi.fn(),
  extractPriority: vi.fn(),
  extractStatus: vi.fn(),
  extractStatusColor: vi.fn(),
}));

import { getMemberLeaveToday, calculateReturnDate, calculateLeaveDays, getMemberLeaveBalance, enrichMembersWithLeaveStatus } from '../leaveHelpers';
import { countLeaveDaysInRange } from '../../services/sync/calculations';
import { db } from '../../db';

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

describe('getMemberLeaveBalance', () => {
  const memberId = '123';
  const emptyLeaves = [];

  test('uses default quotas when settings is empty', () => {
    const balance = getMemberLeaveBalance(memberId, emptyLeaves, {});
    expect(balance.annual.total).toBe(30);
    expect(balance.sick.total).toBe(10);
    expect(balance.bonus.total).toBe(5);
    expect(balance.wfh.monthly).toBe(2);
  });

  test('reads sickQuota from settings.team.sickQuotas', () => {
    const settings = { team: { sickQuotas: { '123': 15 } } };
    const balance = getMemberLeaveBalance(memberId, emptyLeaves, settings);
    expect(balance.sick.total).toBe(15);
  });

  test('reads bonusQuota from settings.team.bonusQuotas', () => {
    const settings = { team: { bonusQuotas: { '123': 8 } } };
    const balance = getMemberLeaveBalance(memberId, emptyLeaves, settings);
    expect(balance.bonus.total).toBe(8);
  });

  test('reads annualQuota from settings.team.leaveQuotas as flat number', () => {
    const settings = { team: { leaveQuotas: { '123': 21 } } };
    const balance = getMemberLeaveBalance(memberId, emptyLeaves, settings);
    expect(balance.annual.total).toBe(21);
  });
});

// ---------------------------------------------------------------------------
// getMemberLeaveToday — BUG-016 exposure (pending leaves not filtered)
// ---------------------------------------------------------------------------
describe('getMemberLeaveToday — BUG-016 pending leave exposure', () => {
  // Pin today to a known Wednesday so dates are deterministic
  const FIXED_TODAY = '2026-03-11'; // Wednesday

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-03-11T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // BUG-016: this test should FAIL — pending leaves not filtered
  it('member with a PENDING leave should NOT have leave detected (currently fails due to BUG-016)', () => {
    const leaves = [
      {
        memberId: 'member-1',
        memberClickUpId: '99999',
        type: 'annual',
        status: 'pending',
        startDate: FIXED_TODAY,
        endDate: FIXED_TODAY,
      },
    ];
    // BUG-016: getMemberLeaveToday only skips 'rejected'; 'pending' slips through
    const result = getMemberLeaveToday('member-1', leaves);
    expect(result).toBeNull(); // Should be null — pending is not approved
  });
});

// ---------------------------------------------------------------------------
// enrichMembersWithLeaveStatus — uses db mock
// ---------------------------------------------------------------------------
describe('enrichMembersWithLeaveStatus', () => {
  // Pin today to a known date for all tests in this suite
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-03-11T10:00:00')); // Wednesday
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const TODAY = '2026-03-11';
  const YESTERDAY = '2026-03-10';
  const TOMORROW = '2026-03-12';

  it('sets status to "leave" for member with an approved leave today', async () => {
    db.leaves.toArray.mockResolvedValue([
      {
        memberId: 'member-1',
        memberClickUpId: '11111',
        type: 'annual',
        status: 'approved',
        startDate: TODAY,
        endDate: TODAY,
      },
    ]);

    const members = [{ id: 'member-1', clickUpId: '11111', status: 'offline' }];
    const result = await enrichMembersWithLeaveStatus(members);

    expect(result[0].status).toBe('leave');
    expect(result[0].onLeave).toBe(true);
  });

  it('leaves status unchanged for member NOT on leave today', async () => {
    db.leaves.toArray.mockResolvedValue([
      {
        memberId: 'member-2',
        memberClickUpId: '22222',
        type: 'annual',
        status: 'approved',
        startDate: YESTERDAY,
        endDate: YESTERDAY, // leave ended yesterday
      },
    ]);

    const members = [{ id: 'member-2', clickUpId: '22222', status: 'working' }];
    const result = await enrichMembersWithLeaveStatus(members);

    expect(result[0].status).toBe('working');
    expect(result[0].onLeave).toBeUndefined();
  });

  it('WFH member preserves original status — WFH is not a leave', async () => {
    db.leaves.toArray.mockResolvedValue([
      {
        memberId: 'member-3',
        memberClickUpId: '33333',
        type: 'wfh',
        status: 'approved',
        startDate: TODAY,
        endDate: TODAY,
      },
    ]);

    const members = [{ id: 'member-3', clickUpId: '33333', status: 'working' }];
    const result = await enrichMembersWithLeaveStatus(members);

    // WFH should NOT change status to 'leave'
    expect(result[0].status).toBe('working');
    expect(result[0].onWfh).toBe(true);
    expect(result[0].onLeave).toBe(false);
  });

  it('leave overrides working status — leave takes priority over active state', async () => {
    db.leaves.toArray.mockResolvedValue([
      {
        memberId: 'member-4',
        memberClickUpId: '44444',
        type: 'sick',
        status: 'confirmed',
        startDate: TODAY,
        endDate: TOMORROW,
      },
    ]);

    const members = [{ id: 'member-4', clickUpId: '44444', status: 'working' }];
    const result = await enrichMembersWithLeaveStatus(members);

    // Sick leave must override 'working' status
    expect(result[0].status).toBe('leave');
    expect(result[0].onLeave).toBe(true);
  });

  it('leave overrides break status', async () => {
    db.leaves.toArray.mockResolvedValue([
      {
        memberId: 'member-5',
        memberClickUpId: '55555',
        type: 'annual',
        status: 'active',
        startDate: TODAY,
        endDate: TODAY,
      },
    ]);

    const members = [{ id: 'member-5', clickUpId: '55555', status: 'break' }];
    const result = await enrichMembersWithLeaveStatus(members);

    expect(result[0].status).toBe('leave');
  });

  it('leave overrides offline status', async () => {
    db.leaves.toArray.mockResolvedValue([
      {
        memberId: 'member-6',
        memberClickUpId: '66666',
        type: 'annual',
        status: 'approved',
        startDate: TODAY,
        endDate: TODAY,
      },
    ]);

    const members = [{ id: 'member-6', clickUpId: '66666', status: 'offline' }];
    const result = await enrichMembersWithLeaveStatus(members);

    expect(result[0].status).toBe('leave');
  });

  it('returns members unchanged when leaves array is empty', async () => {
    db.leaves.toArray.mockResolvedValue([]);

    const members = [{ id: 'member-7', clickUpId: '77777', status: 'working' }];
    const result = await enrichMembersWithLeaveStatus(members);

    expect(result).toEqual(members);
  });
});

// ---------------------------------------------------------------------------
// countLeaveDaysInRange (from calculations.js)
// ---------------------------------------------------------------------------
describe('countLeaveDaysInRange', () => {
  // Sun 2026-02-15 to Thu 2026-02-19 — standard work week (Sun-Thu)
  const rangeStart = new Date('2026-02-15T00:00:00');
  const rangeEnd   = new Date('2026-02-19T00:00:00');
  const workDaySettings = { schedule: { workDays: [0, 1, 2, 3, 4], publicHolidays: [] } };

  it('returns 0 for empty leaves array', () => {
    const result = countLeaveDaysInRange([], rangeStart, rangeEnd, workDaySettings);
    expect(result).toBe(0);
  });

  it('returns 0 for null leaves', () => {
    const result = countLeaveDaysInRange(null, rangeStart, rangeEnd, workDaySettings);
    expect(result).toBe(0);
  });

  it('counts only approved leaves — rejects pending/rejected', () => {
    const leaves = [
      { startDate: '2026-02-16', endDate: '2026-02-16', status: 'approved' },  // Mon — counted
      { startDate: '2026-02-17', endDate: '2026-02-17', status: 'pending' },   // Tue — excluded
      { startDate: '2026-02-18', endDate: '2026-02-18', status: 'rejected' },  // Wed — excluded
    ];
    const result = countLeaveDaysInRange(leaves, rangeStart, rangeEnd, workDaySettings);
    expect(result).toBe(1); // Only approved Monday counts
  });

  it('counts confirmed and active leaves as valid', () => {
    const leaves = [
      { startDate: '2026-02-15', endDate: '2026-02-15', status: 'confirmed' }, // Sun
      { startDate: '2026-02-16', endDate: '2026-02-16', status: 'active' },    // Mon
    ];
    const result = countLeaveDaysInRange(leaves, rangeStart, rangeEnd, workDaySettings);
    expect(result).toBe(2);
  });

  it('deduplicates overlapping leave records — same day from two records counts once', () => {
    const leaves = [
      { startDate: '2026-02-16', endDate: '2026-02-17', status: 'approved' }, // Mon-Tue
      { startDate: '2026-02-16', endDate: '2026-02-16', status: 'approved' }, // Mon again (overlap)
    ];
    const result = countLeaveDaysInRange(leaves, rangeStart, rangeEnd, workDaySettings);
    expect(result).toBe(2); // Mon + Tue, not 3
  });

  it('respects workDays setting — only counts Sun-Thu, not Fri-Sat', () => {
    // Leave spanning full week including weekend
    const leaves = [
      { startDate: '2026-02-15', endDate: '2026-02-21', status: 'approved' }, // Sun–Sat
    ];
    const weekStart = new Date('2026-02-15T00:00:00');
    const weekEnd   = new Date('2026-02-21T00:00:00');
    const result = countLeaveDaysInRange(leaves, weekStart, weekEnd, workDaySettings);
    expect(result).toBe(5); // Only Sun-Thu (5 working days)
  });

  it('respects publicHolidays — holiday not counted as leave day', () => {
    const settingsWithHoliday = {
      schedule: {
        workDays: [0, 1, 2, 3, 4],
        publicHolidays: ['2026-02-16'], // Monday is a public holiday
      },
    };
    const leaves = [
      { startDate: '2026-02-15', endDate: '2026-02-17', status: 'approved' }, // Sun–Tue
    ];
    // Sun(15) + Mon(16=holiday) + Tue(17) = Sun + Tue = 2 (Mon excluded as holiday)
    const result = countLeaveDaysInRange(leaves, rangeStart, rangeEnd, settingsWithHoliday);
    expect(result).toBe(2);
  });

  it('clips leave range to the query range boundaries', () => {
    // Leave starts before and ends after the query range
    const leaves = [
      { startDate: '2026-02-01', endDate: '2026-02-28', status: 'approved' },
    ];
    // Query range is only Sun 2026-02-15 to Thu 2026-02-19 → 5 working days
    const result = countLeaveDaysInRange(leaves, rangeStart, rangeEnd, workDaySettings);
    expect(result).toBe(5);
  });

  it('uses default workDays [0-4] when settings is null', () => {
    const leaves = [
      { startDate: '2026-02-15', endDate: '2026-02-19', status: 'approved' }, // Sun–Thu
    ];
    const result = countLeaveDaysInRange(leaves, rangeStart, rangeEnd, null);
    expect(result).toBe(5);
  });
});
