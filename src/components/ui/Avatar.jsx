import React, { useState } from 'react';

// Avatar with initials and status indicator
const Avatar = ({ name, status, theme, size = 48, profilePicture = null, clickUpColor = null }) => {
  const [imageError, setImageError] = useState(false);

  // Extract initials from name
  const getInitials = (name) => {
    if (!name) return '??';
    const trimmedName = name.trim();
    if (!trimmedName) return '??';

    const parts = trimmedName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return trimmedName.substring(0, 2).toUpperCase();
  };

  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case 'working':
        return theme.working;
      case 'break':
        return theme.break;
      case 'offline':
        return theme.offline;
      case 'leave':
        return theme.leave;
      default:
        return theme.offline;
    }
  };

  const statusColor = getStatusColor();
  const indicatorSize = size * 0.25;

  // Determine background color
  const backgroundColor = clickUpColor
    ? `${clickUpColor}40`
    : `linear-gradient(135deg, ${theme.accent}40, ${theme.accent}20)`;

  // Show image if available and not errored
  const showImage = profilePicture && !imageError;

  // Add white ring shadow for light theme
  const avatarShadow = theme.type === 'light' && theme.avatarRing
    ? { boxShadow: theme.avatarRing }
    : {};

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Avatar Rounded Square (12px border-radius) */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '12px',
          background: backgroundColor,
          border: `2px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.35,
          fontWeight: '600',
          color: theme.text,
          userSelect: 'none',
          overflow: 'hidden',
          position: 'relative',
          ...avatarShadow,
        }}
      >
        {showImage ? (
          <img
            src={profilePicture}
            alt={name}
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          getInitials(name)
        )}
      </div>

      {/* Status Indicator (positioned for rounded square) */}
      <div
        style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: indicatorSize,
          height: indicatorSize,
          borderRadius: '50%',
          background: statusColor,
          border: `2px solid ${theme.cardBg}`,
          boxShadow: `0 0 8px ${statusColor}60`,
        }}
      />
    </div>
  );
};

export default Avatar;
