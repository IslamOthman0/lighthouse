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
});
