import { create } from 'zustand';
import themes from '../constants/themes';
import { SETTINGS_STORAGE_KEY } from '../constants/defaults';

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

// No persist middleware — theme is persisted via useSettings (lighthouse_settings key)
const useThemeStore = create((set) => ({
  currentTheme: getInitialTheme(),
  setTheme: (themeName) => set({ currentTheme: themeName }),
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
