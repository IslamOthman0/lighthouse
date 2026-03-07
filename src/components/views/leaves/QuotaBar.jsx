import React from 'react';
import { tabularNumberStyle } from '../../../utils/typography';

/**
 * Reusable quota progress bar with "used/total (remaining left)" label.
 * @param {string} label - e.g. "Annual", "Sick"
 * @param {number} used - Days used
 * @param {number} total - Total quota
 * @param {string} color - Bar fill color (hex)
 * @param {Object} theme - Theme object
 * @param {boolean} compact - Compact mode for team overview cards
 */
const QuotaBar = ({ label, used, total, color, theme, compact = false }) => {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const remaining = Math.max(0, total - used);

  return (
    <div style={{ marginBottom: compact ? 6 : 10 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
        fontSize: compact ? 11 : 12,
        color: theme.textSecondary,
      }}>
        <span>{label}</span>
        <span style={{ ...tabularNumberStyle, color: theme.text, fontWeight: 500 }}>
          {used}/{total}
          {!compact && <span style={{ color: theme.textSecondary, fontWeight: 400 }}> ({remaining} left)</span>}
        </span>
      </div>
      <div style={{
        height: compact ? 4 : 6,
        borderRadius: 3,
        background: theme.type === 'light' ? `${color}15` : `${theme.text}10`,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 3,
          background: color,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
};

export default QuotaBar;
