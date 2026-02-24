/**
 * Color utility helpers
 * Provides proper color conversion functions to replace broken
 * template literal patterns like `${hex}15`
 */

/**
 * Convert hex color to rgba string with proper opacity
 * @param {string} hex - Hex color string (e.g., '#ffffff' or '#fff')
 * @param {number} opacity - Opacity value 0-1 (e.g., 0.15)
 * @returns {string} rgba string (e.g., 'rgba(255, 255, 255, 0.15)')
 */
export function hexToRgba(hex, opacity) {
  if (!hex) return `rgba(0, 0, 0, ${opacity})`;

  // Remove # prefix
  let h = hex.replace('#', '');

  // Expand shorthand (e.g., 'fff' → 'ffffff')
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
