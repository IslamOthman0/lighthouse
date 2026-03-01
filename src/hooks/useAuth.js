import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { clickup } from '../services/clickup';
import {
  validateAndAuthenticate,
  saveAuthUser,
  loadAuthUser,
  clearAuthUser,
  createAuditSession,
  closeAuditSession,
} from '../services/authService';

/**
 * Hook for authentication — login, logout, and auto-restore from IndexedDB
 */
export function useAuth() {
  const auth = useAppStore(state => state.auth);
  const setAuth = useAppStore(state => state.setAuth);
  const clearAuth = useAppStore(state => state.clearAuth);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true); // True until we check IndexedDB

  // On mount: try to restore auth from IndexedDB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadAuthUser();
        if (saved && !cancelled) {
          // Re-initialize clickup service
          clickup.initialize(saved.apiKey, saved.teamId);
          // Restore Zustand auth state
          setAuth({
            isAuthenticated: true,
            role: saved.role,
            user: {
              id: saved.user_id,
              username: saved.user_name,
              email: saved.email,
              profilePicture: saved.profilePicture,
            },
            apiKey: saved.apiKey,
            teamId: saved.teamId,
            auditLogId: null, // Will be set on next explicit login
            loginTime: saved.savedAt,
          });
        }
      } catch (err) {
        // Silently fail — user will see login screen
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (apiKey, teamId) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await validateAndAuthenticate(apiKey, teamId);
      if (!result.authenticated) {
        setAuthError(result.error);
        return false;
      }

      // Create audit session
      const auditLogId = await createAuditSession(result.user, result.role);

      // Initialize ClickUp API client
      clickup.initialize(apiKey, teamId);

      // Save to IndexedDB for persistence
      await saveAuthUser(result.user, apiKey, teamId, result.role);

      // Update Zustand
      setAuth({
        isAuthenticated: true,
        role: result.role,
        user: result.user,
        apiKey,
        teamId,
        auditLogId,
        loginTime: Date.now(),
      });

      return true;
    } catch (error) {
      setAuthError(error.message || 'Authentication failed');
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [setAuth]);

  const logout = useCallback(async () => {
    if (auth.auditLogId) {
      await closeAuditSession(auth.auditLogId);
    }
    await clearAuthUser();
    clearAuth();
  }, [auth.auditLogId, clearAuth]);

  return { auth, login, logout, isAuthenticating, authError, isRestoring };
}
