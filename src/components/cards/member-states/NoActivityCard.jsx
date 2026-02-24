import React from 'react';
import CardShell from './CardShell';

// Format lastActiveDate as "Yesterday at 4:12 PM" or "Thu, Feb 6 at 4:12 PM"
// Compare using UTC dates to avoid timezone issues (e.g. 11:55 PM UTC = 1:55 AM local next day)
const formatLastActive = (isoDate) => {
  if (!isoDate) return null;

  const date = new Date(isoDate);
  const now = new Date();

  // Compare UTC dates to determine "today" vs "yesterday"
  const dateUTCDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const nowUTCDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((nowUTCDay - dateUTCDay) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return null; // Truly today in UTC

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (diffDays === 1) {
    return `Yesterday at ${timeStr}`;
  }

  const dayStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${dayStr} at ${timeStr}`;
};

/**
 * NoActivityCard - Compact member card for "noActivity" status
 * Features: dark gray border, compact height (no footer), 50% opacity, no metrics
 */
const NoActivityCard = ({ member, theme, onClick, workingDays = 1 }) => {
  const lastActive = formatLastActive(member.lastActiveDate);

  return (
    <CardShell
      member={member}
      theme={theme}
      onClick={onClick}
      statusTime="No activity today"
      opacity={0.6}
      avatarFilter="grayscale(50%)"
      hideFooter
      workingDays={workingDays}
    >
      {/* Compact Inner Content */}
      <div className="m-4 p-3 rounded-lg border text-center" style={{ background: theme.subtleBg, borderColor: theme.borderLight }}>
        <div className="text-xs mb-0.5" style={{ color: theme.textMuted }}>
          No tasks started today
        </div>
        {lastActive && (
          <div className="text-[10px]" style={{ color: theme.textMuted }}>
            Last active: {lastActive}
          </div>
        )}
      </div>
    </CardShell>
  );
};

export default NoActivityCard;
