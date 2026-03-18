import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../stores/useAppStore';

// SVG icon components (outline style, matching reference design)
const FeedIcon = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const DashboardIcon = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2.5" />
    <circle cx="16" cy="8" r="2.5" />
    <circle cx="8" cy="16" r="2.5" />
    <circle cx="16" cy="16" r="2.5" />
  </svg>
);

const LeavesIcon = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// Mobile bottom navigation bar (fixed at bottom on mobile)
const MobileBottomNav = ({ theme, activeTab, onTabChange, onSettingsClick, alertCount = 0 }) => {
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const { auth, logout } = useAuth();
  const authUser = useAppStore(state => state.auth.user);

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

  const tabs = [
    { id: 'feed', label: 'Feed', Icon: FeedIcon },
    { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
    { id: 'leaves', label: 'Leaves', Icon: LeavesIcon },
  ];

  // isDark drives all theme-specific nav styling — keep inline (no single CSS var covers these)
  const isDark = theme.type === 'dark';

  // Colors: active always high-contrast; inactive uses real muted color
  const activeColor = isDark ? '#ffffff' : '#111827';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const activeTabBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const navBg = isDark
    ? 'rgba(20, 20, 20, 0.94)'
    : 'rgba(255, 255, 255, 0.96)';

  const navShadow = isDark
    ? '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)'
    : '0 8px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)';

  const avatarPlaceholderBg = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
  const avatarBorderActive = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)';
  const dropdownBg = isDark ? 'rgba(18,18,18,0.97)' : 'rgba(255,255,255,0.98)';
  const dropdownShadow = isDark ? '0 -8px 32px rgba(0,0,0,0.5)' : '0 -8px 32px rgba(0,0,0,0.15)';

  return (
    <div
      className="fixed z-[100]"
      style={{
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '420px',
      }}
    >
      <div
        className="flex items-center justify-around"
        style={{
          background: navBg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '22px',
          padding: '6px 4px',
          boxShadow: navShadow,
        }}
      >
        {/* Regular tabs */}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const color = isActive ? activeColor : inactiveColor;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center border-none cursor-pointer transition-all duration-[250ms]"
              style={{
                gap: '3px',
                padding: isActive ? '10px 16px' : '10px 12px',
                background: isActive ? activeTabBg : 'transparent',
                borderRadius: '16px',
                minWidth: '48px',
              }}
            >
              <tab.Icon color={color} size={22} />
              <span style={{
                fontSize: '10px',
                fontWeight: isActive ? '600' : '400',
                color,
                whiteSpace: 'nowrap',
                transition: 'all 0.25s ease',
                letterSpacing: '0.2px',
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Avatar tab with dropdown */}
        <div ref={avatarMenuRef} className="relative">
          <button
            onClick={() => setIsAvatarMenuOpen(prev => !prev)}
            className="flex flex-col items-center justify-center border-none cursor-pointer transition-all duration-[250ms]"
            style={{
              gap: '3px',
              padding: '10px 12px',
              background: isAvatarMenuOpen ? activeTabBg : 'transparent',
              borderRadius: '16px',
              minWidth: '48px',
            }}
          >
            {/* Avatar image — circle */}
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: avatarPlaceholderBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: isAvatarMenuOpen
                ? `1.5px solid ${avatarBorderActive}`
                : '1.5px solid transparent',
              transition: 'border-color 0.2s',
            }}>
              {authUser?.profilePicture ? (
                <img
                  src={authUser.profilePicture}
                  alt={authUser?.username || 'User'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '10px', fontWeight: '600', color: isAvatarMenuOpen ? activeColor : inactiveColor }}>
                  {(authUser?.username || 'U').substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: '400',
              color: isAvatarMenuOpen ? activeColor : inactiveColor,
              whiteSpace: 'nowrap',
              letterSpacing: '0.2px',
            }}>
              {authUser?.username?.split(' ')[0] || 'Me'}
            </span>
          </button>

          {/* Dropdown — opens upward */}
          {isAvatarMenuOpen && (
            <div
              className="absolute overflow-hidden"
              style={{
                bottom: 'calc(100% + 10px)',
                right: 0,
                minWidth: '200px',
                background: dropdownBg,
                border: '1px solid var(--color-border)',
                borderRadius: '14px',
                boxShadow: dropdownShadow,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                zIndex: 200,
              }}
            >
              {/* User info header */}
              <div style={{
                padding: '12px 14px 10px',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <div className="text-[13px] font-semibold text-th-text">
                  {authUser?.username || 'User'}
                </div>
                {authUser?.email && (
                  <div className="text-[11px] text-th-text-muted" style={{ marginTop: '2px' }}>
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
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  if (onSettingsClick) onSettingsClick();
                }}
                className="w-full flex items-center gap-2.5 text-th-text text-[14px] font-medium cursor-pointer text-left"
                style={{
                  padding: '15px 14px',
                  background: 'transparent',
                  border: 'none',
                }}
              >
                <span>⚙️</span>
                Settings
              </button>

              {/* Sign Out */}
              <button
                onClick={() => { setIsAvatarMenuOpen(false); logout(); }}
                className="w-full flex items-center gap-2.5 text-[14px] font-medium cursor-pointer text-left"
                style={{
                  padding: '15px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderTop: '1px solid var(--color-border)',
                  color: 'var(--color-danger)',
                }}
              >
                <span>↪</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileBottomNav;
