/**
 * Leave/WFH Helper Utilities
 * Provides functions to enrich member data with leave status from db.leaves
 */

import { db } from '../db';

/**
 * Check if a member is on leave or WFH today
 * @param {string|number} memberId - Member's clickUpId or local id
 * @param {Array} allLeaves - Pre-fetched leaves array (avoids repeated DB queries)
 * @returns {Object|null} Leave record if on leave today, null otherwise
 */
export function getMemberLeaveToday(memberId, allLeaves) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  return allLeaves.find(l => {
    // Match member
    const memberMatch =
      String(l.memberId) === String(memberId) ||
      String(l.memberClickUpId) === String(memberId);
    if (!memberMatch) return false;

    // Skip rejected
    if (l.status === 'rejected') return false;

    // Check date range
    const start = l.startDate; // Already YYYY-MM-DD
    const end = l.endDate || l.startDate;
    return todayStr >= start && todayStr <= end;
  }) || null;
}

/**
 * Map leave type to display-friendly label
 */
function getLeaveTypeLabel(type) {
  switch (type) {
    case 'wfh': return 'Work From Home';
    case 'sick': return 'Sick Leave';
    case 'bonus': return 'Bonus Leave';
    case 'holiday': return 'Holiday';
    default: return 'Annual Leave';
  }
}

/**
 * Calculate return date (next working day after leave ends)
 * @param {string} endDateStr - End date YYYY-MM-DD
 * @param {Array} workDays - Array of working day indices (0=Sun, 6=Sat), default [0,1,2,3,4]
 * @returns {string|null} Return date YYYY-MM-DD
 */
export function calculateReturnDate(endDateStr, workDays = [0, 1, 2, 3, 4]) {
  if (!endDateStr) return null;
  const end = new Date(endDateStr + 'T00:00:00');
  end.setDate(end.getDate() + 1);

  // Skip non-working days
  let safety = 0;
  while (!workDays.includes(end.getDay()) && safety < 10) {
    end.setDate(end.getDate() + 1);
    safety++;
  }

  // Use local date to avoid timezone shifts from toISOString()
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculate working days between two dates (inclusive)
 * @param {string} startStr - Start date YYYY-MM-DD
 * @param {string} endStr - End date YYYY-MM-DD
 * @param {Array} workDays - Working day indices
 * @returns {number} Number of working days
 */
export function calculateLeaveDays(startStr, endStr, workDays = [0, 1, 2, 3, 4]) {
  if (!startStr) return 0;
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date((endStr || startStr) + 'T00:00:00');
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    if (workDays.includes(current.getDay())) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Enrich members array with leave/WFH status from db.leaves
 * Called after sync to set member.status = 'leave' for members on leave today
 * @param {Array} members - Array of member objects from sync
 * @returns {Promise<Array>} Members with leave status applied
 */
export async function enrichMembersWithLeaveStatus(members) {
  try {
    const allLeaves = await db.leaves.toArray();
    if (!allLeaves || allLeaves.length === 0) return members;

    return members.map(member => {
      const memberId = member.clickUpId || member.id;
      const leaveToday = getMemberLeaveToday(memberId, allLeaves);

      if (leaveToday) {
        return {
          ...member,
          status: leaveToday.type === 'wfh' ? member.status : 'leave', // WFH members still show working status
          onLeave: leaveToday.type !== 'wfh',
          onWfh: leaveToday.type === 'wfh',
          leaveType: getLeaveTypeLabel(leaveToday.type),
          leaveStart: leaveToday.startDate,
          leaveEnd: leaveToday.endDate,
          returnDate: leaveToday.type !== 'wfh'
            ? calculateReturnDate(leaveToday.endDate)
            : null,
          leaveRecord: leaveToday,
        };
      }

      return member;
    });
  } catch (error) {
    console.error('[leaveHelpers] Error enriching members with leave status:', error);
    return members;
  }
}
