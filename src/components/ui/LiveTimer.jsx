import React, { useState, useEffect } from 'react';
import { tabularNumberStyle } from '../../utils/typography';

// Live timer component with real-time tracking
const LiveTimer = ({ startTime, status = 'working', theme, compact = false, seconds, useGradient = false }) => {
  const [elapsed, setElapsed] = useState(seconds || 0);

  useEffect(() => {
    // If seconds prop is provided, use it directly and increment
    if (seconds !== undefined) {
      // Only update elapsed when seconds prop actually changes value
      setElapsed(seconds);
    }
  }, [seconds]);

  useEffect(() => {
    // If using seconds prop mode, create interval for incrementing
    if (seconds !== undefined) {
      // Only increment if working or break
      if (status === 'working' || status === 'break') {
        const interval = setInterval(() => {
          setElapsed(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
      }

      return undefined; // No interval needed for offline/leave
    }

    // Starttime-based mode: Only update timer if status is 'working' or 'break'
    if (status !== 'working' && status !== 'break') {
      return undefined; // Return cleanup function (even if empty)
    }

    // Calculate initial elapsed time
    const updateElapsed = () => {
      if (startTime) {
        const now = Date.now();
        const diff = now - startTime;
        setElapsed(Math.floor(diff / 1000)); // Convert to seconds
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime, status]);

  // Format elapsed time as HH:MM:SS or MM:SS
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    // Always show hours if >= 1 hour, regardless of compact mode
    if (hours === 0) {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't show timer for offline or leave
  if (status === 'offline' || status === 'leave') {
    return (
      <div
        style={{
          fontSize: compact ? '13px' : '15px',
          fontWeight: '600',
          color: theme.textMuted,
          ...tabularNumberStyle,
        }}
      >
        --:--
      </div>
    );
  }

  const timeString = formatTime(elapsed);

  // Use solid color instead of gradient to avoid rendering issues
  // The CSS gradient text effect can fail in some browsers/React versions
  const textColor = status === 'working'
    ? theme.working
    : status === 'break'
      ? theme.break
      : theme.textMuted;

  return (
    <span
      style={{
        fontSize: compact ? '13px' : '22px',
        fontWeight: '700',
        color: textColor,
        ...tabularNumberStyle,
        letterSpacing: compact ? 'normal' : '1px',
        textShadow: status === 'working' ? `0 0 20px ${theme.workingGlow}` : 'none',
      }}
    >
      {timeString}
    </span>
  );
};

export default LiveTimer;
