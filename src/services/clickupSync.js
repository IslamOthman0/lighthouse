/**
 * ClickUp Sync Service - DEPRECATED
 *
 * This file has been refactored into a modular structure for better maintainability.
 *
 * NEW STRUCTURE:
 * - sync/calculations.js  - Pure calculation helper functions
 * - sync/transform.js     - Member data transformation
 * - sync/projects.js      - Project breakdown calculations
 * - sync/orchestrator.js  - Main sync orchestration logic
 * - sync/index.js         - Public API barrel export
 *
 * MIGRATION GUIDE:
 * Replace imports from './clickupSync' with './sync' or specific modules:
 *
 * OLD:
 *   import { syncMemberData } from './services/clickupSync';
 *
 * NEW:
 *   import { syncMemberData } from './services/sync';
 *
 * For direct imports from specific modules:
 *   import { calculateTimer } from './services/sync/calculations';
 *   import { transformMember } from './services/sync/transform';
 *   import { calculateProjectBreakdown } from './services/sync/projects';
 *
 * This file will be removed in a future version once all imports are updated.
 */

// Re-export everything from the new modular structure for backward compatibility
export * from './sync/index.js';
export { default } from './sync/index.js';
