import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../db';

const LoginScreen = () => {
  const { login, isAuthenticating, authError } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [teamId, setTeamId] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Auto-fill from env vars in dev mode
  useEffect(() => {
    if (import.meta.env.DEV) {
      if (import.meta.env.VITE_CLICKUP_API_KEY) {
        setApiKey(import.meta.env.VITE_CLICKUP_API_KEY);
      }
      if (import.meta.env.VITE_CLICKUP_TEAM_ID) {
        setTeamId(import.meta.env.VITE_CLICKUP_TEAM_ID);
      }
    }
  }, []);

  // Try to pre-fill Team ID from any previously saved auth
  useEffect(() => {
    (async () => {
      try {
        const users = await db.authUser.toArray();
        if (users.length > 0 && users[0].teamId) {
          setTeamId(prev => prev || users[0].teamId);
        }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey.trim() || !teamId.trim()) return;
    await login(apiKey.trim(), teamId.trim());
  };

  return (
    <div style={{
      minHeight: '100vh',
      minHeight: '100dvh',
      background: '#0A0A0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: "'Inter', sans-serif",
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{
            fontSize: 'clamp(22px, 7vw, 34px)',
            fontWeight: 'normal',
            fontFamily: "'Dune Rise', sans-serif",
            letterSpacing: 'clamp(2px, 1.5vw, 4px)',
            color: '#ffffff',
          }}>
            LIGHTHOUSE
          </span>
          <div style={{
            marginTop: '8px',
            fontSize: '13px',
            color: '#606060',
            letterSpacing: '1px',
          }}>
            Team Monitoring Dashboard
          </div>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: 'clamp(20px, 5vw, 28px)',
          }}
        >
          {/* API Key Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '500',
              color: '#a0a0a0',
              marginBottom: '6px',
              letterSpacing: '0.5px',
            }}>
              API Key
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="pk_..."
                style={{
                  width: '100%',
                  padding: '12px 50px 12px 14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#606060',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '4px 6px',
                  flexShrink: 0,
                }}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Team ID Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '500',
              color: '#a0a0a0',
              marginBottom: '6px',
              letterSpacing: '0.5px',
            }}>
              Team ID
            </label>
            <input
              type="text"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="Your ClickUp Team ID"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.05)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
              }}
              autoComplete="off"
            />
            <div style={{
              marginTop: '4px',
              fontSize: '11px',
              color: '#606060',
              wordBreak: 'break-all',
            }}>
              Found in your ClickUp workspace URL: app.clickup.com/{'{team_id}'}/...
            </div>
          </div>

          {/* Error Message */}
          {authError && (
            <div style={{
              marginBottom: '16px',
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#EF4444',
              fontSize: '13px',
              wordBreak: 'break-word',
            }}>
              {authError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isAuthenticating || !apiKey.trim() || !teamId.trim()}
            style={{
              width: '100%',
              padding: '13px',
              background: isAuthenticating ? 'rgba(255,255,255,0.1)' : '#ffffff',
              color: isAuthenticating ? '#a0a0a0' : '#000000',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: isAuthenticating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Inter', sans-serif",
              opacity: (!apiKey.trim() || !teamId.trim()) ? 0.4 : 1,
              touchAction: 'manipulation',
            }}
          >
            {isAuthenticating ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '14px', height: '14px',
                  border: '2px solid rgba(0,0,0,0.2)',
                  borderTopColor: '#000',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Verifying...
              </span>
            ) : 'Connect'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '11px',
          color: '#404040',
        }}>
          Lighthouse v2.0.0
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        input::placeholder { color: #404040; }
      `}</style>
    </div>
  );
};

export default LoginScreen;
