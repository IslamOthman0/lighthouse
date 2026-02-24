import React, { useState, useEffect } from 'react';
import CardShell from './CardShell';
import LiveTimer from '../../ui/LiveTimer';
import { PriorityBadge } from '../../ui/PriorityFlag';
import { getTextFontStyle, tabularNumberStyle } from '../../../utils/typography';
import { formatHoursToHM, formatMinutesToHM } from '../../../utils/timeFormat';

// Utility to detect RTL text (Arabic)
const isRTL = (text) => /[\u0600-\u06FF]/.test(text);

/**
 * WorkingCard - Full member card for "working" status
 * Features: emerald border, pulsing dot, live timer, full task info, overwork warning
 */
const WorkingCard = ({ member, theme, onClick, workingDays = 1 }) => {
  const {
    name,
    task,
    taskStatus,
    taskStatusColor,
    location,
    project,
    priority,
    tags = [],
    timer,
    tracked,
    target,
    tasks,
    done,
    breaks,
    startTime,
    assignees = [],
    publisher,
    genre,
    score,
  } = member;

  // Live tracked time - only update when tracked changes significantly
  const [liveTracked, setLiveTracked] = useState(tracked);

  useEffect(() => {
    // Only reset if the difference is significant (more than 2 minutes = 0.033h)
    const diff = Math.abs(tracked - liveTracked);
    const threshold = 2 / 60; // 2 minutes in hours

    if (diff > threshold) {
      console.log(`[WorkingCard ${name}] Significant change detected: ${liveTracked}h → ${tracked}h (diff: ${(diff * 60).toFixed(1)}m)`);
      setLiveTracked(tracked);
    }
  }, [tracked, name, liveTracked]);

  useEffect(() => {
    console.log(`[WorkingCard ${name}] Starting timer interval (increment every 60s)`);
    const interval = setInterval(() => {
      setLiveTracked(prev => {
        const newValue = prev + (1 / 60);
        console.log(`[WorkingCard ${name}] Timer tick: ${prev}h → ${newValue}h`);
        return newValue;
      });
    }, 60000);

    return () => {
      console.log(`[WorkingCard ${name}] Cleaning up timer interval`);
      clearInterval(interval);
    };
  }, [name]);

  const progressPercent = (liveTracked / target) * 100;

  // Check if member is overworking (>100% of target)
  const isOverworking = progressPercent > 100;

  // Get score color based on percentage
  const getScoreColor = (percent) => {
    if (percent >= 80) return theme.success;
    if (percent >= 60) return theme.warning;
    return theme.danger;
  };

  return (
    <>
      <CardShell
        member={member}
        theme={theme}
        onClick={onClick}
        statusTime={startTime ? `Started ${startTime} – now` : '—'}
        opacity={1}
        avatarFilter="none"
        workingDays={workingDays}
      >
        {/* Inner Content Area - Glass morphism nested card */}
        <div className="m-4 p-4 rounded-xl border border-white/[0.08]" style={{ background: theme.innerBg }}>
          {/* Session Header + Timer */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: theme.textMuted }}>
                Current Session
              </div>
              <div className="flex items-center gap-2">
                {timer && <LiveTimer seconds={timer} theme={theme} status="working" />}
                {isOverworking && (
                  <span className="text-xs font-semibold" style={{ color: theme.warning }}>
                    ⚠ Over target
                  </span>
                )}
              </div>
              {/* Previous tracked time */}
              {member.previousTimer && (
                <div className="text-[11px] font-medium mt-1" style={{ color: theme.textMuted }}>
                  Previous: {member.previousTimer}
                </div>
              )}
            </div>

            {/* Priority Badge */}
            <PriorityBadge priority={priority} size={13} fontSize="10px" />
          </div>

          {/* Task Info Box */}
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
              {task || 'No task assigned'}
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
                {/* Assignees */}
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

                {/* Tags */}
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

      {/* CSS for glow animation */}
      <style>
        {`
          @keyframes glow-pulse {
            0%, 100% {
              filter: drop-shadow(0 0 20px ${theme.workingGlow});
            }
            50% {
              filter: drop-shadow(0 0 30px rgba(16, 185, 129, 0.6));
            }
          }
        `}
      </style>
    </>
  );
};

export default WorkingCard;
