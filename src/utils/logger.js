/**
 * Lighthouse Logger Utility
 * Wraps console methods with [Lighthouse] prefix for easy log filtering
 */

const PREFIX = '[Lighthouse]';

export const logger = {
  /**
   * Info-level logging (general operational messages)
   */
  info: (...args) => {
    console.log(PREFIX, ...args);
  },

  /**
   * Warning-level logging (potentially harmful situations)
   */
  warn: (...args) => {
    console.warn(PREFIX, ...args);
  },

  /**
   * Error-level logging (error events)
   */
  error: (...args) => {
    console.error(PREFIX, ...args);
  },

  /**
   * Debug-level logging (detailed information for debugging)
   * Only logs in development mode
   */
  debug: (...args) => {
    if (import.meta.env.DEV) {
      console.debug(PREFIX, ...args);
    }
  },
};
