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
          textShadow: `0 0 20px ${theme.accent}80, 0 0 40px ${theme.accent}40`,
        }}
      >
        LIGHTHOUSE
      </span>
    </div>
  );
};

export default Logo;
