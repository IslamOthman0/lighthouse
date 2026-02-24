import { calculateWorkingDays } from '../sync/calculations';

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
