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
      className="rounded-[16px] p-6 border flex items-center gap-5 h-full min-h-[120px] transition-all duration-200"
      style={{
        background: 'var(--color-card-bg)',
        backdropFilter: 'var(--effect-backdrop-blur)',
        WebkitBackdropFilter: 'var(--effect-backdrop-blur)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--effect-card-shadow)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `var(--effect-card-shadow)`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--effect-card-shadow)';
        }
      }}
    >
      <ProgressRing progress={progress} color={color} size={80} strokeWidth={6} theme={theme} />

      <div className="flex-1">
        <div
          className="text-xs mb-1"
          style={{
            color: 'var(--color-text-muted)',
            fontFamily: getFontFamily('english'),
          }}
        >
          {label}
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className="text-[22px] font-bold"
            style={{
              color: 'var(--color-text)',
              ...tabularNumberStyle,
            }}
          >
            {value}
          </span>
          <span
            className="text-xs"
            style={{
              color: 'var(--color-text-muted)',
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
