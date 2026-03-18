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

  const isActive = (val) => (typeFilter || 'all') === val;

  return (
    <div className="flex flex-col gap-3">
      {/* Filter Bar */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Type filter pills */}
        <div className="flex gap-1">
          {typeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => onTypeFilterChange(opt.value)}
              className="px-[10px] py-1 rounded-badge text-xs font-medium border-none cursor-pointer transition-colors"
              style={{
                background: isActive(opt.value) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                color: isActive(opt.value) ? 'var(--color-text)' : 'var(--color-text-secondary)',
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
          className="px-2 py-1 rounded-badge text-xs border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text)] cursor-pointer"
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
      <div className="flex justify-between items-center">
        <button onClick={prevMonth} className="bg-transparent border border-[var(--color-border)] rounded-badge text-[var(--color-text)] text-lg cursor-pointer px-[10px] py-[2px] leading-none">
          &lsaquo;
        </button>
        <span className="text-[15px] font-semibold text-[var(--color-text)]">{monthLabel}</span>
        <button onClick={nextMonth} className="bg-transparent border border-[var(--color-border)] rounded-badge text-[var(--color-text)] text-lg cursor-pointer px-[10px] py-[2px] leading-none">
          &rsaquo;
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-[2px] bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-card p-2">
        {/* Day headers */}
        {dayLabels.map(l => (
          <div key={l} className="text-center text-[11px] font-semibold text-[var(--color-text-secondary)] py-[6px]">
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
              className="relative rounded-badge p-1"
              style={{
                minHeight: isMobile ? 44 : 60,
                border: isToday ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                background: isToday ? 'rgba(255,255,255,0.05)' : 'transparent',
                cursor: hasEntries ? 'pointer' : 'default',
              }}
            >
              {/* Day number */}
              <div
                className="text-[11px] mb-[2px]"
                style={{
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  ...tabularNumberStyle,
                }}
              >
                {day}
              </div>

              {/* Member avatars */}
              {hasEntries && (
                <div className="flex flex-wrap gap-[2px]">
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
                    <span className="text-[9px] text-[var(--color-text-secondary)] flex items-center">
                      +{entries.length - (isMobile ? 2 : 3)}
                    </span>
                  )}
                </div>
              )}

              {/* Expanded popover */}
              {isExpanded && (
                <div
                  className="absolute top-full left-0 z-50 min-w-[180px] bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-button p-2 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                  onClick={e => e.stopPropagation()}
                >
                  {entries.map(({ member, leave }) => {
                    const typeColor = TYPE_COLORS[leave.type] || TYPE_COLORS.annual;
                    return (
                      <div key={member.id || member.clickUpId} className="flex items-center gap-[6px] py-1 text-xs">
                        <Avatar name={member.name} status={member.status} theme={theme} size={20}
                          profilePicture={member.profilePicture} clickUpColor={member.clickUpColor}
                          ringColor={typeColor} />
                        <span className="text-[var(--color-text)] flex-1">{member.name}</span>
                        <span
                          className="text-[10px] px-[5px] py-[1px] rounded"
                          style={{
                            background: `${typeColor}20`,
                            color: typeColor,
                          }}
                        >
                          {TYPE_LABELS[leave.type] || 'Leave'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[11px] text-[var(--color-text-secondary)]">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="w-2 h-1 rounded-sm inline-block" style={{ background: color }} />
            {TYPE_LABELS[type]}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LeaveCalendar;
