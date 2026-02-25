/**
 * Settings Modal Component
 *
 * Comprehensive settings management with 7 tabs:
 * - ClickUp Integration
 * - Team Configuration
 * - Score Configuration
 * - Thresholds
 * - Sync & Cache
 * - Calendar & Schedule
 * - Display Preferences
 */

import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../hooks/useTheme';
import { useWindowSize } from '../../hooks/useWindowSize';
import { useAppStore } from '../../stores/useAppStore';
import {
  validateClickUpApiKey,
  balanceScoreWeights,
} from '../../utils/settingsValidation';
import {
  SYNC_INTERVAL_OPTIONS,
  CACHE_CLEAR_OPTIONS,
  WORK_DAYS,
  DEFAULT_MEMBER_QUOTAS,
} from '../../constants/defaults';
import { db } from '../../db';
import { fetchTeamMembers, fetchClickUpLists } from '../../utils/clickupHelpers';
import { hexToRgba } from '../../utils/colorHelpers';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';
import { getAdaptiveFontFamily } from '../../utils/typography';

// Egyptian Public Holidays 2026
const EGYPTIAN_HOLIDAYS_2026 = [
  { date: '2026-01-07', name: 'Coptic Christmas' },
  { date: '2026-01-25', name: 'Revolution Day (Jan 25)' },
  { date: '2026-03-20', name: 'Eid al-Fitr (expected)' },
  { date: '2026-03-21', name: 'Eid al-Fitr Day 2' },
  { date: '2026-03-22', name: 'Eid al-Fitr Day 3' },
  { date: '2026-04-20', name: 'Sham El-Nessim' },
  { date: '2026-04-25', name: 'Sinai Liberation Day' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-27', name: 'Eid al-Adha (expected)' },
  { date: '2026-05-28', name: 'Eid al-Adha Day 2' },
  { date: '2026-05-29', name: 'Eid al-Adha Day 3' },
  { date: '2026-06-17', name: 'Islamic New Year (expected)' },
  { date: '2026-06-30', name: 'June 30 Revolution Day' },
  { date: '2026-07-23', name: 'Revolution Day (Jul 23)' },
  { date: '2026-08-26', name: "Prophet's Birthday (expected)" },
  { date: '2026-10-06', name: 'Armed Forces Day' },
];

// Section header component
const SectionHeader = ({ title, description, theme }) => (
  <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: `1px solid ${theme.border}` }}>
    <div style={{ fontSize: '13px', fontWeight: '600', color: theme.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
    {description && <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>{description}</div>}
  </div>
);

// Reusable UI components
const FieldLabel = ({ children, theme }) => (
  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: theme.text }}>
    {children}
  </label>
);

const FieldHint = ({ children, theme }) => (
  <p style={{ margin: '6px 0 0', fontSize: '12px', color: theme.textSecondary }}>{children}</p>
);

const inputStyle = (theme, width = '100%') => ({
  width,
  padding: '10px 12px',
  background: theme.innerBg,
  border: `1px solid ${theme.border}`,
  borderRadius: '8px',
  color: theme.text,
  fontSize: '14px',
});

const selectStyle = (theme) => inputStyle(theme, '100%');

// Toggle switch with green active state + visible knob
const ToggleSwitch = ({ value, onChange, theme }) => (
  <button
    onClick={onChange}
    style={{
      width: '48px',
      height: '28px',
      background: value ? '#10B981' : theme.border,
      border: 'none',
      borderRadius: '14px',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.2s',
      flexShrink: 0,
    }}
  >
    <div
      style={{
        width: '20px',
        height: '20px',
        background: '#ffffff',
        borderRadius: '50%',
        position: 'absolute',
        top: '4px',
        left: value ? '24px' : '4px',
        transition: 'left 0.2s',
      }}
    />
  </button>
);

// Primary button
const PrimaryButton = ({ children, onClick, disabled, small }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: small ? '8px 16px' : '10px 20px',
      background: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      color: '#000000',
      fontSize: small ? '13px' : '14px',
      fontWeight: '500',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
    }}
  >
    {children}
  </button>
);

