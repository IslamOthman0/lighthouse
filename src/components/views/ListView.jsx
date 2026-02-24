import React, { useState } from 'react';
import Avatar from '../ui/Avatar';
import LiveTimer from '../ui/LiveTimer';
import PriorityFlag from '../ui/PriorityFlag';
import OverviewCard from '../cards/OverviewCard';
import ScoreBreakdownCard from '../cards/ScoreBreakdownCard';
import TeamStatusOverview from '../cards/TeamStatusOverview';
import ProjectBreakdownCard from '../cards/ProjectBreakdownCard';
import RankingTable from '../table/RankingTable';
import { useWindowSize } from '../../hooks/useWindowSize';
import { getTextFontStyle, tabularNumberStyle, getFontFamily } from '../../utils/typography';
import { formatHoursToHM, formatMinutesToHM } from '../../utils/timeFormat';
import { getMetricColor } from '../../utils/metricColor';

// Utility to detect RTL text (Arabic)
const isRTL = (text) => /[\u0600-\u06FF]/.test(text);

const ListView = ({ members, theme, teamStats, scoreMetrics, onMemberClick, onDashboardCardClick, controls }) => {
  const { isMobile } = useWindowSize();
  const [sortBy, setSortBy] = useState('tracked'); // tracked, tasks, breaks, timeSpan, status, firstActivity, lastActivity
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [expandedRows, setExpandedRows] = useState({}); // Track expanded rows by member id

  // Toggle row expansion
  const toggleRow = (memberId) => {
    setExpandedRows(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  // Format timer seconds to HH:MM:SS
  const formatTimer = (seconds) => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Parse previous timer string to minutes (e.g., "2h 30m" -> 150)
  const parsePreviousTimer = (timerStr) => {
    if (!timerStr || timerStr === '—') return 0;
    let minutes = 0;
    const hourMatch = timerStr.match(/(\d+)h/);
    const minMatch = timerStr.match(/(\d+)m/);
    if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) minutes += parseInt(minMatch[1]);
    return minutes;
  };

  // Format minutes to display string
  const formatMinutes = (mins) => {
    if (mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Format last seen for mobile (e.g., "12m ago" / "2h ago")
  const formatLastSeen = (minutes) => {
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Task status colors
  const taskStatusConfig = {
    Active: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981' },
    Paused: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' },
    Completed: { bg: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' },
  };

  // Get progress color based on percentage
  const getProgressColor = (percent) => {
    if (percent >= 80) return theme.success;
    if (percent >= 50) return theme.warning;
    return theme.danger;
  };

  // Use pre-calculated score from member data (global score formula)
  const membersWithScore = members.map((member) => {
    // Convert start time to comparable number (for sorting)
    const timeToMinutes = (timeStr) => {
      if (!timeStr || timeStr === '—') return 999; // Put missing times at end
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    // Use avgEndTime from sync if available, fallback to endTime
    const displayEndTime = member.avgEndTime || member.endTime || '—';

    // Status priority for sorting (working=1, break=2, offline=3, leave=4)
    const statusPriority =
      member.status === 'working' ? 1 :
      member.status === 'break' ? 2 :
      member.status === 'offline' ? 3 : 4;

    // Calculate tracked percentage
    const trackedPercent = (member.tracked / member.target) * 100;

    return {
      ...member,
      // Use pre-calculated score from sync (global formula)
      score: member.score ?? 0,
      firstActivityMinutes: timeToMinutes(member.startTime),
      lastActivityMinutes: timeToMinutes(displayEndTime),
      statusPriority,
      endTime: displayEndTime,
      trackedPercent,
    };
  });

  // Sort members
  const sortedMembers = [...membersWithScore].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'tracked':
        aVal = a.tracked;
        bVal = b.tracked;
        break;
      case 'tasks':
        aVal = a.tasks;
        bVal = b.tasks;
        break;
      case 'breaks':
        aVal = a.breaks?.total || 0;
        bVal = b.breaks?.total || 0;
        break;
      case 'timeSpan':
        aVal = a.tracked + (a.breaks?.total || 0) / 60;
        bVal = b.tracked + (b.breaks?.total || 0) / 60;
        break;
      case 'status':
        aVal = a.statusPriority;
        bVal = b.statusPriority;
        break;
      case 'firstActivity':
        aVal = a.firstActivityMinutes;
        bVal = b.firstActivityMinutes;
        break;
      case 'lastActivity':
        aVal = a.lastActivityMinutes;
        bVal = b.lastActivityMinutes;
        break;
      default:
        aVal = a.tracked;
        bVal = b.tracked;
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
    if (sortBy !== column) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <>
      {/* Overview Row - 3 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Stacked Overview Cards (Column 1) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
          <OverviewCard
            theme={theme}
            value={teamStats?.tracked.value || '0h'}
            subValue={teamStats?.tracked.sub || '/ 0h'}
            label="Team Tracked"
            progress={teamStats?.tracked.progress || 0}
            color={theme.working}
            onClick={() => onDashboardCardClick?.('time')}
          />
          <OverviewCard
            theme={theme}
            value={teamStats?.tasks.value || '0/0'}
            subValue={teamStats?.tasks.sub || '0% done'}
            label="Tasks Progress"
            progress={teamStats?.tasks.progress || 0}
            color={getMetricColor(teamStats?.tasks.progress || 0)}
            onClick={() => onDashboardCardClick?.('tasks')}
          />
        </div>

        {/* Score Breakdown Card (Column 2) */}
        <ScoreBreakdownCard theme={theme} teamScore={scoreMetrics?.total || 0} metrics={scoreMetrics} onClick={() => onDashboardCardClick?.('score')} />

        {/* Team Status Overview (Column 3) */}
        <TeamStatusOverview members={members} theme={theme} />
      </div>

      {/* Project Breakdown - Full Width */}
      <div style={{ marginBottom: '16px' }}>
        <ProjectBreakdownCard theme={theme} />
      </div>

      {/* Filter/Sort Controls - Passed from parent */}
      {controls}

      {/* List View - Responsive Layout */}
      {isMobile ? (
        // Mobile Card Layout
        <div>
          {/* Mobile Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 4px',
              marginBottom: '4px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text, fontFamily: getFontFamily('english') }}>
              Team Members
            </div>
            <div style={{ fontSize: '12px', color: theme.textMuted, fontWeight: '400', ...tabularNumberStyle }}>
              {sortedMembers.length} Members
            </div>
          </div>

          {/* Member Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedMembers.map((member, index) => {
            const isTopThree = index < 3;
            const isWorking = member.status === 'working';
            const isBreak = member.status === 'break';
            const isOffline = member.status === 'offline';
            const isExpanded = expandedRows[member.id];
            const tsc = taskStatusConfig[member.taskStatus] || taskStatusConfig.Paused;

            // Calculate total time on task
            const currentSessionMins = member.timer ? Math.floor(member.timer / 60) : 0;
            const previousSessionMins = parsePreviousTimer(member.previousTimer);
            const totalOnTask = currentSessionMins + previousSessionMins;

            // Render dynamic status for mobile
            const renderMobileStatus = () => {
              if (isWorking) {
                return (
                  <div style={{
                    fontSize: '11px',
                    color: theme.working,
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    ...tabularNumberStyle,
                  }}>
                    <span>⏱️</span>
                    <LiveTimer seconds={member.timer} theme={theme} compact={true} />
                    <span style={{ fontSize: '9px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>(running)</span>
                  </div>
                );
              }
              if (isBreak) {
                return (
                  <div style={{ fontSize: '11px', color: theme.break, fontWeight: '600', ...tabularNumberStyle }}>
                    ☕ {formatLastSeen(member.lastSeen)}
                  </div>
                );
              }
              if (isOffline) {
                return (
                  <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '600', ...tabularNumberStyle }}>
                    ⏸️ {formatLastSeen(member.lastSeen)}
                  </div>
                );
              }
              return (
                <div style={{ fontSize: '11px', color: theme.leave, fontWeight: '600', fontFamily: getFontFamily('english') }}>
                  📅 {member.leaveType || 'Annual Leave'}
                </div>
              );
            };

            return (
              <div
                key={member.id}
                style={{
                  background: theme.cardBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '12px',
                }}
              >
                {/* Header Section: Avatar + Name + Times + Status */}
                <div
                  style={{
                    padding: '12px',
                    borderBottom: `1px solid ${theme.borderLight}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Avatar name={member.name} status={member.status} theme={theme} size={32} profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: theme.text, marginBottom: '4px', ...getTextFontStyle(member.name) }}>
                      {member.name}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: theme.textMuted }}>
                      <div>
                        First: <span style={{ color: theme.textSecondary, fontWeight: '600', ...tabularNumberStyle }}>{member.startTime}</span>
                      </div>
                      <div>
                        Last: <span style={{ color: theme.textSecondary, fontWeight: '600', ...tabularNumberStyle }}>{member.endTime}</span>
                      </div>
                    </div>
                  </div>
                  <div>{renderMobileStatus()}</div>
                </div>

                {/* Task Section: Current Task + Expand Button */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderBottom: `1px solid ${theme.borderLight}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      fontSize: '11px',
                      color: theme.textSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      direction: isRTL(member.task || '') ? 'rtl' : 'ltr',
                      ...getTextFontStyle(member.task || ''),
                    }}
                  >
                    <span style={{ color: theme.textMuted, fontSize: '10px', marginRight: '4px', fontFamily: getFontFamily('english') }}>Task:</span>
                    {member.task || 'No task assigned'}
                  </div>
                  <div
                    onClick={() => toggleRow(member.id)}
                    style={{
                      fontSize: '10px',
                      color: theme.textMuted,
                      minWidth: '36px',
                      minHeight: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    ▼
                  </div>
                </div>

                {/* Metrics Grid: Tracked | Tasks/Done | Breaks/Ses | Time Span */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0',
                    borderBottom: isExpanded ? `1px solid ${theme.borderLight}` : 'none',
                  }}
                >
                  {/* Tracked */}
                  <div
                    style={{
                      padding: '10px 6px',
                      textAlign: 'center',
                      borderRight: `1px solid ${theme.borderLight}`,
                    }}
                  >
                    <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '3px', fontFamily: getFontFamily('english') }}>
                      Tracked
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: theme.text, ...tabularNumberStyle }}>
                      {formatHoursToHM(member.tracked)}
                    </div>
                    <div
                      style={{
                        marginTop: '2px',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        background: getProgressColor(member.trackedPercent) + '20',
                        color: getProgressColor(member.trackedPercent),
                        fontWeight: '700',
                        fontSize: '9px',
                        display: 'inline-block',
                      }}
                    >
                      {Math.round(member.trackedPercent)}%
                    </div>
                  </div>

                  {/* Tasks/Done */}
                  <div
                    style={{
                      padding: '10px 6px',
                      textAlign: 'center',
                      borderRight: `1px solid ${theme.borderLight}`,
                    }}
                  >
                    <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '3px', fontFamily: getFontFamily('english') }}>
                      Tasks/Done
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', ...tabularNumberStyle }}>
                      <span style={{ color: theme.text }}>{member.tasks}</span>
                      <span style={{ color: theme.textMuted }}>/</span>
                      <span style={{ color: theme.success }}>{member.done}</span>
                    </div>
                  </div>

                  {/* Breaks/Session */}
                  <div
                    style={{
                      padding: '10px 6px',
                      textAlign: 'center',
                      borderRight: `1px solid ${theme.borderLight}`,
                    }}
                  >
                    <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '3px', fontFamily: getFontFamily('english') }}>
                      Breaks/Ses
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', ...tabularNumberStyle }}>
                      <span style={{ color: theme.text }}>{formatMinutesToHM(member.breaks?.total || 0)}</span>
                      <span style={{ color: theme.textMuted }}>/</span>
                      <span style={{ color: theme.textSecondary }}>{member.breaks?.count || 0}</span>
                    </div>
                  </div>

                  {/* Time Span */}
                  <div
                    style={{
                      padding: '10px 6px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '3px', fontFamily: getFontFamily('english') }}>
                      Time Span
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: theme.text, ...tabularNumberStyle }}>
                      {formatMinutesToHM(Math.round(member.tracked * 60 + (member.breaks?.total || 0)))}
                    </div>
                  </div>
                </div>

                {/* Expanded Content (when clicked): Task Details and Time Tracked sections */}
                {isExpanded && (
                  <div
                    style={{
                      background: theme.secondaryBg,
                      padding: '12px',
                    }}
                  >
                    {/* Stacked Layout for Mobile */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr',
                        gap: '12px',
                      }}
                    >
                      {/* Task Details */}
                      <div
                        style={{
                          background: theme.cardBg,
                          borderRadius: '8px',
                          padding: '12px',
                          border: `1px solid ${theme.borderLight}`,
                        }}
                      >
                        {/* Task Details Header */}
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            color: theme.textMuted,
                            marginBottom: '8px',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            fontFamily: getFontFamily('english'),
                          }}
                        >
                          Task Details
                        </div>

                        {/* Task Metadata Grid */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '6px',
                            fontSize: '10px',
                          }}
                        >
                          {/* Status */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>📊</span>
                            <span style={{ color: theme.textMuted, fontFamily: getFontFamily('english') }}>Status:</span>
                            <span
                              style={{
                                background: tsc.bg,
                                color: tsc.color,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: '600',
                                fontFamily: getFontFamily('english'),
                              }}
                            >
                              {member.taskStatus || '—'}
                            </span>
                          </div>

                          {/* Project */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>📍</span>
                            <span style={{ color: theme.textMuted, fontFamily: getFontFamily('english') }}>Project:</span>
                            <span style={{ color: theme.text, fontWeight: '600', fontSize: '9px', fontFamily: getFontFamily('english') }}>
                              {member.project || '—'}
                            </span>
                          </div>

                          {/* Priority */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <PriorityFlag priority={member.priority} size={12} fontSize="9px" />
                          </div>

                          {/* Publisher */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>📚</span>
                            <span style={{ color: theme.textMuted, fontFamily: getFontFamily('english') }}>Publisher:</span>
                            <span
                              style={{
                                color: theme.textSecondary,
                                fontWeight: '600',
                                fontSize: '9px',
                                direction: isRTL(member.publisher || '') ? 'rtl' : 'ltr',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                ...getTextFontStyle(member.publisher || ''),
                              }}
                            >
                              {member.publisher || '—'}
                            </span>
                          </div>

                          {/* Genre */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', gridColumn: '1 / -1' }}>
                            <span>📖</span>
                            <span style={{ color: theme.textMuted, fontFamily: getFontFamily('english') }}>Genre:</span>
                            <span
                              style={{
                                color: theme.textSecondary,
                                fontWeight: '600',
                                fontSize: '9px',
                                direction: isRTL(member.genre || '') ? 'rtl' : 'ltr',
                                ...getTextFontStyle(member.genre || ''),
                              }}
                            >
                              {member.genre || '—'}
                            </span>
                          </div>

                          {/* Tags */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', gridColumn: '1 / -1' }}>
                            <span>🏷️</span>
                            <span style={{ color: theme.textMuted, fontFamily: getFontFamily('english') }}>Tags:</span>
                            {member.tags && member.tags.length > 0 ? (
                              member.tags.slice(0, 2).map((tag, i) => (
                                <span
                                  key={i}
                                  style={{
                                    background: theme.secondaryBg,
                                    color: theme.textSecondary,
                                    padding: '2px 5px',
                                    borderRadius: '3px',
                                    fontSize: '8px',
                                    fontWeight: '600',
                                    fontFamily: getFontFamily('english'),
                                  }}
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: theme.textMuted }}>—</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Time Tracked */}
                      <div
                        style={{
                          background: theme.cardBg,
                          borderRadius: '8px',
                          padding: '12px',
                          border: `1px solid ${theme.borderLight}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            color: theme.textMuted,
                            marginBottom: '10px',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            fontFamily: getFontFamily('english'),
                          }}
                        >
                          ⏱️ Time Tracked on This Task
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '10px',
                          }}
                        >
                          {/* Current Session */}
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: theme.textMuted, marginBottom: '3px', fontFamily: getFontFamily('english') }}>
                              Current Session
                            </div>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: '700',
                                color: isWorking ? theme.working : theme.textMuted,
                                ...tabularNumberStyle,
                              }}
                            >
                              {isWorking ? (
                                <LiveTimer seconds={member.timer} theme={theme} compact={true} />
                              ) : (
                                '—'
                              )}
                            </div>
                            {isWorking && (
                              <div style={{ fontSize: '8px', color: theme.success, marginTop: '1px', fontFamily: getFontFamily('english') }}>
                                running
                              </div>
                            )}
                          </div>

                          {/* Previous Session */}
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: theme.textMuted, marginBottom: '3px', fontFamily: getFontFamily('english') }}>
                              Previous
                            </div>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: '700',
                                color: theme.text,
                                ...tabularNumberStyle,
                              }}
                            >
                              {member.previousTimer || '—'}
                            </div>
                          </div>

                          {/* Total on Task */}
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: theme.textMuted, marginBottom: '3px', fontFamily: getFontFamily('english') }}>
                              Total
                            </div>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: '700',
                                color: theme.accent,
                                ...tabularNumberStyle,
                              }}
                            >
                              {totalOnTask > 0 ? formatMinutes(totalOnTask) : '—'}
                            </div>
                          </div>
                        </div>

                        {/* View Full Profile Button */}
                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMemberClick && onMemberClick(member);
                            }}
                            style={{
                              padding: '10px 16px',
                              borderRadius: '8px',
                              border: `1px solid ${theme.accent}`,
                              background: theme.accent + '20',
                              color: theme.accent,
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '600',
                              transition: 'all 0.2s ease',
                              minHeight: '44px',
                              width: '100%',
                              fontFamily: getFontFamily('english'),
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = theme.accent;
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = theme.accent + '20';
                              e.currentTarget.style.color = theme.accent;
                            }}
                          >
                            View Full Profile →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        // Desktop Table Layout
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
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text, fontFamily: getFontFamily('english') }}>
              Team Members List
            </div>
            <div style={{ fontSize: '12px', color: theme.textMuted, fontWeight: '400', ...tabularNumberStyle }}>
              {sortedMembers.length} Members
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
          {/* Desktop Headers */}
          <thead>
            <tr>
              {[
                { key: '#', label: '#', align: 'left', width: '48px', sortable: false },
                { key: 'member', label: 'Member', align: 'left', width: '200px', minWidth: '180px', sortable: false },
                { key: 'status', label: 'Status', align: 'center', width: '160px', minWidth: '150px', sortable: true },
                { key: 'task', label: 'Current Task', align: 'left', width: 'auto', minWidth: '200px', sortable: false },
                { key: 'firstActivity', label: 'First Activity', align: 'center', width: '120px', sortable: true },
                { key: 'lastActivity', label: 'Last Activity', align: 'center', width: '120px', sortable: true },
                { key: 'tracked', label: 'Tracked', align: 'center', width: '150px', minWidth: '140px', sortable: true },
                { key: 'tasks', label: 'Tasks/Done', align: 'center', width: '120px', sortable: true },
                { key: 'breaks', label: 'Breaks/Session', align: 'center', width: '130px', sortable: true },
                { key: 'timeSpan', label: 'Time Span', align: 'center', width: '100px', sortable: true },
                { key: 'expand', label: '', align: 'center', width: '40px', sortable: false },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  style={{
                    padding: '10px 16px',
                    textAlign: col.align,
                    fontSize: '11px',
                    fontWeight: '500',
                    color: theme.textMuted,
                    letterSpacing: '0.3px',
                    width: col.width,
                    minWidth: col.minWidth || 'auto',
                    whiteSpace: 'nowrap',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: col.sortable ? 'none' : 'auto',
                    borderBottom: `1px solid ${theme.borderLight}`,
                    fontFamily: getFontFamily('english'),
                  }}
                >
                  {col.label} {col.sortable && <SortIcon column={col.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member, index) => {
              const isTopThree = index < 3;
              const isWorking = member.status === 'working';
              const isBreak = member.status === 'break';
              const isOffline = member.status === 'offline';
              const isExpanded = expandedRows[member.id];
              const tsc = taskStatusConfig[member.taskStatus] || taskStatusConfig.Paused;

              // Calculate total time on task
              const currentSessionMins = member.timer ? Math.floor(member.timer / 60) : 0;
              const previousSessionMins = parsePreviousTimer(member.previousTimer);
              const totalOnTask = currentSessionMins + previousSessionMins;

              return (
                <React.Fragment key={member.id}>
                  {/* Desktop Row */}
                  <tr
                    style={{
                      borderBottom: isExpanded ? 'none' : `1px solid ${theme.borderLight}`,
                      transition: 'background 0.15s ease',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleRow(member.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme.innerBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Rank */}
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: theme.textMuted,
                        ...tabularNumberStyle,
                      }}
                    >
                      {index + 1}
                    </td>

                    {/* Member */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar name={member.name} status={member.status} theme={theme} size={32} profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: theme.text, ...getTextFontStyle(member.name), lineHeight: '1.3' }}>
                            {member.name}
                          </div>
                          <div style={{ fontSize: '11px', color: theme.textMuted, fontFamily: getFontFamily('english'), fontWeight: '400' }}>
                            {member.initials}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {isWorking && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px', borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.12)', fontSize: '12px',
                        }}>
                          <LiveTimer seconds={member.timer} theme={theme} compact={true} />
                        </span>
                      )}
                      {isBreak && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap',
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: theme.break, fontSize: '12px', fontWeight: '500',
                        }}>
                          Break {formatLastSeen(member.lastSeen)}
                        </span>
                      )}
                      {isOffline && member.tracked > 0 && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap',
                          background: 'rgba(107, 114, 128, 0.1)',
                          color: theme.textMuted, fontSize: '12px', fontWeight: '500',
                        }}>
                          Offline {formatLastSeen(member.lastSeen)}
                        </span>
                      )}
                      {member.status === 'noActivity' && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap',
                          background: 'rgba(55, 65, 81, 0.15)',
                          color: theme.textMuted, fontSize: '12px', fontWeight: '500',
                        }}>
                          No activity
                        </span>
                      )}
                      {member.status === 'leave' && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap',
                          background: 'rgba(139, 92, 246, 0.12)',
                          color: theme.leave, fontSize: '12px', fontWeight: '500',
                        }}>
                          On Leave
                        </span>
                      )}
                    </td>

                    {/* Current Task */}
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '12px',
                        color: member.task ? theme.text : theme.textMuted,
                        fontStyle: member.task ? 'normal' : 'italic',
                        maxWidth: '250px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        direction: isRTL(member.task || '') ? 'rtl' : 'ltr',
                        fontWeight: member.task ? '500' : '400',
                        ...getTextFontStyle(member.task || ''),
                      }}
                    >
                      {member.task || 'No task assigned'}
                    </td>

                    {/* First Activity */}
                    <td
                      style={{
                        padding: '14px 16px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: member.startTime && member.startTime !== '—' ? theme.textSecondary : theme.textMuted,
                        fontWeight: '400',
                        ...tabularNumberStyle,
                      }}
                    >
                      {member.startTime || '—'}
                    </td>

                    {/* Last Activity */}
                    <td
                      style={{
                        padding: '14px 16px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: member.status === 'working' ? theme.working : (member.endTime && member.endTime !== '—' ? theme.textSecondary : theme.textMuted),
                        fontWeight: member.status === 'working' ? '600' : '400',
                        ...tabularNumberStyle,
                      }}
                    >
                      {member.status === 'working' ? 'Now' : (member.endTime || '—')}
                    </td>

                    {/* Tracked */}
                    <td
                      style={{
                        padding: '14px 16px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: theme.text, ...tabularNumberStyle }}>
                          {formatHoursToHM(member.tracked)}
                        </span>
                        <span
                          style={{
                            padding: '2px 5px',
                            borderRadius: '4px',
                            background: getMetricColor(member.trackedPercent) + '18',
                            color: getMetricColor(member.trackedPercent),
                            fontWeight: '600',
                            fontSize: '10px',
                            ...tabularNumberStyle,
                          }}
                        >
                          {Math.round(member.trackedPercent)}%
                        </span>
                      </div>
                    </td>

                    {/* Tasks/Done */}
                    <td
                      style={{
                        padding: '14px 16px',
                        textAlign: 'center',
                        fontSize: '13px',
                        ...tabularNumberStyle,
                      }}
                    >
                      <span style={{ color: theme.text, fontWeight: '600' }}>{member.tasks}</span>
                      <span style={{ color: theme.textMuted, fontWeight: '400' }}>/</span>
                      <span style={{ color: theme.success, fontWeight: '600' }}>{member.done}</span>
                    </td>

                    {/* Breaks/Session */}
                    <td
                      style={{
                        padding: '14px 16px',
                        textAlign: 'center',
                        fontSize: '13px',
                        ...tabularNumberStyle,
                      }}
                    >
                      <span style={{ color: theme.text, fontWeight: '500' }}>{formatMinutesToHM(member.breaks?.total || 0)}</span>
                      <span style={{ color: theme.textMuted, fontWeight: '400' }}>/</span>
                      <span style={{ color: theme.textSecondary, fontWeight: '500' }}>{member.breaks?.count || 0}</span>
                    </td>

                    {/* Time Span */}
                    <td
                      style={{
                        padding: '14px 16px',
                        textAlign: 'center',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: theme.text,
                        ...tabularNumberStyle,
                      }}
                    >
                      {formatMinutesToHM(Math.round(member.tracked * 60 + (member.breaks?.total || 0)))}
                    </td>

                    {/* Expand/Collapse */}
                    <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          color: theme.textMuted,
                          transition: 'transform 0.2s ease',
                          display: 'inline-block',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        ▼
                      </span>
                    </td>
                  </tr>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <tr style={{ borderBottom: `1px solid ${theme.borderLight}` }}>
                      <td colSpan="11" style={{ padding: '0' }}>
                        <div
                          style={{
                            background: theme.secondaryBg,
                            padding: '16px 20px',
                          }}
                        >
                          {/* Side by Side Layout */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '16px',
                            }}
                          >
                            {/* Left: Task Details */}
                            <div
                              style={{
                                background: theme.cardBg,
                                borderRadius: '12px',
                                padding: '16px',
                                border: `1px solid ${theme.borderLight}`,
                              }}
                            >
                              {/* Task Details Header */}
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  color: theme.textMuted,
                                  marginBottom: '10px',
                                  letterSpacing: '0.5px',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Task Details
                              </div>

                              {/* Task Name */}
                              <div
                                style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: theme.text,
                                  marginBottom: '12px',
                                  direction: isRTL(member.task || '') ? 'rtl' : 'ltr',
                                  ...getTextFontStyle(member.task || ''),
                                }}
                              >
                                {member.task || 'No task assigned'}
                              </div>

                              {/* Task Metadata Grid - 2 columns */}
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: '8px',
                                  fontSize: '11px',
                                }}
                              >
                                {/* Status */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>📊</span>
                                  <span style={{ color: theme.textMuted }}>Status:</span>
                                  <span
                                    style={{
                                      background: tsc.bg,
                                      color: tsc.color,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      fontSize: '10px',
                                      fontWeight: '600',
                                    }}
                                  >
                                    {member.taskStatus || '—'}
                                  </span>
                                </div>

                                {/* Project */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>📍</span>
                                  <span style={{ color: theme.textMuted }}>Project:</span>
                                  <span style={{ color: theme.text, fontWeight: '600' }}>
                                    {member.project || '—'}
                                  </span>
                                </div>

                                {/* Priority */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <PriorityFlag priority={member.priority} size={14} fontSize="12px" />
                                </div>

                                {/* Publisher */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>📚</span>
                                  <span style={{ color: theme.textMuted }}>Publisher:</span>
                                  <span
                                    style={{
                                      color: theme.textSecondary,
                                      fontWeight: '600',
                                      direction: isRTL(member.publisher || '') ? 'rtl' : 'ltr',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      ...getTextFontStyle(member.publisher || ''),
                                    }}
                                  >
                                    {member.publisher || '—'}
                                  </span>
                                </div>

                                {/* Genre */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>📖</span>
                                  <span style={{ color: theme.textMuted }}>Genre:</span>
                                  <span
                                    style={{
                                      color: theme.textSecondary,
                                      fontWeight: '600',
                                      direction: isRTL(member.genre || '') ? 'rtl' : 'ltr',
                                      ...getTextFontStyle(member.genre || ''),
                                    }}
                                  >
                                    {member.genre || '—'}
                                  </span>
                                </div>

                                {/* Tags */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span>🏷️</span>
                                  <span style={{ color: theme.textMuted }}>Tags:</span>
                                  {member.tags && member.tags.length > 0 ? (
                                    member.tags.slice(0, 2).map((tag, i) => (
                                      <span
                                        key={i}
                                        style={{
                                          background: theme.secondaryBg,
                                          color: theme.textSecondary,
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          fontSize: '9px',
                                          fontWeight: '600',
                                          fontFamily: getFontFamily('english'),
                                        }}
                                      >
                                        {tag}
                                      </span>
                                    ))
                                  ) : (
                                    <span style={{ color: theme.textMuted }}>—</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Time Tracked */}
                            <div
                              style={{
                                background: theme.cardBg,
                                borderRadius: '12px',
                                padding: '16px',
                                border: `1px solid ${theme.borderLight}`,
                                display: 'flex',
                                flexDirection: 'column',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  color: theme.textMuted,
                                  marginBottom: '12px',
                                  letterSpacing: '0.5px',
                                  textTransform: 'uppercase',
                                }}
                              >
                                ⏱️ Time Tracked on This Task
                              </div>

                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(3, 1fr)',
                                  gap: '12px',
                                  flex: 1,
                                  alignContent: 'center',
                                }}
                              >
                                {/* Current Session */}
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '4px' }}>
                                    Current Session
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '16px',
                                      fontWeight: '700',
                                      color: isWorking ? theme.working : theme.textMuted,
                                      fontVariantNumeric: 'tabular-nums',
                                    }}
                                  >
                                    {isWorking ? (
                                      <LiveTimer seconds={member.timer} theme={theme} compact={true} />
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                  {isWorking && (
                                    <div style={{ fontSize: '9px', color: theme.success, marginTop: '2px' }}>
                                      running
                                    </div>
                                  )}
                                </div>

                                {/* Previous Session */}
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '4px' }}>
                                    Previous
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '16px',
                                      fontWeight: '700',
                                      color: theme.text,
                                    }}
                                  >
                                    {member.previousTimer || '—'}
                                  </div>
                                </div>

                                {/* Total on Task */}
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '4px' }}>
                                    Total
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '16px',
                                      fontWeight: '700',
                                      color: theme.accent,
                                    }}
                                  >
                                    {totalOnTask > 0 ? formatMinutes(totalOnTask) : '—'}
                                  </div>
                                </div>
                              </div>

                              {/* View Full Profile Button */}
                              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMemberClick && onMemberClick(member);
                                  }}
                                  style={{
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    border: `1px solid ${theme.accent}`,
                                    background: theme.accent + '20',
                                    color: theme.accent,
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = theme.accent;
                                    e.currentTarget.style.color = '#fff';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = theme.accent + '20';
                                    e.currentTarget.style.color = theme.accent;
                                  }}
                                >
                                  View Full Profile →
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
          </div>
        </div>
      )}

      {/* Ranking Table - Full Width */}
      <div style={{ marginTop: '16px' }}>
        <RankingTable members={members} theme={theme} onMemberClick={onMemberClick} />
      </div>
    </>
  );
};

export default ListView;
