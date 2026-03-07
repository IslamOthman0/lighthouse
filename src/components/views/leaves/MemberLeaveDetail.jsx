import React, { useMemo } from 'react';
import Avatar from '../../ui/Avatar';
import QuotaBar from './QuotaBar';
import { TYPE_ICONS, TYPE_COLORS, TYPE_LABELS, STATUS_COLORS_MAP, formatDateRange, formatDateShort, toLocalDateStr } from './constants';
import { getMemberLeaveBalance, calculateLeaveDays } from '../../../utils/leaveHelpers';
import { tabularNumberStyle } from '../../../utils/typography';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: theme.accent,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          opacity: 0.8,
        }}
      >
        &#x2190; Back to Overview
      </button>

      {/* Member Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 16,
      }}>
        <Avatar name={member.name} status={member.status} theme={theme} size={48}
          profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>{member.name}</div>
          <div style={{ fontSize: 13, marginTop: 2 }}>
            {isOnLeave && (
              <span style={{ color: TYPE_COLORS[leaveToday.type] || TYPE_COLORS.annual, fontWeight: 500 }}>
                {TYPE_ICONS[leaveToday.type]} On {TYPE_LABELS[leaveToday.type] || 'Leave'}
              </span>
            )}
            {isWfh && (
              <span style={{ color: TYPE_COLORS.wfh, fontWeight: 500 }}>
                {TYPE_ICONS.wfh} Working from Home
              </span>
            )}
            {!isOnLeave && !isWfh && (
              <span style={{ color: theme.textSecondary }}>Available</span>
            )}
          </div>
        </div>
      </div>

      {/* Leave Balances */}
      <div style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 14 }}>
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
          <div style={{
            marginTop: 10,
            fontSize: 11,
            color: theme.textSecondary,
            padding: '6px 10px',
            borderRadius: 6,
            background: `${theme.text}08`,
          }}>
            Max carry-over to {currentYear + 1}: {balance.maxTransfer} days
          </div>
        )}
      </div>

      {/* Mini Calendar */}
      <div style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 12 }}>
          {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <MiniCalendar data={calendarData} theme={theme} todayDate={now.getDate()} />
        <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, color: theme.textSecondary }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLORS.annual, display: 'inline-block' }} />
            Leave
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLORS.wfh, display: 'inline-block' }} />
            WFH
          </span>
        </div>
      </div>

      {/* Leave History */}
      <div style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 12 }}>
          Leave History ({currentYear})
        </div>
        {memberLeaves.length === 0 ? (
          <div style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', padding: 20 }}>
            No leave records this year
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {memberLeaves.map(l => {
              const days = l.requestedDays || calculateLeaveDays(l.startDate, l.endDate);
              return (
                <div key={l.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: `1px solid ${theme.border}20`,
                  fontSize: 13,
                }}>
                  <span style={{ minWidth: 90, color: theme.textSecondary, ...tabularNumberStyle, fontSize: 12 }}>
                    {formatDateRange(l.startDate, l.endDate)}
                  </span>
                  <span style={{ fontSize: 14 }}>{TYPE_ICONS[l.type] || TYPE_ICONS.annual}</span>
                  <span style={{ flex: 1, color: theme.text }}>
                    {TYPE_LABELS[l.type] || 'Leave'}
                  </span>
                  <span style={{ ...tabularNumberStyle, color: theme.textSecondary, fontSize: 12 }}>
                    {days}d
                  </span>
                  <span style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: `${STATUS_COLORS_MAP[l.status] || '#666'}20`,
                    color: STATUS_COLORS_MAP[l.status] || '#666',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}>
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
    cells.push(
      <div key={d} style={{
        textAlign: 'center',
        padding: '4px 0',
        fontSize: 12,
        borderRadius: 4,
        fontWeight: isToday ? 700 : 400,
        color: isToday ? theme.cardBg : type ? '#fff' : theme.textSecondary,
        background: isToday
          ? theme.text
          : type === 'leave'
            ? TYPE_COLORS.annual
            : type === 'wfh'
              ? TYPE_COLORS.wfh
              : 'transparent',
        ...tabularNumberStyle,
      }}>
        {d}
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 2,
    }}>
      {dayLabels.map(l => (
        <div key={l} style={{ textAlign: 'center', fontSize: 10, color: theme.textSecondary, padding: '2px 0', fontWeight: 600 }}>
          {l}
        </div>
      ))}
      {cells}
    </div>
  );
};

export default MemberLeaveDetail;
