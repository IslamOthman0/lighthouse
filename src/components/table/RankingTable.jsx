import React, { useState } from 'react';
import Avatar from '../ui/Avatar';
import { useWindowSize } from '../../hooks/useWindowSize';
import { getTextFontStyle, tabularNumberStyle, getFontFamily } from '../../utils/typography';
import { formatHoursToHM } from '../../utils/timeFormat';
import { getMetricColor } from '../../utils/metricColor';

const RankingTable = ({ members, theme, onMemberClick, dateRangeInfo }) => {
  const { isMobile } = useWindowSize();
  const workingDays = dateRangeInfo?.workingDays || 1;
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
    if (sortBy !== column) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>⇅</span>;
    return <span style={{ marginLeft: '4px' }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  // Format compliance display: show percentage (complianceHours / (dailyTarget × workingDays) × 100%)
  const formatComplianceDisplay = (member) => {
    const compliance = member.complianceHours || 0;
    const dailyTarget = member.target || 6.5;
    const totalTarget = dailyTarget * workingDays;
    const pct = Math.min(Math.round((compliance / totalTarget) * 100), 100);
    return { pct, label: `${pct}%` };
  };

  return (
    <div
      style={{
        background: theme.cardBg,
        borderRadius: '12px',
        border: `1px solid ${theme.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Table Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${theme.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: '700', color: theme.text, fontFamily: getFontFamily('english') }}>
          Team Ranking
        </div>

        {/* Mobile: Sort dropdown button | Desktop: member count */}
        {isMobile ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsMobileSortOpen(!isMobileSortOpen)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                background: 'transparent',
                color: theme.textSecondary,
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: getFontFamily('english'),
              }}
            >
              <span style={{ fontSize: '11px' }}>↕</span>
              {sortBy === 'score' ? 'Score' : sortBy === 'tracked' ? 'Tracked' : sortBy === 'tasks' ? 'Tasks' : sortBy === 'compliance' ? 'Compliance' : 'Done'}
              <span style={{ fontSize: '9px', opacity: 0.5 }}>▼</span>
            </button>

            {isMobileSortOpen && (
              <>
                <div
                  onClick={() => setIsMobileSortOpen(false)}
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1098 }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    zIndex: 1099,
                    background: theme.type === 'dark' ? 'rgba(24, 24, 24, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '12px',
                    border: `1px solid ${theme.border}`,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    minWidth: '150px',
                    overflow: 'hidden',
                  }}
                >
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
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: sortBy === opt.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                        border: 'none',
                        color: theme.text,
                        fontSize: '13px',
                        fontWeight: sortBy === opt.id ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        fontFamily: getFontFamily('english'),
                      }}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.id && (
                        <span style={{ fontSize: '11px', opacity: 0.6 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
            {members?.length || 0} members
          </div>
        )}
      </div>

      {/* Mobile Card Layout */}
      {isMobile && (
        <div>
          {sortedMembers.map((member, index) => {
            const scoreColor = member.score >= 80 ? theme.success : member.score >= 60 ? theme.warning : theme.danger;
            const compliance = formatComplianceDisplay(member);
            const isTopThree = index < 3;
            const rankColors = ['#fbbf24', '#9ca3af', '#d97706'];
            const hasActivity = member.tracked > 0 || member.score > 0;

            return (
              <div
                key={member.id}
                onClick={() => onMemberClick && onMemberClick(member)}
                style={{
                  padding: '16px',
                  borderBottom: `1px solid ${theme.borderLight}`,
                  borderLeft: 'none',
                  cursor: onMemberClick ? 'pointer' : 'default',
                  opacity: hasActivity ? 1 : 0.45,
                }}
              >
                {/* Top row: Rank + Avatar + Name + Score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Rank */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: isTopThree ? rankColors[index] : theme.textMuted,
                    width: '22px',
                    textAlign: 'center',
                    flexShrink: 0,
                    ...tabularNumberStyle,
                  }}>
                    {index + 1}
                  </div>
                  {/* Avatar */}
                  <Avatar name={member.name} status={member.status} theme={theme} size={32} profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px', fontWeight: '600', color: theme.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      ...getTextFontStyle(member.name),
                    }}>
                      {member.name}
                    </div>
                  </div>
                  {/* Score Badge */}
                  <div style={{
                    padding: '4px 12px', borderRadius: '8px', flexShrink: 0,
                    background: scoreColor + '18', color: scoreColor,
                    fontSize: '13px', fontWeight: '700', ...tabularNumberStyle,
                  }}>
                    {Math.round(member.score)}%
                  </div>
                </div>

                {/* Metrics Grid — only for active members */}
                {hasActivity && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '4px',
                    marginTop: '10px',
                    marginLeft: '32px',
                    paddingLeft: '10px',
                  }}>
                    <div style={{ ...tabularNumberStyle }}>
                      <div style={{ fontSize: '10px', color: theme.textMuted, fontWeight: '400', marginBottom: '2px', fontFamily: getFontFamily('english') }}>Tracked</div>
                      <div style={{ fontSize: '13px', color: theme.text, fontWeight: '600' }}>{formatHoursToHM(member.tracked)}</div>
                    </div>
                    <div style={{ ...tabularNumberStyle }}>
                      <div style={{ fontSize: '10px', color: theme.textMuted, fontWeight: '400', marginBottom: '2px', fontFamily: getFontFamily('english') }}>Tasks</div>
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: theme.text, fontWeight: '600' }}>{member.tasks}</span>
                        <span style={{ color: theme.textMuted, fontWeight: '400' }}>/</span>
                        <span style={{ color: theme.success, fontWeight: '600' }}>{member.done}</span>
                      </div>
                    </div>
                    <div style={{ ...tabularNumberStyle }}>
                      <div style={{ fontSize: '10px', color: theme.textMuted, fontWeight: '400', marginBottom: '2px', fontFamily: getFontFamily('english') }}>Compliance</div>
                      <div style={{ fontSize: '13px', color: getMetricColor(compliance.pct), fontWeight: '600' }}>{compliance.label}</div>
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
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table
            style={{
              width: '100%',
              minWidth: '800px',
              borderCollapse: 'separate',
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr style={{ background: theme.secondaryBg }}>
                <th
                  style={{
                    padding: '14px 12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: theme.textMuted,
                    width: '50px',
                    position: 'sticky',
                    left: 0,
                    background: theme.secondaryBg,
                    zIndex: 10,
                    borderBottom: `2px solid ${theme.border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    padding: '14px 12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: theme.textMuted,
                    minWidth: '140px',
                    width: '140px',
                    position: 'sticky',
                    left: '50px',
                    background: theme.secondaryBg,
                    zIndex: 10,
                    borderBottom: `2px solid ${theme.border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Member
                </th>
                <th
                  onClick={() => handleSort('tracked')}
                  style={{
                    padding: '14px 12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: theme.textMuted,
                    cursor: 'pointer',
                    userSelect: 'none',
                    width: '100px',
                    borderBottom: `2px solid ${theme.border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Time tracked<SortIcon column="tracked" />
                </th>
                <th
                  onClick={() => handleSort('tasks')}
                  style={{
                    padding: '14px 12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: theme.textMuted,
                    cursor: 'pointer',
                    userSelect: 'none',
                    width: '85px',
                    borderBottom: `2px solid ${theme.border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Workload<SortIcon column="tasks" />
                </th>
                <th
                  onClick={() => handleSort('done')}
                  style={{
                    padding: '14px 12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: theme.textMuted,
                    cursor: 'pointer',
                    userSelect: 'none',
                    width: '95px',
                    borderBottom: `2px solid ${theme.border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Completion<SortIcon column="done" />
                </th>
                <th
                  onClick={() => handleSort('compliance')}
                  style={{
                    padding: '14px 12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: theme.textMuted,
                    cursor: 'pointer',
                    userSelect: 'none',
                    width: '200px',
                    borderBottom: `2px solid ${theme.border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Compliance<SortIcon column="compliance" />
                </th>
                <th
                  onClick={() => handleSort('score')}
                  style={{
                    padding: '14px 12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: theme.textMuted,
                    cursor: 'pointer',
                    userSelect: 'none',
                    width: '80px',
                    borderBottom: `2px solid ${theme.border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Score<SortIcon column="score" />
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedMembers.map((member, index) => {
                const isTopThree = index < 3;
                const compliance = formatComplianceDisplay(member);
                return (
                <tr
                  key={member.id}
                  onClick={() => onMemberClick && onMemberClick(member)}
                  style={{
                    borderBottom: `1px solid ${theme.borderLight}`,
                    transition: 'background 0.2s ease',
                    background: 'transparent',
                    cursor: onMemberClick ? 'pointer' : 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme.secondaryBg;
                    const cells = e.currentTarget.querySelectorAll('td');
                    cells[0].style.background = theme.secondaryBg;
                    cells[1].style.background = theme.secondaryBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    const cells = e.currentTarget.querySelectorAll('td');
                    cells[0].style.background = theme.cardBg;
                    cells[1].style.background = theme.cardBg;
                  }}
                >
                  <td
                    style={{
                      padding: '14px 12px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: isTopThree ? theme.accent : theme.textMuted,
                      ...tabularNumberStyle,
                      position: 'sticky',
                      left: 0,
                      background: theme.cardBg,
                      zIndex: 5,
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {index + 1}
                  </td>
                  <td style={{
                    padding: '14px 12px',
                    position: 'sticky',
                    left: '50px',
                    background: theme.cardBg,
                    zIndex: 5,
                    transition: 'background 0.2s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar name={member.name} status={member.status} theme={theme} size={32} profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: theme.text,
                          whiteSpace: 'nowrap',
                          ...getTextFontStyle(member.name),
                        }}
                      >
                        {member.name}
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '14px 12px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: theme.text,
                      ...tabularNumberStyle,
                    }}
                  >
                    {formatHoursToHM(member.tracked)}
                  </td>
                  <td
                    style={{
                      padding: '14px 12px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: theme.text,
                      ...tabularNumberStyle,
                    }}
                  >
                    {member.tasks}
                  </td>
                  <td
                    style={{
                      padding: '14px 12px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: theme.success,
                      ...tabularNumberStyle,
                    }}
                  >
                    {member.done}
                  </td>
                  {/* Compliance - Single Column */}
                  <td
                    style={{
                      padding: '14px 12px',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: theme.textSecondary,
                      ...tabularNumberStyle,
                    }}
                  >
                    <span style={{ color: getMetricColor(compliance.pct), fontWeight: '600' }}>
                      {compliance.label}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '14px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        background:
                          member.score >= 80
                            ? theme.success + '20'
                            : member.score >= 60
                            ? theme.warning + '20'
                            : theme.danger + '20',
                        color:
                          member.score >= 80
                            ? theme.success
                            : member.score >= 60
                            ? theme.warning
                            : theme.danger,
                        fontSize: '14px',
                        fontWeight: '700',
                        ...tabularNumberStyle,
                      }}
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
