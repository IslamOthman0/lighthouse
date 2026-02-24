import React from 'react';
import { getFontFamily } from '../../utils/typography';

// ClickUp native priority colors
const PRIORITY_CONFIG = {
  urgent: { color: '#F50537', label: 'Urgent' },
  high: { color: '#FFCC00', label: 'High' },
  normal: { color: '#6FDDFF', label: 'Normal' },
  low: { color: '#D8D8D8', label: 'Low' },
  // Legacy fallback
  medium: { color: '#6FDDFF', label: 'Normal' },
};

// Convert hex color to rgba string
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// SVG flag icon matching ClickUp's native style
const FlagIcon = ({ color, size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 2v12M3 2h8.5l-2 3.5 2 3.5H3"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={hexToRgba(color, 0.19)}
    />
  </svg>
);

/**
 * PriorityFlag — Shared priority display component
 * Renders a ClickUp-style colored flag + label
 *
 * @param {string} priority - Priority value ("Urgent", "High", "Normal", "Low", "Medium")
 * @param {boolean} showLabel - Show text label (default: true)
 * @param {number} size - Icon size in px (default: 14)
 * @param {string} fontSize - Label font size (default: '12px')
 */
const PriorityFlag = ({ priority, showLabel = true, size = 14, fontSize = '12px' }) => {
  if (!priority) return null;

  const config = PRIORITY_CONFIG[priority.toLowerCase()] || PRIORITY_CONFIG.normal;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <FlagIcon color={config.color} size={size} />
      {showLabel && (
        <span
          style={{
            fontSize,
            fontWeight: '600',
            color: config.color,
            fontFamily: getFontFamily('english'),
          }}
        >
          {config.label}
        </span>
      )}
    </span>
  );
};

/**
 * PriorityBadge — Flag + label inside a bordered pill
 * Used in WorkingCard and similar prominent placements
 */
export const PriorityBadge = ({ priority, size = 14, fontSize = '10px' }) => {
  if (!priority) return null;

  const config = PRIORITY_CONFIG[priority.toLowerCase()] || PRIORITY_CONFIG.normal;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 10px',
        borderRadius: '6px',
        background: hexToRgba(config.color, 0.09),
        border: `1px solid ${hexToRgba(config.color, 0.21)}`,
      }}
    >
      <FlagIcon color={config.color} size={size} />
      <span
        style={{
          fontSize,
          fontWeight: '700',
          color: config.color,
          fontFamily: getFontFamily('english'),
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        {config.label}
      </span>
    </div>
  );
};

// Export config for external use (e.g., grouping by priority)
export const PRIORITIES = PRIORITY_CONFIG;

export default PriorityFlag;
