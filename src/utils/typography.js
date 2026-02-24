/**
 * Typography utilities for multi-language and numeric display
 * Based on 2025 best practices for web typography
 */

/**
 * Detects if text contains Arabic characters
 */
export const isRTL = (text) => {
  if (!text) return false;
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
