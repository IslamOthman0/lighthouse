import React from 'react';
import MemberCard from './MemberCard';
import Avatar from '../ui/Avatar';
import StatusBadge from '../ui/StatusBadge';
import { getTextFontStyle } from '../../utils/typography';

// Format lastActiveDate as relative text
// Compare using UTC dates to avoid timezone issues (e.g. 11:55 PM UTC = 1:55 AM local next day)
const formatLastActive = (isoDate) => {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  const now = new Date();

  // Compare UTC dates (year/month/day) to determine "today" vs "yesterday"
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

// Compact inline row for NoActivity / Leave members
const CompactMemberRow = ({ member, theme, onClick }) => {
  const isLeave = member.onLeave || member.status === 'leave';
  const lastActive = !isLeave ? formatLastActive(member.lastActiveDate) : null;

  return (
    <div
      onClick={() => onClick && onClick(member)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '10px',
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        cursor: onClick ? 'pointer' : 'default',
        opacity: isLeave ? 0.8 : 0.6,
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.background = theme.cardHoverBg || theme.subtleBg || theme.cardBg;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.opacity = isLeave ? '0.8' : '0.6';
          e.currentTarget.style.background = theme.cardBg;
        }
      }}
    >
      {/* Avatar */}
      <div style={{ filter: isLeave ? 'none' : 'grayscale(50%)' }}>
        <Avatar
          name={member.name}
          status={member.status}
          theme={theme}
          size={32}
          profilePicture={member.profilePicture}
          clickUpColor={member.clickUpColor}
        />
      </div>

      {/* Name + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: theme.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            ...getTextFontStyle(member.name),
          }}
        >
          {member.name}
        </div>
        <div style={{ fontSize: '10px', color: theme.textMuted }}>
          {isLeave
            ? `🏖️ ${member.leaveType || 'On Leave'}`
            : lastActive
              ? `Last active: ${lastActive}`
              : 'No activity today'
          }
        </div>
      </div>

      {/* Status Badge */}
      <StatusBadge status={member.status} theme={theme} size="small" />
    </div>
  );
};

// Team Status Card - active cards in grid, compact members in separate inline grid
const TeamStatusCard = ({ members, theme, onMemberClick, workingDays = 1 }) => {
  const compactStatuses = ['noActivity', 'leave'];
  const activeMembers = members.filter((m) => !compactStatuses.includes(m.status) && !m.onLeave);
  const compactMembers = members.filter((m) => compactStatuses.includes(m.status) || m.onLeave);

  return (
    <div style={{ width: '100%' }}>
      {/* Active Members Grid */}
      {activeMembers.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '24px',
            width: '100%',
            alignItems: 'start',
          }}
        >
          {activeMembers.map((member) => (
            <MemberCard key={member.id} member={member} theme={theme} onMemberClick={onMemberClick} workingDays={workingDays} />
          ))}
        </div>
      )}

      {/* Compact Members Grid - full width, inline rows */}
      {compactMembers.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '8px',
            width: '100%',
            marginTop: activeMembers.length > 0 ? '20px' : '0',
          }}
        >
          {compactMembers.map((member) => (
            <CompactMemberRow
              key={member.id}
              member={member}
              theme={theme}
              onClick={onMemberClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamStatusCard;
