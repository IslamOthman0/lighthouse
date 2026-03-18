import React, { useMemo } from 'react';
import Avatar from '../../ui/Avatar';
import QuotaBar from './QuotaBar';
import { TYPE_ICONS, TYPE_COLORS, TYPE_LABELS, STATUS_COLORS_MAP, formatDateRange, formatDateShort, toLocalDateStr } from './constants';
import { getMemberLeaveBalance, calculateLeaveDays } from '../../../utils/leaveHelpers';
import { tabularNumberStyle, getAdaptiveFontFamily } from '../../../utils/typography';

/**
 * Per-member leave detail panel (drills down from TeamOverview)
 */
const MemberLeaveDetail = ({ member, leaves, theme, settings, isMobile, onBack }) => {
  const memberId = member.clickUpId || member.id;
  const todayStr = toLocalDateStr();
  const now = new Date();
  const currentYear = now.getFullYear();

  // Filter leaves for this member
  const memberLeaves = useMemo(() => {
    return leaves.filter(l => {
      if (l.status === 'rejected') return false;
      const match = String(l.memberId) === String(memberId) ||
        String(l.memberClickUpId) === String(memberId);
      if (!match) return false;
      return (l.startDate || '').startsWith(String(currentYear));
    }).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [leaves, memberId, currentYear]);

  // Balance
  const balance = useMemo(() =>
    getMemberLeaveBalance(memberId, leaves, settings),
    [memberId, leaves, settings]
  );

  // Current leave status
  const leaveToday = memberLeaves.find(l => {
    const end = l.endDate || l.startDate;
    return todayStr >= l.startDate && todayStr <= end;
  });

  const isOnLeave = leaveToday && leaveToday.type !== 'wfh';
  const isWfh = leaveToday && leaveToday.type === 'wfh';

  // Mini calendar data for current month
  const calendarData = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = {};

    memberLeaves.forEach(l => {
      const start = new Date(l.startDate + 'T00:00:00');
      const end = new Date((l.endDate || l.startDate) + 'T00:00:00');
      const cur = new Date(start);
      while (cur <= end) {
        if (cur.getMonth() === month && cur.getFullYear() === year) {
          days[cur.getDate()] = l.type === 'wfh' ? 'wfh' : 'leave';
        }
        cur.setDate(cur.getDate() + 1);
      }
    });

    return { daysInMonth, firstDay, days };
  }, [memberLeaves, now]);

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="bg-transparent border-none text-[var(--color-accent)] cursor-pointer text-[13px] font-medium p-0 flex items-center gap-1 opacity-80"
      >
        &#x2190; Back to Overview
      </button>

      {/* Member Header */}
      <div className="flex items-center gap-[14px] bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-card p-4">
        <Avatar name={member.name} status={member.status} theme={theme} size={48}
          profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
        <div>
          <div className="text-lg font-bold text-[var(--color-text)]" style={{ fontFamily: getAdaptiveFontFamily(member.name) }}>{member.name}</div>
          <div className="text-[13px] mt-[2px]">
            {isOnLeave && (
              <span className="font-medium" style={{ color: TYPE_COLORS[leaveToday.type] || TYPE_COLORS.annual }}>
                {TYPE_ICONS[leaveToday.type]} On {TYPE_LABELS[leaveToday.type] || 'Leave'}
              </span>
            )}
            {isWfh && (
              <span className="font-medium" style={{ color: TYPE_COLORS.wfh }}>
                {TYPE_ICONS.wfh} Working from Home
              </span>
            )}
            {!isOnLeave && !isWfh && (
              <span className="text-[var(--color-text-secondary)]">Available</span>
            )}
          </div>
        </div>
      </div>

      {/* Leave Balances */}
      <div className="bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-card p-4">
        <div className="text-[13px] font-semibold text-[var(--color-text)] mb-[14px]">
          Leave Balances ({currentYear})
        </div>
        <QuotaBar label="Annual Leave" used={balance.annual.used} total={balance.annual.total}
          color={TYPE_COLORS.annual} theme={theme} />
        <QuotaBar label="Sick Leave" used={balance.sick.used} total={balance.sick.total}
          color={TYPE_COLORS.sick} theme={theme} />
        <QuotaBar label="Bonus Leave" used={balance.bonus.used} total={balance.bonus.total}
          color={TYPE_COLORS.bonus} theme={theme} />
        <QuotaBar label={`WFH (${now.toLocaleDateString('en-US', { month: 'long' })})`}
          used={balance.wfh.usedThisMonth} total={balance.wfh.monthly}
          color={TYPE_COLORS.wfh} theme={theme} />

        {balance.maxTransfer > 0 && (
          <div className="mt-[10px] text-[11px] text-[var(--color-text-secondary)] px-[10px] py-[6px] rounded-badge bg-[rgba(255,255,255,0.05)]">
            Max carry-over to {currentYear + 1}: {balance.maxTransfer} days
          </div>
        )}
      </div>

      {/* Mini Calendar */}
      <div className="bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-card p-4">
        <div className="text-[13px] font-semibold text-[var(--color-text)] mb-3">
          {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <MiniCalendar data={calendarData} theme={theme} todayDate={now.getDate()} />
        <div className="flex gap-3 mt-[10px] text-[11px] text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-[2px] inline-block" style={{ background: TYPE_COLORS.annual }} />
            Leave
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-[2px] inline-block" style={{ background: TYPE_COLORS.wfh }} />
            WFH
          </span>
        </div>
      </div>

      {/* Leave History */}
      <div className="bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-card p-4">
        <div className="text-[13px] font-semibold text-[var(--color-text)] mb-3">
          Leave History ({currentYear})
        </div>
        {memberLeaves.length === 0 ? (
          <div className="text-[13px] text-[var(--color-text-secondary)] text-center p-5">
            No leave records this year
          </div>
        ) : (
          <div className="flex flex-col gap-[6px]">
            {memberLeaves.map(l => {
              const days = l.requestedDays || calculateLeaveDays(l.startDate, l.endDate);
              const statusColor = STATUS_COLORS_MAP[l.status] || '#666';
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-[10px] py-2 text-[13px]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span className="min-w-[90px] text-[var(--color-text-secondary)] text-xs" style={tabularNumberStyle}>
                    {formatDateRange(l.startDate, l.endDate)}
                  </span>
                  <span className="text-sm">{TYPE_ICONS[l.type] || TYPE_ICONS.annual}</span>
                  <span className="flex-1 text-[var(--color-text)]">
                    {TYPE_LABELS[l.type] || 'Leave'}
                  </span>
                  <span className="text-[var(--color-text-secondary)] text-xs" style={tabularNumberStyle}>
                    {days}d
                  </span>
                  <span
                    className="text-[10px] px-[6px] py-[1px] rounded font-medium capitalize"
                    style={{
                      background: `${statusColor}20`,
                      color: statusColor,
                    }}
                  >
                    {l.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Mini Calendar Grid ---
const MiniCalendar = ({ data, theme, todayDate }) => {
  const { daysInMonth, firstDay, days } = data;
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const type = days[d]; // 'leave' | 'wfh' | undefined
    const isToday = d === todayDate;
    const bg = isToday
      ? 'var(--color-text)'
      : type === 'leave'
        ? TYPE_COLORS.annual
        : type === 'wfh'
          ? TYPE_COLORS.wfh
          : 'transparent';
    const color = isToday
      ? 'var(--color-card-bg)'
      : type
        ? '#fff'
        : 'var(--color-text-secondary)';

    cells.push(
      <div
        key={d}
        className="text-center py-1 text-xs rounded"
        style={{
          fontWeight: isToday ? 700 : 400,
          color,
          background: bg,
          ...tabularNumberStyle,
        }}
      >
        {d}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-[2px]">
      {dayLabels.map(l => (
        <div key={l} className="text-center text-[10px] text-[var(--color-text-secondary)] py-[2px] font-semibold">
          {l}
        </div>
      ))}
      {cells}
    </div>
  );
};

export default MemberLeaveDetail;
