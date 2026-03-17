/**
 * Sync Queue Service
 * Handles queuing and processing of operations when offline
 * Uses IndexedDB syncQueue table to persist pending operations
 */

import { logger } from '../utils/logger';
import { db } from '../db';
import { clickup } from './clickup';

/**
 * Queue types
 */
export const QUEUE_TYPES = {
  TIME_ENTRY_START: 'time_entry_start',
  TIME_ENTRY_STOP: 'time_entry_stop',
  TASK_UPDATE: 'task_update',
  LEAVE_REQUEST: 'leave_request'
};

/**
 * Add operation to sync queue
 * @param {string} type - Operation type from QUEUE_TYPES
 * @param {Object} payload - Operation data
 * @param {number} userId - ClickUp user ID
 * @returns {Promise<number>} Queue item ID
 */
export async function queueOperation(type, payload, userId) {
  try {
    const queueItem = {
      type,
      payload,
      userId,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending', // pending, processing, failed, completed
      error: null
    };

    const id = await db.syncQueue.add(queueItem);
    logger.info(`Queued operation: ${type} (ID: ${id})`);
    return id;
  } catch (error) {
    logger.error('Failed to queue operation:', error);
    throw error;
  }
}

/**
 * Get all pending queue items
 * @returns {Promise<Array>} Pending queue items
 */
export async function getPendingQueue() {
  try {
    const items = await db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();

    return items;
  } catch (error) {
    logger.error('Failed to get pending queue:', error);
    return [];
  }
}

/**
 * Process a single queue item
 * @param {Object} item - Queue item from database
 * @returns {Promise<boolean>} Success status
 */
async function processQueueItem(item) {
  try {
    logger.info(`Processing queue item: ${item.type} (ID: ${item.id})`);

    // Update status to processing
    await db.syncQueue.update(item.id, {
      status: 'processing',
      retries: item.retries + 1
    });

    let success = false;

    switch (item.type) {
      case QUEUE_TYPES.TIME_ENTRY_START:
        // Start time entry via ClickUp API
        await clickup.startTimer(item.payload.taskId);
        success = true;
        break;

      case QUEUE_TYPES.TIME_ENTRY_STOP:
        // Stop time entry via ClickUp API
        await clickup.stopTimer();
        success = true;
        break;

      case QUEUE_TYPES.TASK_UPDATE:
        // Update task via ClickUp API
        await clickup.updateTask(item.payload.taskId, item.payload.updates);
        success = true;
        break;

      case QUEUE_TYPES.LEAVE_REQUEST:
        // Create leave request task (if leave tracking is implemented)
        // await clickup.createTask(item.payload);
        logger.warn('Leave request queuing not yet implemented');
        success = true; // Mark as success to remove from queue
        break;

      default:
        logger.warn(`Unknown queue item type: ${item.type}`);
        success = false;
    }

    if (success) {
      // Mark as completed
      await db.syncQueue.update(item.id, {
        status: 'completed',
        error: null
      });
      logger.info(`Queue item processed: ${item.type} (ID: ${item.id})`);
      return true;
    } else {
      // Mark as failed
      await db.syncQueue.update(item.id, {
        status: 'failed',
        error: 'Unknown error'
      });
      return false;
    }
  } catch (error) {
    logger.error(`Failed to process queue item ${item.id}:`, error);

    // Update with error
    await db.syncQueue.update(item.id, {
      status: 'failed',
      error: error.message
    });

    return false;
  }
}

/**
 * Process all pending queue items
 * Called when connection is restored
 * @returns {Promise<Object>} Processing results { processed, succeeded, failed }
 */
export async function processPendingQueue() {
  try {
    const pendingItems = await getPendingQueue();

    if (pendingItems.length === 0) {
      logger.debug('No pending queue items to process');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    logger.info(`Processing ${pendingItems.length} pending queue items...`);

    let succeeded = 0;
    let failed = 0;

    // Process items sequentially (not in parallel to avoid race conditions)
    for (const item of pendingItems) {
      // Skip items that have been retried too many times
      if (item.retries >= 3) {
        logger.warn(`Queue item ${item.id} has exceeded max retries (3)`);
        await db.syncQueue.update(item.id, {
          status: 'failed',
          error: 'Max retries exceeded'
        });
        failed++;
        continue;
      }

      const success = await processQueueItem(item);
      if (success) {
        succeeded++;
      } else {
        failed++;
      }

      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.info(`Queue processing complete: ${succeeded} succeeded, ${failed} failed`);

    return {
      processed: pendingItems.length,
      succeeded,
      failed
    };
  } catch (error) {
    logger.error('Failed to process pending queue:', error);
    return { processed: 0, succeeded: 0, failed: 0 };
  }
}

/**
 * Clear completed queue items older than specified days
 * @param {number} daysOld - Age threshold in days (default: 7)
 * @returns {Promise<number>} Number of items deleted
 */
export async function clearOldQueueItems(daysOld = 7) {
  try {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    const oldItems = await db.syncQueue
      .where('timestamp')
      .below(cutoffTime)
      .and(item => item.status === 'completed')
      .toArray();

    if (oldItems.length === 0) {
      return 0;
    }

    const idsToDelete = oldItems.map(item => item.id);
    await db.syncQueue.bulkDelete(idsToDelete);

    logger.info(`Cleared ${idsToDelete.length} old queue items`);
    return idsToDelete.length;
  } catch (error) {
    logger.error('Failed to clear old queue items:', error);
    return 0;
  }
}

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue stats { pending, processing, failed, completed, total }
 */
export async function getQueueStats() {
  try {
    const all = await db.syncQueue.toArray();

    const stats = {
      pending: all.filter(item => item.status === 'pending').length,
      processing: all.filter(item => item.status === 'processing').length,
      failed: all.filter(item => item.status === 'failed').length,
      completed: all.filter(item => item.status === 'completed').length,
      total: all.length
    };

    return stats;
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    return { pending: 0, processing: 0, failed: 0, completed: 0, total: 0 };
  }
}

export default {
  queueOperation,
  getPendingQueue,
  processPendingQueue,
  clearOldQueueItems,
  getQueueStats,
  QUEUE_TYPES
};
