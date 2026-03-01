import React, { useState, useRef, useEffect } from 'react';
import Logo from './Logo';
import { useAppStore } from '../../stores/useAppStore';
import { useWindowSize } from '../../hooks/useWindowSize';
import { useAuth } from '../../hooks/useAuth';
import DatePickerModal from '../modals/DatePickerModal';

const Header = ({ theme, themes, currentTheme, setTheme, onSettingsClick }) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const { isMobile } = useWindowSize();
  const { auth, logout } = useAuth();
  const authUser = auth.user;

  // Close dropdown on outside click
  useEffect(() => {
    if (!isAvatarMenuOpen) return;
    const handleOutside = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
        setIsAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isAvatarMenuOpen]);

  const syncStatus = useAppStore(state => ({
    lastSync: state.lastSync,
    error: state.syncError,
    isSyncing: state.isSyncing,
    requestCount: state.requestCount
  }));

  const dateRange = useAppStore(state => state.dateRange);

  const getDateRangeDisplay = () => {
    if (!dateRange.startDate && dateRange.preset === 'today') {
      return { text: 'Today', isToday: true };
    }
    if (!dateRange.startDate) {
      return { text: 'Select Date', isToday: false };
    }

    // Convert ISO strings to Date objects.
    // Parse YYYY-MM-DD as local midnight (not UTC midnight) to avoid timezone off-by-one.
    const toDate = (dateStr) => {
      if (!dateStr) return null;
      if (dateStr instanceof Date) return dateStr;
      // "2026-02-26" → parse as local time to avoid UTC midnight = previous day in UTC+2
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr + 'T00:00:00');
      return new Date(dateStr);
    };
    const formatDate = (d) => toDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isSameDay = (d1, d2) => {
      if (!d1 || !d2) return false;
      const date1 = toDate(d1);
      const date2 = toDate(d2);
      return date1.getDate() === date2.getDate() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getFullYear() === date2.getFullYear();
    };

    if (isSameDay(dateRange.startDate, dateRange.endDate)) {
      return { text: formatDate(dateRange.startDate), isToday: false };
    }
    return {
      text: `${formatDate(dateRange.startDate)} — ${formatDate(dateRange.endDate)}`,
      isToday: false
    };
  };

  const dateDisplay = getDateRangeDisplay();

  const toggleTheme = () => {
    setTheme(currentTheme === 'trueBlack' ? 'noirGlass' : 'trueBlack');
  };

  const isConnected = !syncStatus.error && syncStatus.lastSync;
  const isOffline = syncStatus.error && (
    syncStatus.error.includes('Network') ||
    syncStatus.error.includes('Failed to fetch') ||
    syncStatus.error.includes('offline')
  );

  const statusColor = isOffline
    ? theme.offline
    : (syncStatus.isSyncing ? theme.warning : (isConnected ? theme.working : theme.offline));

  const statusLabel = isOffline
    ? 'Offline Mode'
    : (syncStatus.isSyncing ? 'Syncing...' : (isConnected ? 'Connected' : 'Disconnected'));

  // Shared pill style for header controls
  const pillStyle = {
    background: theme.cardBg,
    backdropFilter: theme.backdropBlur,
    WebkitBackdropFilter: theme.backdropBlur,
    boxShadow: theme.cardShadow || 'none',
  };

  return (
    <div>
      {/* Main Header */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: isMobile ? '10px' : '20px', gap: '8px' }}
      >
        {/* Left: Logo + status dot (mobile) */}
        <div className="flex items-center" style={{ gap: '8px' }}>
          <Logo theme={theme} compact={isMobile} />
          {isMobile && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 6px ${statusColor}`,
                animation: syncStatus.isSyncing ? 'statusPulse 2s ease-in-out infinite' : 'none',
                flexShrink: 0,
              }}
            />
          )}
        </div>

        {/* Right: Controls */}
        <div
          className="flex items-center"
          style={{ gap: isMobile ? '6px' : '10px', fontSize: isMobile ? '12px' : '13px' }}
        >
          {/* API Status Indicator — desktop pill */}
          {!isMobile && (
            <div
              className="flex items-center gap-1.5 rounded-full"
              style={{ ...pillStyle, padding: '6px 12px' }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: statusColor,
                  boxShadow: `0 0 6px ${statusColor}`,
                  animation: syncStatus.isSyncing ? 'statusPulse 2s ease-in-out infinite' : 'none',
                }}
              />
              <span style={{ fontWeight: '500', color: theme.text }}>
                {statusLabel}
              </span>
              {isConnected && (
                <span style={{ color: theme.textMuted, fontSize: '12px' }}>
                  • {syncStatus.requestCount}/100
                </span>
              )}
            </div>
          )}

          {/* Date Range Picker Button */}
          <button
            onClick={() => setIsDatePickerOpen(true)}
            className="flex items-center gap-1.5 rounded-full cursor-pointer transition-all duration-200"
            style={{
              padding: isMobile ? '6px 8px' : '6px 12px',
              background: !dateDisplay.isToday ? '#ffffff' : theme.cardBg,
              backdropFilter: theme.backdropBlur,
              WebkitBackdropFilter: theme.backdropBlur,
              border: 'none',
              boxShadow: !dateDisplay.isToday
                ? '0 0 12px rgba(255,255,255,0.15)'
                : (theme.cardShadow || 'none'),
              color: !dateDisplay.isToday ? '#000000' : theme.text,
              fontSize: isMobile ? '14px' : '13px',
              fontWeight: !dateDisplay.isToday ? '600' : '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title={dateDisplay.isToday ? 'Select date range' : `Viewing: ${dateDisplay.text}`}
          >
            {syncStatus.isSyncing && !dateDisplay.isToday ? (
              <span style={{
                display: 'inline-block',
                width: '12px', height: '12px',
                border: `2px solid ${!dateDisplay.isToday ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
                borderTopColor: !dateDisplay.isToday ? '#000' : theme.text,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <span>📅</span>
            )}
            {!isMobile && <span>{syncStatus.isSyncing && !dateDisplay.isToday ? 'Loading...' : dateDisplay.text}</span>}
          </button>

          {/* Theme Toggle Switch — desktop */}
          {!isMobile ? (
            <div
              onClick={toggleTheme}
              className="cursor-pointer transition-all duration-300"
              style={{
                width: '52px',
                height: '26px',
                borderRadius: '13px',
                background: currentTheme === 'trueBlack' ? 'rgba(255,255,255,0.12)' : theme.working,
                padding: '3px',
                position: 'relative',
              }}
              title={`Switch to ${currentTheme === 'trueBlack' ? 'Noir Glass' : 'True Black'}`}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  top: '3px',
                  left: currentTheme === 'trueBlack' ? '3px' : 'calc(100% - 23px)',
                  transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                {currentTheme === 'trueBlack' ? '🌙' : '☀️'}
              </div>
            </div>
          ) : (
            /* Theme toggle — mobile icon */
            <button
              onClick={toggleTheme}
              className="rounded-full cursor-pointer transition-all duration-200"
              style={{
                ...pillStyle,
                padding: '6px 8px',
                border: 'none',
                color: theme.text,
                fontSize: '14px',
              }}
              title={`Switch to ${currentTheme === 'trueBlack' ? 'Noir Glass' : 'True Black'}`}
            >
              {currentTheme === 'trueBlack' ? '☀️' : '🌙'}
            </button>
          )}

          {/* Avatar + Dropdown Menu (Settings & Sign Out) — desktop & mobile */}
          {authUser && (
            <div ref={avatarMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
              {/* Avatar button */}
              <button
                onClick={() => setIsAvatarMenuOpen(prev => !prev)}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  border: isAvatarMenuOpen
                    ? `1px solid ${theme.border}`
                    : '1px solid transparent',
                  padding: 0,
                  overflow: 'hidden',
                  background: theme.innerBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                title={authUser.username || 'User'}
              >
                {authUser.profilePicture ? (
                  <img
                    src={authUser.profilePicture}
                    alt={authUser.username || 'User'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '11px', fontWeight: '600', color: theme.text, letterSpacing: '0.5px' }}>
                    {(authUser.username || 'U').substring(0, 2).toUpperCase()}
                  </span>
                )}
              </button>

              {/* Dropdown menu */}
              {isAvatarMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: '180px',
                  background: currentTheme === 'trueBlack'
                    ? 'rgba(18,18,18,0.97)'
                    : 'rgba(255,255,255,0.97)',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  overflow: 'hidden',
                  zIndex: 500,
                }}>
                  {/* User info */}
                  <div style={{
                    padding: '12px 14px 10px',
                    borderBottom: `1px solid ${theme.border}`,
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: theme.text }}>
                      {authUser.username || 'User'}
                    </div>
                    {authUser.email && (
                      <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>
                        {authUser.email}
                      </div>
                    )}
                    {auth.role === 'admin' && (
                      <div style={{
                        display: 'inline-block',
                        marginTop: '5px',
                        padding: '1px 7px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        background: 'rgba(139,92,246,0.15)',
                        color: '#A78BFA',
                        letterSpacing: '0.3px',
                      }}>
                        ADMIN
                      </div>
                    )}
                  </div>

                  {/* Settings */}
                  <button
                    onClick={() => { setIsAvatarMenuOpen(false); onSettingsClick(); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      color: theme.text,
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = theme.innerBg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: '15px' }}>⚙️</span>
                    Settings
                  </button>

                  {/* Sign Out */}
                  <button
                    onClick={() => { setIsAvatarMenuOpen(false); logout(); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      color: theme.danger || '#EF4444',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                      borderTop: `1px solid ${theme.border}`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: '15px' }}>↪</span>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        theme={theme}
      />

      <style>
        {`
          @keyframes statusPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
        `}
      </style>
    </div>
  );
};

export default Header;
