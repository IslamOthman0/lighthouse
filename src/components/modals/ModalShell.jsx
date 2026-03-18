import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getFontFamily } from '../../utils/typography';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

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
      lockScroll();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (isOpen) unlockScroll();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const modalContent = (
    <>
      {/* Backdrop - Full Coverage */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[1000] overflow-hidden"
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          animation: 'modalFadeIn 0.2s ease-out',
        }}
      />

      {/* Modal - Centered Container */}
      <div
        className="fixed inset-0 z-[1001] flex items-start justify-center overflow-y-auto pointer-events-none"
        style={{
          padding: isMobile ? '10px' : '20px',
          paddingTop: isMobile ? '10px' : '40px',
        }}
      >
        {/* Actual Modal Content */}
        <div
          data-testid={testId}
          className="relative w-full rounded-[16px] border border-[var(--color-border)] overflow-hidden flex flex-col pointer-events-auto direction-ltr"
          style={{
            maxWidth,
            maxHeight: isMobile ? '88dvh' : '85vh',
            background: 'var(--color-card-bg)',
            boxShadow: theme?.type === 'dark'
              ? '0 25px 50px -12px rgba(0,0,0,0.5)'
              : '0 25px 50px -12px rgba(0,0,0,0.15)',
            animation: 'modalSlideIn 0.25s ease-out',
            direction: 'ltr',
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 border-b border-[var(--color-border)] flex justify-between items-center"
            style={{
              background: headerColor || 'var(--color-inner-bg)',
              ...(headerColor && { color: '#ffffff' }),
            }}
          >
            <div
              className="flex items-center gap-[10px] text-[15px] font-semibold"
              style={{
                color: headerColor ? '#ffffff' : 'var(--color-text)',
                fontFamily: getFontFamily('english'),
              }}
            >
              {icon && <span className="text-base">{icon}</span>}
              {title}
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-badge border-none cursor-pointer flex items-center justify-center text-base transition-all duration-150"
              style={{
                background: headerColor ? 'rgba(255,255,255,0.2)' : 'var(--color-subtle-bg)',
                color: headerColor ? '#ffffff' : 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = headerColor ? 'rgba(255,255,255,0.3)' : 'var(--color-border)';
                e.currentTarget.style.color = headerColor ? '#ffffff' : 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = headerColor ? 'rgba(255,255,255,0.2)' : 'var(--color-subtle-bg)';
                e.currentTarget.style.color = headerColor ? '#ffffff' : 'var(--color-text-muted)';
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ padding: isMobile ? '14px' : '20px' }}
          >
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
  <div className="mb-5">
    <div
      className="text-[11px] text-[var(--color-text-muted)] mb-[6px] uppercase tracking-[0.5px]"
      style={{ fontFamily: getFontFamily('english') }}
    >
      {label}
    </div>
    <div className="flex items-baseline justify-between mb-[10px]">
      <div className="flex items-baseline gap-2">
        <span className="text-[32px] font-bold text-[var(--color-text)] tabular-nums">
          {value}
        </span>
        {subValue && (
          <span
            className="text-sm text-[var(--color-text-secondary)]"
            style={{ fontFamily: getFontFamily('english') }}
          >
            {subValue}
          </span>
        )}
      </div>
      {rightContent}
    </div>
    {progress !== undefined && (
      <div className="w-full h-2 bg-[var(--color-subtle-bg)] rounded overflow-hidden">
        <div
          className="h-full rounded transition-[width] duration-300 ease-out"
          style={{
            width: `${Math.min(Math.max(progress, 0), 100)}%`,
            background: progressColor
              ? `linear-gradient(90deg, ${progressColor}, ${progressColor}cc)`
              : 'linear-gradient(90deg, var(--color-accent), var(--color-accent))',
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
    className="bg-[var(--color-inner-bg)] rounded-card border border-[var(--color-border-light)] mb-4"
    style={{ padding: noPadding ? '0' : '16px' }}
  >
    {title && (
      <div
        className="text-xs font-semibold text-[var(--color-text)] mb-3 flex items-center gap-[6px]"
        style={{
          fontFamily: getFontFamily('english'),
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
  <div className="flex justify-between items-center py-[6px]">
    <span
      className="text-[11px] text-[var(--color-text-secondary)]"
      style={{ fontFamily: getFontFamily('english') }}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </span>
    <span
      className="text-xs font-semibold tabular-nums"
      style={{ color: valueColor || 'var(--color-text)' }}
    >
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
    <div className="flex items-center gap-2">
      <div
        className="flex-1 bg-[var(--color-subtle-bg)] overflow-hidden"
        style={{ height: `${height}px`, borderRadius: `${height / 2}px` }}
      >
        <div
          className="h-full transition-[width] duration-300 ease-out"
          style={{
            width: `${Math.min(percent, 100)}%`,
            background: color || 'var(--color-accent)',
            borderRadius: `${height / 2}px`,
          }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] tabular-nums min-w-8 text-right">
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
  <div className="text-center py-10 px-5 text-[var(--color-text-muted)]">
    <div className="text-5xl mb-3 opacity-30">{icon || '📊'}</div>
    <div
      className="text-sm mb-1"
      style={{ fontFamily: getFontFamily('english') }}
    >
      {title || 'No data available'}
    </div>
    {subtitle && <div className="text-xs opacity-70">{subtitle}</div>}
  </div>
);

export default ModalShell;