const SettingsModal = ({ isOpen, onClose, theme }) => {
  const { setTheme: setAppTheme } = useTheme();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { isMobile } = useWindowSize();
  const storeMembers = useAppStore(state => state.members);
  const [activeTab, setActiveTab] = useState('clickup');
  const [apiValidation, setApiValidation] = useState({ status: 'idle', message: '', user: null });
  const [isValidating, setIsValidating] = useState(false);

  // Toast
  const [saveToast, setSaveToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setSaveToast({ message, type });
    setTimeout(() => setSaveToast(null), 2200);
  };

  // Team members state
  const [clickUpMembers, setClickUpMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState(null);

  // ClickUp projects/lists state
  const [clickUpLists, setClickUpLists] = useState([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [listsError, setListsError] = useState(null);

  // Handle ESC key and body scroll lock
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      lockScroll();
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      if (isOpen) unlockScroll();
    };
  }, [isOpen, onClose]);

  // Auto-load members when modal opens: use synced members from store/db,
  // then try ClickUp API for fresh data
  useEffect(() => {
    if (!isOpen) return;

    const loadMembers = async () => {
      // 1. First populate from already-synced store members (instant, no API call)
      if (storeMembers && storeMembers.length > 0 && clickUpMembers.length === 0) {
        const fromStore = storeMembers.map(m => ({
          id: m.clickUpId ? String(m.clickUpId) : String(m.id),
          username: m.name,
          profilePicture: m.profilePicture || null,
          color: m.clickUpColor || null,
          initials: m.name ? m.name.substring(0, 2).toUpperCase() : '??',
        }));
        setClickUpMembers(fromStore);
      }

      // 2. Also try db.members for any persisted data not in store
      if (clickUpMembers.length === 0) {
        try {
          const dbMembers = await db.members.toArray();
          if (dbMembers && dbMembers.length > 0) {
            const fromDb = dbMembers.map(m => ({
              id: m.clickUpId ? String(m.clickUpId) : String(m.id),
              username: m.name,
              profilePicture: m.profilePicture || null,
              color: m.clickUpColor || null,
              initials: m.name ? m.name.substring(0, 2).toUpperCase() : '??',
            }));
            setClickUpMembers(fromDb);
          }
        } catch (err) {
          console.log('[SettingsModal] Could not load members from db:', err);
        }
      }

      // 3. Try API fetch for latest data (non-blocking, enriches the list)
      if (settings.clickup.apiKey && settings.clickup.teamId) {
        try {
          const apiMembers = await fetchTeamMembers(settings.clickup.apiKey, settings.clickup.teamId);
          if (apiMembers && apiMembers.length > 0) {
            // Normalize IDs to strings for consistency
            const normalized = apiMembers.map(m => ({
              ...m,
              id: String(m.id),
            }));
            setClickUpMembers(normalized);
          }
        } catch (err) {
          // Silently fail — we already have store/db members as fallback
          console.log('[SettingsModal] API fetch failed, using cached members:', err.message);
        }
      }
    };

    loadMembers();
  }, [isOpen, settings.clickup.apiKey, settings.clickup.teamId]);

  if (!isOpen) return null;

  // === Handlers ===

  const handleValidateApiKey = async () => {
    if (!settings.clickup.apiKey) {
      setApiValidation({ status: 'error', message: 'API key is required' });
      return;
    }
    setIsValidating(true);
    setApiValidation({ status: 'validating', message: 'Validating...' });
    try {
      const result = await validateClickUpApiKey(settings.clickup.apiKey);
      if (result.valid) {
        setApiValidation({ status: 'success', message: `Connected as ${result.user.username}`, user: result.user });
      } else {
        setApiValidation({ status: 'error', message: result.error || 'Validation failed' });
      }
    } catch {
      setApiValidation({ status: 'error', message: 'Validation timed out' });
    }
    setIsValidating(false);
  };

  const handleWeightChange = (key, value) => {
    const numValue = parseFloat(value) / 100;
    if (isNaN(numValue) || numValue < 0 || numValue > 1) return;
    const newWeights = balanceScoreWeights(settings.score.weights, key, numValue);
    updateSettings({ score: { ...settings.score, weights: newWeights } });
  };

  const handleClearCache = async () => {
    try {
      await db.members.clear();
      if (db.timeEntries) await db.timeEntries.clear();
      showToast('Cache cleared successfully');
    } catch (error) {
      showToast(`Failed to clear cache: ${error.message}`, 'error');
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
      setApiValidation({ status: 'idle', message: '', user: null });
      showToast('Settings reset to defaults');
    }
  };

  const handleFetchLists = async () => {
    if (!settings.clickup.apiKey || !settings.clickup.teamId) { setListsError('API key and Team ID required'); return; }
    setIsLoadingLists(true);
    setListsError(null);
    try {
      const lists = await fetchClickUpLists(settings.clickup.apiKey, settings.clickup.teamId);
      setClickUpLists(lists);
    } catch (error) { setListsError(error.message); }
    finally { setIsLoadingLists(false); }
  };

  const handleToggleProject = (listId, checked) => {
    const cur = settings.clickup?.projectsToTrack || [];
    updateSettings({ clickup: { ...settings.clickup, projectsToTrack: checked ? [...cur, listId] : cur.filter(id => id !== listId) } });
  };

  const handleFetchMembers = async () => {
    if (!settings.clickup.apiKey || !settings.clickup.teamId) { setMembersError('API key and Team ID required'); return; }
    setIsLoadingMembers(true);
    setMembersError(null);
    try {
      const members = await fetchTeamMembers(settings.clickup.apiKey, settings.clickup.teamId);
      setClickUpMembers(members);
    } catch (error) { setMembersError(error.message); }
    finally { setIsLoadingMembers(false); }
  };

  const handleToggleMember = (memberId, checked) => {
    const strId = String(memberId);
    const cur = (settings.team?.membersToMonitor || []).map(String);
    updateSettings({ team: { ...settings.team, membersToMonitor: checked ? [...cur, strId] : cur.filter(id => id !== strId) } });
  };

  const handleSelectAllMembers = () => updateSettings({ team: { ...settings.team, membersToMonitor: clickUpMembers.map(m => String(m.id)) } });
  const handleDeselectAllMembers = () => updateSettings({ team: { ...settings.team, membersToMonitor: [] } });

  const handleUpdateLeaveQuota = (memberId, days) => {
    updateSettings({ team: { ...settings.team, leaveQuotas: { ...(settings.team?.leaveQuotas || {}), [memberId]: days } } });
  };

  const handleUpdateWfhQuota = (memberId, days) => {
    updateSettings({ team: { ...settings.team, wfhQuotas: { ...(settings.team?.wfhQuotas || {}), [memberId]: days } } });
  };

  const handleAddHoliday = () => {
    const cur = settings.schedule?.publicHolidays || [];
    updateSettings({ schedule: { ...settings.schedule, publicHolidays: [...cur, { date: '', name: '' }] } });
  };

  const handleUpdateHoliday = (index, field, value) => {
    const cur = [...(settings.schedule?.publicHolidays || [])];
    cur[index] = { ...cur[index], [field]: value };
    updateSettings({ schedule: { ...settings.schedule, publicHolidays: cur } });
  };

  const handleRemoveHoliday = (index) => {
    const cur = [...(settings.schedule?.publicHolidays || [])];
    cur.splice(index, 1);
    updateSettings({ schedule: { ...settings.schedule, publicHolidays: cur } });
  };

  const handleLoadEgyptianHolidays = () => {
    const cur = settings.schedule?.publicHolidays || [];
    const existingDates = new Set(cur.map(h => h.date));
    const newOnes = EGYPTIAN_HOLIDAYS_2026.filter(h => !existingDates.has(h.date));
    updateSettings({ schedule: { ...settings.schedule, publicHolidays: [...cur, ...newOnes].sort((a, b) => a.date.localeCompare(b.date)) } });
    showToast(`Added ${newOnes.length} Egyptian holidays`);
  };

  // Tab config
  const tabs = [
    { id: 'clickup', label: 'ClickUp', icon: '🔗' },
    { id: 'team', label: 'Team', icon: '👥' },
    { id: 'score', label: 'Score', icon: '📊' },
    { id: 'thresholds', label: 'Thresholds', icon: '⏱️' },
    { id: 'sync', label: 'Sync', icon: '🔄' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'display', label: 'Display', icon: '🎨' },
  ];

  const selectedCount = (settings.team?.membersToMonitor || []).length;
  const totalCount = clickUpMembers.length;

  // Score weight config with colors and descriptions
  const weightConfig = [
    { key: 'trackedTime', label: 'Tracked Time', desc: 'Hours tracked vs daily target', color: '#3b82f6' },
    { key: 'tasksWorked', label: 'Tasks Worked', desc: 'Number of tasks worked on', color: '#8b5cf6' },
    { key: 'tasksDone', label: 'Tasks Done', desc: 'Completion rate of assigned tasks', color: '#10b981' },
    { key: 'compliance', label: 'Compliance', desc: 'Hours within work window', color: '#f59e0b' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        padding: isMobile ? '0' : '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.cardBg,
          border: isMobile ? 'none' : `1px solid ${theme.border}`,
          borderRadius: isMobile ? '0' : '16px',
          maxWidth: isMobile ? '100%' : '800px',
          width: '100%',
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : '90vh',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: isMobile ? '16px' : '24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? '20px' : '24px', fontWeight: '600', color: theme.text }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: theme.textSecondary, fontSize: '24px', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
        </div>

        {/* Toast */}
        {saveToast && (
          <div style={{
            position: 'absolute', top: '72px', left: '50%', transform: 'translateX(-50%)', zIndex: 1001,
            padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', pointerEvents: 'none',
            background: saveToast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: saveToast.type === 'success' ? '#10B981' : '#EF4444',
            border: `1px solid ${saveToast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>{saveToast.message}</div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px', padding: `12px ${isMobile ? '12px' : '24px'} 0`,
          borderBottom: `1px solid ${theme.border}`,
          overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? theme.innerBg : 'transparent',
                borderTop: activeTab === tab.id ? `1px solid ${theme.border}` : '1px solid transparent',
                borderLeft: activeTab === tab.id ? `1px solid ${theme.border}` : '1px solid transparent',
                borderRight: activeTab === tab.id ? `1px solid ${theme.border}` : '1px solid transparent',
                borderBottom: 'none',
                borderRadius: '8px 8px 0 0',
                padding: isMobile ? '10px 12px' : '12px 20px',
                color: activeTab === tab.id ? theme.text : theme.textSecondary,
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: activeTab === tab.id ? '600' : '400',
                cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
              }}
            >
              <span>{tab.icon}</span>
              {!isMobile && <span>{tab.label}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px', paddingBottom: '60px' }}>

          {/* ========== CLICKUP TAB ========== */}
          {activeTab === 'clickup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <FieldLabel theme={theme}>ClickUp API Key</FieldLabel>
                <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
                  <input type="password" value={settings.clickup.apiKey}
                    onChange={(e) => updateSettings({ clickup: { ...settings.clickup, apiKey: e.target.value } })}
                    placeholder="pk_..." style={{ ...inputStyle(theme), flex: 1 }} />
                  <PrimaryButton onClick={handleValidateApiKey} disabled={isValidating}>
                    {isValidating ? 'Validating...' : 'Validate'}
                  </PrimaryButton>
                </div>
                {apiValidation.status !== 'idle' && (
                  <div style={{
                    marginTop: '8px', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                    background: apiValidation.status === 'success' ? 'rgba(16,185,129,0.1)' : apiValidation.status === 'error' ? 'rgba(239,68,68,0.1)' : theme.innerBg,
                    color: apiValidation.status === 'success' ? '#10B981' : apiValidation.status === 'error' ? '#EF4444' : theme.textSecondary,
                  }}>{apiValidation.message}</div>
                )}
              </div>

              <div>
                <FieldLabel theme={theme}>Team ID</FieldLabel>
                <input type="text" value={settings.clickup.teamId}
                  onChange={(e) => updateSettings({ clickup: { ...settings.clickup, teamId: e.target.value } })}
                  placeholder="9012345678" style={inputStyle(theme)} />
              </div>

              {/* Projects to Track */}
              <div>
                <FieldLabel theme={theme}>Projects to Track</FieldLabel>
                <FieldHint theme={theme}>Select ClickUp lists to monitor in the dashboard</FieldHint>
                <div style={{ marginTop: '12px' }}>
                  <PrimaryButton onClick={handleFetchLists} disabled={isLoadingLists || !settings.clickup.apiKey || !settings.clickup.teamId} small>
                    {isLoadingLists ? 'Loading...' : 'Load Projects from ClickUp'}
                  </PrimaryButton>
                </div>
                {listsError && <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '13px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', marginTop: '12px' }}>{listsError}</div>}
                {clickUpLists.length > 0 && (
                  <div style={{ background: theme.innerBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', maxHeight: 'min(280px, 40vh)', overflowY: 'auto', marginTop: '12px' }}>
                    {clickUpLists.map((list) => {
                      const isSelected = (settings.clickup?.projectsToTrack || []).includes(list.id);
                      return (
                        <div key={list.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '6px', marginBottom: '4px', background: isSelected ? hexToRgba(theme.accent, 0.08) : 'transparent', cursor: 'pointer' }}
                          onClick={() => handleToggleProject(list.id, !isSelected)}>
                          <input type="checkbox" checked={isSelected} onChange={(e) => handleToggleProject(list.id, e.target.checked)} style={{ cursor: 'pointer' }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '14px', color: theme.text }}>{list.name}</span>
                            {list.folder && <span style={{ fontSize: '12px', color: theme.textSecondary, marginLeft: '8px' }}>({list.folder})</span>}
                          </div>
                          <span style={{ fontSize: '12px', color: theme.textMuted }}>{list.task_count} tasks</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Leave & WFH List IDs */}
              <div>
                <FieldLabel theme={theme}>Leave Tracking List ID</FieldLabel>
                <FieldHint theme={theme}>Fields: Start of Time-Off, End of Time-Off, Requested Days</FieldHint>
                <input type="text" value={settings.clickup.leaveListId || ''}
                  onChange={(e) => updateSettings({ clickup: { ...settings.clickup, leaveListId: e.target.value } })}
                  placeholder="e.g., 123456789" style={{ ...inputStyle(theme), marginTop: '8px' }} />
              </div>
              <div>
                <FieldLabel theme={theme}>WFH Tracking List ID</FieldLabel>
                <FieldHint theme={theme}>Field: WFH Date Request</FieldHint>
                <input type="text" value={settings.clickup.wfhListId || ''}
                  onChange={(e) => updateSettings({ clickup: { ...settings.clickup, wfhListId: e.target.value } })}
                  placeholder="e.g., 987654321" style={{ ...inputStyle(theme), marginTop: '8px' }} />
              </div>
            </div>
          )}

          {/* ========== TEAM TAB ========== */}
          {activeTab === 'team' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <SectionHeader title="Team Members" description="Select members to appear on dashboard and affect team averages" theme={theme} />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <PrimaryButton onClick={handleFetchMembers} disabled={isLoadingMembers || !settings.clickup.apiKey || !settings.clickup.teamId} small>
                    {isLoadingMembers ? 'Loading...' : 'Load Members'}
                  </PrimaryButton>
                  {totalCount > 0 && (
                    <>
                      <button onClick={handleSelectAllMembers} style={{ padding: '8px 12px', background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.textSecondary, fontSize: '12px', cursor: 'pointer' }}>Select All</button>
                      <button onClick={handleDeselectAllMembers} style={{ padding: '8px 12px', background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.textSecondary, fontSize: '12px', cursor: 'pointer' }}>Deselect All</button>
                      <span style={{ fontSize: '12px', color: theme.textMuted, marginLeft: 'auto' }}>{selectedCount} of {totalCount} selected</span>
                    </>
                  )}
                </div>

                {membersError && <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '13px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', marginBottom: '12px' }}>{membersError}</div>}

                {totalCount > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '6px', maxHeight: 'min(280px, 40vh)', overflowY: 'auto', padding: '4px' }}>
                    {clickUpMembers.map((member) => {
                      const memberId = member.id;
                      const memberName = member.username || 'Unknown';
                      const memberAvatar = member.profilePicture;
                      const isSelected = (settings.team?.membersToMonitor || []).some(id => String(id) === String(memberId));
                      return (
                        <div key={memberId} style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 6px', borderRadius: '8px',
                          background: isSelected ? hexToRgba('#10B981', 0.08) : theme.innerBg,
                          border: isSelected ? '1px solid rgba(16,185,129,0.3)' : `1px solid ${theme.border}`,
                          cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
                        }} onClick={() => handleToggleMember(memberId, !isSelected)}>
                          {isSelected && (
                            <div style={{ position: 'absolute', top: '4px', right: '4px', width: '14px', height: '14px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '9px', color: '#fff', lineHeight: 1 }}>✓</span>
                            </div>
                          )}
                          {memberAvatar ? (
                            <img src={memberAvatar} alt={memberName} style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: member.color || hexToRgba(theme.text, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: member.color ? '#ffffff' : theme.text, fontSize: '12px', fontWeight: '600', fontFamily: getAdaptiveFontFamily(memberName) }}>
                              {memberName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontSize: '11px', color: theme.text, fontFamily: getAdaptiveFontFamily(memberName), textAlign: 'center', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{memberName}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {totalCount === 0 && !isLoadingMembers && (
                  <p style={{ fontSize: '13px', color: theme.textMuted, fontStyle: 'italic' }}>Click "Load Members" to fetch team members from ClickUp</p>
                )}
              </div>

              {/* Leave & WFH Quotas */}
              {selectedCount > 0 && (
                <div>
                  <SectionHeader title="Leave & WFH Quotas" description="Set annual leave and monthly WFH allowance per member" theme={theme} />
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ padding: '10px 16px', background: theme.innerBg, borderRadius: '8px', border: `1px solid ${theme.border}`, flex: 1, minWidth: '140px' }}>
                      <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase' }}>Default Annual</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: theme.text }}>{DEFAULT_MEMBER_QUOTAS.annualLeave} days/yr</div>
                    </div>
                    <div style={{ padding: '10px 16px', background: theme.innerBg, borderRadius: '8px', border: `1px solid ${theme.border}`, flex: 1, minWidth: '140px' }}>
                      <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase' }}>Default WFH</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: theme.text }}>{DEFAULT_MEMBER_QUOTAS.wfhDays} days/mo</div>
                    </div>
                  </div>

                  <div style={{ background: theme.innerBg, border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: '8px', padding: '10px 16px', borderBottom: `1px solid ${theme.border}` }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase' }}>Member</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>Leave/yr</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>WFH/mo</span>
                    </div>
                    {(settings.team?.membersToMonitor || []).map((memberId) => {
                      const member = clickUpMembers.find(m => String(m.id) === String(memberId));
                      // Fallback: try store members if not found in clickUpMembers
                      const storeMember = !member ? storeMembers.find(m => String(m.clickUpId) === String(memberId) || String(m.id) === String(memberId)) : null;
                      const memberName = member?.username || storeMember?.name || `Member ${memberId}`;
                      const leaveQuota = settings.team?.leaveQuotas?.[memberId] ?? DEFAULT_MEMBER_QUOTAS.annualLeave;
                      const wfhQuota = settings.team?.wfhQuotas?.[memberId] ?? DEFAULT_MEMBER_QUOTAS.wfhDays;
                      return (
                        <div key={memberId} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: '8px', padding: '10px 16px', borderBottom: `1px solid ${theme.border}`, alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: theme.text, fontFamily: getAdaptiveFontFamily(memberName) }}>{memberName}</span>
                          <input type="number" min="0" max="365" value={leaveQuota}
                            onChange={(e) => handleUpdateLeaveQuota(memberId, parseInt(e.target.value) || 0)}
                            style={{ width: '80px', padding: '6px 8px', background: theme.subtleBg || theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text, fontSize: '13px', textAlign: 'center', justifySelf: 'center' }} />
                          <input type="number" min="0" max="31" value={wfhQuota}
                            onChange={(e) => handleUpdateWfhQuota(memberId, parseInt(e.target.value) || 0)}
                            style={{ width: '80px', padding: '6px 8px', background: theme.subtleBg || theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text, fontSize: '13px', textAlign: 'center', justifySelf: 'center' }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== SCORE TAB ========== */}
          {activeTab === 'score' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Formula preview */}
              <div style={{ padding: '16px', background: theme.innerBg, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '10px' }}>Score Formula</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', fontSize: '13px' }}>
                  {weightConfig.map((w, i) => (
                    <React.Fragment key={w.key}>
                      {i > 0 && <span style={{ color: theme.textMuted }}>+</span>}
                      <span style={{ color: w.color, fontWeight: '600' }}>{w.label} {Math.round(settings.score.weights[w.key] * 100)}%</span>
                    </React.Fragment>
                  ))}
                  <span style={{ color: theme.textMuted }}>=</span>
                  <span style={{ fontWeight: '700', color: theme.text }}>Score</span>
                </div>
              </div>

              {/* Visual weight bar */}
              <div>
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  {weightConfig.map((w) => (
                    <div key={w.key} style={{ width: `${Math.round(settings.score.weights[w.key] * 100)}%`, background: w.color, transition: 'width 0.2s' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: Math.round(Object.values(settings.score.weights).reduce((s, v) => s + v, 0) * 100) === 100 ? '#10B981' : '#EF4444' }}>
                    Total: {Math.round(Object.values(settings.score.weights).reduce((s, v) => s + v, 0) * 100)}%
                  </span>
                </div>
              </div>

              {/* Auto-balance info */}
              <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px' }}>💡</span>
                <p style={{ margin: 0, fontSize: '11px', color: theme.textSecondary, lineHeight: 1.5 }}>
                  All weights must add up to <strong>100%</strong>. When you change one slider, the others automatically adjust to keep the total at 100%. Drag slowly for precise control.
                </p>
              </div>

              {/* Weight cards */}
              {weightConfig.map((w) => {
                const value = Math.round(settings.score.weights[w.key] * 100);
                return (
                  <div key={w.key} style={{ padding: '16px', background: theme.innerBg, borderRadius: '10px', border: `1px solid ${theme.border}`, borderLeft: `3px solid ${w.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>{w.label}</div>
                        <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>{w.desc}</div>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: w.color, minWidth: '50px', textAlign: 'right' }}>{value}%</div>
                    </div>
                    <input type="range" min="0" max="100" value={value}
                      onChange={(e) => handleWeightChange(w.key, e.target.value)}
                      style={{ width: '100%', marginTop: '8px', accentColor: w.color }} />
                  </div>
                );
              })}

              {/* Task Baseline */}
              <div style={{ padding: '16px', background: theme.innerBg, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                <FieldLabel theme={theme}>Task Baseline</FieldLabel>
                <FieldHint theme={theme}>Members working on this many tasks/day get full marks for "Tasks Worked". The app also auto-calculates a 3-month average from your team's history — this setting overrides it.</FieldHint>
                <input type="number" min="1" max="20" value={settings.score.taskBaseline}
                  onChange={(e) => updateSettings({ score: { ...settings.score, taskBaseline: parseInt(e.target.value) || 3 } })}
                  style={{ ...inputStyle(theme, '100px'), marginTop: '10px' }} />
              </div>
            </div>
          )}

          {/* ========== THRESHOLDS TAB (Simplified) ========== */}
          {activeTab === 'thresholds' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Visual timeline */}
              <div style={{ padding: '16px', background: theme.innerBg, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '12px' }}>How Status Detection Works</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0', fontSize: '12px', overflowX: 'auto' }}>
                  <div style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.15)', borderRadius: '6px 0 0 6px', color: '#10B981', fontWeight: '600', whiteSpace: 'nowrap' }}>Working</div>
                  <div style={{ padding: '6px 8px', background: theme.subtleBg || theme.cardBg, color: theme.textMuted, borderTop: `1px dashed ${theme.border}`, borderBottom: `1px dashed ${theme.border}`, whiteSpace: 'nowrap', textAlign: 'center', minWidth: '60px' }}>
                    &lt;{settings.thresholds.breakGapMinutes}m<div style={{ fontSize: '10px' }}>ignored</div>
                  </div>
                  <div style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: '600', whiteSpace: 'nowrap' }}>Working</div>
                  <div style={{ padding: '6px 8px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderTop: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', whiteSpace: 'nowrap', textAlign: 'center', minWidth: '60px' }}>
                    {settings.thresholds.breakMinutes}m+<div style={{ fontSize: '10px' }}>Break</div>
                  </div>
                  <div style={{ padding: '6px 12px', background: 'rgba(107,114,128,0.15)', borderRadius: '0 6px 6px 0', color: '#6B7280', fontWeight: '600', whiteSpace: 'nowrap', textAlign: 'center' }}>
                    {settings.thresholds.offlineMinutes}m+<div style={{ fontSize: '10px' }}>Offline</div>
                  </div>
                </div>
              </div>

              <SectionHeader title="Status Detection" description="When to change a member's status after their timer stops" theme={theme} />

              <div>
                <FieldLabel theme={theme}>Break after (minutes)</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="number" min="0" max="60" value={settings.thresholds.breakMinutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      const updates = { breakMinutes: val };
                      if (val >= settings.thresholds.offlineMinutes) updates.offlineMinutes = val + 30;
                      updateSettings({ thresholds: { ...settings.thresholds, ...updates } });
                    }}
                    style={inputStyle(theme, '100px')} />
                  <span style={{ fontSize: '12px', color: theme.textSecondary }}>0 = immediately when timer stops</span>
                </div>
                <FieldHint theme={theme}>How long without an active timer before marking as "on break"</FieldHint>
              </div>

              <div>
                <FieldLabel theme={theme}>Offline after (minutes)</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="number" min={Math.max(1, settings.thresholds.breakMinutes + 1)} max="480" value={settings.thresholds.offlineMinutes}
                    onChange={(e) => updateSettings({ thresholds: { ...settings.thresholds, offlineMinutes: parseInt(e.target.value) || 60 } })}
                    style={inputStyle(theme, '100px')} />
                  <span style={{ fontSize: '12px', color: theme.textSecondary }}>must be &gt; break threshold</span>
                </div>
                <FieldHint theme={theme}>How long on break before marking as "offline"</FieldHint>
                {settings.thresholds.offlineMinutes <= settings.thresholds.breakMinutes && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#EF4444' }}>⚠ Offline must be greater than break threshold</div>
                )}
              </div>

              <SectionHeader title="Break Calculation" description="How gaps between time entries are interpreted" theme={theme} />

              <div>
                <FieldLabel theme={theme}>Ignore gaps under (minutes)</FieldLabel>
                <input type="number" min="1" max="15" value={settings.thresholds.breakGapMinutes}
                  onChange={(e) => updateSettings({ thresholds: { ...settings.thresholds, breakGapMinutes: parseInt(e.target.value) || 5 } })}
                  style={inputStyle(theme, '100px')} />
                <FieldHint theme={theme}>Tiny pauses between timers (switching tasks, etc.) won't count as breaks</FieldHint>
              </div>
            </div>
          )}

          {/* ========== SYNC TAB ========== */}
          {activeTab === 'sync' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <SectionHeader title="Sync Settings" description="Control how often data is fetched from ClickUp" theme={theme} />
              <div>
                <FieldLabel theme={theme}>Sync Interval</FieldLabel>
                <select value={settings.sync.intervalMs}
                  onChange={(e) => updateSettings({ sync: { ...settings.sync, intervalMs: parseInt(e.target.value) } })}
                  style={selectStyle(theme)}>
                  {SYNC_INTERVAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <FieldHint theme={theme}>How often to fetch data (auto 60s on mobile)</FieldHint>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div>
                  <FieldLabel theme={theme}>Batch Size</FieldLabel>
                  <input type="number" min="1" max="50" value={settings.sync.batchSize}
                    onChange={(e) => updateSettings({ sync: { ...settings.sync, batchSize: parseInt(e.target.value) || 10 } })}
                    style={inputStyle(theme, '100px')} />
                  <FieldHint theme={theme}>Concurrent API requests</FieldHint>
                </div>
                <div>
                  <FieldLabel theme={theme}>Batch Delay (ms)</FieldLabel>
                  <input type="number" min="50" max="2000" value={settings.sync.batchDelayMs}
                    onChange={(e) => updateSettings({ sync: { ...settings.sync, batchDelayMs: parseInt(e.target.value) || 150 } })}
                    style={inputStyle(theme, '100px')} />
                  <FieldHint theme={theme}>Delay between batches</FieldHint>
                </div>
              </div>

              <SectionHeader title="Cache Management" description="Control how cached data is stored and cleaned up" theme={theme} />

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div>
                  <FieldLabel theme={theme}>Auto-Clear Cache</FieldLabel>
                  <select value={settings.sync.autoClearCache}
                    onChange={(e) => updateSettings({ sync: { ...settings.sync, autoClearCache: e.target.value } })}
                    style={selectStyle(theme)}>
                    {CACHE_CLEAR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel theme={theme}>Data Retention</FieldLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" min="7" max="365" value={settings.sync.dataRetentionDays}
                      onChange={(e) => updateSettings({ sync: { ...settings.sync, dataRetentionDays: parseInt(e.target.value) || 30 } })}
                      style={inputStyle(theme, '80px')} />
                    <span style={{ fontSize: '13px', color: theme.textSecondary }}>days</span>
                  </div>
                </div>
              </div>

              <div>
                <button onClick={handleClearCache} style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#EF4444', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                  Clear Cache Now
                </button>
                <FieldHint theme={theme}>Manually clear all cached data from IndexedDB</FieldHint>
              </div>
            </div>
          )}

          {/* ========== CALENDAR TAB ========== */}
          {activeTab === 'calendar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <SectionHeader title="Work Hours" description="Define the expected work schedule" theme={theme} />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <FieldLabel theme={theme}>Start Time</FieldLabel>
                  <input type="time" value={settings.schedule.startTime}
                    onChange={(e) => updateSettings({ schedule: { ...settings.schedule, startTime: e.target.value } })}
                    style={inputStyle(theme, '150px')} />
                </div>
                <div>
                  <FieldLabel theme={theme}>End Time</FieldLabel>
                  <input type="time" value={settings.schedule.endTime}
                    onChange={(e) => updateSettings({ schedule: { ...settings.schedule, endTime: e.target.value } })}
                    style={inputStyle(theme, '150px')} />
                </div>
                <div>
                  <FieldLabel theme={theme}>Daily Target</FieldLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" min="1" max="24" step="0.5" value={settings.schedule.dailyTargetHours}
                      onChange={(e) => updateSettings({ schedule: { ...settings.schedule, dailyTargetHours: parseFloat(e.target.value) || 6.5 } })}
                      style={inputStyle(theme, '80px')} />
                    <span style={{ fontSize: '13px', color: theme.textSecondary }}>hours</span>
                  </div>
                </div>
              </div>

              <SectionHeader title="Work Days" description="Select which days count as working days" theme={theme} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {WORK_DAYS.map((day) => {
                  const isSelected = settings.schedule.workDays.includes(day.value);
                  return (
                    <button key={day.value} onClick={() => {
                      const newDays = isSelected ? settings.schedule.workDays.filter(d => d !== day.value) : [...settings.schedule.workDays, day.value];
                      updateSettings({ schedule: { ...settings.schedule, workDays: newDays } });
                    }} style={{ padding: '8px 16px', background: isSelected ? '#ffffff' : theme.innerBg, border: `1px solid ${isSelected ? '#ffffff' : theme.border}`, borderRadius: '6px', color: isSelected ? '#000000' : theme.text, fontSize: '13px', fontWeight: isSelected ? '500' : '400', cursor: 'pointer' }}>
                      {day.label}
                    </button>
                  );
                })}
              </div>

              {/* Public Holidays */}
              <SectionHeader title="Public Holidays" description={`${(settings.schedule?.publicHolidays || []).length} holidays configured — excluded from work day calculations`} theme={theme} />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={handleLoadEgyptianHolidays} style={{ padding: '8px 16px', background: hexToRgba('#3b82f6', 0.1), border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', color: '#3b82f6', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  Load Egyptian Holidays 2026
                </button>
                <button onClick={handleAddHoliday} style={{ padding: '8px 16px', background: '#ffffff', border: 'none', borderRadius: '6px', color: '#000000', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  + Add Custom
                </button>
              </div>

              {(settings.schedule?.publicHolidays || []).length > 0 && (
                <div style={{ background: theme.innerBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '8px', maxHeight: 'min(300px, 40vh)', overflowY: 'auto' }}>
                  {[...(settings.schedule?.publicHolidays || [])].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((holiday, index) => {
                    const origIndex = (settings.schedule?.publicHolidays || []).findIndex(h => h === holiday);
                    return (
                      <div key={index} style={{ display: 'flex', gap: '8px', padding: '8px', alignItems: 'center', borderBottom: index < (settings.schedule?.publicHolidays || []).length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                        <input type="date" value={holiday.date}
                          onChange={(e) => handleUpdateHoliday(origIndex, 'date', e.target.value)}
                          style={{ ...inputStyle(theme, 'auto'), flex: isMobile ? 1 : '0 0 150px', padding: '6px 10px', fontSize: '13px' }} />
                        <input type="text" value={holiday.name} placeholder="Holiday name"
                          onChange={(e) => handleUpdateHoliday(origIndex, 'name', e.target.value)}
                          style={{ ...inputStyle(theme), flex: 1, padding: '6px 10px', fontSize: '13px' }} />
                        <button onClick={() => handleRemoveHoliday(origIndex)} style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', color: '#EF4444', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========== DISPLAY TAB ========== */}
          {activeTab === 'display' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <FieldLabel theme={theme}>Theme</FieldLabel>
                <select value={settings.display.theme} onChange={(e) => { updateSettings({ display: { ...settings.display, theme: e.target.value } }); setAppTheme(e.target.value); }} style={selectStyle(theme)}>
                  <option value="trueBlack">True Black + Emerald</option>
                  <option value="noirGlass">Noir Glass</option>
                </select>
              </div>
              <div>
                <FieldLabel theme={theme}>Default View</FieldLabel>
                <select value={settings.display.defaultView} onChange={(e) => updateSettings({ display: { ...settings.display, defaultView: e.target.value } })} style={selectStyle(theme)}>
                  <option value="grid">Grid View</option>
                  <option value="list">List View</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: theme.innerBg, borderRadius: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: theme.text }}>Show Profile Pictures</label>
                <ToggleSwitch value={settings.display.showProfilePictures} onChange={() => updateSettings({ display: { ...settings.display, showProfilePictures: !settings.display.showProfilePictures } })} theme={theme} />
              </div>

              <SectionHeader title="Developer" description="Advanced options for debugging and diagnostics" theme={theme} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: theme.innerBg, borderRadius: '8px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: theme.text }}>Developer Mode</label>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: theme.textMuted }}>Show sync timing, request counts, and cache stats</p>
                </div>
                <ToggleSwitch value={settings.display.developerMode} onChange={() => updateSettings({ display: { ...settings.display, developerMode: !settings.display.developerMode } })} theme={theme} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? '16px' : '20px 24px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleReset} style={{ padding: '10px 20px', background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.textSecondary, fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
            Reset
          </button>
          <button onClick={onClose} style={{ padding: '10px 24px', background: '#ffffff', border: 'none', borderRadius: '8px', color: '#000000', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
