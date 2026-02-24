import React from 'react';

/**
 * Skeleton Loading Components
 * Provides placeholder UI while data is loading
 */

/**
 * Base Skeleton Component
 * Generic skeleton element with shimmer animation
 */
export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '8px', style = {} }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
};

/**
 * Skeleton Avatar
 * Placeholder for member avatar
 */
export const SkeletonAvatar = ({ size = 48, theme }) => {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '12px',
        background: theme.innerBg,
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
};

/**
 * Skeleton Member Card
 * Placeholder for MemberCard in Grid view
 */
export const SkeletonMemberCard = ({ theme }) => {
  return (
    <div
      style={{
        background: theme.cardBg,
        backdropFilter: theme.backdropBlur,
        WebkitBackdropFilter: theme.backdropBlur,
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow || `0 8px 32px ${theme.border}80`,
      }}
    >
      {/* Header: Avatar + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <SkeletonAvatar size={48} theme={theme} />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height="18px" borderRadius="6px" />
          <div style={{ height: '4px' }} />
          <Skeleton width="40%" height="14px" borderRadius="6px" />
        </div>
      </div>

      {/* Timer */}
      <div style={{ marginBottom: '16px' }}>
        <Skeleton width="50%" height="32px" borderRadius="8px" />
      </div>

      {/* Task Info */}
      <div style={{ marginBottom: '12px' }}>
        <Skeleton width="80%" height="16px" borderRadius="6px" />
        <div style={{ height: '8px' }} />
        <Skeleton width="60%" height="14px" borderRadius="6px" />
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '12px' }}>
        <Skeleton width="100%" height="8px" borderRadius="4px" />
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <Skeleton width="25%" height="40px" borderRadius="8px" />
        <Skeleton width="25%" height="40px" borderRadius="8px" />
        <Skeleton width="25%" height="40px" borderRadius="8px" />
        <Skeleton width="25%" height="40px" borderRadius="8px" />
      </div>
    </div>
  );
};

/**
 * Skeleton Overview Card
 * Placeholder for dashboard overview cards
 */
export const SkeletonOverviewCard = ({ theme }) => {
  return (
    <div
      style={{
        background: theme.cardBg,
        backdropFilter: theme.backdropBlur,
        WebkitBackdropFilter: theme.backdropBlur,
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow || `0 8px 32px ${theme.border}80`,
      }}
    >
      {/* Title */}
      <Skeleton width="40%" height="16px" borderRadius="6px" style={{ marginBottom: '16px' }} />

      {/* Large Number */}
      <Skeleton width="60%" height="36px" borderRadius="8px" style={{ marginBottom: '12px' }} />

      {/* Progress Bar */}
      <Skeleton width="100%" height="8px" borderRadius="4px" style={{ marginBottom: '8px' }} />

      {/* Subtitle */}
      <Skeleton width="50%" height="14px" borderRadius="6px" />
    </div>
  );
};

/**
 * Skeleton Score Card
 * Placeholder for score breakdown card
 */
export const SkeletonScoreCard = ({ theme }) => {
  return (
    <div
      style={{
        background: theme.cardBg,
        backdropFilter: theme.backdropBlur,
        WebkitBackdropFilter: theme.backdropBlur,
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow || `0 8px 32px ${theme.border}80`,
      }}
    >
      {/* Title */}
      <Skeleton width="40%" height="16px" borderRadius="6px" style={{ marginBottom: '16px' }} />

      {/* Large Score Circle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: theme.innerBg,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* 4 Metric Boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Skeleton width="100%" height="60px" borderRadius="10px" />
        <Skeleton width="100%" height="60px" borderRadius="10px" />
        <Skeleton width="100%" height="60px" borderRadius="10px" />
        <Skeleton width="100%" height="60px" borderRadius="10px" />
      </div>
    </div>
  );
};

/**
 * Skeleton Project Card
 * Placeholder for project breakdown card
 */
export const SkeletonProjectCard = ({ theme }) => {
  return (
    <div
      style={{
        background: theme.cardBg,
        backdropFilter: theme.backdropBlur,
        WebkitBackdropFilter: theme.backdropBlur,
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow || `0 8px 32px ${theme.border}80`,
      }}
    >
      {/* Title */}
      <Skeleton width="40%" height="16px" borderRadius="6px" style={{ marginBottom: '16px' }} />

      {/* Project Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <Skeleton width="120px" height="80px" borderRadius="12px" />
        <Skeleton width="140px" height="80px" borderRadius="12px" />
        <Skeleton width="100px" height="80px" borderRadius="12px" />
      </div>
    </div>
  );
};

/**
 * Skeleton Ranking Row
 * Placeholder for ranking table rows
 */
export const SkeletonRankingRow = ({ theme }) => {
  return (
    <tr>
      <td style={{ padding: '12px' }}>
        <Skeleton width="30px" height="16px" borderRadius="6px" />
      </td>
      <td style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SkeletonAvatar size={40} theme={theme} />
          <Skeleton width="100px" height="16px" borderRadius="6px" />
        </div>
      </td>
      <td style={{ padding: '12px' }}>
        <Skeleton width="60px" height="16px" borderRadius="6px" />
      </td>
      <td style={{ padding: '12px' }}>
        <Skeleton width="60px" height="16px" borderRadius="6px" />
      </td>
      <td style={{ padding: '12px' }}>
        <Skeleton width="40px" height="16px" borderRadius="6px" />
      </td>
      <td style={{ padding: '12px' }}>
        <Skeleton width="50px" height="16px" borderRadius="6px" />
      </td>
    </tr>
  );
};

/**
 * Skeleton List Row
 * Placeholder for list view rows
 */
export const SkeletonListRow = ({ theme }) => {
  return (
    <div
      style={{
        background: theme.cardBg,
        backdropFilter: theme.backdropBlur,
        WebkitBackdropFilter: theme.backdropBlur,
        borderRadius: '12px',
        padding: '16px',
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow || `0 4px 16px ${theme.border}40`,
        marginBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Avatar */}
        <SkeletonAvatar size={48} theme={theme} />

        {/* Name & Status */}
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height="18px" borderRadius="6px" style={{ marginBottom: '6px' }} />
          <Skeleton width="30%" height="14px" borderRadius="6px" />
        </div>

        {/* Timer */}
        <Skeleton width="80px" height="24px" borderRadius="6px" />

        {/* Progress */}
        <Skeleton width="100px" height="20px" borderRadius="6px" />

        {/* Score */}
        <Skeleton width="60px" height="28px" borderRadius="8px" />
      </div>
    </div>
  );
};

/**
 * CSS Animations
 * Inject keyframes for shimmer and pulse animations
 */
export const SkeletonStyles = () => (
  <style>
    {`
      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `}
  </style>
);

export default {
  Skeleton,
  SkeletonAvatar,
  SkeletonMemberCard,
  SkeletonOverviewCard,
  SkeletonScoreCard,
  SkeletonProjectCard,
  SkeletonRankingRow,
  SkeletonListRow,
  SkeletonStyles,
};
