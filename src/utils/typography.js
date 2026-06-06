/**
 * Typography utilities for multi-language and numeric display
 * Based on 2025 best practices for web typography
 */

/**
 * Coerce a value to a safe string for rendering as a JSX child.
 * Guards against raw objects (e.g. legacy ClickUp list/status objects in
 * stale IndexedDB data) reaching React, which throws error #31.
 * Strings/numbers pass through; everything else (objects, arrays) \u2192 ''.
 */
export const safeText = (value) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

/**
 * Detects if text contains Arabic characters
 */
export const isRTL = (text) => {
  if (!text || typeof text !== 'string') return false;
  return /[\u0600-\u06FF]/.test(text);
};

/**
 * Get the appropriate font family based on content type
 *
 * @param {string} type - 'arabic' | 'english' | 'number'
 * @returns {string} Font family CSS value
 */
export const getFontFamily = (type) => {
  switch (type) {
    case 'arabic':
      // Noto Sans Arabic - optimized for Arabic screen reading
      return "'Noto Sans Arabic', sans-serif";
    case 'number':
      // JetBrains Mono with tabular figures for aligned numbers
      return "'JetBrains Mono', monospace";
    case 'english':
    default:
      // Inter - optimized for UI/screen reading
      return "'Inter', sans-serif";
  }
};

/**
 * Get font family for mixed content (auto-detects Arabic)
 */
export const getAdaptiveFontFamily = (text) => {
  if (!text) return getFontFamily('english');
  return isRTL(text) ? getFontFamily('arabic') : getFontFamily('english');
};

/**
 * CSS style object for tabular numbers (for timers, data tables)
 * Ensures numbers are monospaced and aligned
 */
export const tabularNumberStyle = {
  fontFamily: getFontFamily('number'),
  fontVariantNumeric: 'tabular-nums lining-nums',
  fontFeatureSettings: '"tnum", "lnum"',
};

/**
 * Get complete font style for text content
 */
export const getTextFontStyle = (text) => ({
  fontFamily: getAdaptiveFontFamily(text),
});
