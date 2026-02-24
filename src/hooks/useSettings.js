/**
 * Settings Management Hook
 *
 * Manages application settings with localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../constants/defaults';
import { sanitizeSettings } from '../utils/settingsValidation';

/**
 * Load settings from localStorage
 *
 * @returns {Object} Settings object
 */
function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return sanitizeSettings(parsed, DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error('[useSettings] Error loading settings from localStorage:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 *
 * @param {Object} settings - Settings object to save
 */
function saveSettings(settings) {
  try {
    const sanitized = sanitizeSettings(settings, DEFAULT_SETTINGS);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch (error) {
    console.error('[useSettings] Error saving settings to localStorage:', error);
    return false;
  }
}

/**
 * Hook for managing application settings
 *
 * @returns {Object} { settings, updateSettings, resetSettings, getSetting }
 */
export function useSettings() {
  const [settings, setSettings] = useState(() => loadSettings());

  // Save to localStorage whenever settings change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  /**
   * Update settings (deep merge)
   *
   * @param {Object} updates - Partial settings object to update
   */
  const updateSettings = useCallback((updates) => {
    setSettings((prev) => {
      const updated = { ...prev };

      for (const key in updates) {
        if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
          updated[key] = {
            ...prev[key],
            ...updates[key],
          };
        } else {
          updated[key] = updates[key];
        }
      }

      return updated;
    });
  }, []);

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }, []);

  /**
   * Get a specific setting value by path
   *
   * @param {string} path - Dot-separated path (e.g., 'score.weights.trackedTime')
   * @returns {any} Setting value
   */
  const getSetting = useCallback(
    (path) => {
      const keys = path.split('.');
      let value = settings;
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined) break;
      }
      return value;
    },
    [settings]
  );

  /**
   * Update a single nested setting
   *
   * @param {string} path - Dot-separated path (e.g., 'score.weights.trackedTime')
   * @param {any} value - New value
   */
  const setSetting = useCallback((path, value) => {
    setSettings((prev) => {
      const keys = path.split('.');
      const updated = { ...prev };
      let current = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current[key] = { ...current[key] };
        current = current[key];
      }

      current[keys[keys.length - 1]] = value;
      return updated;
    });
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    getSetting,
    setSetting,
  };
}

/**
 * Hook for a specific settings section
 *
 * @param {string} section - Section name ('team', 'clickup', 'score', etc.)
 * @returns {Object} { data, update }
 */
export function useSettingsSection(section) {
  const { settings, updateSettings } = useSettings();

  const update = useCallback(
    (sectionData) => {
      updateSettings({ [section]: sectionData });
    },
    [section, updateSettings]
  );

  return {
    data: settings[section] || {},
    update,
  };
}
