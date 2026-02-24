import React from 'react';
import Avatar from '../../ui/Avatar';
import StatusBadge from '../../ui/StatusBadge';
import { getTextFontStyle, tabularNumberStyle } from '../../../utils/typography';
import { formatHoursToHM, formatMinutesToHM } from '../../../utils/timeFormat';

/**
 * CardShell - Shared wrapper for all member card states
 * Provides consistent border, avatar, name, status badge, footer, and click handling
 */
const CardShell = ({
  member,
  theme,
  onClick,
  statusTime,
  children,
  opacity = 1,
  avatarFilter = 'none',
  hideFooter = false,
  workingDays = 1, // Number of working days for multi-day ranges
}) => {
  const { name, status, profilePicture, clickUpColor, tracked, target, tasks, done, breaks, score } = member;

  // Calculate effective target and progress for multi-day ranges
  const effectiveTarget = target * workingDays;
  const progressPercent = (tracked / effectiveTarget) * 100;

  // Get score color based on percentage
  const getScoreColor = (percent) => {
    if (percent >= 80) return theme.success;
    if (percent >= 60) return theme.warning;
    return theme.danger;
  };

  return (
    <div
      onClick={() => onClick && onClick(member)}
      data-testid="member-card"
      className="relative rounded-card border cursor-pointer transition-all duration-200 overflow-hidden flex flex-col w-full"
      style={{
        background: theme.cardBg,
        backdropFilter: theme.backdropBlur,
        WebkitBackdropFilter: theme.backdropBlur,
        borderColor: theme.border,
        boxShadow: theme.cardShadow || 'none',
        opacity,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 4px 16px ${theme.border}60`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = theme.cardShadow || 'none';
        }
      }}
    >
      {/* Header Row: Avatar + Name + Status */}
      <div className="p-4 flex gap-3 items-start">
        <div style={{ filter: avatarFilter }}>
          <Avatar
            name={name}
            status={status}
            theme={theme}
            size={40}
            profilePicture={profilePicture}
            clickUpColor={clickUpColor}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-bold mb-0.5"
            style={{
              color: theme.text,
              ...getTextFontStyle(name),
            }}
          >
            {name}
          </div>
          <div
            className="text-[10px] font-medium"
            style={{ color: theme.textMuted }}
          >
            {statusTime}
          </div>
        </div>

        <StatusBadge status={status} theme={theme} size="small" />
      </div>

      {/* Divider */}
      <div
        className="h-px mx-4"
        style={{
          background: theme.divider || `linear-gradient(90deg, transparent 0%, ${theme.borderLight} 50%, transparent 100%)`,
        }}
      />

      {/* Content - passed as children (flex-1 to push footer down) */}
      <div className="flex-1">
        {children}
      </div>

      {/* Fixed Footer: Progress Bar + Bottom Metrics (hidden for compact cards) */}
      {!hideFooter && (
        <div className="mt-auto">
          {/* Progress Bar - Goal (Daily or Multi-Day) */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold" style={{ color: theme.textMuted }}>
                {workingDays > 1 ? `${workingDays}-Day Goal` : 'Daily Goal'}
              </span>
              <span className="text-[11px] font-bold" style={tabularNumberStyle}>
                <span style={{ color: theme.text }}>{formatHoursToHM(tracked)}</span>{' '}
                <span style={{ color: theme.textMuted }}>/ {formatHoursToHM(effectiveTarget)}</span>{' '}
                <span
                  style={{
                    color: progressPercent >= 100
                      ? theme.success
                      : progressPercent >= 80
                        ? theme.working
                        : progressPercent >= 50
                          ? theme.warning
                          : theme.danger
                  }}
                >
                  {Math.round(progressPercent)}%
                </span>
              </span>
            </div>

            {/* Progress Bar */}
            <div
              className="w-full h-1.5 rounded overflow-hidden relative"
              style={{
                background: theme.type === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
              }}
            >
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${Math.min(progressPercent, 100)}%`,
                  background: progressPercent >= 100 ? theme.success : progressPercent >= 80 ? theme.working : progressPercent >= 50 ? theme.warning : theme.textMuted,
                }}
              />
            </div>

            {/* Target Time */}
            <div className="mt-1">
              <span className="text-[9px] font-medium" style={{ color: theme.textMuted }}>
                Target: 8:00 AM – 6:00 PM
              </span>
            </div>
          </div>

          {/* Bottom Metrics (4 columns) */}
          <div className="grid grid-cols-4 border-t" style={{ borderColor: theme.borderLight }}>
            {[
              {
                label: 'SPAN',
                value: formatMinutesToHM(Math.round(tracked * 60 + (breaks?.total || 0))),
                color: theme.text,
              },
              {
                label: 'BREAKS',
                value: formatMinutesToHM(breaks?.total || 0),
                color: theme.break,
              },
              {
                label: 'TASKS',
                doneCount: done,
                totalCount: tasks,
              },
              {
                label: 'SCORE',
                scorePercent: score ?? 0,
              },
            ].map((metric, i) => (
              <div
                key={i}
                className="py-3 px-2 text-center border-r last:border-r-0"
                style={{ borderColor: theme.metricDivider || theme.borderLight }}
              >
                <div className="text-[9px] font-bold mb-1 uppercase tracking-wide" style={{ color: theme.textMuted }}>
                  {metric.label}
                </div>
                <div
                  className="text-[13px] font-bold"
                  style={{
                    color: metric.label === 'SCORE' && metric.scorePercent !== undefined
                      ? getScoreColor(metric.scorePercent)
                      : metric.color || theme.text,
                    ...tabularNumberStyle,
                  }}
                >
                  {metric.label === 'TASKS' && metric.doneCount !== undefined && metric.totalCount !== undefined ? (
                    <>
                      <span style={{ color: theme.success }}>{metric.doneCount}</span>
                      <span style={{ color: theme.textMuted }}>/</span>
                      <span>{metric.totalCount}</span>
                    </>
                  ) : metric.label === 'SCORE' && metric.scorePercent !== undefined ? (
                    `${Math.round(metric.scorePercent)}%`
                  ) : (
                    metric.value
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CardShell;
