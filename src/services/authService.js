import { db } from '../db';
import { logger } from '../utils/logger';

// Islam Othman = Admin (can see audit logs)
const ADMIN_CLICKUP_ID = '87650455';

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

/**
 * Validate API key by calling ClickUp /user endpoint
 * @returns {{ valid: boolean, user: Object|null, error: string|null }}
 */
async function fetchCurrentUser(apiKey) {
  try {
    const res = await fetch(`${CLICKUP_API_BASE}/user`, {
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { valid: false, user: null, error: err.err || `API error: ${res.status}` };
    }
    const data = await res.json();
    return { valid: true, user: data.user, error: null };
  } catch (error) {
    return { valid: false, user: null, error: error.message || 'Network error' };
  }
}

/**
 * Check if user is a member of the team
 * @returns {{ isMember: boolean, clickUpRole: number|null, error: string|null }}
 */
async function checkTeamMembership(apiKey, teamId, userId) {
  try {
    const res = await fetch(`${CLICKUP_API_BASE}/team/${teamId}`, {
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { isMember: false, clickUpRole: null, error: err.err || `API error: ${res.status}` };
    }
    const data = await res.json();
    const members = data.team?.members || [];
    const member = members.find(m => String(m.user.id) === String(userId));
    if (!member) {
      return { isMember: false, clickUpRole: null, error: 'Not a member of this workspace' };
    }
    // ClickUp roles: 1=owner, 2=admin, 3=member, 4=viewer
    return { isMember: true, clickUpRole: member.user.role, error: null };
  } catch (error) {
    return { isMember: false, clickUpRole: null, error: error.message || 'Network error' };
  }
}

/**
 * Full authentication flow: validate key → check team membership → determine role
 * @returns {{ authenticated: boolean, role: string|null, user: Object|null, error: string|null }}
 */
export async function validateAndAuthenticate(apiKey, teamId) {
  // Step 1: Validate API key and get user info
  const { valid, user, error: userError } = await fetchCurrentUser(apiKey);
  if (!valid) {
    return { authenticated: false, role: null, user: null, error: userError || 'Invalid API key' };
  }

  // Step 2: Check team membership
  const { isMember, error: teamError } = await checkTeamMembership(apiKey, teamId, user.id);
  if (!isMember) {
    return { authenticated: false, role: null, user: null, error: teamError || 'Not a workspace member' };
  }

  // Step 3: Determine app role (admin = Islam Othman, user = everyone else)
  const role = String(user.id) === ADMIN_CLICKUP_ID ? 'admin' : 'user';

  return { authenticated: true, role, user, error: null };
}

/**
 * Save authenticated user to IndexedDB for persistent login
 */
export async function saveAuthUser(user, apiKey, teamId, role) {
  try {
    await db.authUser.put({
      user_id: String(user.id),
      user_name: user.username,
      email: user.email || '',
      apiKey,
      teamId,
      role,
      profilePicture: user.profilePicture || null,
      savedAt: Date.now(),
    });
    logger.info(`Auth saved for ${user.username} (${role})`);
  } catch (error) {
    logger.error('Failed to save auth user:', error);
  }
}

/**
 * Load persisted auth user from IndexedDB (returns first record or null)
 */
export async function loadAuthUser() {
  try {
    const users = await db.authUser.toArray();
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    logger.error('Failed to load auth user:', error);
    return null;
  }
}

/**
 * Clear persisted auth (on logout)
 */
export async function clearAuthUser() {
  try {
    await db.authUser.clear();
    logger.info('Auth user cleared');
  } catch (error) {
    logger.error('Failed to clear auth user:', error);
  }
}

/**
 * Create an audit log entry for a login session.
 * Auto-closes any stale open sessions for the same user.
 * @returns {number} The new audit log record ID
 */
export async function createAuditSession(user, role) {
  try {
    // Auto-close stale sessions for this user
    const openSessions = await db.auditLogs
      .where('user_id').equals(String(user.id))
      .filter(log => log.logout_time === null)
      .toArray();

    for (const session of openSessions) {
      await db.auditLogs.update(session.id, {
        logout_time: Date.now(),
        session_duration: Date.now() - session.login_time,
        close_reason: 'auto',
      });
    }

    // Insert new session
    const id = await db.auditLogs.add({
      user_id: String(user.id),
      user_name: user.username,
      user_email: user.email || '',
      login_time: Date.now(),
      logout_time: null,
      session_duration: null,
      role,
      api_key_prefix: 'pk_***',
    });

    logger.info(`Audit session created for ${user.username} (id: ${id})`);
    return id;
  } catch (error) {
    logger.error('Failed to create audit session:', error);
    return null;
  }
}

/**
 * Close an audit session on logout
 */
export async function closeAuditSession(auditLogId) {
  if (!auditLogId) return;
  try {
    const record = await db.auditLogs.get(auditLogId);
    if (record && record.logout_time === null) {
      await db.auditLogs.update(auditLogId, {
        logout_time: Date.now(),
        session_duration: Date.now() - record.login_time,
        close_reason: 'logout',
      });
      logger.info(`Audit session ${auditLogId} closed`);
    }
  } catch (error) {
    logger.error('Failed to close audit session:', error);
  }
}
