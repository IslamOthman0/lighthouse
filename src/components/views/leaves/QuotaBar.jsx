import React from 'react';
import { tabularNumberStyle } from '../../../utils/typography';

/**
 * Reusable quota progress bar with "used/total (remaining left)" label.
 * @param {string} label - e.g. "Annual", "Sick"
 * @param {number} used - Days used
 * @param {number} total - Total quota
 * @param {string} color - Bar fill color (hex, from TYPE_COLORS)
 * @param {Object} theme - Theme object (used for lightMode track bg)
 * @param {boolean} compact - Compact mode for team overview cards
 */
const QuotaBar = ({ label, used, total, color, theme, compact = false }) => {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const remaining = Math.max(0, total - used);
  // Track bg differs between light/dark: light uses color tint, dark uses white/10
  const trackBg = theme.type === 'light' ? `${color}15` : 'rgba(255,255,255,0.06)';

  return (
    <div className={compact ? 'mb-[6px]' : 'mb-[10px]'}>
      <div className={`flex justify-between items-center mb-[3px] ${compact ? 'text-[11px]' : 'text-xs'} text-[var(--color-text-secondary)]`}>
        <span>{label}</span>
        <span className="text-[var(--color-text)] font-medium" style={tabularNumberStyle}>
          {used}/{total}
          {!compact && <span className="text-[var(--color-text-secondary)] font-normal"> ({remaining} left)</span>}
        </span>
      </div>
      <div
        className={`${compact ? 'h-1' : 'h-[6px]'} rounded-full overflow-hidden`}
        style={{ background: trackBg }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
};

export default QuotaBar;
