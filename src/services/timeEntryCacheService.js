import { db } from '../db';
import { logger } from '../utils/logger';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Convert a Date object to local "YYYY-MM-DD" string (avoids UTC off-by-one).
 */
function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get today's local date key.
 */
function todayKey() {
  return toLocalDateKey(new Date());
}

/**
 * Merge consecutive uncached days into 30-day chunks (ClickUp's max range per request).
 * Returns array of { startSec, endSec } for each chunk needed.
 * Dates are sorted and consecutive days are merged into chunks ≤30 days.
 */
function buildChunks(uncachedDays) {
  if (uncachedDays.length === 0) return [];

  const sorted = [...uncachedDays].sort();
  const chunks = [];
  let chunkStart = sorted[0];
  let chunkEnd = sorted[0];
  const MS_PER_DAY = 86400000;
  const MAX_DAYS = 30;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(chunkEnd + 'T00:00:00');
    const curr = new Date(sorted[i] + 'T00:00:00');
    const daysDiff = Math.round((curr - prev) / MS_PER_DAY);
    const chunkStart_ = new Date(chunkStart + 'T00:00:00');
    const chunkSpan = Math.round((curr - chunkStart_) / MS_PER_DAY) + 1;

    if (daysDiff === 1 && chunkSpan <= MAX_DAYS) {
      chunkEnd = sorted[i];
    } else {
      chunks.push({ startSec: toStartSec(chunkStart), endSec: toEndSec(chunkEnd) });
      chunkStart = sorted[i];
      chunkEnd = sorted[i];
    }
  }
  chunks.push({ startSec: toStartSec(chunkStart), endSec: toEndSec(chunkEnd) });
  return chunks;
}

function toStartSec(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  return Math.floor(d.getTime() / 1000);
}

function toEndSec(dateKey) {
  const d = new Date(dateKey + 'T23:59:59');
  return Math.floor(d.getTime() / 1000);
}

export const timeEntryCache = {
  /**
   * For a date range, returns what's already cached and what chunks still need API fetching.
   *
   * Rules:
   * - Today is ALWAYS uncached (always fetched fresh)
   * - Past days with valid cache (<7 days old) are returned as cached entries
   * - Past days with no cache or expired cache are returned as uncachedChunks
   *
   * @param {Date} startDate - Range start (local midnight)
   * @param {Date} endDate - Range end (local midnight)
   * @returns {Promise<{ cached: Array, uncachedChunks: Array<{startSec, endSec}> }>}
   */
  async getEntries(startDate, endDate) {
    const today = todayKey();
    const now = Date.now();
    const cached = [];
    const uncachedDays = [];

    // Iterate each day in range
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      const dayKey = toLocalDateKey(current);

      if (dayKey === today) {
        // Today always fetched fresh — add as uncached
        uncachedDays.push(dayKey);
      } else {
        // Check cache
        try {
          const row = await db.timeEntryCache.get(dayKey);
          if (row && (now - row.fetchedAt) < CACHE_TTL_MS) {
            cached.push(...row.entries);
          } else {
            uncachedDays.push(dayKey);
          }
        } catch {
          uncachedDays.push(dayKey);
        }
      }

      current.setDate(current.getDate() + 1);
    }

    const uncachedChunks = buildChunks(uncachedDays);
    logger.debug(`TimeEntryCache: ${cached.length} cached entries, ${uncachedChunks.length} chunks to fetch`);
    return { cached, uncachedChunks };
  },

  /**
   * Store time entries grouped by their local date.
   * Today's entries are NEVER cached (they change as the day progresses).
   *
   * @param {Array} entries - Array of ClickUp time entry objects
   */
  async storeEntries(entries) {
    const today = todayKey();
    const now = Date.now();

    // Group entries by local date
    const byDay = {};
    for (const entry of entries) {
      const startMs = parseInt(entry.start, 10);
      if (!startMs) continue;
      const dayKey = toLocalDateKey(new Date(startMs));
      if (dayKey === today) continue; // Never cache today
      if (!byDay[dayKey]) byDay[dayKey] = [];
      byDay[dayKey].push(entry);
    }

    // Bulk put into IndexedDB
    const rows = Object.entries(byDay).map(([dateKey, dayEntries]) => ({
      dateKey,
      entries: dayEntries,
      fetchedAt: now,
    }));

    if (rows.length > 0) {
      try {
        await db.timeEntryCache.bulkPut(rows);
        logger.info(`TimeEntryCache: stored ${rows.length} days (${entries.length} entries)`);
      } catch (err) {
        logger.error('TimeEntryCache: failed to store entries', err);
      }
    }
  },

  /**
   * Clear ALL cached time entries (called from Settings "Clear Cache" and "Reload All Data").
   */
  async clearAll() {
    try {
      await db.timeEntryCache.clear();
      logger.info('TimeEntryCache: cleared all');
    } catch (err) {
      logger.error('TimeEntryCache: failed to clear', err);
    }
  },

  /**
   * Get cache statistics for debugging.
   */
  async getStats() {
    try {
      const count = await db.timeEntryCache.count();
      const rows = await db.timeEntryCache.toArray();
      const oldest = rows.length > 0 ? rows.reduce((a, b) => a.dateKey < b.dateKey ? a : b).dateKey : null;
      const newest = rows.length > 0 ? rows.reduce((a, b) => a.dateKey > b.dateKey ? a : b).dateKey : null;
      const totalEntries = rows.reduce((sum, r) => sum + r.entries.length, 0);
      return { days: count, oldest, newest, totalEntries };
    } catch {
      return { days: 0, oldest: null, newest: null, totalEntries: 0 };
    }
  },
};
