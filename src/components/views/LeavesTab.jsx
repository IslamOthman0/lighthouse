/**
 * Leaves & WFH Tab Component (Redesigned)
 *
 * View-only monitoring dashboard for team leaves and WFH days.
 * All data synced from ClickUp - no add/edit/delete functionality.
 *
 * Features:
 * - 4 stat cards: On Leave Today, WFH Today, Team Availability, Week Overview
 * - Calendar view with month navigation and color-coded day cells
 * - List view grouped by Active/Upcoming/Past with card layout
 * - Filter by type and member, period selector for list view
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db';
import { useAppStore } from '../../stores/useAppStore';
import { useSettings } from '../../hooks/useSettings';
import { DEFAULT_MEMBER_QUOTAS } from '../../constants/defaults';
import Avatar from '../ui/Avatar';
import { getFontFamily, getAdaptiveFontFamily, tabularNumberStyle } from '../../utils/typography';
import { hexToRgba } from '../../utils/colorHelpers';
import { calculateLeaveDays } from '../../utils/leaveHelpers';

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

// ===== Utility Functions =====

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

const todayStr = () => new Date().toISOString().split('T')[0];

const isLeaveActiveToday = (leave) => {
  const today = todayStr();
  return today >= leave.startDate && today <= (leave.endDate || leave.startDate);
};

const isLeaveUpcoming = (leave) => {
  const today = todayStr();
  return leave.startDate > today;
};

const isLeavePast = (leave) => {
  const today = todayStr();
  return (leave.endDate || leave.startDate) < today;
};

// ===== Member Matching =====

const getMember = (leave, members) => {
  return members.find(m =>
    String(m.id) === String(leave.memberId) ||
    String(m.clickUpId) === String(leave.memberId) ||
    String(m.id) === String(leave.memberClickUpId) ||
    String(m.clickUpId) === String(leave.memberClickUpId)
  );
};

// ===== Sub-Components =====

/**
 * Stat Card - On Leave Today
 */
