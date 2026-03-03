/**
 * Leaves & WFH Tab Component (Analytics Redesign)
 *
 * 3-tab manager dashboard:
 * - Today: who's out + team month summary + upcoming leaves
 * - This Week: day strip with member names + week comparison + weekly table
 * - Calendar: existing calendar/list views (unchanged)
 *
 * Uses useLiveQuery for reactive leave data (auto-updates when sync runs).
 * All dates use toLocalDateStr() to avoid UTC+2 timezone shifts.
 */

import React, { useState, useMemo } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../stores/useAppStore';
import { useSettings } from '../../hooks/useSettings';
import Avatar from '../ui/Avatar';
import { getFontFamily, getAdaptiveFontFamily, tabularNumberStyle } from '../../utils/typography';
import { hexToRgba } from '../../utils/colorHelpers';
import { calculateLeaveDays } from '../../utils/leaveHelpers';
import { toLocalDateStr } from '../../utils/timeFormat';

// ===== Constants =====

const TYPE_ICONS = {
  annual: '\u{1F3D6}\u{FE0F}',
  sick: '\u{1F3E5}',
  wfh: '\u{1F3E0}',
  bonus: '\u{1F381}',
  holiday: '\u{1F389}',
};

const TYPE_LABELS = {
  annual: 'Annual',
  sick: 'Sick',
  wfh: 'WFH',
  bonus: 'Bonus',
  holiday: 'Holiday',
};

const TYPE_COLORS = {
  annual: '#3b82f6',
  sick: '#ef4444',
  wfh: '#10b981',
  bonus: '#8b5cf6',
  holiday: '#f59e0b',
};

const STATUS_COLORS_MAP = {
  approved: '#10b981',
  scheduled: '#3b82f6',
  pending: '#f59e0b',
};

// ===== Date Utility Functions =====

const getWeekStart = (refDate) => {
  const d = new Date(refDate || new Date());
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return toLocalDateStr(d);
};

const getWeekEnd = (refDate) => {
  const d = new Date(refDate || new Date());
  d.setDate(d.getDate() + (6 - d.getDay()));
  d.setHours(0, 0, 0, 0);
  return toLocalDateStr(d);
};

const getMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const getMonthEnd = () => {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return toLocalDateStr(last);
};

