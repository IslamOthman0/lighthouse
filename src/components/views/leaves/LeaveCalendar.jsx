import React, { useState, useMemo } from 'react';
import Avatar from '../../ui/Avatar';
import { TYPE_ICONS, TYPE_COLORS, TYPE_LABELS, getMember, toLocalDateStr } from './constants';
import { tabularNumberStyle } from '../../../utils/typography';

/**
 * Full calendar view with member avatars on leave days.
 * Receives filtered leaves (respects type/member filters from parent).
 */
const LeaveCalendar = ({ leaves, members, theme, isMobile, typeFilter, onTypeFilterChange, memberFilter, onMemberFilterChange }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const todayStr = toLocalDateStr();
  const todayDate = new Date();
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;

  // Apply filters
  const filteredLeaves = useMemo(() => {
    let filtered = leaves.filter(l => l.status !== 'rejected');
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(l => l.type === typeFilter);
    }
    if (memberFilter && memberFilter !== 'all') {
      filtered = filtered.filter(l =>
        String(l.memberId) === memberFilter || String(l.memberClickUpId) === memberFilter
      );
    }
    return filtered;
  }, [leaves, typeFilter, memberFilter]);

  // Build day -> [{ member, leave }] map
  const dayMap = useMemo(() => {
    const map = {};
    filteredLeaves.forEach(l => {
      const start = new Date(l.startDate + 'T00:00:00');
      const end = new Date((l.endDate || l.startDate) + 'T00:00:00');
      const cur = new Date(start);
      while (cur <= end) {
        if (cur.getMonth() === month && cur.getFullYear() === year) {
          const day = cur.getDate();
          if (!map[day]) map[day] = [];
          const member = getMember(l, members);
          // Deduplicate by member per day
          if (member && !map[day].find(e => String(e.member.clickUpId || e.member.id) === String(member.clickUpId || member.id))) {
            map[day].push({ member, leave: l });
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [filteredLeaves, members, month, year]);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build cells
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ type: 'empty', key: `e-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ type: 'day', day: d, entries: dayMap[d] || [] });
  }

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'annual', label: 'Annual' },
    { value: 'sick', label: 'Sick' },
    { value: 'wfh', label: 'WFH' },
    { value: 'bonus', label: 'Bonus' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {typeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => onTypeFilterChange(opt.value)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: (typeFilter || 'all') === opt.value ? `${theme.accent}20` : `${theme.text}08`,
                color: (typeFilter || 'all') === opt.value ? theme.text : theme.textSecondary,
              }}
            >
              {opt.value !== 'all' && TYPE_ICONS[opt.value]} {opt.label}
            </button>
          ))}
        </div>
        {/* Member filter */}
        <select
          value={memberFilter || 'all'}
          onChange={e => onMemberFilterChange(e.target.value)}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 12,
            border: `1px solid ${theme.border}`,
            background: theme.cardBg,
            color: theme.text,
            cursor: 'pointer',
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

      {/* Month Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <button onClick={prevMonth} style={navBtnStyle(theme)}>&lsaquo;</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{monthLabel}</span>
        <button onClick={nextMonth} style={navBtnStyle(theme)}>&rsaquo;</button>
      </div>

      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2,
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 8,
      }}>
        {/* Day headers */}
        {dayLabels.map(l => (
          <div key={l} style={{
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: theme.textSecondary,
            padding: '6px 0',
          }}>
            {l}
          </div>
        ))}

        {/* Day cells */}
        {cells.map(cell => {
          if (cell.type === 'empty') {
            return <div key={cell.key} />;
          }
          const { day, entries } = cell;
          const isToday = isCurrentMonth && day === todayDate.getDate();
          const hasEntries = entries.length > 0;
          const isExpanded = expandedDay === day;

          return (
            <div
              key={day}
              onClick={() => hasEntries && setExpandedDay(isExpanded ? null : day)}
              style={{
                minHeight: isMobile ? 44 : 60,
                padding: 4,
                borderRadius: 6,
                border: isToday ? `1px solid ${theme.text}40` : '1px solid transparent',
                background: isToday ? `${theme.text}08` : 'transparent',
                cursor: hasEntries ? 'pointer' : 'default',
                position: 'relative',
              }}
            >
              {/* Day number */}
              <div style={{
                fontSize: 11,
                fontWeight: isToday ? 700 : 400,
                color: isToday ? theme.text : theme.textSecondary,
                ...tabularNumberStyle,
                marginBottom: 2,
              }}>
                {day}
              </div>

              {/* Member avatars */}
              {hasEntries && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {entries.slice(0, isMobile ? 2 : 3).map(({ member, leave }) => (
                    <Avatar
                      key={member.id || member.clickUpId}
                      name={member.name}
                      status={member.status}
                      theme={theme}
                      size={isMobile ? 22 : 28}
                      profilePicture={member.profilePicture}
                      clickUpColor={member.clickUpColor}
                      ringColor={TYPE_COLORS[leave.type] || TYPE_COLORS.annual}
                    />
                  ))}
                  {entries.length > (isMobile ? 2 : 3) && (
                    <span style={{
                      fontSize: 9,
                      color: theme.textSecondary,
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                      +{entries.length - (isMobile ? 2 : 3)}
                    </span>
                  )}
                </div>
              )}

              {/* Expanded popover */}
              {isExpanded && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 50,
                  minWidth: 180,
                  background: theme.cardBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  padding: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
                  onClick={e => e.stopPropagation()}
                >
                  {entries.map(({ member, leave }) => (
                    <div key={member.id || member.clickUpId} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 0',
                      fontSize: 12,
                    }}>
                      <Avatar name={member.name} status={member.status} theme={theme} size={20}
                        profilePicture={member.profilePicture} clickUpColor={member.clickUpColor}
                        ringColor={TYPE_COLORS[leave.type] || TYPE_COLORS.annual} />
                      <span style={{ color: theme.text, flex: 1 }}>{member.name}</span>
                      <span style={{
                        fontSize: 10,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: `${TYPE_COLORS[leave.type] || TYPE_COLORS.annual}20`,
                        color: TYPE_COLORS[leave.type] || TYPE_COLORS.annual,
                      }}>
                        {TYPE_LABELS[leave.type] || 'Leave'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: theme.textSecondary }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 4, borderRadius: 2, background: color, display: 'inline-block' }} />
            {TYPE_LABELS[type]}
          </span>
        ))}
      </div>
    </div>
  );
};

const navBtnStyle = (theme) => ({
  background: 'none',
  border: `1px solid ${theme.border}`,
  borderRadius: 6,
  color: theme.text,
  fontSize: 18,
  cursor: 'pointer',
  padding: '2px 10px',
  lineHeight: 1,
});

export default LeaveCalendar;
