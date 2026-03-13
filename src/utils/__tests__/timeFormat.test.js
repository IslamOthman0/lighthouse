import { formatHoursToHM, formatMinutesToHM } from '../timeFormat';

describe('formatHoursToHM', () => {
  it('formats hours and minutes', () => {
    expect(formatHoursToHM(6.45)).toBe('6h 27m');
    expect(formatHoursToHM(2.5)).toBe('2h 30m');
    expect(formatHoursToHM(1.25)).toBe('1h 15m');
  });

  it('formats hours only (no minutes)', () => {
    expect(formatHoursToHM(2.0)).toBe('2h');
    expect(formatHoursToHM(1)).toBe('1h');
  });

  it('formats minutes only (no hours)', () => {
    expect(formatHoursToHM(0.5)).toBe('30m');
    expect(formatHoursToHM(0.08)).toBe('5m');
  });

  it('handles zero', () => {
    expect(formatHoursToHM(0)).toBe('0m');
  });

  it('handles 60-minute rollover edge case', () => {
    // 0.999... hours = ~60 minutes should roll to 1h
    expect(formatHoursToHM(0.9999)).toBe('1h');
  });

  it('handles large values', () => {
    expect(formatHoursToHM(10.5)).toBe('10h 30m');
  });

  it('handles values above 24h (e.g. 24.5)', () => {
    expect(formatHoursToHM(24.5)).toBe('24h 30m');
  });

  it('handles undefined/null/NaN gracefully — returns 0m', () => {
    expect(formatHoursToHM(undefined)).toBe('0m');
    expect(formatHoursToHM(null)).toBe('0m');
    expect(formatHoursToHM(NaN)).toBe('0m');
  });
});

describe('formatMinutesToHM', () => {
  it('formats mixed hours and minutes', () => {
    expect(formatMinutesToHM(387)).toBe('6h 27m');
    expect(formatMinutesToHM(150)).toBe('2h 30m');
  });

  it('formats exact hours', () => {
    expect(formatMinutesToHM(120)).toBe('2h');
    expect(formatMinutesToHM(60)).toBe('1h');
  });

  it('formats minutes only', () => {
    expect(formatMinutesToHM(30)).toBe('30m');
    expect(formatMinutesToHM(5)).toBe('5m');
  });

  it('handles zero', () => {
    expect(formatMinutesToHM(0)).toBe('0m');
  });

  it('handles negative minutes — does not crash (documents current behavior)', () => {
    // Guard catches undefined/null/NaN but NOT negatives.
    // Math.floor(-5/60)=-1, Math.round(-5%60)=-5 → returns "-1h -5m"
    // This documents the current (unguarded) output; callers should never pass negatives.
    expect(formatMinutesToHM(-5)).toBe('-1h -5m');
  });

  it('handles undefined/null/NaN gracefully — returns 0m', () => {
    expect(formatMinutesToHM(undefined)).toBe('0m');
    expect(formatMinutesToHM(null)).toBe('0m');
    expect(formatMinutesToHM(NaN)).toBe('0m');
  });
});
