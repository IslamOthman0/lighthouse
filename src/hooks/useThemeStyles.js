/**
 * useThemeStyles — returns commonly-used style presets composed from CSS custom properties.
 *
 * This hook does NOT read the theme object. It only returns CSS var references.
 * This makes it a zero-cost bridge for components that can't use Tailwind directly
 * (e.g., when background is a gradient).
 *
 * Usage:
 *   const styles = useThemeStyles();
 *   <div style={styles.card}>...</div>
 */
export function useThemeStyles() {
  return {
    // Card container (most common pattern)
    card: {
      background: 'var(--color-card-bg)',
      backdropFilter: 'var(--effect-backdrop-blur)',
      borderRadius: 'var(--radius-card, 12px)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--effect-card-shadow)',
    },
    // Inner section inside a card
    section: {
      background: 'var(--color-inner-bg)',
      borderRadius: '8px',
      border: '1px solid var(--color-border-light)',
    },
    // Text color styles (for cases where Tailwind can't be used)
    textPrimary: { color: 'var(--color-text)' },
    textSecondary: { color: 'var(--color-text-secondary)' },
    textMuted: { color: 'var(--color-text-muted)' },
    // Border
    border: { borderColor: 'var(--color-border)' },
    borderLight: { borderColor: 'var(--color-border-light)' },
  };
}

export default useThemeStyles;