const OnLeaveTodayCard = ({ membersOnLeave, theme, isMobile }) => (
  <div
    style={{
      background: theme.cardBg,
      border: `1px solid ${theme.border}`,
      borderRadius: '12px',
      padding: isMobile ? '14px' : '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}
  >
    <div style={{ fontSize: '12px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
      {TYPE_ICONS.annual} On Leave Today
    </div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: theme.text, ...tabularNumberStyle }}>
      {membersOnLeave.length}
    </div>
    {membersOnLeave.length > 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        {membersOnLeave.slice(0, 3).map((m, i) => (
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
        {membersOnLeave.length > 3 && (
          <span style={{ fontSize: '11px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
            +{membersOnLeave.length - 3} more
          </span>
        )}
      </div>
    )}
  </div>
);

/**
 * Stat Card - WFH Today
 */
const WfhTodayCard = ({ membersWfh, theme, isMobile }) => (
  <div
    style={{
      background: theme.cardBg,
      border: `1px solid ${theme.border}`,
      borderRadius: '12px',
      padding: isMobile ? '14px' : '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}
  >
    <div style={{ fontSize: '12px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
      {TYPE_ICONS.wfh} WFH Today
    </div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: theme.text, ...tabularNumberStyle }}>
      {membersWfh.length}
    </div>
    {membersWfh.length > 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        {membersWfh.slice(0, 3).map((m, i) => (
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
        {membersWfh.length > 3 && (
          <span style={{ fontSize: '11px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
            +{membersWfh.length - 3} more
          </span>
        )}
      </div>
    )}
  </div>
);

/**
 * Stat Card - Team Availability
 */
const TeamAvailabilityCard = ({ available, total, theme, isMobile }) => {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: '12px',
        padding: isMobile ? '14px' : '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '12px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
        Team Availability
      </div>
      <div style={{ fontSize: '20px', fontWeight: '700', color: theme.text, fontFamily: getFontFamily('english') }}>
        <span style={tabularNumberStyle}>{available}</span>
        <span style={{ fontSize: '14px', fontWeight: '400', color: theme.textSecondary }}> of </span>
        <span style={tabularNumberStyle}>{total}</span>
        <span style={{ fontSize: '14px', fontWeight: '400', color: theme.textSecondary }}> available</span>
      </div>
      {/* Availability bar */}
      <div style={{
        width: '100%',
        height: '6px',
        borderRadius: '3px',
        background: hexToRgba(theme.accent, 0.08),
        overflow: 'hidden',
        marginTop: '4px',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: '3px',
          background: pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ fontSize: '11px', color: theme.textMuted, ...tabularNumberStyle }}>
        {pct}% available today
      </div>
    </div>
  );
};

/**
 * Stat Card - This Week Overview (Sun-Thu strip)
 */
const WeekOverviewCard = ({ leaves, members, settings, theme, isMobile }) => {
  const workDays = settings?.schedule?.workDays || [0, 1, 2, 3, 4];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const todayDay = today.getDay();

  // Get start of week (Sunday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - todayDay);
  weekStart.setHours(0, 0, 0, 0);

  const weekDays = useMemo(() => {
    return workDays.map(dayIdx => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayIdx);
      const dateStr = date.toISOString().split('T')[0];

      // Count how many members are on leave this day
      const onLeaveCount = leaves.filter(l => {
        if (l.type === 'wfh') return false;
        return dateStr >= l.startDate && dateStr <= (l.endDate || l.startDate);
      }).length;

      const available = members.length - onLeaveCount;

      return {
        label: dayLabels[dayIdx],
        dayIdx,
        dateStr,
        isToday: dayIdx === todayDay,
        available,
        onLeave: onLeaveCount,
      };
    });
  }, [leaves, members.length, workDays, weekStart.toISOString()]);

  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: '12px',
        padding: isMobile ? '14px' : '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '12px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
        This Week Overview
      </div>
      <div style={{
        display: 'flex',
        gap: isMobile ? '4px' : '6px',
        marginTop: '4px',
      }}>
        {weekDays.map((d) => (
          <div
            key={d.dayIdx}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 2px',
              borderRadius: '8px',
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
              fontSize: '16px',
              fontWeight: '700',
              color: d.onLeave > 0
                ? (d.available <= 0 ? '#ef4444' : '#f59e0b')
                : '#10b981',
              ...tabularNumberStyle,
            }}>
              {d.available}
            </span>
            <span style={{
              fontSize: '9px',
              color: theme.textMuted,
              fontFamily: getFontFamily('english'),
            }}>
              avail
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Calendar View with month navigation
 */
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
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const goToToday = () => {
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
  };

  // Build events map: day -> array of { leave, member }
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
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: '12px',
        padding: isMobile ? '14px' : '20px',
      }}
    >
      {/* Month Header with Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <button
          onClick={goToPrevMonth}
          style={{
            background: 'none',
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            color: theme.text,
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          \u2039
        </button>
        <span
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: theme.text,
            fontFamily: getFontFamily('english'),
            minWidth: '160px',
            textAlign: 'center',
          }}
        >
          {monthName}
        </span>
        <button
          onClick={goToNextMonth}
          style={{
            background: 'none',
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            color: theme.text,
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          \u203A
        </button>
        {!isCurrentMonth && (
          <button
            onClick={goToToday}
            style={{
              background: hexToRgba(theme.accent, 0.08),
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              color: theme.text,
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '500',
              fontFamily: getFontFamily('english'),
            }}
          >
            Today
          </button>
        )}
      </div>

      {/* Day Names */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '8px',
        }}
      >
        {dayNames.map(day => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: '600',
              color: theme.textMuted,
              padding: isMobile ? '4px 2px' : '8px 4px',
              fontFamily: getFontFamily('english'),
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
        }}
      >
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} style={{ padding: isMobile ? '4px' : '8px' }} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isToday = day === today.getDate() && isCurrentMonth;
          const dayEvents = eventsMap[day] || [];
          const hasLeave = dayEvents.some(e => ['annual', 'sick', 'bonus'].includes(e.leave.type));
          const hasWfh = dayEvents.some(e => e.leave.type === 'wfh');
          const hasHoliday = dayEvents.some(e => e.leave.type === 'holiday');
          const memberCount = dayEvents.length;
          const isHovered = hoveredDay === day && memberCount > 0;

          // Determine background color
          let bgColor = 'transparent';
          if (hasHoliday) bgColor = 'rgba(245, 158, 11, 0.1)';
          if (hasWfh) bgColor = 'rgba(16, 185, 129, 0.1)';
          if (hasLeave) bgColor = 'rgba(59, 130, 246, 0.1)';

          return (
            <div
              key={day}
              style={{
                position: 'relative',
                padding: isMobile ? '4px 2px' : '8px 4px',
                textAlign: 'center',
                borderRadius: '8px',
                background: bgColor,
                border: isToday
                  ? `2px solid ${theme.accent}`
                  : '2px solid transparent',
                cursor: memberCount > 0 ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: isToday ? '700' : '400',
                  color: isToday ? theme.accent : theme.text,
                  ...tabularNumberStyle,
                }}
              >
                {day}
              </div>
              {/* Member count dots */}
              {memberCount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '2px',
                    marginTop: '2px',
                    flexWrap: 'wrap',
                  }}
                >
                  {dayEvents.slice(0, 4).map((evt, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: TYPE_COLORS[evt.leave.type] || '#3b82f6',
                      }}
                    />
                  ))}
                  {memberCount > 4 && (
                    <span style={{
                      fontSize: '8px',
                      color: theme.textMuted,
                      lineHeight: '5px',
                      ...tabularNumberStyle,
                    }}>
                      +{memberCount - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Hover tooltip */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: theme.type === 'dark' ? '#1f2937' : '#ffffff',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    zIndex: 50,
                    minWidth: '140px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    pointerEvents: 'none',
                  }}
                >
                  {dayEvents.slice(0, 5).map((evt, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '2px 0',
                      }}
                    >
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: TYPE_COLORS[evt.leave.type] || '#3b82f6',
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: '11px',
                        color: theme.text,
                        fontFamily: getAdaptiveFontFamily(evt.member?.name),
                        whiteSpace: 'nowrap',
                      }}>
                        {evt.member?.name || 'Unknown'}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        color: theme.textMuted,
                        fontFamily: getFontFamily('english'),
                      }}>
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
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '16px',
          fontSize: '11px',
          color: theme.textSecondary,
          justifyContent: 'center',
          flexWrap: 'wrap',
          fontFamily: getFontFamily('english'),
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
          Leave
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
          WFH
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
          Holiday
        </span>
      </div>
    </div>
  );
};

/**
 * Leave Card for list view (replaces table row)
 */
const LeaveCard = ({ leave, member, theme, isMobile }) => {
  const typeColor = TYPE_COLORS[leave.type] || '#3b82f6';
  const statusColor = STATUS_COLORS_MAP[leave.status] || theme.textMuted;
  const days = calculateLeaveDays(leave.startDate, leave.endDate);

  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: '10px',
        padding: isMobile ? '12px' : '14px 16px',
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '10px' : '16px',
        flexDirection: isMobile ? 'column' : 'row',
      }}
    >
      {/* Avatar + Name */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: isMobile ? 'auto' : '160px',
        flexShrink: 0,
      }}>
        <Avatar name={member?.name} size={32} theme={theme} />
        <span style={{
          fontSize: '14px',
          fontWeight: '500',
          color: theme.text,
          fontFamily: getAdaptiveFontFamily(member?.name),
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {member?.name || 'Unknown'}
        </span>
      </div>

      {/* Type */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        minWidth: isMobile ? 'auto' : '90px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px' }}>{TYPE_ICONS[leave.type] || '\u{1F4C5}'}</span>
        <span style={{
          fontSize: '13px',
          color: typeColor,
          fontWeight: '500',
          fontFamily: getFontFamily('english'),
          textTransform: 'capitalize',
        }}>
          {TYPE_LABELS[leave.type] || leave.type}
        </span>
      </div>

      {/* Date Range */}
      <div style={{
        flex: 1,
        fontSize: '13px',
        color: theme.textSecondary,
        fontFamily: getFontFamily('english'),
        ...tabularNumberStyle,
      }}>
        {formatDateRange(leave.startDate, leave.endDate)}
      </div>

      {/* Days Count */}
      <div style={{
        fontSize: '13px',
        fontWeight: '600',
        color: theme.text,
        minWidth: '50px',
        textAlign: 'center',
        ...tabularNumberStyle,
      }}>
        {days} {days === 1 ? 'day' : 'days'}
      </div>

      {/* Status Badge */}
      <div
        style={{
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '500',
          background: hexToRgba(statusColor, 0.12),
          color: statusColor,
          textTransform: 'capitalize',
          fontFamily: getFontFamily('english'),
          flexShrink: 0,
        }}
      >
        {leave.status || 'scheduled'}
      </div>
    </div>
  );
};

