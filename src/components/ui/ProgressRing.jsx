import React from 'react';

// Progress Ring with percentage INSIDE (no shadow behind, animated)
const ProgressRing = ({ progress, color, size = 60, strokeWidth = 5, theme }) => {
  const safeProgress = progress || 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(safeProgress, 100) / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Ring SVG */}
      <svg
        width={size}
        height={size}
        style={{
          position: 'relative',
          transform: 'rotate(-90deg)',
          zIndex: 1,
        }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.border}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease',
          }}
        />
      </svg>

      {/* Percentage text INSIDE */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size > 70 ? '16px' : '13px',
          fontWeight: '700',
          color: color,
          zIndex: 2,
        }}
      >
        {Math.round(safeProgress)}%
      </div>
    </div>
  );
};

export default ProgressRing;
