import React, { useState } from 'react';
import { useWindowSize } from '../../hooks/useWindowSize';
import { useAppStore } from '../../stores/useAppStore';

// Filter and Sort controls for member cards section
const FilterSortControls = ({ theme, activeView, setActiveView }) => {
  const { isMobile } = useWindowSize();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Get filter/sort state from Zustand store
  const memberFilter = useAppStore(state => state.memberFilter);
  const memberSort = useAppStore(state => state.memberSort);
  const setMemberFilter = useAppStore(state => state.setMemberFilter);
  const setMemberSort = useAppStore(state => state.setMemberSort);

  const filters = [
    { id: 'all', label: 'All', icon: '👥' },
    { id: 'working', label: 'Working', icon: '●', color: theme.working },
    { id: 'break', label: 'Break', icon: '◐', color: theme.break },
    { id: 'offline', label: 'Offline', icon: '○', color: theme.offline },
    { id: 'leave', label: 'Leave', icon: '📅', color: theme.leave },
    { id: 'noActivity', label: 'No Activity', icon: '⚠', color: theme.noActivity },
  ];

  const sortOptions = [
    { id: 'activity', label: 'Activity', icon: '⚡' },
    { id: 'rank', label: 'Rank', icon: '🏆' },
    { id: 'hours', label: 'Hours', icon: '⏱️' },
    { id: 'tasks', label: 'Tasks', icon: '✓' },
    { id: 'name', label: 'Name', icon: 'A→Z' },
  ];

  const viewIcons = [
    { id: 'grid', icon: '⊞', label: 'Grid' },
    { id: 'list', icon: '☰', label: 'List' },
  ];

  const handleFilterClick = (filterId) => {
    setMemberFilter(filterId);
    setIsFilterOpen(false);
  };

  const handleSortClick = (sortId) => {
    setMemberSort(sortId);
    setIsSortOpen(false);
  };

  const memberFilterObj = filters.find(f => f.id === memberFilter);
  const memberSortObj = sortOptions.find(s => s.id === memberSort);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-end' : 'space-between',
        gap: isMobile ? '8px' : '16px',
        marginBottom: isMobile ? '12px' : '16px',
        flexWrap: 'wrap',
      }}
    >
      {/* Left: View Toggle Icons — desktop only */}
      {!isMobile && (
        <div
          style={{
            display: 'flex',
            background: theme.cardBg,
            backdropFilter: theme.backdropBlur,
            WebkitBackdropFilter: theme.backdropBlur,
            borderRadius: '10px',
            border: `1px solid ${theme.border}`,
            overflow: 'hidden',
          }}
        >
          {viewIcons.map((view) => (
            <button
              key={view.id}
              data-testid={`${view.id}-view-toggle`}
              onClick={() => {
                setActiveView(view.id);
              }}
              style={{
                padding: '8px 14px',
                background: activeView === view.id ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                border: 'none',
                color: activeView === view.id ? '#000000' : theme.text,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                if (activeView !== view.id) {
                  e.currentTarget.style.background = theme.secondaryBg || theme.innerBg;
                }
              }}
              onMouseLeave={(e) => {
                if (activeView !== view.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
              title={view.label}
            >
              <span style={{ fontSize: '14px' }}>{view.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right: Sort and Filter Dropdowns */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '12px' }}>
        {/* Sort Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            style={{
              padding: isMobile ? '6px 10px' : '8px 14px',
              borderRadius: '10px',
              border: `1px solid ${theme.border}`,
              background: theme.cardBg,
              backdropFilter: theme.backdropBlur,
              WebkitBackdropFilter: theme.backdropBlur,
              color: theme.text,
              fontSize: isMobile ? '13px' : '13px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '12px' }}>☰</span>
            {!isMobile && <span>Sort: {memberSortObj.label}</span>}
            <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
          </button>

          {/* Sort Dropdown Menu */}
          {isSortOpen && (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setIsSortOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1098,
                }}
              />
              {/* Menu */}
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  zIndex: 1099,
                  background: theme.type === 'dark' ? 'rgba(24, 24, 24, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '12px',
                  border: `1px solid ${theme.border}`,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  minWidth: '160px',
                  overflow: 'hidden',
                }}
              >
                {sortOptions.map((sort) => (
                  <button
                    key={sort.id}
                    onClick={() => handleSortClick(sort.id)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: memberSort === sort.id ? theme.secondaryBg : 'transparent',
                      border: 'none',
                      color: theme.text,
                      fontSize: '13px',
                      fontWeight: memberSort === sort.id ? '600' : '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (memberSort !== sort.id) {
                        e.currentTarget.style.background = theme.secondaryBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (memberSort !== sort.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>{sort.icon}</span>
                    <span>{sort.label}</span>
                    {memberSort === sort.id && (
                      <span style={{ marginLeft: 'auto', color: theme.accent }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Filter Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              padding: isMobile ? '6px 10px' : '8px 14px',
              borderRadius: '10px',
              border: `1px solid ${theme.border}`,
              background: theme.cardBg,
              backdropFilter: theme.backdropBlur,
              WebkitBackdropFilter: theme.backdropBlur,
              color: theme.text,
              fontSize: isMobile ? '13px' : '13px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '12px' }}>▽</span>
            {!isMobile && <span>Filter: {memberFilterObj.label}</span>}
            <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
          </button>

          {/* Filter Dropdown Menu */}
          {isFilterOpen && (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setIsFilterOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1098,
                }}
              />
              {/* Menu */}
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  zIndex: 1099,
                  background: theme.type === 'dark' ? 'rgba(24, 24, 24, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '12px',
                  border: `1px solid ${theme.border}`,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  minWidth: '160px',
                  overflow: 'hidden',
                }}
              >
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterClick(filter.id)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: memberFilter === filter.id ? theme.secondaryBg : 'transparent',
                      border: 'none',
                      color: theme.text,
                      fontSize: '13px',
                      fontWeight: memberFilter === filter.id ? '600' : '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (memberFilter !== filter.id) {
                        e.currentTarget.style.background = theme.secondaryBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (memberFilter !== filter.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span style={{ color: filter.color || theme.text }}>{filter.icon}</span>
                    <span>{filter.label}</span>
                    {memberFilter === filter.id && (
                      <span style={{ marginLeft: 'auto', color: theme.accent }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterSortControls;
