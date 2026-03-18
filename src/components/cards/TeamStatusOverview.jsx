import React from 'react';
import { tabularNumberStyle, getFontFamily } from '../../utils/typography';

// Team Status Overview Card - shows status breakdown with counts and avatars
const TeamStatusOverview = ({ members, theme }) => {
  // Group members by status
  const grouped = {
    working: members.filter((m) => m.status === 'working'),
    break: members.filter((m) => m.status === 'break'),
    offline: members.filter((m) => m.status === 'offline'),
    leave: members.filter((m) => m.status === 'leave'),
    noActivity: members.filter((m) => m.status === 'noActivity'),
  };

  return (
    <div
      className="rounded-[16px] p-5 border"
      style={{
        background: 'var(--color-card-bg)',
        backdropFilter: 'var(--effect-backdrop-blur)',
        WebkitBackdropFilter: 'var(--effect-backdrop-blur)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--effect-card-shadow)',
      }}
    >
      {/* Header */}
      <div
        className="text-sm font-semibold mb-3.5"
        style={{
          color: 'var(--color-text)',
          fontFamily: getFontFamily('english'),
        }}
      >
        Team Status
      </div>

      {/* Status Groups */}
      {Object.entries(grouped).map(([status, list]) => (
        <div key={status} className="mb-3">
          {/* Status Header */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              {/* Status dot color is dynamic per status — keep inline */}
              <span style={{ color: theme[status], fontSize: '8px' }}>●</span>
              <span
                className="text-xs"
                style={{
                  color: 'var(--color-text-secondary)',
                  fontFamily: getFontFamily('english'),
                }}
              >
                {status === 'noActivity' ? 'No Activity' : status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <span
              className="text-[13px] font-semibold"
              style={{
                color: 'var(--color-text)',
                ...tabularNumberStyle,
              }}
            >
              {list.length}
            </span>
          </div>

          {/* Avatar Pills */}
          <div className="flex gap-1 flex-wrap min-h-[28px]">
            {list.length > 0 ? (
              list.map((m) => (
                <div
                  key={m.id}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: m.profilePicture
                      ? `url(${m.profilePicture}) center/cover no-repeat`
                      : m.clickUpColor
                      ? m.clickUpColor
                      // Dynamic gradient using theme.accent — keep inline
                      : `linear-gradient(135deg, ${theme.accent}, ${theme.accent}80)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '600',
                    color: '#fff',
                    // Dynamic status-specific border — keep inline
                    border: `2px solid ${theme[status]}`,
                    fontFamily: getFontFamily('english'),
                    position: 'relative',
                  }}
                >
                  {/* Show initials only if no profile picture */}
                  {!m.profilePicture && m.initials}
                </div>
              ))
            ) : (
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>—</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamStatusOverview;
