import React from 'react';
import ProgressRing from '../ui/ProgressRing';
import { tabularNumberStyle, getFontFamily } from '../../utils/typography';

const getScoreColor = (score) => {
  if (!score && score !== 0) return 'var(--color-text-muted)';
  if (score >= 90) return 'var(--color-success)';
  if (score >= 80) return 'var(--color-accent)';
  if (score >= 70) return 'var(--color-warning)';
  return 'var(--color-danger)';
};

const ScoreBreakdownCard = ({ theme, teamScore, metrics, yesterdayScore, onClick }) => {
  const scoreColor = getScoreColor(teamScore);

  const dailyDelta = (yesterdayScore != null && teamScore != null)
    ? Math.round(teamScore - yesterdayScore)
    : null;

  return (
    <div
      onClick={onClick}
      data-testid="overview-card-team-score"
      className="rounded-[16px] p-5 border transition-all duration-200"
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
          e.currentTarget.style.boxShadow = 'var(--effect-card-shadow)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--effect-card-shadow)';
        }
      }}
    >
      {/* Team Score with Ring */}
      <div className="flex items-center gap-4 mb-4">
        <ProgressRing
          progress={teamScore}
          color={scoreColor}
          size={72}
          strokeWidth={6}
          theme={theme}
        />

        <div>
          <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--color-text)', fontFamily: getFontFamily('english') }}>
            Team Score
          </div>
          {dailyDelta !== null ? (
            <div
              className="text-[11px] mt-0.5"
              style={{
                color: dailyDelta > 0 ? 'var(--color-success)' : dailyDelta < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)',
                fontFamily: getFontFamily('english'),
              }}
            >
              {dailyDelta > 0 ? `↑ +${dailyDelta} from yesterday` : dailyDelta < 0 ? `↓ ${dailyDelta} from yesterday` : '→ No change'}
            </div>
          ) : (
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: getFontFamily('english') }}>
              {metrics && `Time ${metrics.time || 0}% · Tasks ${metrics.tasks || 0}%`}
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid (2x2) */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Time Tracked', value: metrics?.time || 0, color: 'var(--color-working)' },
          { label: 'Workload', value: metrics?.workload || 0, color: 'var(--color-accent)' },
          { label: 'Completion', value: metrics?.tasks || 0, color: 'var(--color-leave)' },
          { label: 'Compliance', value: metrics?.compliance || 0, color: 'var(--color-purple)' },
        ].map((metric, idx) => (
          <div
            key={idx}
            className="rounded-[10px] p-3 text-center border"
            style={{
              background: 'var(--color-inner-bg)',
              borderColor: 'var(--color-border-light)',
            }}
          >
            <div
              className="text-[18px] font-bold"
              style={{
                color: metric.color,
                ...tabularNumberStyle,
              }}
            >
              {metric.value}%
            </div>
            <div
              className="text-[10px] mt-0.5"
              style={{
                color: 'var(--color-text-muted)',
                fontFamily: getFontFamily('english'),
              }}
            >
              {metric.label}
            </div>
            <div className="mt-1.5 h-[3px] rounded-sm overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div style={{ height: '100%', width: `${Math.min(metric.value, 100)}%`, background: metric.color, borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Focus area callout - shows weakest metric if below 80% */}
      {metrics && teamScore != null && teamScore > 0 && (() => {
        const metricList = [
          { label: 'Time', value: metrics.time || 0 },
          { label: 'Workload', value: metrics.workload || 0 },
          { label: 'Completion', value: metrics.tasks || 0 },
          { label: 'Compliance', value: metrics.compliance || 0 },
        ];
        const weakest = metricList.reduce((min, m) => m.value < min.value ? m : min, metricList[0]);
        if (weakest.value >= 80) return null;
        return (
          <div className="mt-2.5 px-3 py-2 rounded-lg border" style={{ background: 'var(--color-inner-bg)', borderColor: 'var(--color-border-light)' }}>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', fontFamily: getFontFamily('english') }}>
              Focus area: <strong style={{ color: 'var(--color-warning)' }}>{weakest.label}</strong> at {weakest.value}%
            </span>
          </div>
        );
      })()}
    </div>
  );
};

export default ScoreBreakdownCard;
