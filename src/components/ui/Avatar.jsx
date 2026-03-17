import React, { useState, useEffect } from 'react';

// Avatar with initials and status indicator
const Avatar = ({ name, status, theme, size = 48, profilePicture = null, clickUpColor = null, ringColor = null }) => {
  const [imageError, setImageError] = useState(false);

  // Reset error state when profilePicture URL changes
  useEffect(() => {
    setImageError(false);
  }, [profilePicture]);

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

  // Status color values (solid hex needed for boxShadow glow calculation)
  const STATUS_COLORS = {
    working: '#10B981',
    break:   '#F59E0B',
    leave:   '#8B5CF6',
    offline: '#6B7280',
  };
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.offline;
  const indicatorSize = size * 0.25;

  // Determine background color
  // theme.accent used directly — hex suffix opacity not expressible via CSS var
  const backgroundColor = clickUpColor
    ? `${clickUpColor}40`
    : `linear-gradient(135deg, ${theme?.accent || '#ffffff'}40, ${theme?.accent || '#ffffff'}20)`;

  // Show image if available and not errored
  const showImage = profilePicture && !imageError;

  // avatarRing is a Noir Glass-only box-shadow — no CSS var exists, keep inline
  const avatarShadow = theme?.type === 'light' && theme?.avatarRing
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
          border: ringColor ? `3px solid ${ringColor}` : '2px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.35,
          fontWeight: '600',
          color: 'var(--color-text)',
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
            referrerPolicy="no-referrer"
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
          border: `2px solid ${theme?.cardBg || '#0A0A0A'}`,
          boxShadow: `0 0 8px ${statusColor}60`,
        }}
      />
    </div>
  );
};

export default Avatar;
