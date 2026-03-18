import React, { useState, useEffect } from 'react';
import CardShell from './CardShell';
import LiveTimer from '../../ui/LiveTimer';
import { PriorityBadge } from '../../ui/PriorityFlag';
import { getTextFontStyle, tabularNumberStyle } from '../../../utils/typography';
import { formatHoursToHM, formatMinutesToHM } from '../../../utils/timeFormat';
import { logger } from '../../../utils/logger';

// Utility to detect RTL text (Arabic)
const isRTL = (text) => /[\u0600-\u06FF]/.test(text);

// Hardcoded hex constant for working glow (avoids theme.workingGlow hex suffix in CSS animation)
const WORKING_GLOW = 'rgba(16, 185, 129, 0.4)';

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
      logger.debug(`[WorkingCard ${name}] Significant change detected: ${liveTracked}h → ${tracked}h (diff: ${(diff * 60).toFixed(1)}m)`);
      setLiveTracked(tracked);
    }
  }, [tracked, name, liveTracked]);

  useEffect(() => {
    logger.debug(`[WorkingCard ${name}] Starting timer interval (increment every 60s)`);
    const interval = setInterval(() => {
      setLiveTracked(prev => prev + (1 / 60));
    }, 60000);

    return () => {
      logger.debug(`[WorkingCard ${name}] Cleaning up timer interval`);
      clearInterval(interval);
    };
  }, [name]);

  const progressPercent = (liveTracked / target) * 100;

  // Check if member is overworking (>100% of target)
  const isOverworking = progressPercent > 100;

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
        <div className="m-4 p-4 rounded-xl border border-white/[0.08]" style={{ background: 'var(--color-inner-bg)' }}>
          {/* Session Header + Timer */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Current Session
              </div>
              <div className="flex items-center gap-2">
                {timer && <LiveTimer seconds={timer} theme={theme} status="working" />}
                {isOverworking && (
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-warning)' }}>
                    ⚠ Over target
                  </span>
                )}
              </div>
              {/* Previous tracked time */}
              {member.previousTimer && (
                <div className="text-[11px] font-medium mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Previous: {member.previousTimer}
                </div>
              )}
            </div>

            {/* Priority Badge */}
            <PriorityBadge priority={priority} size={13} fontSize="10px" />
          </div>

          {/* Task Info Box */}
          <div className="p-3 rounded-lg border" style={{ background: 'var(--color-subtle-bg)', borderColor: 'var(--color-border-light)' }}>
            {/* Location + Status Badge — same line */}
            {((location || project) || taskStatus) && (
              <div className="flex items-center justify-between gap-2 mb-1.5">
                {(location || project) ? (
                  <div
                    className="text-[10px] font-bold truncate"
                    style={{
                      color: 'var(--color-text-muted)',
                      ...getTextFontStyle(location || project),
                      direction: isRTL(location || project) ? 'rtl' : 'ltr',
                    }}
                  >
                    {location || project}
                  </div>
                ) : <div />}
                {taskStatus && (
                  <div
                    className="shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tight"
                    style={{
                      background: taskStatusColor || '#64748b',
                      color: '#fff',
                    }}
                  >
                    {taskStatus}
                  </div>
                )}
              </div>
            )}

            {/* Task Name */}
            <div
              className="text-[13px] font-semibold leading-snug"
              style={{
                color: 'var(--color-text)',
                ...getTextFontStyle(task || ''),
                direction: isRTL(task || '') ? 'rtl' : 'ltr',
              }}
            >
              {task || 'No task assigned'}
            </div>
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
                    // theme.type check — no CSS var equivalent, keep inline
                    background: theme.type === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    borderColor: 'var(--color-border-light)',
                  }}
                >
                  <div className="text-[8px] font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                    Publisher
                  </div>
                  <div
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--color-text)', ...getTextFontStyle(publisher) }}
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
                    borderColor: 'var(--color-border-light)',
                  }}
                >
                  <div className="text-[8px] font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                    Genre
                  </div>
                  <div
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--color-text)', ...getTextFontStyle(genre) }}
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
                  background: `linear-gradient(90deg, transparent 0%, var(--color-border-light) 50%, transparent 100%)`,
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
                          // theme.cardBg as gradient border — keep inline (avatarRing pattern)
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
                          background: 'var(--color-border-light)',
                          color: 'var(--color-text-muted)',
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
                          // Dynamic tag colors with hex suffix — keep inline
                          background: tag.color ? `${tag.color}20` : 'var(--color-subtle-bg)',
                          color: tag.color || 'var(--color-text-secondary)',
                          borderColor: tag.color ? `${tag.color}40` : 'var(--color-border-light)',
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

      {/* CSS for glow animation — hardcoded constant avoids theme.workingGlow in CSS string */}
      <style>
        {`
          @keyframes glow-pulse {
            0%, 100% {
              filter: drop-shadow(0 0 20px ${WORKING_GLOW});
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