const filterLeavesToPeriod = (leaves, startStr, endStr) => {
  return leaves.filter(l => {
    const end = l.endDate || l.startDate;
    return l.startDate <= endStr && end >= startStr;
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateRange = (start, end) => {
  const s = formatDateShort(start);
  const e = formatDateShort(end || start);
  return s === e ? s : `${s} - ${e}`;
};

const isLeaveActiveToday = (leave) => {
  const today = toLocalDateStr();
  return today >= leave.startDate && today <= (leave.endDate || leave.startDate);
};

const isLeaveUpcoming = (leave) => {
  const today = toLocalDateStr();
  return leave.startDate > today;
};

const isLeavePast = (leave) => {
  const today = toLocalDateStr();
  return (leave.endDate || leave.startDate) < today;
};

const getMember = (leave, members) => {
  return members.find(m =>
    String(m.id) === String(leave.memberId) ||
    String(m.clickUpId) === String(leave.memberId) ||
    String(m.id) === String(leave.memberClickUpId) ||
    String(m.clickUpId) === String(leave.memberClickUpId)
  );
};

// ===== Sub-Components: Today Tab =====

const OnLeaveTodayCard = ({ membersOnLeave, theme, isMobile }) => (
  <div style={{
    background: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    padding: isMobile ? '14px' : '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }}>
    <div style={{ fontSize: '12px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
      {TYPE_ICONS.annual} On Leave Today
    </div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: theme.text, ...tabularNumberStyle }}>
      {membersOnLeave.length}
    </div>
    {membersOnLeave.length === 0 ? (
      <div style={{ fontSize: '12px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
        All in office
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        {membersOnLeave.map((m, i) => (
          <div key={m.id || i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Avatar name={m.name} size={22} theme={theme} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{
                fontSize: '12px',
                color: theme.text,
                fontFamily: getAdaptiveFontFamily(m.name),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {m.name}
              </span>
              <span style={{ fontSize: '10px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
                {m.leaveType || 'Leave'}{m.returnDate ? ` \u00B7 Back ${formatDateShort(m.returnDate)}` : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const WfhTodayCard = ({ membersWfh, theme, isMobile }) => (
  <div style={{
    background: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    padding: isMobile ? '14px' : '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }}>
    <div style={{ fontSize: '12px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
      {TYPE_ICONS.wfh} WFH Today
    </div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: theme.text, ...tabularNumberStyle }}>
      {membersWfh.length}
    </div>
    {membersWfh.length === 0 ? (
      <div style={{ fontSize: '12px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
        No WFH today
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        {membersWfh.map((m, i) => (
          <div key={m.id || i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Avatar name={m.name} size={22} theme={theme} />
            <span style={{
              fontSize: '12px',
              color: theme.text,
              fontFamily: getAdaptiveFontFamily(m.name),
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {m.name}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const AvailabilityBar = ({ available, total, theme }) => {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const barColor = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{
      background: theme.cardBg,
      border: `1px solid ${theme.border}`,
      borderRadius: '12px',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
          Team Availability
        </span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: barColor, fontFamily: getFontFamily('english'), ...tabularNumberStyle }}>
          {available} of {total} available ({pct}%)
        </span>
      </div>
      <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: hexToRgba(theme.accent, 0.08), overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: barColor, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
};

const SectionHeader = ({ title, theme }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
    <span style={{ fontSize: '13px', fontWeight: '600', color: theme.text, fontFamily: getFontFamily('english'), whiteSpace: 'nowrap' }}>
      {title}
    </span>
    <div style={{ flex: 1, height: '1px', background: theme.border }} />
  </div>
);

// ===== Sub-Component: TeamSummaryTable =====

const TeamSummaryTable = ({ leaves, members, periodStart, periodEnd, workDays = [0, 1, 2, 3, 4], theme, isMobile }) => {
  const periodLeaves = useMemo(() => {
    return filterLeavesToPeriod(leaves, periodStart, periodEnd).filter(l => l.status !== 'rejected');
  }, [leaves, periodStart, periodEnd]);

  const rows = useMemo(() => {
    return members.map(m => {
      const mLeaves = periodLeaves.filter(l =>
        String(l.memberId) === String(m.id) ||
        String(l.memberClickUpId) === String(m.clickUpId) ||
        String(l.memberId) === String(m.clickUpId) ||
        String(l.memberClickUpId) === String(m.id)
      );
      const leaveDays = mLeaves
        .filter(l => l.type !== 'wfh')
        .reduce((sum, l) => {
          const start = l.startDate < periodStart ? periodStart : l.startDate;
          const end = (l.endDate || l.startDate) > periodEnd ? periodEnd : (l.endDate || l.startDate);
          return sum + calculateLeaveDays(start, end, workDays);
        }, 0);
      const wfhDays = mLeaves.filter(l => l.type === 'wfh').length;
      return { member: m, leaveDays, wfhDays, total: leaveDays + wfhDays };
    }).sort((a, b) => b.total - a.total);
  }, [periodLeaves, members, workDays, periodStart, periodEnd]);

  const teamLeaveDays = rows.reduce((s, r) => s + r.leaveDays, 0);
  const teamWfhDays = rows.reduce((s, r) => s + r.wfhDays, 0);
  const teamTotal = teamLeaveDays + teamWfhDays;

  if (rows.length === 0) return null;

  const colStyle = (width, align = 'right') => ({
    width,
    textAlign: align,
    fontSize: '13px',
    padding: '8px 6px',
    fontFamily: getFontFamily('english'),
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '300px' : 'auto' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
            <th style={{ ...colStyle('auto', 'left'), color: theme.textMuted, fontWeight: '500', paddingLeft: '4px' }}>Member</th>
            <th style={{ ...colStyle('70px'), color: theme.textMuted, fontWeight: '500' }}>Leave</th>
            <th style={{ ...colStyle('60px'), color: theme.textMuted, fontWeight: '500' }}>WFH</th>
            <th style={{ ...colStyle('60px'), color: theme.textMuted, fontWeight: '500' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ member, leaveDays, wfhDays, total }) => (
            <tr key={member.id} style={{ borderBottom: `1px solid ${hexToRgba(theme.border, 0.5)}` }}>
              <td style={{ padding: '8px 6px 8px 4px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Avatar name={member.name} size={24} theme={theme} />
                  <span style={{ fontSize: '13px', color: theme.text, fontFamily: getAdaptiveFontFamily(member.name) }}>
                    {member.name}
                  </span>
                </div>
              </td>
              <td style={{ ...colStyle('70px'), color: leaveDays > 0 ? '#3b82f6' : theme.textMuted, ...tabularNumberStyle }}>
                {leaveDays > 0 ? `${leaveDays}d` : '\u2014'}
              </td>
              <td style={{ ...colStyle('60px'), color: wfhDays > 0 ? '#10b981' : theme.textMuted, ...tabularNumberStyle }}>
                {wfhDays > 0 ? `${wfhDays}d` : '\u2014'}
              </td>
              <td style={{ ...colStyle('60px'), color: total > 0 ? theme.text : theme.textMuted, fontWeight: total > 0 ? '600' : '400', ...tabularNumberStyle }}>
                {total > 0 ? `${total}d` : '\u2014'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: `2px solid ${theme.border}` }}>
            <td style={{ padding: '8px 6px 8px 4px', fontSize: '12px', fontWeight: '600', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>Team Total</td>
            <td style={{ ...colStyle('70px'), color: '#3b82f6', fontWeight: '600', ...tabularNumberStyle }}>{teamLeaveDays}d</td>
            <td style={{ ...colStyle('60px'), color: '#10b981', fontWeight: '600', ...tabularNumberStyle }}>{teamWfhDays}d</td>
            <td style={{ ...colStyle('60px'), color: theme.text, fontWeight: '600', ...tabularNumberStyle }}>{teamTotal}d</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ===== Sub-Component: ExpandedWeekStrip =====

const ExpandedWeekStrip = ({ leaves, members, settings, theme, isMobile }) => {
  const workDays = settings?.schedule?.workDays || [0, 1, 2, 3, 4];
  const todayStr = toLocalDateStr();
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const weekStartDate = new Date(today);
  weekStartDate.setDate(today.getDate() - today.getDay());
  weekStartDate.setHours(0, 0, 0, 0);
  const weekStartStr = toLocalDateStr(weekStartDate);

  const weekDays = useMemo(() => {
    return workDays.map(dayIdx => {
      const date = new Date(weekStartDate);
      date.setDate(weekStartDate.getDate() + dayIdx);
      const dateStr = toLocalDateStr(date);

      const absentLeaves = leaves.filter(l => {
        if (l.status === 'rejected') return false;
        const end = l.endDate || l.startDate;
        return dateStr >= l.startDate && dateStr <= end;
      });

      const seen = new Set();
      const absentMembers = absentLeaves
        .map(l => getMember(l, members))
        .filter(m => {
          if (!m || seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });

      return {
        label: dayLabels[dayIdx],
        dayIdx,
        dateStr,
        dayNum: date.getDate(),
        isToday: dateStr === todayStr,
        available: members.length - absentMembers.length,
        absentMembers,
      };
    });
  }, [leaves, members, workDays, weekStartStr, todayStr]);

  return (
    <div style={{
      background: theme.cardBg,
      border: `1px solid ${theme.border}`,
      borderRadius: '12px',
      padding: isMobile ? '12px' : '16px',
    }}>
      <div style={{ fontSize: '12px', color: theme.textSecondary, fontFamily: getFontFamily('english'), marginBottom: '12px' }}>
        This Week — Day by Day
      </div>
      <div style={{ display: 'flex', gap: isMobile ? '4px' : '8px' }}>
        {weekDays.map(d => (
          <div
            key={d.dayIdx}
            style={{
              flex: 1,
              minWidth: '44px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: isMobile ? '8px 2px' : '12px 4px',
              borderRadius: '10px',
              background: d.isToday ? hexToRgba(theme.accent, 0.08) : 'transparent',
              border: d.isToday ? `1.5px solid ${hexToRgba(theme.accent, 0.3)}` : '1.5px solid transparent',
            }}
          >
            <span style={{
              fontSize: '10px',
              fontWeight: d.isToday ? '700' : '500',
              color: d.isToday ? theme.text : theme.textMuted,
              fontFamily: getFontFamily('english'),
            }}>
              {d.label}
            </span>
            <span style={{
              fontSize: '11px',
              color: theme.textMuted,
              fontFamily: getFontFamily('english'),
              ...tabularNumberStyle,
            }}>
              {d.dayNum}
            </span>
            <span style={{
              fontSize: '17px',
              fontWeight: '700',
              color: d.absentMembers.length > 0
                ? (d.available <= 0 ? '#ef4444' : '#f59e0b')
                : '#10b981',
              ...tabularNumberStyle,
            }}>
              {d.available}
            </span>
            <span style={{ fontSize: '9px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
              avail
            </span>
            {d.absentMembers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginTop: '4px', width: '100%' }}>
                {d.absentMembers.slice(0, 2).map(m => (
                  <span key={m.id} style={{
                    fontSize: '9px',
                    color: theme.textMuted,
                    fontFamily: getAdaptiveFontFamily(m.name),
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}>
                    {m.name.split(' ')[0]}
                  </span>
                ))}
                {d.absentMembers.length > 2 && (
                  <span style={{ fontSize: '9px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
                    +{d.absentMembers.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ===== Sub-Component: WeekComparisonCard =====

const WeekComparisonCard = ({ leaves, settings, theme, isMobile }) => {
  const workDays = settings?.schedule?.workDays || [0, 1, 2, 3, 4];

  const { thisWeekLeave, thisWeekWfh, lastWeekLeave, lastWeekWfh } = useMemo(() => {
    const now = new Date();
    const thisStart = getWeekStart(now);
    const thisEnd = getWeekEnd(now);

    const lastWeekRef = new Date(now);
    lastWeekRef.setDate(now.getDate() - 7);
    const lastStart = getWeekStart(lastWeekRef);
    const lastEnd = getWeekEnd(lastWeekRef);

    const thisLeaves = filterLeavesToPeriod(leaves, thisStart, thisEnd).filter(l => l.status !== 'rejected');
    const lastLeaves = filterLeavesToPeriod(leaves, lastStart, lastEnd).filter(l => l.status !== 'rejected');

    const sumLeaveDays = (arr, rangeStart, rangeEnd) =>
      arr.filter(l => l.type !== 'wfh').reduce((sum, l) => {
        const s = l.startDate < rangeStart ? rangeStart : l.startDate;
        const e = (l.endDate || l.startDate) > rangeEnd ? rangeEnd : (l.endDate || l.startDate);
        return sum + calculateLeaveDays(s, e, workDays);
      }, 0);

    return {
      thisWeekLeave: sumLeaveDays(thisLeaves, thisStart, thisEnd),
      thisWeekWfh: thisLeaves.filter(l => l.type === 'wfh').length,
      lastWeekLeave: sumLeaveDays(lastLeaves, lastStart, lastEnd),
      lastWeekWfh: lastLeaves.filter(l => l.type === 'wfh').length,
    };
  }, [leaves, workDays]);

  const trend = (curr, prev) => {
    if (curr > prev) return { icon: '\u2191', color: '#ef4444' };
    if (curr < prev) return { icon: '\u2193', color: '#10b981' };
    return { icon: '=', color: '#6b7280' };
  };

  const leaveTrend = trend(thisWeekLeave, lastWeekLeave);
  const wfhTrend = trend(thisWeekWfh, lastWeekWfh);

  const WeekCol = ({ label, leaveDays, wfhDays, isThis }) => (
    <div style={{
      flex: 1,
      background: isThis ? hexToRgba(theme.accent, 0.05) : 'transparent',
      border: `1px solid ${isThis ? hexToRgba(theme.accent, 0.2) : theme.border}`,
      borderRadius: '10px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <span style={{ fontSize: '12px', fontWeight: '600', color: isThis ? theme.text : theme.textSecondary, fontFamily: getFontFamily('english') }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6', ...tabularNumberStyle }}>{leaveDays}d</div>
          <div style={{ fontSize: '10px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>leave</div>
        </div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', ...tabularNumberStyle }}>{wfhDays}d</div>
          <div style={{ fontSize: '10px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>WFH</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      background: theme.cardBg,
      border: `1px solid ${theme.border}`,
      borderRadius: '12px',
      padding: isMobile ? '12px' : '16px',
    }}>
      <div style={{ fontSize: '12px', color: theme.textSecondary, fontFamily: getFontFamily('english'), marginBottom: '12px' }}>
        Week Comparison
        <span style={{ marginLeft: '8px', fontSize: '11px', color: leaveTrend.color }}>
          Leave {leaveTrend.icon}
        </span>
        <span style={{ marginLeft: '6px', fontSize: '11px', color: wfhTrend.color }}>
          WFH {wfhTrend.icon}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
        <WeekCol label="This Week" leaveDays={thisWeekLeave} wfhDays={thisWeekWfh} isThis={true} />
        <WeekCol label="Last Week" leaveDays={lastWeekLeave} wfhDays={lastWeekWfh} isThis={false} />
      </div>
    </div>
  );
};

// ===== Calendar View =====

const LeaveCalendar = ({ leaves, members, theme, isMobile }) => {
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [hoveredDay, setHoveredDay] = useState(null);

  const isCurrentMonth = calendarMonth === today.getMonth() && calendarYear === today.getFullYear();

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const monthName = new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const goToPrevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); }
    else setCalendarMonth(calendarMonth - 1);
  };

  const goToNextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); }
    else setCalendarMonth(calendarMonth + 1);
  };

  const goToToday = () => {
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
  };

  const eventsMap = useMemo(() => {
    const map = {};
    leaves.forEach(leave => {
      const start = new Date(leave.startDate + 'T00:00:00');
      const end = new Date((leave.endDate || leave.startDate) + 'T00:00:00');
      const current = new Date(start);
      while (current <= end) {
        if (current.getMonth() === calendarMonth && current.getFullYear() === calendarYear) {
          const day = current.getDate();
          if (!map[day]) map[day] = [];
          const member = getMember(leave, members);
          map[day].push({ leave, member });
        }
        current.setDate(current.getDate() + 1);
      }
    });
    return map;
  }, [leaves, members, calendarMonth, calendarYear]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{
      background: theme.cardBg,
      border: `1px solid ${theme.border}`,
      borderRadius: '12px',
      padding: isMobile ? '14px' : '20px',
    }}>
      {/* Month Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
        <button onClick={goToPrevMonth} style={{
          background: 'none', border: `1px solid ${theme.border}`, borderRadius: '6px',
          color: theme.text, cursor: 'pointer', padding: '4px 10px', fontSize: '14px',
          display: 'flex', alignItems: 'center',
        }}>\u2039</button>
        <span style={{
          fontSize: '16px', fontWeight: '600', color: theme.text,
          fontFamily: getFontFamily('english'), minWidth: '160px', textAlign: 'center',
        }}>{monthName}</span>
        <button onClick={goToNextMonth} style={{
          background: 'none', border: `1px solid ${theme.border}`, borderRadius: '6px',
          color: theme.text, cursor: 'pointer', padding: '4px 10px', fontSize: '14px',
          display: 'flex', alignItems: 'center',
        }}>\u203A</button>
        {!isCurrentMonth && (
          <button onClick={goToToday} style={{
            background: hexToRgba(theme.accent, 0.08), border: `1px solid ${theme.border}`,
            borderRadius: '6px', color: theme.text, cursor: 'pointer', padding: '4px 10px',
            fontSize: '11px', fontWeight: '500', fontFamily: getFontFamily('english'),
          }}>Today</button>
        )}
      </div>

      {/* Day Names */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
        {dayNames.map(day => (
          <div key={day} style={{
            textAlign: 'center', fontSize: '11px', fontWeight: '600', color: theme.textMuted,
            padding: isMobile ? '4px 2px' : '8px 4px', fontFamily: getFontFamily('english'),
          }}>{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} style={{ padding: isMobile ? '4px' : '8px' }} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isToday = day === today.getDate() && isCurrentMonth;
          const dayEvents = eventsMap[day] || [];
          const hasLeave = dayEvents.some(e => ['annual', 'sick', 'bonus'].includes(e.leave.type));
          const hasWfh = dayEvents.some(e => e.leave.type === 'wfh');
          const hasHoliday = dayEvents.some(e => e.leave.type === 'holiday');
          const memberCount = dayEvents.length;
          const isHovered = hoveredDay === day && memberCount > 0;

          let bgColor = 'transparent';
          if (hasHoliday) bgColor = 'rgba(245, 158, 11, 0.1)';
          if (hasWfh) bgColor = 'rgba(16, 185, 129, 0.1)';
          if (hasLeave) bgColor = 'rgba(59, 130, 246, 0.1)';

          return (
            <div
              key={day}
              style={{
                position: 'relative', padding: isMobile ? '4px 2px' : '8px 4px',
                textAlign: 'center', borderRadius: '8px', background: bgColor,
                border: isToday ? `2px solid ${theme.accent}` : '2px solid transparent',
                cursor: memberCount > 0 ? 'pointer' : 'default', transition: 'background 0.15s',
              }}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div style={{
                fontSize: '13px', fontWeight: isToday ? '700' : '400',
                color: isToday ? theme.accent : theme.text, ...tabularNumberStyle,
              }}>{day}</div>
              {memberCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px', flexWrap: 'wrap' }}>
                  {dayEvents.slice(0, 4).map((evt, idx) => (
                    <div key={idx} style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: TYPE_COLORS[evt.leave.type] || '#3b82f6',
                    }} />
                  ))}
                  {memberCount > 4 && (
                    <span style={{ fontSize: '8px', color: theme.textMuted, lineHeight: '5px', ...tabularNumberStyle }}>
                      +{memberCount - 4}
                    </span>
                  )}
                </div>
              )}
              {isHovered && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  background: theme.type === 'dark' ? '#1f2937' : '#ffffff',
                  border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '8px 10px',
                  zIndex: 50, minWidth: '140px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  pointerEvents: 'none',
                }}>
                  {dayEvents.slice(0, 5).map((evt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: TYPE_COLORS[evt.leave.type] || '#3b82f6', flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', color: theme.text, fontFamily: getAdaptiveFontFamily(evt.member?.name), whiteSpace: 'nowrap' }}>
                        {evt.member?.name || 'Unknown'}
                      </span>
                      <span style={{ fontSize: '10px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
                        {TYPE_LABELS[evt.leave.type] || 'Leave'}
                      </span>
                    </div>
                  ))}
                  {dayEvents.length > 5 && (
                    <div style={{ fontSize: '10px', color: theme.textMuted, marginTop: '2px' }}>
                      +{dayEvents.length - 5} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: '16px', marginTop: '16px', fontSize: '11px',
        color: theme.textSecondary, justifyContent: 'center', flexWrap: 'wrap',
        fontFamily: getFontFamily('english'),
      }}>
        {[
          { color: '#3b82f6', label: 'Leave' },
          { color: '#10b981', label: 'WFH' },
          { color: '#f59e0b', label: 'Holiday' },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ===== List View Components (Calendar Tab) =====

const LeaveCard = ({ leave, member, theme, isMobile }) => {
  const typeColor = TYPE_COLORS[leave.type] || '#3b82f6';
  const statusColor = STATUS_COLORS_MAP[leave.status] || theme.textMuted;
  const days = calculateLeaveDays(leave.startDate, leave.endDate);

  return (
    <div style={{
      background: theme.cardBg,
      border: `1px solid ${theme.border}`,
      borderRadius: '10px',
      padding: isMobile ? '12px' : '14px 16px',
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? '10px' : '16px',
      flexDirection: isMobile ? 'column' : 'row',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: isMobile ? 'auto' : '160px', flexShrink: 0 }}>
        <Avatar name={member?.name} size={32} theme={theme} />
        <span style={{
          fontSize: '14px', fontWeight: '500', color: theme.text,
          fontFamily: getAdaptiveFontFamily(member?.name),
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{member?.name || 'Unknown'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: isMobile ? 'auto' : '90px', flexShrink: 0 }}>
        <span style={{ fontSize: '14px' }}>{TYPE_ICONS[leave.type] || '\u{1F4C5}'}</span>
        <span style={{ fontSize: '13px', color: typeColor, fontWeight: '500', fontFamily: getFontFamily('english'), textTransform: 'capitalize' }}>
          {TYPE_LABELS[leave.type] || leave.type}
        </span>
      </div>
      <div style={{ flex: 1, fontSize: '13px', color: theme.textSecondary, fontFamily: getFontFamily('english'), ...tabularNumberStyle }}>
        {formatDateRange(leave.startDate, leave.endDate)}
      </div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: theme.text, minWidth: '50px', textAlign: 'center', ...tabularNumberStyle }}>
        {days} {days === 1 ? 'day' : 'days'}
      </div>
      <div style={{
        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '500',
        background: hexToRgba(statusColor, 0.12), color: statusColor,
        textTransform: 'capitalize', fontFamily: getFontFamily('english'), flexShrink: 0,
      }}>
        {leave.status || 'scheduled'}
      </div>
    </div>
  );
};

const GroupHeader = ({ label, count, color, theme }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', marginTop: '8px' }}>
    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
    <span style={{ fontSize: '13px', fontWeight: '600', color: theme.text, fontFamily: getFontFamily('english') }}>
      {label}
    </span>
    <span style={{ fontSize: '12px', color: theme.textMuted, ...tabularNumberStyle }}>({count})</span>
    <div style={{ flex: 1, height: '1px', background: theme.border, marginLeft: '4px' }} />
  </div>
);

const FilterBar = ({ typeFilter, setTypeFilter, memberFilter, setMemberFilter, members, theme, isMobile }) => {
  const typeOptions = ['all', 'annual', 'sick', 'wfh', 'bonus'];
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {typeOptions.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{
            padding: '5px 12px',
            background: typeFilter === t ? hexToRgba(theme.accent, 0.12) : 'transparent',
            color: typeFilter === t ? theme.text : theme.textSecondary,
            border: `1px solid ${typeFilter === t ? hexToRgba(theme.accent, 0.3) : theme.border}`,
            borderRadius: '16px', fontSize: '12px', fontWeight: typeFilter === t ? '600' : '400',
            cursor: 'pointer', textTransform: 'capitalize', fontFamily: getFontFamily('english'),
          }}>
            {t === 'all' ? 'All' : TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <select
        value={memberFilter}
        onChange={(e) => setMemberFilter(e.target.value)}
        style={{
          padding: '5px 10px',
          background: theme.type === 'dark' ? '#1a1a1a' : '#ffffff',
          color: theme.text,
          border: `1px solid ${theme.border}`,
          borderRadius: '8px', fontSize: '12px',
          fontFamily: getFontFamily('english'), cursor: 'pointer', outline: 'none', minWidth: '120px',
        }}
      >
        <option value="all">All Members</option>
        {members.map(m => (
          <option key={m.id || m.clickUpId} value={String(m.clickUpId || m.id)}>{m.name}</option>
        ))}
      </select>
    </div>
  );
};

// ===== Main LeavesTab Component =====

const LeavesTab = ({ theme, isMobile = false }) => {
  const [activeTab, setActiveTab] = useState('today');
  const [viewMode, setViewMode] = useState('calendar');
  const [period, setPeriod] = useState('month');
  const [typeFilter, setTypeFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');

  // Reactive leaves — auto-updates when sync runs
  const leaves = useLiveQuery(() => db.leaves.toArray(), []) || [];

  const members = useAppStore(state => state.members);
  const { settings } = useSettings();
  const workDays = settings?.schedule?.workDays || [0, 1, 2, 3, 4];

  // Today's status from enriched member data
  const membersOnLeave = useMemo(() => members.filter(m => m.onLeave === true), [members]);
  const membersWfh = useMemo(() => members.filter(m => m.onWfh === true), [members]);
  const availableCount = members.length - membersOnLeave.length;

  // Upcoming leaves: next 14 days, non-rejected, max 8
  const upcomingLeaves = useMemo(() => {
    const today = toLocalDateStr();
    const twoWeeksOut = toLocalDateStr(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
    return leaves
      .filter(l => l.startDate > today && l.startDate <= twoWeeksOut && l.status !== 'rejected')
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [leaves]);

  const totalUpcoming = upcomingLeaves.length;
  const visibleUpcoming = upcomingLeaves.slice(0, 8);

  // Calendar tab: period-filtered and grouped leaves
  const filteredLeaves = useMemo(() => {
    const now = new Date();
    let filtered = [...leaves];

    if (period === 'week') {
      const wsStr = getWeekStart(now);
      const weStr = getWeekEnd(now);
      filtered = filtered.filter(l => {
        const end = l.endDate || l.startDate;
        return l.startDate <= weStr && end >= wsStr;
      });
    } else if (period === 'month') {
      const ms = getMonthStart();
      const me = getMonthEnd();
      filtered = filtered.filter(l => {
        const end = l.endDate || l.startDate;
        return l.startDate <= me && end >= ms;
      });
    } else if (period === 'year') {
      const ys = `${now.getFullYear()}-01-01`;
      const ye = `${now.getFullYear()}-12-31`;
      filtered = filtered.filter(l => {
        const end = l.endDate || l.startDate;
        return l.startDate <= ye && end >= ys;
      });
    }

    if (typeFilter !== 'all') filtered = filtered.filter(l => l.type === typeFilter);
    if (memberFilter !== 'all') {
      filtered = filtered.filter(l =>
        String(l.memberId) === memberFilter || String(l.memberClickUpId) === memberFilter
      );
    }
    return filtered;
  }, [leaves, period, typeFilter, memberFilter]);

  const groupedLeaves = useMemo(() => {
    const active = filteredLeaves.filter(isLeaveActiveToday);
    const upcoming = filteredLeaves.filter(isLeaveUpcoming);
    const past = filteredLeaves.filter(isLeavePast);
    active.sort((a, b) => (a.endDate || a.startDate).localeCompare(b.endDate || b.startDate));
    upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate));
    past.sort((a, b) => b.startDate.localeCompare(a.startDate));
    return { active, upcoming, past };
  }, [filteredLeaves]);

  // Tab pill style
  const tabStyle = (id) => ({
    padding: isMobile ? '8px 14px' : '8px 20px',
    background: activeTab === id ? hexToRgba(theme.accent, 0.12) : 'transparent',
    color: activeTab === id ? theme.text : theme.textSecondary,
    border: `1px solid ${activeTab === id ? hexToRgba(theme.accent, 0.3) : theme.border}`,
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: activeTab === id ? '600' : '400',
    cursor: 'pointer',
    fontFamily: getFontFamily('english'),
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Tab Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'today', label: 'Today' },
          { id: 'week', label: 'This Week' },
          { id: 'calendar', label: 'Calendar' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {activeTab === 'today' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* On Leave + WFH stat cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: isMobile ? '10px' : '16px',
          }}>
            <OnLeaveTodayCard membersOnLeave={membersOnLeave} theme={theme} isMobile={isMobile} />
            <WfhTodayCard membersWfh={membersWfh} theme={theme} isMobile={isMobile} />
          </div>

          {/* Availability Bar */}
          <AvailabilityBar available={availableCount} total={members.length} theme={theme} />

          {/* Team Summary — This Month */}
          <SectionHeader title="Team Summary — This Month" theme={theme} />
          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: '12px',
            padding: isMobile ? '12px' : '16px',
          }}>
            <TeamSummaryTable
              leaves={leaves}
              members={members}
              periodStart={getMonthStart()}
              periodEnd={getMonthEnd()}
              workDays={workDays}
              theme={theme}
              isMobile={isMobile}
            />
          </div>

          {/* Upcoming Leaves */}
          <SectionHeader title={`Upcoming Leaves — Next 14 Days${totalUpcoming > 8 ? ` (${totalUpcoming} total)` : ''}`} theme={theme} />
          {visibleUpcoming.length === 0 ? (
            <div style={{
              fontSize: '13px', color: theme.textMuted, textAlign: 'center',
              padding: '20px', fontFamily: getFontFamily('english'),
            }}>
              No upcoming leaves in the next 14 days
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {visibleUpcoming.map((leave, idx) => {
                const member = getMember(leave, members);
                const days = calculateLeaveDays(leave.startDate, leave.endDate, workDays);
                const typeColor = TYPE_COLORS[leave.type] || '#3b82f6';
                const statusColor = STATUS_COLORS_MAP[leave.status] || theme.textMuted;
                return (
                  <div key={leave.id || idx} style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                  }}>
                    <span style={{
                      fontSize: '12px', color: theme.textMuted,
                      fontFamily: getFontFamily('english'), minWidth: '58px',
                      flexShrink: 0, ...tabularNumberStyle,
                    }}>
                      {formatDateShort(leave.startDate)}
                    </span>
                    <Avatar name={member?.name} size={24} theme={theme} />
                    <span style={{
                      fontSize: '13px', color: theme.text,
                      fontFamily: getAdaptiveFontFamily(member?.name),
                      flex: 1, minWidth: '70px',
                    }}>
                      {member?.name || 'Unknown'}
                    </span>
                    <span style={{ fontSize: '12px', color: typeColor, fontFamily: getFontFamily('english'), flexShrink: 0 }}>
                      {TYPE_ICONS[leave.type]} {TYPE_LABELS[leave.type] || leave.type}
                    </span>
                    <span style={{
                      fontSize: '12px', color: theme.textMuted,
                      fontFamily: getFontFamily('english'), flexShrink: 0, ...tabularNumberStyle,
                    }}>
                      {days}d
                    </span>
                    <span style={{
                      padding: '3px 8px', borderRadius: '10px', fontSize: '11px',
                      background: hexToRgba(statusColor, 0.12), color: statusColor,
                      fontFamily: getFontFamily('english'), textTransform: 'capitalize', flexShrink: 0,
                    }}>
                      {leave.status || 'scheduled'}
                    </span>
                  </div>
                );
              })}
              {totalUpcoming > 8 && (
                <div style={{
                  fontSize: '12px', color: theme.textMuted, textAlign: 'center',
                  padding: '8px', fontFamily: getFontFamily('english'),
                }}>
                  +{totalUpcoming - 8} more — see Calendar tab for full list
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* THIS WEEK TAB */}
      {activeTab === 'week' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ExpandedWeekStrip
            leaves={leaves}
            members={members}
            settings={settings}
            theme={theme}
            isMobile={isMobile}
          />
          <WeekComparisonCard
            leaves={leaves}
            settings={settings}
            theme={theme}
            isMobile={isMobile}
          />
          <SectionHeader title="Per-Member This Week" theme={theme} />
          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: '12px',
            padding: isMobile ? '12px' : '16px',
          }}>
            <TeamSummaryTable
              leaves={leaves}
              members={members}
              periodStart={getWeekStart()}
              periodEnd={getWeekEnd()}
              workDays={workDays}
              theme={theme}
              isMobile={isMobile}
            />
          </div>
        </div>
      )}

      {/* CALENDAR TAB */}
      {activeTab === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Period selector + View toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['week', 'month', 'year'].map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: '8px 16px',
                  background: period === p ? hexToRgba(theme.accent, 0.12) : theme.cardBg,
                  color: period === p ? theme.text : theme.textSecondary,
                  border: `1px solid ${period === p ? hexToRgba(theme.accent, 0.3) : theme.border}`,
                  borderRadius: '8px', fontSize: '13px',
                  fontWeight: period === p ? '600' : '400',
                  cursor: 'pointer', textTransform: 'capitalize',
                  fontFamily: getFontFamily('english'),
                }}>
                  This {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              style={{
                padding: '8px 16px', background: theme.cardBg,
                border: `1px solid ${theme.border}`, borderRadius: '8px',
                color: theme.text, fontSize: '13px', cursor: 'pointer',
                fontFamily: getFontFamily('english'),
              }}
            >
              {viewMode === 'calendar' ? 'List View' : 'Calendar View'}
            </button>
          </div>

          {/* Calendar View */}
          {viewMode === 'calendar' ? (
            <LeaveCalendar leaves={leaves} members={members} theme={theme} isMobile={isMobile} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <FilterBar
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                memberFilter={memberFilter}
                setMemberFilter={setMemberFilter}
                members={members}
                theme={theme}
                isMobile={isMobile}
              />
              {filteredLeaves.length === 0 ? (
                <div style={{
                  background: theme.cardBg, border: `1px solid ${theme.border}`,
                  borderRadius: '12px', padding: '40px',
                  textAlign: 'center', color: theme.textSecondary,
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>{TYPE_ICONS.annual}</div>
                  <div style={{ fontSize: '14px', fontFamily: getFontFamily('english') }}>No leave records found</div>
                  <div style={{ fontSize: '12px', marginTop: '8px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
                    Leave data is synced from ClickUp
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {groupedLeaves.active.length > 0 && (
                    <>
                      <GroupHeader label="Active Now" count={groupedLeaves.active.length} color="#10b981" theme={theme} />
                      {groupedLeaves.active.map((leave, idx) => (
                        <LeaveCard key={leave.id || `active-${idx}`} leave={leave} member={getMember(leave, members)} theme={theme} isMobile={isMobile} />
                      ))}
                    </>
                  )}
                  {groupedLeaves.upcoming.length > 0 && (
                    <>
                      <GroupHeader label="Upcoming" count={groupedLeaves.upcoming.length} color="#3b82f6" theme={theme} />
                      {groupedLeaves.upcoming.map((leave, idx) => (
                        <LeaveCard key={leave.id || `upcoming-${idx}`} leave={leave} member={getMember(leave, members)} theme={theme} isMobile={isMobile} />
                      ))}
                    </>
                  )}
                  {groupedLeaves.past.length > 0 && (
                    <>
                      <GroupHeader label="Past" count={groupedLeaves.past.length} color="#6b7280" theme={theme} />
                      {groupedLeaves.past.map((leave, idx) => (
                        <LeaveCard key={leave.id || `past-${idx}`} leave={leave} member={getMember(leave, members)} theme={theme} isMobile={isMobile} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeavesTab;
