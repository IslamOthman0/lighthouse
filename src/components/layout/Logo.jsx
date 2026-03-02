import React from 'react';

const Logo = ({ theme, compact = false }) => {
  return (
    <div className="flex items-center">
      <span
        style={{
          fontSize: compact ? '18px' : '28px',
          fontWeight: 'normal',
          fontFamily: "'Dune Rise', sans-serif",
          letterSpacing: compact ? '2px' : '3px',
          color: theme.accent,
          textShadow: 'none',
        }}
      >
        LIGHTHOUSE
      </span>
    </div>
  );
};

export default Logo;
