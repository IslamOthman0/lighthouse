/**
 * Shared constants for Leaves & WFH components
 */

export const TYPE_ICONS = {
  annual: '\u{1F3D6}\u{FE0F}',
  sick: '\u{1F3E5}',
  wfh: '\u{1F3E0}',
  bonus: '\u{1F381}',
  holiday: '\u{1F389}',
};

export const TYPE_LABELS = {
  annual: 'Annual',
  sick: 'Sick',
  wfh: 'WFH',
  bonus: 'Bonus',
  holiday: 'Holiday',
};

export const TYPE_COLORS = {
  annual: '#3b82f6',
  sick: '#ef4444',
  wfh: '#06b6d4',
  bonus: '#8b5cf6',
  holiday: '#f59e0b',
};

export const STATUS_COLORS_MAP = {
  approved: '#10b981',
  scheduled: '#3b82f6',
  pending: '#f59e0b',
};

// Re-export toLocalDateStr from canonical source to avoid duplication
export { toLocalDateStr } from '../../../utils/timeFormat';

// Date helpers

export const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatDateRange = (start, end) => {
  const s = formatDateShort(start);
  const e = formatDateShort(end || start);
  return s === e ? s : `${s} - ${e}`;
};

export const getMember = (leave, members) => {
  return members.find(m =>
    String(m.id) === String(leave.memberId) ||
    String(m.clickUpId) === String(leave.memberId) ||
    String(m.id) === String(leave.memberClickUpId) ||
    String(m.clickUpId) === String(leave.memberClickUpId)
  );
};
