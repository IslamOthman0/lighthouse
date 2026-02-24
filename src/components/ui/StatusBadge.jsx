import React from 'react';

// Status badge for member status display
const StatusBadge = ({ status, theme, size = 'normal' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'working':
        return {
          label: 'Working',
          color: theme.working,
          glow: theme.workingGlow,
          icon: '●',
          pulse: true,  // Add pulsing animation for working status
        };
      case 'break':
        return {
          label: 'Break',
          color: theme.break,
          glow: theme.breakGlow,
          icon: '◐',
          pulse: false,
        };
      case 'offline':
        return {
          label: 'Offline',
          color: theme.offline,
          glow: theme.offlineGlow,
          icon: '○',
          pulse: false,
        };
      case 'leave':
        return {
          label: 'Leave',
          color: theme.leave,
          glow: theme.leaveGlow,
          icon: '📅',
          pulse: false,
        };
      case 'noActivity':
        return {
          label: 'No Activity',
          color: theme.noActivity,
          glow: 'rgba(255, 255, 255, 0.1)',
          icon: '⚠',
          pulse: false,
        };
      default:
        return {
          label: 'Unknown',
          color: theme.textMuted,
          glow: 'rgba(100, 116, 139, 0.1)',
          icon: '?',
          pulse: false,
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'tiny':
        return {
          padding: '2px 6px',
          fontSize: '9px',
          iconSize: '7px',
          borderRadius: '8px',
          gap: '3px',
        };
      case 'small':
        return {
          padding: '3px 8px',
          fontSize: '11px',
          iconSize: '9px',
          borderRadius: '10px',
          gap: '4px',
        };
      default: // normal
        return {
          padding: '4px 10px',
          fontSize: '12px',
          iconSize: '10px',
          borderRadius: '12px',
          gap: '6px',
        };
    }
  };

  const config = getStatusConfig();
  const sizeConfig = getSizeConfig();

  // Use gradient background for Noir Glass theme when working
  const getBadgeBackground = () => {
    if (status === 'working' && theme.type === 'light' && theme.badgeWorking) {
      return theme.badgeWorking;
    }
    return config.glow;
  };

  const getBadgeShadow = () => {
    if (status === 'working' && theme.type === 'light' && theme.badgeWorkingShadow) {
      return theme.badgeWorkingShadow;
    }
    return 'none';
  };

  const getBadgeTextColor = () => {
    if (status === 'working' && theme.type === 'light' && theme.badgeWorking) {
      return '#ffffff';  // White text on gradient background
    }
    return config.color;
  };

  return (
    <>
      {/* CSS Keyframes for pulsing animation - only for the dot */}
      <style>
        {`
          @keyframes statusDotPulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.2);
            }
          }
        `}
      </style>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: sizeConfig.gap,
          padding: sizeConfig.padding,
          borderRadius: sizeConfig.borderRadius,
          background: getBadgeBackground(),
          border: `1px solid ${status === 'working' && theme.type === 'light' ? 'transparent' : config.color}`,
          fontSize: sizeConfig.fontSize,
          fontWeight: '500',
          color: getBadgeTextColor(),
          userSelect: 'none',
          boxShadow: getBadgeShadow(),
        }}
      >
        <span
          style={{
            fontSize: sizeConfig.iconSize,
            animation: config.pulse ? 'statusDotPulse 2s ease-in-out infinite' : 'none',
            display: 'inline-block',
          }}
        >
          {config.icon}
        </span>
        <span>{config.label}</span>
      </div>
    </>
  );
};

export default StatusBadge;
