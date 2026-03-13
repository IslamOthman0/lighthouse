import { calculateWorkingDays } from '../sync/calculations';
import { toLocalDateStr } from '../../utils/timeFormat';

describe('Date Range and Working Days', () => {
  describe('calculateWorkingDays', () => {
    it('calculates 1 day for same-day range', () => {
      const startDate = new Date('2026-02-16T00:00:00'); // Sunday
      const endDate = new Date('2026-02-16T23:59:59');
      expect(calculateWorkingDays(startDate, endDate)).toBe(1);
    });

    it('calculates 2 working days for Sun-Mon', () => {
      const startDate = new Date('2026-02-16T00:00:00'); // Sunday
      const endDate = new Date('2026-02-17T23:59:59');   // Monday
      expect(calculateWorkingDays(startDate, endDate)).toBe(2);
    });

    it('calculates 5 working days for full week (Sun-Thu)', () => {
      const startDate = new Date('2026-02-15T00:00:00'); // Sunday
      const endDate = new Date('2026-02-19T23:59:59');   // Thursday
      expect(calculateWorkingDays(startDate, endDate)).toBe(5);
    });

    it('excludes Friday and Saturday (Egypt weekend)', () => {
      const startDate = new Date('2026-02-15T00:00:00'); // Sunday
      const endDate = new Date('2026-02-21T23:59:59');   // Saturday (next week)
      // Feb 15 (Sun), 16 (Mon), 17 (Tue), 18 (Wed), 19 (Thu) = 5 days
      // Feb 20 (Fri), 21 (Sat) = weekend, excluded
      expect(calculateWorkingDays(startDate, endDate)).toBe(5);
    });

    it('calculates 0 working days for Friday-Saturday only, returns minimum 1', () => {
      const startDate = new Date('2026-02-20T00:00:00'); // Friday
      const endDate = new Date('2026-02-21T23:59:59');   // Saturday
      // Should return 1 (minimum) even though no working days
      expect(calculateWorkingDays(startDate, endDate)).toBe(1);
    });

    it('handles multi-week ranges correctly', () => {
      const startDate = new Date('2026-02-01T00:00:00'); // Sunday, Feb 1
      const endDate = new Date('2026-02-28T23:59:59');   // Saturday, Feb 28
      // Feb 2026: 4 full weeks = 20 working days + partial days
      // 1 (Sun) + 2-5 (M-Th) + 8-12 (Sun-Th) + 15-19 (Sun-Th) + 22-26 (Sun-Th) = 20 days
      expect(calculateWorkingDays(startDate, endDate)).toBe(20);
    });

    it('returns 1 for single Friday (minimum)', () => {
      const startDate = new Date('2026-02-20T00:00:00'); // Friday
      const endDate = new Date('2026-02-20T23:59:59');
      expect(calculateWorkingDays(startDate, endDate)).toBe(1);
    });
  });

  describe('Date normalization in store', () => {
    it('normalizes Date objects to ISO strings', () => {
      const normalizeDate = (date) => {
        if (!date) return null;
        if (date instanceof Date) {
          return date.toISOString().split('T')[0];
        }
        if (typeof date === 'string') {
          return date.split('T')[0];
        }
        return date;
      };

      const date = new Date('2026-02-16T12:34:56');
      expect(normalizeDate(date)).toBe('2026-02-16');
    });

    it('extracts date from ISO datetime string', () => {
      const normalizeDate = (date) => {
        if (!date) return null;
        if (typeof date === 'string') {
          return date.split('T')[0];
        }
        return date;
      };

      expect(normalizeDate('2026-02-16T00:00:00')).toBe('2026-02-16');
      expect(normalizeDate('2026-02-16T23:59:59.999Z')).toBe('2026-02-16');
    });

    it('handles null and undefined', () => {
      const normalizeDate = (date) => {
        if (!date) return null;
        if (date instanceof Date) {
          return date.toISOString().split('T')[0];
        }
        return date;
      };

      expect(normalizeDate(null)).toBe(null);
      expect(normalizeDate(undefined)).toBe(null);
    });
  });

  describe('Time entry filtering', () => {
    it('includes entry that overlaps range', () => {
      const rangeStart = new Date('2026-02-16T08:00:00').getTime();
      const rangeEnd = new Date('2026-02-16T18:00:00').getTime();

      // Entry that starts before and ends during range
      const entry1 = {
        start: String(new Date('2026-02-16T07:00:00').getTime()),
        end: String(new Date('2026-02-16T09:00:00').getTime()),
      };

      // Entry entirely within range
      const entry2 = {
        start: String(new Date('2026-02-16T10:00:00').getTime()),
        end: String(new Date('2026-02-16T12:00:00').getTime()),
      };

      // Entry that starts during and ends after range
      const entry3 = {
        start: String(new Date('2026-02-16T17:00:00').getTime()),
        end: String(new Date('2026-02-16T19:00:00').getTime()),
      };

      // Entry outside range (before)
      const entry4 = {
        start: String(new Date('2026-02-16T06:00:00').getTime()),
        end: String(new Date('2026-02-16T07:00:00').getTime()),
      };

      // Entry outside range (after)
      const entry5 = {
        start: String(new Date('2026-02-16T19:00:00').getTime()),
        end: String(new Date('2026-02-16T20:00:00').getTime()),
      };

      const filterEntry = (entry) => {
        const entryStart = parseInt(entry.start);
        const entryEnd = parseInt(entry.end || Date.now());
        return entryStart <= rangeEnd && entryEnd >= rangeStart;
      };

      expect(filterEntry(entry1)).toBe(true);  // Overlaps
      expect(filterEntry(entry2)).toBe(true);  // Within
      expect(filterEntry(entry3)).toBe(true);  // Overlaps
      expect(filterEntry(entry4)).toBe(false); // Before
      expect(filterEntry(entry5)).toBe(false); // After
    });

    it('includes running timer (no end) if started within range', () => {
      const rangeStart = new Date('2026-02-16T08:00:00').getTime();
      const rangeEnd = new Date('2026-02-16T18:00:00').getTime();
      const now = new Date('2026-02-16T12:00:00').getTime(); // Simulated "now" within range

      const runningTimer = {
        start: String(new Date('2026-02-16T10:00:00').getTime()),
        end: null, // Running timer
      };

      const filterEntry = (entry, currentTime = now) => {
        const entryStart = parseInt(entry.start);
        const entryEnd = parseInt(entry.end || currentTime);
        return entryStart <= rangeEnd && entryEnd >= rangeStart;
      };

      expect(filterEntry(runningTimer, now)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// BUG-001 / BUG-002 — toLocalDateStr vs toISOString UTC shift
// Snapshot date keys must use LOCAL date (Egypt = UTC+2/+3), not UTC.
// At midnight local (00:00 Egypt) = 22:00 previous day UTC → toISOString()
// returns yesterday's date, saving/loading snapshot under wrong key.
// ---------------------------------------------------------------------------
describe('toLocalDateStr — BUG-001/BUG-002 UTC date shift safety', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('BUG-001: returns local date for yesterday snapshot — not UTC date', () => {
    // Simulate 00:30 local Egypt time (UTC+2) = 22:30 UTC previous day
    // Local date = 2026-03-12, UTC date = 2026-03-11 (wrong)
    vi.setSystemTime(new Date('2026-03-11T22:30:00Z')); // 00:30 Egypt

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // BUG-001: old code used toISOString() — gives UTC date (wrong)
    const utcYesterday = yesterday.toISOString().split('T')[0]; // '2026-03-10' (UTC - 2 days ago locally!)

    // Fix: use toLocalDateStr
    const localYesterday = toLocalDateStr(yesterday); // '2026-03-11' (correct local yesterday)

    // In Egypt at 00:30 local on Mar 12, yesterday should be Mar 11
    // UTC says yesterday is Mar 10 (wrong), local says Mar 11 (correct)
    expect(localYesterday).toBe('2026-03-11');
    expect(utcYesterday).not.toBe(localYesterday); // proves bug exists
  });

  it('BUG-002: returns local date for today snapshot — not UTC date', () => {
    // Simulate 00:30 local Egypt time (UTC+2) on 2026-03-12
    vi.setSystemTime(new Date('2026-03-11T22:30:00Z')); // 00:30 Egypt on Mar 12

    // BUG-002: old code used new Date().toISOString().split('T')[0] — gives UTC date
    const utcToday = new Date().toISOString().split('T')[0]; // '2026-03-11' (UTC yesterday!)

    // Fix: use toLocalDateStr()
    const localToday = toLocalDateStr(); // '2026-03-12' (correct local today)

    expect(localToday).toBe('2026-03-12');
    expect(utcToday).not.toBe(localToday); // proves bug exists
  });

  it('BUG-002: cutoff date for pruning also uses local date', () => {
    vi.setSystemTime(new Date('2026-03-11T22:30:00Z')); // 00:30 Egypt on Mar 12

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const utcCutoff = cutoff.toISOString().split('T')[0]; // UTC — off by 1 day
    const localCutoff = toLocalDateStr(cutoff);           // Local — correct

    expect(localCutoff).toBe('2025-12-12'); // 90 days before Mar 12
    expect(utcCutoff).not.toBe(localCutoff); // proves bug exists
  });
});
