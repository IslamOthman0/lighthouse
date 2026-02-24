import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getFontFamily } from '../../utils/typography';

/**
 * Unified Modal Shell Component
 * Provides consistent styling for all detail modals
 */
const ModalShell = ({
  isOpen,
  onClose,
  title,
  icon,
  theme,
  maxWidth = '800px',
  children,
  headerColor, // Optional: for colored headers like TaskListModal
  testId, // Optional: data-testid for testing
}) => {
  // Handle ESC key and body scroll lock
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const modalContent = (
    <>
      {/* Backdrop - Full Coverage */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          zIndex: 999998,
          animation: 'modalFadeIn 0.2s ease-out',
          overflow: 'hidden',
        }}
      />

      {/* Modal - Centered Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: isMobile ? '10px' : '20px',
          paddingTop: isMobile ? '10px' : '40px',
          pointerEvents: 'none',
          overflowY: 'auto',
        }}
      >
        {/* Actual Modal Content */}
        <div
          data-testid={testId}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: maxWidth,
            maxHeight: '85vh',
            background: theme.type === 'dark'
              ? 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))'
              : 'linear-gradient(155deg, rgb(255,255,255), rgb(252,252,252))',
            borderRadius: '16px',
            border: `1px solid ${theme.border}`,
            boxShadow: theme.type === 'dark'
              ? '0 25px 50px -12px rgba(0,0,0,0.5)'
              : '0 25px 50px -12px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'modalSlideIn 0.25s ease-out',
            pointerEvents: 'auto',
            direction: 'ltr', // Force LTR for modal structure
          }}
        >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: headerColor || (theme.innerBg || theme.secondaryBg),
            ...(headerColor && { color: '#ffffff' }),
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '15px',
              fontWeight: '600',
              color: headerColor ? '#ffffff' : theme.text,
              fontFamily: getFontFamily('english'),
            }}
          >
            {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: 'none',
              background: headerColor ? 'rgba(255,255,255,0.2)' : theme.subtleBg || 'rgba(0,0,0,0.05)',
              color: headerColor ? '#ffffff' : theme.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = headerColor ? 'rgba(255,255,255,0.3)' : (theme.border || 'rgba(0,0,0,0.1)');
              e.currentTarget.style.color = headerColor ? '#ffffff' : theme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = headerColor ? 'rgba(255,255,255,0.2)' : (theme.subtleBg || 'rgba(0,0,0,0.05)');
              e.currentTarget.style.color = headerColor ? '#ffffff' : theme.textMuted;
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {children}
        </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );

  // Render modal using React Portal to ensure it's at document root level
  return createPortal(modalContent, document.body);
};

/**
 * Hero Section Component - Big metric display
 */
export const ModalHero = ({
  theme,
  label,
  value,
  subValue,
  progress,
  progressColor,
  rightContent
}) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '6px', fontFamily: getFontFamily('english'), textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '32px', fontWeight: '700', color: theme.text, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        {subValue && (
          <span style={{ fontSize: '14px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
            {subValue}
          </span>
        )}
      </div>
      {rightContent}
    </div>
    {progress !== undefined && (
      <div style={{ width: '100%', height: '8px', background: theme.subtleBg || theme.border, borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(Math.max(progress, 0), 100)}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${progressColor || theme.accent}, ${progressColor || theme.accent}cc)`,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    )}
  </div>
);

/**
 * Section Card Component - Grouped content
 */
export const ModalSection = ({ theme, title, icon, children, noPadding }) => (
  <div
    style={{
      background: theme.innerBg || theme.secondaryBg,
      borderRadius: '12px',
      padding: noPadding ? '0' : '16px',
      marginBottom: '16px',
      border: `1px solid ${theme.borderLight || theme.border}`,
    }}
  >
    {title && (
      <div
        style={{
          fontSize: '12px',
          fontWeight: '600',
          color: theme.text,
          marginBottom: '12px',
          fontFamily: getFontFamily('english'),
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: noPadding ? '12px 16px 0' : '0',
        }}
      >
        {icon && <span>{icon}</span>}
        {title}
      </div>
    )}
    {children}
  </div>
);

/**
 * Stat Row Component - Label/Value pair
 */
export const StatRow = ({ theme, label, value, valueColor, icon }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
    <span style={{ fontSize: '11px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
      {icon && <span style={{ marginRight: '4px' }}>{icon}</span>}
      {label}
    </span>
    <span style={{ fontSize: '12px', fontWeight: '600', color: valueColor || theme.text, fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </span>
  </div>
);

/**
 * Progress Bar Component
 */
export const ProgressBar = ({ theme, value, max, color, height = 6, showLabel }) => {
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: `${height}px`, background: theme.subtleBg || theme.border, borderRadius: `${height / 2}px`, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(percent, 100)}%`,
            height: '100%',
            background: color || theme.accent,
            borderRadius: `${height / 2}px`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: '10px', fontWeight: '600', color: theme.textSecondary, fontVariantNumeric: 'tabular-nums', minWidth: '32px', textAlign: 'right' }}>
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
};

/**
 * Empty State Component
 */
export const EmptyState = ({ theme, icon, title, subtitle }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.textMuted }}>
    <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>{icon || '📊'}</div>
    <div style={{ fontSize: '14px', fontFamily: getFontFamily('english'), marginBottom: '4px' }}>{title || 'No data available'}</div>
    {subtitle && <div style={{ fontSize: '12px', opacity: 0.7 }}>{subtitle}</div>}
  </div>
);

export default ModalShell;
