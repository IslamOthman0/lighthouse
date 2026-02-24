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
      style={{
        background: theme.cardBg,
        backdropFilter: theme.backdropBlur,
        WebkitBackdropFilter: theme.backdropBlur,
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow || 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: '600',
          color: theme.text,
          marginBottom: '14px',
          fontFamily: getFontFamily('english'),
        }}
      >
        Team Status
      </div>

      {/* Status Groups */}
      {Object.entries(grouped).map(([status, list]) => (
        <div key={status} style={{ marginBottom: '12px' }}>
          {/* Status Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: theme[status], fontSize: '8px' }}>●</span>
              <span
                style={{
                  fontSize: '12px',
                  color: theme.textSecondary,
                  fontFamily: getFontFamily('english'),
                }}
              >
                {status === 'noActivity' ? 'No Activity' : status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: theme.text,
                ...tabularNumberStyle,
              }}
            >
              {list.length}
            </span>
          </div>

          {/* Avatar Pills */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              minHeight: '28px',
            }}
          >
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
                      : `linear-gradient(135deg, ${theme.accent}, ${theme.accent}80)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '600',
                    color: '#fff',
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
              <span style={{ fontSize: '11px', color: theme.textMuted }}>—</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamStatusOverview;
