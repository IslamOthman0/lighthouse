import React, { useState, useEffect } from 'react';
import Avatar from '../ui/Avatar';
import StatusBadge from '../ui/StatusBadge';
import LiveTimer from '../ui/LiveTimer';
import PriorityFlag from '../ui/PriorityFlag';
import { formatHoursToHM, formatMinutesToHM } from '../../utils/timeFormat';

// Utility to detect RTL text (Arabic)
const isRTL = (text) => /[\u0600-\u06FF]/.test(text);

const MemberRow = ({ member, rank, theme, onViewDetails }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    name,
    initials,
    status,
    task,
    taskStatus,
    taskStatusColor,
    project,
    priority,
    publisher,
    tracked,
    target,
    tasks,
    done,
    timer,
    previousTimer,
    breaks,
    profilePicture,
    clickUpColor,
  } = member;

  const isWorking = status === 'working';

  // Live tracked time - updates every minute when timer is running
  const [liveTracked, setLiveTracked] = useState(tracked);

  useEffect(() => {
    // Reset live tracked when tracked prop changes (from sync)
    setLiveTracked(tracked);

    // Only increment if working
    if (!isWorking || !timer) {
      return;
    }

    // Update every minute (60 seconds)
    const interval = setInterval(() => {
      setLiveTracked(prev => prev + (1 / 60)); // Add 1 minute = 1/60 hour
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [tracked, isWorking, timer]);

  // Calculate score (simple formula)
  const trackedPercent = (liveTracked / target) * 100;
  const tasksPercent = tasks > 0 ? (done / tasks) * 100 : 0;
  const score = (trackedPercent * 0.5 + tasksPercent * 0.5).toFixed(1);

  // Calculate progress percentage
  const progressPercent = (liveTracked / target) * 100;

  const getProgressColor = (percent) => {
    if (percent >= 80) return theme.success;
    if (percent >= 60) return theme.warning;
    return theme.danger;
  };

  return (
    <>
      {/* Collapsed Row */}
      <tr
        style={{
          borderBottom: `1px solid ${theme.borderLight}`,
          cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = theme.secondaryBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Rank */}
        <td
          style={{
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '700',
            color: rank <= 3 ? theme.accent : theme.textMuted,
          }}
        >
          {rank}
        </td>

        {/* Member (Avatar + Name) */}
        <td style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar name={name} status={status} theme={theme} size={32} profilePicture={profilePicture} clickUpColor={clickUpColor} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: theme.text }}>
                {name}
              </div>
              <StatusBadge status={status} theme={theme} size="small" />
            </div>
          </div>
        </td>

        {/* Tracked */}
        <td
          style={{
            padding: '12px 16px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: '600',
            color: theme.text,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatHoursToHM(liveTracked)}
        </td>

        {/* Tasks */}
        <td
          style={{
            padding: '12px 16px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: '600',
            color: theme.text,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {tasks}
        </td>

        {/* Done */}
        <td
          style={{
            padding: '12px 16px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: '600',
            color: theme.success,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {done}
        </td>

        {/* Avg Start */}
        <td
          style={{
            padding: '12px 16px',
            textAlign: 'center',
            fontSize: '12px',
            color: theme.textSecondary,
          }}
        >
          {member.startTime}
        </td>

        {/* Score */}
        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '8px',
              background:
                score >= 90
                  ? theme.success + '20'
                  : score >= 80
                  ? theme.warning + '20'
                  : theme.danger + '20',
              color:
                score >= 90 ? theme.success : score >= 80 ? theme.warning : theme.danger,
              fontSize: '13px',
              fontWeight: '700',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {score}
          </div>
        </td>

        {/* Current Task (Truncated) */}
        <td
          style={{
            padding: '12px 16px',
            fontSize: '12px',
            color: theme.textSecondary,
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            direction: isRTL(task || '') ? 'rtl' : 'ltr',
          }}
        >
          {task || 'No task assigned'}
        </td>

        {/* Expand/Collapse Button */}
        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
          <span
            style={{
              fontSize: '14px',
              color: theme.accent,
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
          <td colSpan="9" style={{ padding: '0' }}>
            <div
              style={{
                background: theme.secondaryBg,
                padding: '20px',
              }}
            >
              <div
                style={{
                  background: theme.cardBg,
                  borderRadius: '12px',
                  padding: '20px',
                  border: `1px solid ${theme.borderLight}`,
                }}
              >
                {/* Current Task Details */}
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: theme.textMuted,
                      marginBottom: '8px',
                      letterSpacing: '0.5px',
                    }}
                  >
                    CURRENT TASK
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: theme.text,
                      marginBottom: '12px',
                      direction: isRTL(task || '') ? 'rtl' : 'ltr',
                    }}
                  >
                    {task || 'No task assigned'}
                  </div>

                  {/* Task Metadata */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '12px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <span style={{ color: theme.textMuted }}>Status: </span>
                      <span
                        style={{
                          background: taskStatusColor
                            ? `${taskStatusColor}33` // Use ClickUp color with 20% opacity
                            : taskStatus === 'Active'
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(245, 158, 11, 0.2)',
                          color: taskStatusColor
                            ? taskStatusColor // Use ClickUp color
                            : taskStatus === 'Active'
                            ? theme.success
                            : theme.warning,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      >
                        {taskStatus}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: theme.textMuted }}>Project: </span>
                      <span style={{ color: theme.text, fontWeight: '600' }}>{project}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: theme.textMuted }}>Priority: </span>
                      <PriorityFlag priority={priority} size={13} fontSize="12px" />
                    </div>
                    <div style={{ direction: isRTL(publisher || '') ? 'rtl' : 'ltr' }}>
                      <span style={{ color: theme.textMuted, direction: 'ltr' }}>
                        Publisher:{' '}
                      </span>
                      <span style={{ color: theme.textSecondary, fontWeight: '600' }}>
                        {publisher}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                    padding: '16px',
                    background: theme.tertiaryBg,
                    borderRadius: '8px',
                  }}
                >
                  {/* Timer */}
                  {status === 'working' && (
                    <div>
                      <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>
                        Timer
                      </div>
                      <LiveTimer seconds={timer} theme={theme} status={status} />
                      <div style={{ fontSize: '10px', color: theme.textMuted }}>
                        Previous: {previousTimer}
                      </div>
                    </div>
                  )}

                  {/* Progress */}
                  <div>
                    <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>
                      Progress
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: getProgressColor(progressPercent),
                        }}
                      >
                        {Math.round(progressPercent)}%
                      </span>
                      <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                        {formatHoursToHM(liveTracked)} / {formatHoursToHM(target)}
                      </span>
                    </div>
                  </div>

                  {/* Breaks */}
                  <div>
                    <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>
                      Breaks
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: theme.text }}>
                      {formatMinutesToHM(breaks?.total || 0)}{' '}
                      <span style={{ fontSize: '12px', color: theme.textMuted }}>
                        ({breaks?.count || 0} sessions)
                      </span>
                    </div>
                  </div>

                  {/* Time Span */}
                  <div>
                    <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>
                      Time Span
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: theme.text }}>
                      {formatMinutesToHM(Math.round(tracked * 60 + (breaks?.total || 0)))}
                    </div>
                  </div>
                </div>

                {/* View Full Details Button */}
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails && onViewDetails(member);
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: `1px solid ${theme.accent}`,
                      background: theme.accent + '20',
                      color: theme.accent,
                      cursor: 'pointer',
                      fontSize: '13px',
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
                    View Full Details →
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default MemberRow;
