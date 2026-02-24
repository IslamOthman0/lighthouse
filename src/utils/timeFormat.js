/**
 * Time formatting utilities for converting decimal hours and minutes to "Xh Xm" format
 */

/**
 * Converts decimal hours to "Xh Xm" format
 * @param {number} decimalHours - Hours in decimal format (e.g., 6.45)
 * @returns {string} Formatted time string (e.g., "6h 27m", "30m", "2h")
 *
 * Examples:
 * - 6.45 → "6h 27m"
 * - 0.5 → "30m"
 * - 2.0 → "2h"
 * - 0.08 → "5m"
 * - 1.0 (with 60 min rounding) → "2h" (handles 60m edge case)
 */
export const formatHoursToHM = (decimalHours) => {
  let hours = Math.floor(decimalHours);
  let minutes = Math.round((decimalHours - hours) * 60);

  // Handle edge case: 60 minutes should roll over to 1 hour
  if (minutes >= 60) {
    hours += Math.floor(minutes / 60);
    minutes = minutes % 60;
  }

  if (hours === 0 && minutes === 0) {
    return '0m';
  }
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};

/**
 * Converts total minutes to "Xh Xm" format
 * @param {number} totalMinutes - Total minutes (e.g., 387)
 * @returns {string} Formatted time string (e.g., "6h 27m", "30m", "2h")
 *
 * Examples:
 * - 387 → "6h 27m"
 * - 30 → "30m"
 * - 120 → "2h"
 * - 60 → "1h"
 * - 0 → "0m"
 */
export const formatMinutesToHM = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  if (hours === 0 && minutes === 0) {
    return '0m';
  }
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};
