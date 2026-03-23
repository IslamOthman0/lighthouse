import React from 'react';

/**
 * Sparkline - A compact trend visualization component
 * Displays a small inline chart showing data trends without axes
 *
 * @param {Array} data - Array of numeric values to visualize
 * @param {number} width - Chart width in pixels (default: 120)
 * @param {number} height - Chart height in pixels (default: 32)
 * @param {string} color - Line/fill color
 * @param {boolean} showMarkers - Whether to show peak/low markers
 * @param {Object} theme - Theme object (kept for backward compat)
 */
const Sparkline = ({
  data = [],
  width = 120,
  height = 32,
  color = '#10B981',
  showMarkers = true,
  theme = {}
}) => {
  if (!data || data.length < 2) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>No data</span>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Use a fixed internal coordinate space so geometry is always correct,
  // regardless of whether width is a number or "100%".
  const VB_WIDTH = 300;
  const VB_HEIGHT = height;

  // Padding for markers
  const padding = 4;
  const chartWidth = VB_WIDTH - padding * 2;
  const chartHeight = VB_HEIGHT - padding * 2;

  // Calculate points for the line
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y, value };
  });

  // Create SVG path
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Create fill path (area under the line)
  const fillD = `${pathD} L ${points[points.length - 1].x} ${VB_HEIGHT - padding} L ${padding} ${VB_HEIGHT - padding} Z`;

  // Find peak and low indices
  const maxIndex = data.indexOf(max);
  const minIndex = data.indexOf(min);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`} style={{ overflow: 'visible', display: 'block' }}>
      {/* Gradient fill under the line */}
      <defs>
        <linearGradient id={`sparkline-gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Fill area */}
      <path
        d={fillD}
        fill={`url(#sparkline-gradient-${color.replace('#', '')})`}
      />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Markers for peak and low */}
      {showMarkers && (
        <>
          {/* Peak marker */}
          <circle
            cx={points[maxIndex].x}
            cy={points[maxIndex].y}
            r="3"
            fill={color}
            stroke="#fff"
            strokeWidth="1"
          />
          {/* Low marker */}
          <circle
            cx={points[minIndex].x}
            cy={points[minIndex].y}
            r="3"
            fill="var(--color-warning)"
            stroke="#fff"
            strokeWidth="1"
          />
          {/* Current value marker (last point) */}
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="3"
            fill="#fff"
            stroke={color}
            strokeWidth="1.5"
          />
        </>
      )}
    </svg>
  );
};

/**
 * SparklineWithStats - Sparkline with summary statistics below
 */
export const SparklineWithStats = ({
  data = [],
  labels = [],
  width = 200,
  height = 60,
  color = '#10B981',
  theme = {},
  formatValue = (v) => v,
}) => {
  if (!data || data.length < 2) {
    return (
      <div style={{
        width: '100%',
        height: height + 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-inner-bg)',
        borderRadius: '8px',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Not enough data</span>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;

  const minIndex = data.indexOf(min);
  const maxIndex = data.indexOf(max);

  return (
    <div style={{ width: '100%' }}>
      <Sparkline
        data={data}
        width="100%"
        height={height}
        color={color}
        showMarkers={true}
        theme={theme}
      />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '8px',
        padding: '6px 8px',
        background: 'var(--color-inner-bg)',
        borderRadius: '6px',
        fontSize: '10px',
        color: 'var(--color-text-muted)',
      }}>
        <span>Best: <strong style={{ color: color }}>{formatValue(max)}</strong> {labels[maxIndex] && `(${labels[maxIndex]})`}</span>
        <span>Low: <strong style={{ color: 'var(--color-warning)' }}>{formatValue(min)}</strong></span>
        <span>Avg: <strong style={{ color: 'var(--color-text)' }}>{formatValue(avg)}</strong></span>
      </div>
    </div>
  );
};

export default Sparkline;
