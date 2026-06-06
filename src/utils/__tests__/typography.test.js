import { safeText, isRTL } from '../typography';

describe('safeText', () => {
  it('passes through strings unchanged', () => {
    expect(safeText('Hello')).toBe('Hello');
    expect(safeText('')).toBe('');
  });

  it('converts finite numbers to strings', () => {
    expect(safeText(42)).toBe('42');
    expect(safeText(0)).toBe('0');
  });

  it('returns empty string for non-finite numbers', () => {
    expect(safeText(NaN)).toBe('');
    expect(safeText(Infinity)).toBe('');
  });

  it('returns empty string for null and undefined', () => {
    expect(safeText(null)).toBe('');
    expect(safeText(undefined)).toBe('');
  });

  it('returns empty string for raw objects (the React #31 guard)', () => {
    // This is the exact shape of a stale ClickUp list object that caused error #31
    const listObject = {
      id: '901', name: 'Digitization Queue', status: null,
      custom_type: null, color: '#fff', team_id: '123',
      deleted: false, url: 'x', access: true, custom_id: null,
    };
    expect(safeText(listObject)).toBe('');
    expect(safeText({})).toBe('');
    expect(safeText([1, 2, 3])).toBe('');
  });
});

describe('isRTL', () => {
  it('detects Arabic text', () => {
    expect(isRTL('مرحبا')).toBe(true);
  });

  it('returns false for English text', () => {
    expect(isRTL('Hello')).toBe(false);
  });

  it('returns false for non-string values (no crash)', () => {
    expect(isRTL(null)).toBe(false);
    expect(isRTL(undefined)).toBe(false);
    expect(isRTL({ name: 'x' })).toBe(false);
    expect(isRTL(42)).toBe(false);
  });
});
