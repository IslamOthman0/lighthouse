import React from 'react';
import ProgressRing from '../ui/ProgressRing';
import { tabularNumberStyle, getFontFamily } from '../../utils/typography';

const getScoreColor = (score, theme) => {
  if (!score && score !== 0) return theme.textMuted;
  if (score >= 90) return theme.success;
  if (score >= 80) return theme.accent;
  if (score >= 70) return theme.warning;
  return theme.danger;
};

const ScoreBreakdownCard = ({ theme, teamScore, metrics, onClick }) => {
  const scoreColor = getScoreColor(teamScore, theme);

  return (
    <div
      onClick={onClick}
      data-testid="overview-card-team-score"
      style={{
        background: theme.cardBg,
        backdropFilter: theme.backdropBlur,
        WebkitBackdropFilter: theme.backdropBlur,
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow || 'none',
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
      {/* Team Score with Ring */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        <ProgressRing
          progress={teamScore}
          color={scoreColor}
          size={72}
          strokeWidth={6}
          theme={theme}
        />

        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text, fontFamily: getFontFamily('english') }}>
            Team Score
          </div>
          <div style={{ fontSize: '12px', color: theme.success, marginTop: '2px', fontFamily: getFontFamily('english') }}>
            ▲ <span style={{ ...tabularNumberStyle }}>5.2</span> from yesterday
          </div>
        </div>
      </div>

      {/* Metrics Grid (2x2) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { label: 'Time Tracked', value: metrics?.time || 0, color: theme.working },
          { label: 'Workload', value: metrics?.workload || 0, color: theme.accent },
          { label: 'Completion', value: metrics?.tasks || 0, color: theme.leave },
          { label: 'Compliance', value: metrics?.compliance || 0, color: theme.purple },
        ].map((metric, idx) => (
          <div
            key={idx}
            style={{
              background: theme.secondaryBg,
              borderRadius: '10px',
              padding: '12px',
              textAlign: 'center',
              border: `1px solid ${theme.borderLight}`,
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: '700',
                color: metric.color,
                ...tabularNumberStyle,
              }}
            >
              {metric.value}%
            </div>
            <div
              style={{
                fontSize: '10px',
                color: theme.textMuted,
                marginTop: '2px',
                fontFamily: getFontFamily('english'),
              }}
            >
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoreBreakdownCard;
