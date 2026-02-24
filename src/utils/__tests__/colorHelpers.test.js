
import { hexToRgba } from '../colorHelpers';

describe('hexToRgba', () => {
  it('converts 6-digit hex to rgba', () => {
    expect(hexToRgba('#ffffff', 0.15)).toBe('rgba(255, 255, 255, 0.15)');
    expect(hexToRgba('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    expect(hexToRgba('#ff0000', 1)).toBe('rgba(255, 0, 0, 1)');
  });

  it('converts 3-digit shorthand hex', () => {
    expect(hexToRgba('#fff', 0.2)).toBe('rgba(255, 255, 255, 0.2)');
    expect(hexToRgba('#000', 0.1)).toBe('rgba(0, 0, 0, 0.1)');
    expect(hexToRgba('#f00', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('handles hex without # prefix', () => {
    expect(hexToRgba('ffffff', 0.15)).toBe('rgba(255, 255, 255, 0.15)');
    expect(hexToRgba('abc', 0.3)).toBe('rgba(170, 187, 204, 0.3)');
  });

  it('handles null/undefined hex with fallback', () => {
    expect(hexToRgba(null, 0.15)).toBe('rgba(0, 0, 0, 0.15)');
    expect(hexToRgba(undefined, 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    expect(hexToRgba('', 0.08)).toBe('rgba(0, 0, 0, 0.08)');
  });

  it('handles zero opacity', () => {
    expect(hexToRgba('#ffffff', 0)).toBe('rgba(255, 255, 255, 0)');
  });

  it('handles full opacity', () => {
    expect(hexToRgba('#111827', 1)).toBe('rgba(17, 24, 39, 1)');
  });
});
