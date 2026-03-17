/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        arabic: ['Noto Sans Arabic', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        surface: {
          primary: '#0a0a0a',
          card: '#111111',
          'card-hover': '#1a1a1a',
          border: '#1e1e1e',
          elevated: '#161616',
        },
        accent: {
          primary: '#ffffff',
          secondary: '#a0a0a0',
          muted: '#666666',
          dim: '#444444',
        },
        status: {
          working: '#22c55e',
          break: '#f59e0b',
          offline: '#6b7280',
          'no-activity': '#374151',
          leave: '#8b5cf6',
          help: '#ef4444',
          hold: '#6366f1',
          stopped: '#991b1b',
        },
        metric: {
          critical: '#ef4444',
          low: '#f97316',
          moderate: '#f59e0b',
          good: '#22c55e',
          perfect: '#ffffff',
          overwork: '#f97316',
        },
        rank: {
          first: '#fbbf24',
          second: '#9ca3af',
          third: '#d97706',
        },
        // Dynamic theme colors — reference CSS custom properties set by useTheme.js
        // Usage: className="text-th-text bg-th-card border-th-border"
        'th-bg': 'var(--color-bg)',
        'th-card': 'var(--color-card-bg)',
        'th-inner': 'var(--color-inner-bg)',
        'th-border': 'var(--color-border)',
        'th-border-light': 'var(--color-border-light)',
        'th-text': 'var(--color-text)',
        'th-text-secondary': 'var(--color-text-secondary)',
        'th-text-muted': 'var(--color-text-muted)',
        'th-accent': 'var(--color-accent)',
        'th-working': 'var(--color-working)',
        'th-break': 'var(--color-break)',
        'th-offline': 'var(--color-offline)',
        'th-leave': 'var(--color-leave)',
        'th-success': 'var(--color-success)',
        'th-warning': 'var(--color-warning)',
        'th-danger': 'var(--color-danger)',
      },
      fontSize: {
        display: ['2.25rem', { lineHeight: '1.1', fontWeight: '700' }],
        stat: ['1.75rem', { lineHeight: '1.2', fontWeight: '600' }],
        heading: ['1.125rem', { lineHeight: '1.3', fontWeight: '600' }],
        subheading: ['0.9375rem', { lineHeight: '1.4', fontWeight: '500' }],
        body: ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
        micro: ['0.6875rem', { lineHeight: '1.3', fontWeight: '400' }],
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        badge: '6px',
        full: '9999px',
      },
      spacing: {
        'card-padding': '16px',
        'section-gap': '24px',
        'card-gap': '16px',
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
        },
      },
    },
  },
  plugins: [],
}
