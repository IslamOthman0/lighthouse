/**
 * Metric Color Utility
 * Returns dynamic colors based on percentage values for metrics (time, score, compliance, etc.)
 *
 * Thresholds:
 * - 0-29%: Critical (red)
 * - 30-49%: Low (orange)
 * - 50-69%: Moderate (amber)
 * - 70-99%: Good (green)
 * - 100%: Perfect (white)
 * - >100% with isTime flag: Overwork (orange)
 */

/**
 * Returns a Tailwind text color class for a metric percentage
 * @param {number} pct - Percentage value (0-100+)
 * @param {Object} options
 * @param {boolean} options.isTime - If true, values >100% use overwork color instead of perfect
 * @returns {string} Tailwind class name
 */
export function getMetricColorClass(pct, { isTime = false } = {}) {
  if (isTime && pct > 100) return 'text-metric-overwork';
  if (pct >= 100) return 'text-metric-perfect';
  if (pct >= 70) return 'text-metric-good';
  if (pct >= 50) return 'text-metric-moderate';
  if (pct >= 30) return 'text-metric-low';
  return 'text-metric-critical';
}

/**
 * Returns a hex color value for a metric percentage
 * Use this for inline styles, charts, SVGs, etc.
 * @param {number} pct - Percentage value (0-100+)
 * @param {Object} options
 * @param {boolean} options.isTime - If true, values >100% use overwork color
 * @returns {string} Hex color code
 */
export function getMetricColor(pct, { isTime = false } = {}) {
  if (isTime && pct > 100) return '#f97316'; // orange
  if (pct >= 100) return '#ffffff'; // white
  if (pct >= 70) return '#22c55e'; // green
  if (pct >= 50) return '#f59e0b'; // amber
  if (pct >= 30) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Returns a Tailwind background color class for a metric percentage
 * Useful for progress bars, badges, etc.
 * @param {number} pct - Percentage value (0-100+)
 * @param {Object} options
 * @param {boolean} options.isTime - If true, values >100% use overwork color
 * @returns {string} Tailwind class name
 */
export function getMetricBgClass(pct, { isTime = false } = {}) {
  if (isTime && pct > 100) return 'bg-metric-overwork';
  if (pct >= 100) return 'bg-metric-perfect';
  if (pct >= 70) return 'bg-metric-good';
  if (pct >= 50) return 'bg-metric-moderate';
  if (pct >= 30) return 'bg-metric-low';
  return 'bg-metric-critical';
}

/**
 * Returns a human-readable label for a metric percentage
 * @param {number} pct - Percentage value (0-100+)
 * @param {Object} options
 * @param {boolean} options.isTime - If true, values >100% labeled as "Overwork"
 * @returns {string} Label
 */
export function getMetricLabel(pct, { isTime = false } = {}) {
  if (isTime && pct > 100) return 'Overwork';
  if (pct >= 100) return 'Perfect';
  if (pct >= 70) return 'Good';
  if (pct >= 50) return 'Moderate';
  if (pct >= 30) return 'Low';
  return 'Critical';
}
