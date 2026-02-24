// Lighthouse Dashboard - 2 Premium Themes (True Black + Noir Glass)

export const trueBlack = {
  name: 'True Black',
  type: 'dark',

  // Backgrounds
  bg: '#000000',
  cardBg: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
  innerBg: 'rgba(255, 255, 255, 0.03)',
  subtleBg: 'rgba(255, 255, 255, 0.02)',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.06)',

  // Text
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted: '#606060',

  // Status Colors (5 statuses)
  working: '#10B981',                  // Emerald-500
  workingLight: '#34D399',             // Emerald-400
  workingDark: '#059669',              // Emerald-600
  workingGlow: 'rgba(16, 185, 129, 0.4)',
  workingAmbient: 'rgba(16, 185, 129, 0.15)',

  break: '#F59E0B',                    // Amber-500
  breakLight: '#FCD34D',               // Amber-300
  breakDark: '#D97706',                // Amber-600
  breakGlow: 'rgba(245, 158, 11, 0.3)',
  breakAmbient: 'rgba(245, 158, 11, 0.12)',

  offline: '#6B7280',                  // Gray-500
  offlineLight: '#9CA3AF',             // Gray-400
  offlineGlow: 'none',

  leave: '#8B5CF6',                    // Violet-500
  leaveLight: '#C4B5FD',               // Violet-300
  leaveDark: '#7C3AED',                // Violet-600
  leaveGlow: 'none',

  noActivity: 'rgba(255, 255, 255, 0.4)', // Muted text
  noActivityGlow: 'none',

  // Accents (WHITE for True Black theme - NOT green)
  accent: '#ffffff',                   // White (primary accent)
  accentGlow: 'rgba(255, 255, 255, 0.2)',
  danger: '#EF4444',                   // Red-500
  success: '#10B981',                  // Emerald-500
  warning: '#F59E0B',                  // Amber-500
  purple: '#A855F7',                   // Purple-500

  // ClickUp Priority Colors (native)
  priorityUrgent: '#F50537',           // ClickUp Red
  priorityHigh: '#FFCC00',             // ClickUp Yellow
  priorityNormal: '#6FDDFF',           // ClickUp Blue
  priorityLow: '#D8D8D8',              // ClickUp Gray

  // Timer Specific (NEW)
  timerGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  timerGlow: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.4))',

  // Glass Morphism (NEW)
  backdropBlur: 'blur(20px)',
  cardShadow: 'none',

  // Highlights (NEW)
  highlightGradient: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
};

export const noirGlass = {
  name: 'Noir Glass',
  type: 'light',

  // Backgrounds
  bg: 'linear-gradient(170deg, #F9F9F7 0%, #F4F4F2 100%)',
  cardBg: 'linear-gradient(155deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.88) 100%)',
  innerBg: 'linear-gradient(150deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.035) 100%)',
  subtleBg: 'linear-gradient(140deg, rgba(0,0,0,0.025) 0%, rgba(0,0,0,0.04) 100%)',

  // Borders
  border: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.04)',

  // Text
  text: '#111827',                     // Gray-900
  textSecondary: '#6B7280',            // Gray-500
  textMuted: '#9CA3AF',                // Gray-400

  // Status Colors (5 statuses)
  working: '#10B981',                  // Emerald-500 (same as dark)
  workingLight: '#34D399',             // Emerald-400
  workingDark: '#059669',              // Emerald-600
  workingGlow: 'rgba(16, 185, 129, 0.4)',
  workingAmbient: 'rgba(16, 185, 129, 0.15)',

  break: '#F59E0B',                    // Amber-500 (same as dark)
  breakLight: '#FCD34D',               // Amber-300
  breakDark: '#D97706',                // Amber-600
  breakGlow: 'rgba(245, 158, 11, 0.3)',
  breakAmbient: 'rgba(245, 158, 11, 0.12)',

  offline: '#6B7280',                  // Gray-500
  offlineLight: '#9CA3AF',             // Gray-400
  offlineGlow: 'none',

  leave: '#8B5CF6',                    // Violet-500 (same as dark)
  leaveLight: '#C4B5FD',               // Violet-300
  leaveDark: '#7C3AED',                // Violet-600
  leaveGlow: 'none',

  noActivity: 'rgba(0, 0, 0, 0.3)',    // Muted text (darker for light theme)
  noActivityGlow: 'none',

  // Accents (DARK for Noir Glass theme - NOT green)
  accent: '#111827',                   // Gray-900 (dark on light background)
  accentGlow: 'rgba(17, 24, 39, 0.2)',
  danger: '#DC2626',                   // Red-600
  success: '#059669',                  // Emerald-600
  warning: '#D97706',                  // Amber-600
  purple: '#7C3AED',                   // Purple-600

  // ClickUp Priority Colors (native - same for light theme)
  priorityUrgent: '#F50537',           // ClickUp Red
  priorityHigh: '#FFCC00',             // ClickUp Yellow
  priorityNormal: '#6FDDFF',           // ClickUp Blue
  priorityLow: '#D8D8D8',              // ClickUp Gray

  // Timer Specific (NEW)
  timerGradient: 'linear-gradient(135deg, #047857 0%, #065F46 100%)',
  timerGlow: 'drop-shadow(0 3px 12px rgba(6, 95, 70, 0.25))',

  // Glass Morphism (NEW)
  backdropBlur: 'blur(24px)',
  cardShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02), 0 4px 8px rgba(0,0,0,0.03), 0 8px 16px rgba(0,0,0,0.04), 0 16px 32px rgba(0,0,0,0.05)',

  // Highlights (NEW)
  highlightGradient: 'radial-gradient(ellipse at center, rgba(6, 95, 70, 0.08) 0%, transparent 65%)',
  highlightTop: 'linear-gradient(90deg, transparent 0%, rgba(6, 95, 70, 0.06) 15%, rgba(6, 95, 70, 0.1) 50%, rgba(6, 95, 70, 0.06) 85%, transparent 100%)',

  // Badge/Tag Styles (NEW)
  badgeWorking: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
  badgeWorkingShadow: '0 2px 8px rgba(5, 150, 105, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.2)',

  // Progress Bar (NEW)
  progressTrack: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.05) 100%)',
  progressBar: 'linear-gradient(90deg, #065F46 0%, #047857 40%, #059669 100%)',
  progressBarShadow: '0 1px 4px rgba(6, 95, 70, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)',

  // Avatar Ring (NEW)
  avatarRing: '0 0 0 2.5px rgba(255, 255, 255, 0.95), 0 2px 6px rgba(0, 0, 0, 0.12)',

  // Divider (NEW)
  divider: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 50%, transparent 100%)',
  metricDivider: 'rgba(0, 0, 0, 0.06)',
};

export const themes = {
  trueBlack,
  noirGlass,
};

export default themes;
