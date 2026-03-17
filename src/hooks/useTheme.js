import { create } from 'zustand';
import themes from '../constants/themes';
import { SETTINGS_STORAGE_KEY } from '../constants/defaults';

/**
 * Apply a theme object's values as CSS custom properties on document.documentElement.
 * Also toggles the .theme-noir-glass class for CSS-selector-based overrides.
 * This is ADDITIVE — the existing theme prop system continues to work unchanged.
 */
function applyThemeToDom(themeName, theme) {
  const root = document.documentElement;

  // Toggle theme class for CSS-selector overrides
  if (themeName === 'noirGlass') {
    root.classList.add('theme-noir-glass');
  } else {
    root.classList.remove('theme-noir-glass');
  }

  // Map theme object properties → CSS custom property names
  const vars = {
    '--color-bg': theme.bg,
    '--color-card-bg': theme.cardBg,
    '--color-inner-bg': theme.innerBg,
    '--color-subtle-bg': theme.subtleBg,
    '--color-border': theme.border,
    '--color-border-light': theme.borderLight,
    '--color-text': theme.text,
    '--color-text-secondary': theme.textSecondary,
    '--color-text-muted': theme.textMuted,
    '--color-working': theme.working,
    '--color-working-light': theme.workingLight,
    '--color-working-dark': theme.workingDark,
    '--color-working-glow': theme.workingGlow,
    '--color-break': theme.break,
    '--color-break-light': theme.breakLight,
    '--color-break-dark': theme.breakDark,
    '--color-offline': theme.offline,
    '--color-offline-light': theme.offlineLight,
    '--color-leave': theme.leave,
    '--color-leave-light': theme.leaveLight,
    '--color-leave-dark': theme.leaveDark,
    '--color-no-activity': theme.noActivity,
    '--color-accent': theme.accent,
    '--color-accent-glow': theme.accentGlow,
    '--color-danger': theme.danger,
    '--color-success': theme.success,
    '--color-warning': theme.warning,
    '--color-purple': theme.purple,
    '--effect-backdrop-blur': theme.backdropBlur,
    '--effect-card-shadow': theme.cardShadow,
  };

  for (const [prop, value] of Object.entries(vars)) {
    if (value !== undefined) {
      root.style.setProperty(prop, value);
    }
  }
}

/**
 * Load initial theme from settings (single source of truth)
 */
function getInitialTheme() {
  try {
    const settingsStr = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      if (settings?.display?.theme && themes[settings.display.theme]) {
        return settings.display.theme;
      }
    }
  } catch (error) {
    console.error('[useTheme] Error loading theme from settings:', error);
  }
  return 'trueBlack';
}

// Apply initial theme to DOM immediately (before first render)
const initialThemeName = getInitialTheme();
applyThemeToDom(initialThemeName, themes[initialThemeName] || themes.trueBlack);

// No persist middleware — theme is persisted via useSettings (lighthouse_settings key)
const useThemeStore = create((set) => ({
  currentTheme: initialThemeName,
  setTheme: (themeName) => {
    const theme = themes[themeName] || themes.trueBlack;
    applyThemeToDom(themeName, theme);
    set({ currentTheme: themeName });
  },
}));

export const useTheme = () => {
  const { currentTheme, setTheme } = useThemeStore();

  // Fallback to 'trueBlack' if the stored theme doesn't exist (migration from old themes)
  const theme = themes[currentTheme] || themes.trueBlack;

  // If the current theme doesn't exist, update to trueBlack
  if (!themes[currentTheme]) {
    setTheme('trueBlack');
  }

  return {
    theme,
    currentTheme: themes[currentTheme] ? currentTheme : 'trueBlack',
    setTheme,
    themes,
  };
};

export default useTheme;
