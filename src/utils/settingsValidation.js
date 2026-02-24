/**
 * Settings Validation Utilities
 *
 * Validation functions for settings values and API key verification
 */

/**
 * Validate ClickUp API key by calling the /user endpoint
 *
 * @param {string} apiKey - The ClickUp API key to validate
 * @returns {Promise<{valid: boolean, user?: object, error?: string}>}
 */
export async function validateClickUpApiKey(apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API key is required' };
  }

  try {
    const response = await fetch('https://api.clickup.com/api/v2/user', {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      }
      return { valid: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    return {
      valid: true,
      user: data.user, // { id, username, email, color, profilePicture, ... }
    };
  } catch (error) {
    return {
      valid: false,
      error: `Network error: ${error.message}`,
    };
  }
}

/**
 * Validate score weights sum to 100%
 *
 * @param {Object} weights - Score weights object
 * @returns {boolean}
 */
export function validateScoreWeights(weights) {
  const sum = weights.trackedTime + weights.tasksWorked + weights.tasksDone + weights.compliance;
  return Math.abs(sum - 1.0) < 0.001; // Allow tiny floating point errors
}

/**
 * Auto-balance score weights when one changes
 *
 * @param {Object} weights - Current weights
 * @param {string} changedKey - Which weight was changed
 * @param {number} newValue - New value (0-1)
 * @returns {Object} - Balanced weights
 */
export function balanceScoreWeights(weights, changedKey, newValue) {
  // Ensure newValue is between 0 and 1
  newValue = Math.max(0, Math.min(1, newValue));

  const otherKeys = ['trackedTime', 'tasksWorked', 'tasksDone', 'compliance'].filter(
    (k) => k !== changedKey
  );

  // Calculate remaining weight to distribute
  const remaining = 1.0 - newValue;

  // Get current sum of other weights
  const otherSum = otherKeys.reduce((sum, k) => sum + weights[k], 0);

  // Create new weights object
  const newWeights = { ...weights, [changedKey]: newValue };

  if (otherSum === 0) {
    // If all others are 0, distribute equally
    const equalShare = remaining / otherKeys.length;
    otherKeys.forEach((k) => {
      newWeights[k] = equalShare;
    });
  } else {
    // Distribute proportionally
    otherKeys.forEach((k) => {
      newWeights[k] = (weights[k] / otherSum) * remaining;
    });
  }

  return newWeights;
}

/**
 * Validate time format (HH:MM)
 *
 * @param {string} time - Time string
 * @returns {boolean}
 */
export function validateTimeFormat(time) {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

/**
 * Validate date format (YYYY-MM-DD)
 *
 * @param {string} date - Date string
 * @returns {boolean}
 */
export function validateDateFormat(date) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;

  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
}

/**
 * Validate number is positive integer
 *
 * @param {number} value - Number to validate
 * @returns {boolean}
 */
export function validatePositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Validate number is within range
 *
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {boolean}
 */
export function validateRange(value, min, max) {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * Sanitize settings object before saving
 * Ensures all required fields exist and have valid types
 *
 * @param {Object} settings - Settings object
 * @param {Object} defaults - Default settings
 * @returns {Object} - Sanitized settings
 */
export function sanitizeSettings(settings, defaults) {
  const sanitized = {};

  // Deep merge with defaults
  for (const key in defaults) {
    if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
      sanitized[key] = {
        ...defaults[key],
        ...(settings[key] || {}),
      };
    } else {
      sanitized[key] = settings[key] !== undefined ? settings[key] : defaults[key];
    }
  }

  return sanitized;
}
