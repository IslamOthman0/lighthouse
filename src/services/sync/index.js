/**
 * ClickUp Sync - Public API
 * Barrel export for the modular sync system
 */

// Main sync orchestration
export {
  syncMemberData,
  isSyncInProgress,
  initializeSync,
  mapClickUpUsers,
  syncLeaveAndWfh
} from './orchestrator.js';

// Project breakdown calculations
export {
  calculateProjectBreakdown,
  calculateFastProjectBreakdown
} from './projects.js';

// Calculation utilities (exported for testing and reuse)
export {
  deriveStatus,
  calculateTimer,
  calculateTrackedHours,
  calculateBreaks,
  calculateTasksAndDone,
  calculateLastSeen,
  calculateStartTime,
  calculateEndTime,
  calculatePreviousTimer,
  calculateWorkingDays,
  extractCustomFields,
  extractPriority,
  extractStatus,
  extractStatusColor
} from './calculations.js';

// Member transformation
export { transformMember } from './transform.js';

// Import for default export
import {
  syncMemberData as _syncMemberData,
  initializeSync as _initializeSync,
  mapClickUpUsers as _mapClickUpUsers,
  syncLeaveAndWfh as _syncLeaveAndWfh
} from './orchestrator.js';

// Default export for backward compatibility
export default {
  syncMemberData: _syncMemberData,
  initializeSync: _initializeSync,
  mapClickUpUsers: _mapClickUpUsers,
  syncLeaveAndWfh: _syncLeaveAndWfh
};
