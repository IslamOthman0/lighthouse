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

const ScoreBreakdownCard = ({ theme, teamScore, metrics, yesterdayScore, onClick }) => {
  const scoreColor = getScoreColor(teamScore, theme);

  const dailyDelta = (yesterdayScore != null && teamScore != null)
    ? Math.round(teamScore - yesterdayScore)
    : null;

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
          {dailyDelta !== null ? (
            <div style={{ fontSize: '11px', color: dailyDelta > 0 ? theme.success : dailyDelta < 0 ? theme.danger : theme.textMuted, marginTop: '2px', fontFamily: getFontFamily('english') }}>
              {dailyDelta > 0 ? '↑' : dailyDelta < 0 ? '↓' : '→'} {dailyDelta > 0 ? '+' : ''}{dailyDelta} from yesterday
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px', fontFamily: getFontFamily('english') }}>
              {metrics && `Time ${metrics.time || 0}% · Tasks ${metrics.tasks || 0}%`}
            </div>
          )}
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
            <div style={{ marginTop: '6px', height: '3px', borderRadius: '2px', background: theme.border, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(metric.value, 100)}%`, background: metric.color, borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Focus area callout - shows weakest metric if below 80% */}
      {metrics && (() => {
        const metricList = [
          { label: 'Time', value: metrics.time || 0 },
          { label: 'Workload', value: metrics.workload || 0 },
          { label: 'Completion', value: metrics.tasks || 0 },
          { label: 'Compliance', value: metrics.compliance || 0 },
        ];
        const weakest = metricList.reduce((min, m) => m.value < min.value ? m : min, metricList[0]);
        if (weakest.value >= 80) return null; // Don't show if all metrics are good
        return (
          <div style={{ marginTop: '10px', padding: '8px 12px', background: theme.secondaryBg, borderRadius: '8px', border: `1px solid ${theme.borderLight}` }}>
            <span style={{ fontSize: '10px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
              Focus area: <strong style={{ color: theme.warning || '#F59E0B' }}>{weakest.label}</strong> at {weakest.value}%
            </span>
          </div>
        );
      })()}
    </div>
  );
};

export default ScoreBreakdownCard;
