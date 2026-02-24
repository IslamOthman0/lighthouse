import React from 'react';
import ProgressRing from '../ui/ProgressRing';
import { tabularNumberStyle, getFontFamily } from '../../utils/typography';

const OverviewCard = ({ theme, value, subValue, label, progress, color, onClick }) => {
  // Generate a test ID from the label
  const testId = `overview-card-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div
      onClick={onClick}
      data-testid={testId}
      style={{
        background: theme.cardBg,
        backdropFilter: theme.backdropBlur,
        WebkitBackdropFilter: theme.backdropBlur,
        borderRadius: '16px',
        padding: '24px',
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow || 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        height: '100%',
        minHeight: '120px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = theme.cardShadow || `0 4px 16px ${theme.border}60`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = theme.cardShadow || 'none';
        }
      }}
    >
      <ProgressRing progress={progress} color={color} size={80} strokeWidth={6} theme={theme} />

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '12px',
            color: theme.textMuted,
            marginBottom: '4px',
            fontFamily: getFontFamily('english'),
          }}
        >
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            style={{
              fontSize: '22px',
              fontWeight: '700',
              color: theme.text,
              ...tabularNumberStyle,
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: theme.textMuted,
              fontFamily: getFontFamily('english'),
            }}
          >
            {subValue}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OverviewCard;
