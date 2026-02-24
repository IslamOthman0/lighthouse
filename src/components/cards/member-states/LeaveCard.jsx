import React from 'react';
import CardShell from './CardShell';

/**
 * Format date string to readable format (e.g., "Feb 15")
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

/**
 * Get leave type config (icon, color, label)
 */
const getLeaveConfig = (leaveType) => {
  const type = (leaveType || '').toLowerCase();
  if (type.includes('work from home') || type.includes('wfh')) {
    return { icon: '🏠', color: '#0ea5e9', bgColor: 'rgba(14, 165, 233, 0.1)', borderColor: 'rgba(14, 165, 233, 0.3)' };
  }
  if (type.includes('sick')) {
    return { icon: '🏥', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' };
  }
  if (type.includes('bonus')) {
    return { icon: '🎁', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.3)' };
  }
  // Default: Annual Leave
  return { icon: '🏖️', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' };
};

/**
 * LeaveCard - Compact member card for leave/WFH status
 * Features: type-specific colors, formatted dates, return date
 */
const LeaveCard = ({ member, theme, onClick, workingDays = 1 }) => {
  const { leaveType, leaveStart, leaveEnd, returnDate, leaveRecord } = member;
  const config = getLeaveConfig(leaveType);
  const requestedDays = leaveRecord?.requestedDays;

  const formattedStart = formatDate(leaveStart);
  const formattedEnd = formatDate(leaveEnd);
  const isSingleDay = leaveStart === leaveEnd;
  const dateDisplay = isSingleDay ? formattedStart : `${formattedStart} → ${formattedEnd}`;

  return (
    <CardShell
      member={member}
      theme={theme}
      onClick={onClick}
      statusTime={leaveType || 'On Leave'}
      opacity={1}
      avatarFilter="none"
      hideFooter
      workingDays={workingDays}
    >
      {/* Leave/WFH Info Card */}
      <div
        className="mx-4 mb-4 p-3 rounded-lg border"
        style={{
          background: config.bgColor,
          borderColor: config.borderColor,
        }}
      >
        {/* Type + Days badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{config.icon}</span>
            <span className="text-[13px] font-semibold" style={{ color: config.color }}>
              {leaveType || 'Annual Leave'}
            </span>
          </div>
          {requestedDays && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: config.borderColor, color: config.color }}
            >
              {requestedDays}d
            </span>
          )}
        </div>

        {/* Date range */}
        <div className="text-[12px] font-medium" style={{ color: theme.text }}>
          {dateDisplay}
        </div>

        {/* Return date */}
        {returnDate && returnDate !== leaveEnd && (
          <div className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: theme.textSecondary }}>
            <span>↩</span>
            <span>Returns {formatDate(returnDate)}</span>
          </div>
        )}
      </div>
    </CardShell>
  );
};

export default LeaveCard;
