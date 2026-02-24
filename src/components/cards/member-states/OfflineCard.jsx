import React from 'react';
import CardShell from './CardShell';
import { getTextFontStyle, tabularNumberStyle } from '../../../utils/typography';
import { formatHoursToHM, formatMinutesToHM } from '../../../utils/timeFormat';

// Utility to detect RTL text (Arabic)
const isRTL = (text) => /[\u0600-\u06FF]/.test(text);

// Format time elapsed
const formatTimeElapsed = (minutes) => {
  if (!minutes || minutes === 0) return 'now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h ago`;
  return `${hours}h ${mins}m ago`;
};

/**
 * OfflineCard - Member card for "offline" status
 * Features: gray border, 70% opacity, last seen info
 */
const OfflineCard = ({ member, theme, onClick, workingDays = 1 }) => {
  const {
    task,
    taskStatus,
    taskStatusColor,
    location,
    project,
    tracked,
    target,
    tasks,
    done,
    breaks,
    startTime,
    endTime,
    lastSeen,
    publisher,
    genre,
    assignees = [],
    tags = [],
    score,
  } = member;

  const progressPercent = (tracked / target) * 100;

  // Get timer gradient for offline status
  const timerStyle = {
    background: `linear-gradient(135deg, ${theme.offlineLight} 0%, ${theme.offline} 100%)`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    MozBackgroundClip: 'text',
    MozTextFillColor: 'transparent',
    display: 'inline-block',
  };

  // Get score color based on percentage
  const getScoreColor = (percent) => {
    if (percent >= 80) return theme.success;
    if (percent >= 60) return theme.warning;
    return theme.danger;
  };

  return (
    <CardShell
      member={member}
      theme={theme}
      onClick={onClick}
      statusTime={endTime ? `Started ${startTime} – lasted ${endTime}` : (startTime ? `Started ${startTime}` : '—')}
      opacity={0.75}
      avatarFilter="grayscale(30%)"
      workingDays={workingDays}
    >
      {/* Inner Content Area - Glass morphism nested card */}
      <div className="m-4 p-4 rounded-xl border border-white/[0.08]" style={{ background: theme.innerBg }}>
        {/* Session Header + Timer */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: theme.textMuted }}>
              Last Activity
            </div>
            <div className="text-xl font-bold leading-tight min-h-[24px]" style={timerStyle}>
              Offline {formatTimeElapsed(lastSeen)}
            </div>
            {/* Previous tracked time */}
            {member.previousTimer && (
              <div className="text-[11px] font-medium mt-1" style={{ color: theme.textMuted }}>
                Previous: {member.previousTimer}
              </div>
            )}
          </div>
        </div>

        {/* Task Info Box - Last task */}
        <div className="p-3 rounded-lg border" style={{ background: theme.subtleBg, borderColor: theme.borderLight }}>
          {/* Location (Folder path) */}
          {(location || project) && (
            <div
              className="text-[10px] mb-1.5"
              style={{
                color: theme.textMuted,
                ...getTextFontStyle(location || project),
                direction: isRTL(location || project) ? 'rtl' : 'ltr',
              }}
            >
              {location || project}
            </div>
          )}

          {/* Task Name */}
          <div
            className="text-[13px] font-semibold mb-1.5 leading-snug"
            style={{
              color: theme.text,
              ...getTextFontStyle(task || ''),
              direction: isRTL(task || '') ? 'rtl' : 'ltr',
            }}
          >
            {task ? `Last: ${task}` : '—'}
          </div>

          {/* Task Status Badge */}
          {taskStatus && (
            <div className="mb-2">
              <div
                className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tight"
                style={{
                  background: taskStatusColor ? `${taskStatusColor}20` : 'rgba(100,116,139,0.2)',
                  color: taskStatusColor || '#64748b',
                }}
              >
                {taskStatus}
              </div>
            </div>
          )}
        </div>

        {/* Publisher/Genre - Separate boxes */}
        {(publisher || genre) && (
          <div
            className="flex gap-3 mt-3"
            style={{ direction: isRTL(publisher || genre || '') ? 'rtl' : 'ltr' }}
          >
            {publisher && (
              <div
                className="flex-1 p-3 rounded-lg border"
                style={{
                  background: theme.type === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  borderColor: theme.borderLight,
                }}
              >
                <div className="text-[8px] font-bold mb-1 uppercase tracking-wide" style={{ color: theme.textMuted }}>
                  Publisher
                </div>
                <div
                  className="text-[11px] font-semibold"
                  style={{ color: theme.text, ...getTextFontStyle(publisher) }}
                >
                  {publisher}
                </div>
              </div>
            )}
            {genre && (
              <div
                className="flex-1 p-3 rounded-lg border"
                style={{
                  background: theme.type === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  borderColor: theme.borderLight,
                }}
              >
                <div className="text-[8px] font-bold mb-1 uppercase tracking-wide" style={{ color: theme.textMuted }}>
                  Genre
                </div>
                <div
                  className="text-[11px] font-semibold"
                  style={{ color: theme.text, ...getTextFontStyle(genre) }}
                >
                  {genre}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assignees + Tags Row */}
        {((assignees && assignees.length > 0) || (tags && tags.length > 0)) && (
          <>
            <div
              className="h-px my-3"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${theme.borderLight} 50%, transparent 100%)`,
              }}
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {assignees && assignees.length > 0 && (
                <div className="flex items-center gap-1">
                  {assignees.slice(0, 2).map((assignee, i) => (
                    <div
                      key={i}
                      className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-bold border-2"
                      style={{
                        background: assignee.profilePicture
                          ? `url(${assignee.profilePicture}) center/cover no-repeat`
                          : assignee.color || '#6B7280',
                        color: '#fff',
                        borderColor: theme.cardBg,
                      }}
                      title={assignee.name}
                    >
                      {!assignee.profilePicture && (assignee.initials || assignee.name?.charAt(0) || '?')}
                    </div>
                  ))}
                  {assignees.length > 2 && (
                    <div
                      className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{
                        background: theme.borderLight,
                        color: theme.textMuted,
                      }}
                    >
                      +{assignees.length - 2}
                    </div>
                  )}
                </div>
              )}
              {tags && tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {tags.slice(0, 2).map((tag, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold border"
                      style={{
                        background: tag.color ? `${tag.color}20` : theme.subtleBg,
                        color: tag.color || theme.textSecondary,
                        borderColor: tag.color ? `${tag.color}40` : theme.borderLight,
                      }}
                    >
                      #{tag.name || tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </CardShell>
  );
};

export default OfflineCard;
