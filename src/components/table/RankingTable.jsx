import React, { useState } from 'react';
import Avatar from '../ui/Avatar';
import { useWindowSize } from '../../hooks/useWindowSize';
import { getTextFontStyle, tabularNumberStyle, getFontFamily } from '../../utils/typography';
import { formatHoursToHM } from '../../utils/timeFormat';
import { getMetricColor } from '../../utils/metricColor';

// Rank medal colors (fixed — not theme-dependent)
const RANK_COLORS = ['#fbbf24', '#9ca3af', '#d97706'];

const RankingTable = ({ members, theme, onMemberClick, dateRangeInfo }) => {
  const { isMobile } = useWindowSize();
  const workingDays = dateRangeInfo?.workingDays || 1;
  const lightMode = theme.type !== 'dark';
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);

  // Use pre-calculated score from member data (global score formula)
  const membersWithScore = members.map((member) => {
    const timeToMinutes = (timeStr) => {
      if (!timeStr || timeStr === '—') return 999;
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const displayStartTime = member.avgStartTime || member.startTime || '—';
    const displayEndTime = member.avgEndTime || member.endTime || '—';
    const startDelta = member.startDelta || 0;
    const endDelta = member.endDelta || 0;

    return {
      ...member,
      score: member.score ?? 0,
      avgStartMinutes: timeToMinutes(displayStartTime),
      avgEndMinutes: timeToMinutes(displayEndTime),
      displayStartTime,
      displayEndTime,
      startDelta,
      endDelta,
    };
  });

  // Sort members
  const sortedMembers = [...membersWithScore].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'score':
        aVal = a.score;
        bVal = b.score;
        break;
      case 'tracked':
        aVal = a.tracked;
        bVal = b.tracked;
        break;
      case 'tasks':
        aVal = a.tasks;
        bVal = b.tasks;
        break;
      case 'done':
        aVal = a.done;
        bVal = b.done;
        break;
      case 'compliance':
        aVal = a.complianceHours || 0;
        bVal = b.complianceHours || 0;
        break;
      default:
        aVal = a.score;
        bVal = b.score;
    }

    if (sortOrder === 'asc') {
      return aVal - bVal;
    } else {
      return bVal - aVal;
    }
  });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="ml-1 opacity-30">⇅</span>;
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  // Format compliance display: show percentage (complianceHours / (dailyTarget × memberWorkingDays) × 100%)
  const formatComplianceDisplay = (member) => {
    const compliance = member.complianceHours || 0;
    const dailyTarget = member.target || 6.5;
    const mWorkingDays = member.workingDays || workingDays;
    const totalTarget = dailyTarget * mWorkingDays;
    const pct = Math.min(Math.round((compliance / totalTarget) * 100), 100);
    return { pct, label: `${pct}%` };
  };

  // Score badge colors — dynamic per score value, must be inline (runtime value)
  const getScoreBadgeStyle = (score) => {
    const color = score >= 80
      ? 'var(--color-success)'
      : score >= 60
      ? 'var(--color-warning)'
      : 'var(--color-danger)';
    const bg = score >= 80
      ? 'rgba(16, 185, 129, 0.12)'
      : score >= 60
      ? 'rgba(245, 158, 11, 0.12)'
      : 'rgba(239, 68, 68, 0.12)';
    return { color, background: bg };
  };

  return (
    <div className="bg-[var(--color-card-bg)] rounded-card border border-[var(--color-border)] overflow-hidden">
      {/* Table Header */}
      <div className="px-4 py-4 border-b border-[var(--color-border-light)] flex items-center justify-between gap-3">
        <div
          className="text-base font-bold text-[var(--color-text)]"
          style={getFontFamily('english') ? { fontFamily: getFontFamily('english') } : undefined}
        >
          Team Ranking
        </div>

        {/* Mobile: Sort dropdown button | Desktop: member count */}
        {isMobile ? (
          <div className="relative">
            <button
              onClick={() => setIsMobileSortOpen(!isMobileSortOpen)}
              className="px-[10px] py-[6px] rounded-button border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] text-xs font-medium cursor-pointer flex items-center gap-[6px]"
              style={{ fontFamily: getFontFamily('english') }}
            >
              <span className="text-[11px]">↕</span>
              {sortBy === 'score' ? 'Score' : sortBy === 'tracked' ? 'Tracked' : sortBy === 'tasks' ? 'Tasks' : sortBy === 'compliance' ? 'Compliance' : 'Done'}
              <span className="text-[9px] opacity-50">▼</span>
            </button>

            {isMobileSortOpen && (
              <>
                <div
                  onClick={() => setIsMobileSortOpen(false)}
                  className="fixed inset-0 z-[1098]"
                />
                <div className="absolute top-[calc(100%+4px)] right-0 z-[1099] bg-[var(--color-card-bg)] backdrop-blur-[var(--effect-backdrop-blur)] rounded-card border border-[var(--color-border)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] min-w-[150px] overflow-hidden">
                  {[
                    { id: 'score', label: 'Score' },
                    { id: 'tracked', label: 'Tracked' },
                    { id: 'tasks', label: 'Tasks' },
                    { id: 'done', label: 'Done' },
                    { id: 'compliance', label: 'Compliance' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        handleSort(opt.id);
                        setIsMobileSortOpen(false);
                      }}
                      className={`w-full px-[14px] py-[10px] border-none text-[var(--color-text)] text-[13px] cursor-pointer flex items-center justify-between text-left ${
                        sortBy === opt.id ? 'bg-[rgba(255,255,255,0.08)] font-semibold' : 'bg-transparent font-normal'
                      }`}
                      style={{ fontFamily: getFontFamily('english') }}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.id && (
                        <span className="text-[11px] opacity-60">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            className="text-xs text-[var(--color-text-muted)]"
            style={{ fontFamily: getFontFamily('english') }}
          >
            {members?.length || 0} members
          </div>
        )}
      </div>

      {/* Mobile Card Layout */}
      {isMobile && (
        <div>
          {sortedMembers.length === 0 ? (
            <div className="text-center py-10 text-[var(--color-text-muted)]">
              <div className="text-4xl mb-3 opacity-30">🏆</div>
              <div className="text-sm" style={{ fontFamily: getFontFamily('english') }}>No members to rank</div>
            </div>
          ) : sortedMembers.map((member, index) => {
            const compliance = formatComplianceDisplay(member);
            const isTopThree = index < 3;
            const hasActivity = member.tracked > 0 || member.score > 0;
            const scoreBadgeStyle = getScoreBadgeStyle(member.score);

            return (
              <div
                key={member.id}
                onClick={() => onMemberClick && onMemberClick(member)}
                className={`px-4 py-4 border-b border-[var(--color-border-light)] ${onMemberClick ? 'cursor-pointer' : 'cursor-default'} ${!hasActivity ? 'opacity-45' : ''}`}
              >
                {/* Top row: Rank + Avatar + Name + Score */}
                <div className="flex items-center gap-[10px]">
                  {/* Rank */}
                  <div
                    className="text-sm font-bold w-[22px] text-center shrink-0"
                    style={{
                      color: isTopThree ? RANK_COLORS[index] : 'var(--color-text-muted)',
                      ...tabularNumberStyle,
                    }}
                  >
                    {index + 1}
                  </div>
                  {/* Avatar */}
                  <Avatar name={member.name} status={member.status} theme={theme} size={32} profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-semibold text-[var(--color-text)] whitespace-nowrap overflow-hidden text-ellipsis"
                      style={getTextFontStyle(member.name)}
                    >
                      {member.name}
                    </div>
                  </div>
                  {/* Score Badge */}
                  <div
                    className="px-3 py-1 rounded-button shrink-0 text-[13px] font-bold"
                    style={{ ...scoreBadgeStyle, ...tabularNumberStyle }}
                  >
                    {Math.round(member.score)}%
                  </div>
                </div>

                {/* Metrics Grid — only for active members */}
                {hasActivity && (
                  <div className="grid grid-cols-3 gap-1 mt-[10px] ml-8 pl-[10px]">
                    <div style={tabularNumberStyle}>
                      <div className="text-[10px] text-[var(--color-text-muted)] font-normal mb-[2px]" style={{ fontFamily: getFontFamily('english') }}>Tracked</div>
                      <div className="text-[13px] text-[var(--color-text)] font-semibold">{formatHoursToHM(member.tracked)}</div>
                    </div>
                    <div style={tabularNumberStyle}>
                      <div className="text-[10px] text-[var(--color-text-muted)] font-normal mb-[2px]" style={{ fontFamily: getFontFamily('english') }}>Tasks</div>
                      <div className="text-[13px]">
                        <span className="text-[var(--color-text)] font-semibold">{member.tasks}</span>
                        <span className="text-[var(--color-text-muted)] font-normal">/</span>
                        <span className="text-[var(--color-success)] font-semibold">{member.done}</span>
                      </div>
                    </div>
                    <div style={tabularNumberStyle}>
                      <div className="text-[10px] text-[var(--color-text-muted)] font-normal mb-[2px]" style={{ fontFamily: getFontFamily('english') }}>Compliance</div>
                      <div className="text-[13px] font-semibold" style={{ color: getMetricColor(compliance.pct, { lightMode }) }}>{compliance.label}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop Table Layout */}
      {!isMobile && (
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full min-w-[800px] border-collapse border-spacing-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr className="bg-[var(--color-inner-bg)]">
                <th className="px-3 py-[14px] text-center text-xs font-semibold text-[var(--color-text-muted)] w-[50px] sticky left-0 bg-[var(--color-inner-bg)] z-10 border-b-2 border-[var(--color-border)] whitespace-nowrap">
                  #
                </th>
                <th className="px-3 py-[14px] text-left text-xs font-semibold text-[var(--color-text-muted)] min-w-[140px] w-[140px] sticky left-[50px] bg-[var(--color-inner-bg)] z-10 border-b-2 border-[var(--color-border)] whitespace-nowrap">
                  Member
                </th>
                <th
                  onClick={() => handleSort('tracked')}
                  className="px-3 py-[14px] text-center text-xs font-semibold text-[var(--color-text-muted)] cursor-pointer select-none w-[100px] border-b-2 border-[var(--color-border)] whitespace-nowrap"
                >
                  Time tracked<SortIcon column="tracked" />
                </th>
                <th
                  onClick={() => handleSort('tasks')}
                  className="px-3 py-[14px] text-center text-xs font-semibold text-[var(--color-text-muted)] cursor-pointer select-none w-[85px] border-b-2 border-[var(--color-border)] whitespace-nowrap"
                >
                  Workload<SortIcon column="tasks" />
                </th>
                <th
                  onClick={() => handleSort('done')}
                  className="px-3 py-[14px] text-center text-xs font-semibold text-[var(--color-text-muted)] cursor-pointer select-none w-[95px] border-b-2 border-[var(--color-border)] whitespace-nowrap"
                >
                  Completion<SortIcon column="done" />
                </th>
                <th
                  onClick={() => handleSort('compliance')}
                  className="px-3 py-[14px] text-center text-xs font-semibold text-[var(--color-text-muted)] cursor-pointer select-none w-[200px] border-b-2 border-[var(--color-border)] whitespace-nowrap"
                >
                  Compliance<SortIcon column="compliance" />
                </th>
                <th
                  onClick={() => handleSort('score')}
                  className="px-3 py-[14px] text-center text-xs font-semibold text-[var(--color-text-muted)] cursor-pointer select-none w-[80px] border-b-2 border-[var(--color-border)] whitespace-nowrap"
                >
                  Score<SortIcon column="score" />
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedMembers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-[var(--color-text-muted)]">
                    <div className="text-4xl mb-3 opacity-30">🏆</div>
                    <div className="text-sm" style={{ fontFamily: getFontFamily('english') }}>No members to rank</div>
                  </td>
                </tr>
              ) : sortedMembers.map((member, index) => {
                const isTopThree = index < 3;
                const compliance = formatComplianceDisplay(member);
                const scoreBadgeStyle = getScoreBadgeStyle(member.score);
                return (
                  <tr
                    key={member.id}
                    onClick={() => onMemberClick && onMemberClick(member)}
                    className={`border-b border-[var(--color-border-light)] transition-[background] duration-200 bg-transparent ${onMemberClick ? 'cursor-pointer' : 'cursor-default'}`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-inner-bg)';
                      const cells = e.currentTarget.querySelectorAll('td');
                      cells[0].style.background = 'var(--color-inner-bg)';
                      cells[1].style.background = 'var(--color-inner-bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      const cells = e.currentTarget.querySelectorAll('td');
                      cells[0].style.background = 'var(--color-card-bg)';
                      cells[1].style.background = 'var(--color-card-bg)';
                    }}
                  >
                    <td
                      className="px-3 py-[14px] text-center text-sm font-bold sticky left-0 z-[5] transition-[background] duration-200 bg-[var(--color-card-bg)]"
                      style={{
                        color: isTopThree ? RANK_COLORS[index] : 'var(--color-text-muted)',
                        ...tabularNumberStyle,
                      }}
                    >
                      {index + 1}
                    </td>
                    <td className="px-3 py-[14px] sticky left-[50px] bg-[var(--color-card-bg)] z-[5] transition-[background] duration-200">
                      <div className="flex items-center gap-[10px]">
                        <Avatar name={member.name} status={member.status} theme={theme} size={32} profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
                        <div
                          className="text-[13px] font-semibold text-[var(--color-text)] whitespace-nowrap"
                          style={getTextFontStyle(member.name)}
                        >
                          {member.name}
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-3 py-[14px] text-center text-[13px] font-semibold text-[var(--color-text)]"
                      style={tabularNumberStyle}
                    >
                      {formatHoursToHM(member.tracked)}
                    </td>
                    <td
                      className="px-3 py-[14px] text-center text-[13px] font-semibold text-[var(--color-text)]"
                      style={tabularNumberStyle}
                    >
                      {member.tasks}
                    </td>
                    <td
                      className="px-3 py-[14px] text-center text-[13px] font-semibold text-[var(--color-success)]"
                      style={tabularNumberStyle}
                    >
                      {member.done}
                    </td>
                    {/* Compliance */}
                    <td
                      className="px-3 py-[14px] text-center text-xs text-[var(--color-text-secondary)]"
                      style={tabularNumberStyle}
                    >
                      <span className="font-semibold" style={{ color: getMetricColor(compliance.pct, { lightMode }) }}>
                        {compliance.label}
                      </span>
                    </td>
                    <td className="px-3 py-[14px] text-center">
                      <div
                        className="inline-block px-3 py-1 rounded-button text-sm font-bold"
                        style={{ ...scoreBadgeStyle, ...tabularNumberStyle }}
                      >
                        {Math.round(member.score)}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RankingTable;