/**
 * Grouped Section Header
 */
const GroupHeader = ({ label, count, color, theme }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    marginTop: '8px',
  }}>
    <div style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
    }} />
    <span style={{
      fontSize: '13px',
      fontWeight: '600',
      color: theme.text,
      fontFamily: getFontFamily('english'),
    }}>
      {label}
    </span>
    <span style={{
      fontSize: '12px',
      color: theme.textMuted,
      ...tabularNumberStyle,
    }}>
      ({count})
    </span>
    <div style={{
      flex: 1,
      height: '1px',
      background: theme.border,
      marginLeft: '4px',
    }} />
  </div>
);

/**
 * Filter Bar for list view
 */
const FilterBar = ({ typeFilter, setTypeFilter, memberFilter, setMemberFilter, members, theme, isMobile }) => {
  const typeOptions = ['all', 'annual', 'sick', 'wfh', 'bonus'];

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>
      {/* Type Filter */}
      <div style={{
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap',
      }}>
        {typeOptions.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{
              padding: '5px 12px',
              background: typeFilter === t ? hexToRgba(theme.accent, 0.12) : 'transparent',
              color: typeFilter === t ? theme.text : theme.textSecondary,
              border: `1px solid ${typeFilter === t ? hexToRgba(theme.accent, 0.3) : theme.border}`,
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: typeFilter === t ? '600' : '400',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontFamily: getFontFamily('english'),
            }}
          >
            {t === 'all' ? 'All' : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Member Filter */}
      <select
        value={memberFilter}
        onChange={(e) => setMemberFilter(e.target.value)}
        style={{
          padding: '5px 10px',
          background: theme.type === 'dark' ? '#1a1a1a' : '#ffffff',
          color: theme.text,
          border: `1px solid ${theme.border}`,
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: getFontFamily('english'),
          cursor: 'pointer',
          outline: 'none',
          minWidth: '120px',
        }}
      >
        <option value="all">All Members</option>
        {members.map(m => (
          <option key={m.id || m.clickUpId} value={String(m.clickUpId || m.id)}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
};

// ===== Main LeavesTab Component =====

const LeavesTab = ({ theme, isMobile = false }) => {
  const [viewMode, setViewMode] = useState('calendar');
  const [period, setPeriod] = useState('month');
  const [leaves, setLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');

  const members = useAppStore(state => state.members);
  const { settings } = useSettings();

  // Fetch leaves from database
  useEffect(() => {
    const fetchLeaves = async () => {
      setIsLoading(true);
      try {
        const allLeaves = await db.leaves.toArray();
        setLeaves(allLeaves);
      } catch (error) {
        console.error('Error fetching leaves:', error);
        setLeaves([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaves();
  }, []);

  // Members on leave / WFH today (from enriched member data)
  const membersOnLeave = useMemo(() => {
    return members.filter(m => m.onLeave === true);
  }, [members]);

  const membersWfh = useMemo(() => {
    return members.filter(m => m.onWfh === true);
  }, [members]);

  const totalMonitored = members.length;
  const availableCount = totalMonitored - membersOnLeave.length;

  // Filter leaves by period (for list view only)
  const filteredLeaves = useMemo(() => {
    const now = new Date();
    let filtered = [...leaves];

    // Period filter
    if (period === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const wsStr = weekStart.toISOString().split('T')[0];
      const weStr = weekEnd.toISOString().split('T')[0];

      filtered = filtered.filter(l => {
        const end = l.endDate || l.startDate;
        return l.startDate <= weStr && end >= wsStr;
      });
    } else if (period === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      filtered = filtered.filter(l => {
        const end = l.endDate || l.startDate;
        return l.startDate <= monthEnd && end >= monthStart;
      });
    } else if (period === 'year') {
      const yearStart = `${now.getFullYear()}-01-01`;
      const yearEnd = `${now.getFullYear()}-12-31`;

      filtered = filtered.filter(l => {
        const end = l.endDate || l.startDate;
        return l.startDate <= yearEnd && end >= yearStart;
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(l => l.type === typeFilter);
    }

    // Member filter
    if (memberFilter !== 'all') {
      filtered = filtered.filter(l => {
        return String(l.memberId) === memberFilter ||
          String(l.memberClickUpId) === memberFilter;
      });
    }

    return filtered;
  }, [leaves, period, typeFilter, memberFilter]);

  // Group filtered leaves into Active / Upcoming / Past
  const groupedLeaves = useMemo(() => {
    const active = filteredLeaves.filter(isLeaveActiveToday);
    const upcoming = filteredLeaves.filter(isLeaveUpcoming);
    const past = filteredLeaves.filter(isLeavePast);

    // Sort: Active by end date (soonest first)
    active.sort((a, b) => (a.endDate || a.startDate).localeCompare(b.endDate || b.startDate));
    // Upcoming by start date (soonest first)
    upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate));
    // Past by start date desc (most recent first)
    past.sort((a, b) => b.startDate.localeCompare(a.startDate));

    return { active, upcoming, past };
  }, [filteredLeaves]);

  if (isLoading) {
    return (
      <div
        style={{
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          color: theme.textSecondary,
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>{TYPE_ICONS.annual}</div>
        <div style={{ fontSize: '14px', fontFamily: getFontFamily('english') }}>Loading leave data...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Period Selector (filters list view only) */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['week', 'month', 'year'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 16px',
                background: period === p ? hexToRgba(theme.accent, 0.12) : theme.cardBg,
                color: period === p ? theme.text : theme.textSecondary,
                border: `1px solid ${period === p ? hexToRgba(theme.accent, 0.3) : theme.border}`,
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: period === p ? '600' : '400',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontFamily: getFontFamily('english'),
              }}
            >
              This {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <button
          onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
          style={{
            padding: '8px 16px',
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            color: theme.text,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: getFontFamily('english'),
          }}
        >
          {viewMode === 'calendar' ? 'List View' : 'Calendar View'}
        </button>
      </div>

      {/* Stats Cards - 4 cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? '10px' : '16px',
        }}
      >
        <OnLeaveTodayCard
          membersOnLeave={membersOnLeave}
          theme={theme}
          isMobile={isMobile}
        />
        <WfhTodayCard
          membersWfh={membersWfh}
          theme={theme}
          isMobile={isMobile}
        />
        <TeamAvailabilityCard
          available={availableCount}
          total={totalMonitored}
          theme={theme}
          isMobile={isMobile}
        />
        <WeekOverviewCard
          leaves={leaves}
          members={members}
          settings={settings}
          theme={theme}
          isMobile={isMobile}
        />
      </div>

      {/* Main Content */}
      {viewMode === 'calendar' ? (
        <LeaveCalendar
          leaves={leaves}
          members={members}
          theme={theme}
          isMobile={isMobile}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Filter Bar */}
          <FilterBar
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            memberFilter={memberFilter}
            setMemberFilter={setMemberFilter}
            members={members}
            theme={theme}
            isMobile={isMobile}
          />

          {/* Grouped Leave Cards */}
          {filteredLeaves.length === 0 ? (
            <div
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                color: theme.textSecondary,
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>{TYPE_ICONS.annual}</div>
              <div style={{ fontSize: '14px', fontFamily: getFontFamily('english') }}>No leave records found</div>
              <div style={{ fontSize: '12px', marginTop: '8px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
                Leave data is synced from ClickUp
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Active Now */}
              {groupedLeaves.active.length > 0 && (
                <>
                  <GroupHeader
                    label="Active Now"
                    count={groupedLeaves.active.length}
                    color="#10b981"
                    theme={theme}
                  />
                  {groupedLeaves.active.map((leave, idx) => (
                    <LeaveCard
                      key={leave.id || `active-${idx}`}
                      leave={leave}
                      member={getMember(leave, members)}
                      theme={theme}
                      isMobile={isMobile}
                    />
                  ))}
                </>
              )}

              {/* Upcoming */}
              {groupedLeaves.upcoming.length > 0 && (
                <>
                  <GroupHeader
                    label="Upcoming"
                    count={groupedLeaves.upcoming.length}
                    color="#3b82f6"
                    theme={theme}
                  />
                  {groupedLeaves.upcoming.map((leave, idx) => (
                    <LeaveCard
                      key={leave.id || `upcoming-${idx}`}
                      leave={leave}
                      member={getMember(leave, members)}
                      theme={theme}
                      isMobile={isMobile}
                    />
                  ))}
                </>
              )}

              {/* Past */}
              {groupedLeaves.past.length > 0 && (
                <>
                  <GroupHeader
                    label="Past"
                    count={groupedLeaves.past.length}
                    color="#6b7280"
                    theme={theme}
                  />
                  {groupedLeaves.past.map((leave, idx) => (
                    <LeaveCard
                      key={leave.id || `past-${idx}`}
                      leave={leave}
                      member={getMember(leave, members)}
                      theme={theme}
                      isMobile={isMobile}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeavesTab;
