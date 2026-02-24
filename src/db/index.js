import Dexie from 'dexie';
import { logger } from '../utils/logger';

// Initialize Dexie database
export const db = new Dexie('LighthouseDB');

/**
 * Database Schema v16 - Added timestamp indexes
 * All data is ephemeral (re-fetched from ClickUp API every sync cycle)
 * v16: Added timestamp index to sessions and breaks for pruning
 */
db.version(16).stores({
  members: '++id, name, status, project, clickUpId',
  sessions: '++id, memberId, date, startTime, endTime, totalMinutes, timestamp',
  breaks: '++id, sessionId, memberId, startTime, endTime, duration, timestamp',
  tasks: '++id, memberId, clickUpId, status, project, name',
  leaves: '++id, memberId, type, startDate, endDate, returnDate',
  syncQueue: '++id, action, entity, data, timestamp, retryCount',
  baselines: 'key, value, updatedAt',
  clickUpTasks: 'id, dateUpdated, *assigneeIds',
  taskSyncMeta: 'key'
});

/**
 * Database Schema v17 - Fixed syncQueue indexes
 * v17: Added 'status' index to syncQueue (used by syncQueue.js service)
 */
db.version(17).stores({
  members: '++id, name, status, project, clickUpId',
  sessions: '++id, memberId, date, startTime, endTime, totalMinutes, timestamp',
  breaks: '++id, sessionId, memberId, startTime, endTime, duration, timestamp',
  tasks: '++id, memberId, clickUpId, status, project, name',
  leaves: '++id, memberId, type, startDate, endDate, returnDate',
  syncQueue: '++id, type, status, timestamp',
  baselines: 'key, value, updatedAt',
  clickUpTasks: 'id, dateUpdated, *assigneeIds',
  taskSyncMeta: 'key'
});

/**
 * Seeds the database with mock data on first run
 * @param {Array} mockMembers - Array of member objects
 */
export async function seedDatabase(mockMembers) {
  try {
    const count = await db.members.count();

    if (count === 0) {
      logger.info('Seeding database with mock data...');

      const membersToAdd = mockMembers.map(member => ({
        ...member,
        clickUpId: member.clickUpId || null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }));

      await db.members.bulkPut(membersToAdd);
      logger.info(`Seeded ${membersToAdd.length} members`);
    }
  } catch (error) {
    logger.error('Error seeding database:', error);
  }
}

/**
 * Clears all data from the database
 */
export async function clearDatabase() {
  try {
    await db.members.clear();
    await db.sessions.clear();
    await db.breaks.clear();
    await db.tasks.clear();
    await db.leaves.clear();
    await db.syncQueue.clear();
    await db.baselines.clear();
    await db.clickUpTasks.clear();
    await db.taskSyncMeta.clear();
    logger.info('Database cleared');
  } catch (error) {
    logger.error('Error clearing database:', error);
  }
}

/**
 * Gets all members from the database
 */
export async function getAllMembers() {
  try {
    return await db.members.toArray();
  } catch (error) {
    logger.error('Error getting members:', error);
    return [];
  }
}

/**
 * Updates a member in the database
 */
export async function updateMember(id, updates) {
  try {
    await db.members.update(id, {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (error) {
    logger.error('Error updating member:', error);
  }
}

/**
 * Bulk updates members (used for API sync)
 */
export async function bulkUpdateMembers(members) {
  try {
    const updatedMembers = members.map(member => ({
      ...member,
      updatedAt: Date.now()
    }));

    await db.members.bulkPut(updatedMembers);
  } catch (error) {
    logger.error('Error bulk updating members:', error);
  }
}

/**
 * Adds a failed API call to the sync queue
 */
export async function queueSync(action, entity, data) {
  try {
    await db.syncQueue.add({
      action,
      entity,
      data,
      timestamp: Date.now(),
      retryCount: 0
    });
    logger.debug('Queued sync:', { action, entity });
  } catch (error) {
    logger.error('Error queuing sync:', error);
  }
}

/**
 * Gets pending items from the sync queue
 */
export async function getPendingSyncs() {
  try {
    return await db.syncQueue
      .where('retryCount')
      .below(3)
      .toArray();
  } catch (error) {
    logger.error('Error getting pending syncs:', error);
    return [];
  }
}

/**
 * Removes a completed sync from the queue
 */
export async function removeSync(id) {
  try {
    await db.syncQueue.delete(id);
  } catch (error) {
    logger.error('Error removing sync:', error);
  }
}

/**
 * Auto-clears cache tables older than specified frequency
 */
export async function autoClearCache(frequency = 'weekly') {
  const now = Date.now();
  const intervals = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000
  };

  const interval = intervals[frequency] || intervals.weekly;

  try {
    const lastClear = localStorage.getItem('lastCacheClear');
    if (!lastClear || now - parseInt(lastClear) > interval) {
      await db.clickUpTasks.clear();
      await db.taskSyncMeta.clear();
      localStorage.setItem('lastCacheClear', now.toString());
      logger.info(`Cache cleared (${frequency} schedule)`);
    }
  } catch (error) {
    logger.error('Error auto-clearing cache:', error);
  }
}

/**
 * Prunes old data from sessions and breaks tables
 */
export async function pruneOldData(retentionDays = 30) {
  const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

  try {
    await db.sessions
      .where('timestamp')
      .below(cutoffDate)
      .delete();

    await db.breaks
      .where('timestamp')
      .below(cutoffDate)
      .delete();

    logger.info(`Pruned data older than ${retentionDays} days`);
  } catch (error) {
    logger.error('Error pruning old data:', error);
  }
}

// Database error handling
// Note: Dexie 3.x handles errors via promise rejections
// Global error handling is done through window.addEventListener('unhandledrejection')
// Individual operations should use try/catch blocks
