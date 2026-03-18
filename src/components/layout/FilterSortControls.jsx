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
    { id: 'working', label: 'Working', icon: '●', colorVar: 'var(--color-working)' },
    { id: 'break', label: 'Break', icon: '◐', colorVar: 'var(--color-break)' },
    { id: 'offline', label: 'Offline', icon: '○', colorVar: 'var(--color-offline)' },
    { id: 'leave', label: 'Leave', icon: '📅', colorVar: 'var(--color-leave)' },
    { id: 'noActivity', label: 'No Activity', icon: '⚠', colorVar: 'var(--color-no-activity)' },
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

  // Dropdown background depends on theme type — keep inline (no CSS var equivalent)
  const dropdownBg = theme.type === 'dark' ? 'rgba(24, 24, 24, 0.98)' : 'rgba(255, 255, 255, 0.98)';

  return (
    <div
      className={`flex items-center flex-wrap ${isMobile ? 'justify-end' : 'justify-between'}`}
      style={{ gap: isMobile ? '8px' : '16px', marginBottom: isMobile ? '12px' : '16px' }}
    >
      {/* Left: View Toggle Icons — desktop only */}
      {!isMobile && (
        <div
          className="flex overflow-hidden rounded-[10px] border border-th-border"
          style={{
            background: 'var(--color-card-bg)',
            backdropFilter: 'var(--effect-backdrop-blur)',
            WebkitBackdropFilter: 'var(--effect-backdrop-blur)',
          }}
        >
          {viewIcons.map((view) => (
            <button
              key={view.id}
              data-testid={`${view.id}-view-toggle`}
              onClick={() => {
                setActiveView(view.id);
              }}
              className="flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer transition-all duration-200 border-none"
              style={{
                padding: '8px 14px',
                background: activeView === view.id ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                color: activeView === view.id ? '#000000' : 'var(--color-text)',
              }}
              onMouseEnter={(e) => {
                if (activeView !== view.id) {
                  e.currentTarget.style.background = 'var(--color-inner-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeView !== view.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
              title={view.label}
            >
              <span className="text-sm">{view.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right: Sort and Filter Dropdowns */}
      <div className="flex items-center" style={{ gap: isMobile ? '6px' : '12px' }}>
        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="flex items-center gap-1.5 rounded-[10px] border border-th-border text-th-text text-[13px] font-medium cursor-pointer transition-all duration-200"
            style={{
              padding: isMobile ? '6px 10px' : '8px 14px',
              background: 'var(--color-card-bg)',
              backdropFilter: 'var(--effect-backdrop-blur)',
              WebkitBackdropFilter: 'var(--effect-backdrop-blur)',
            }}
          >
            <span className="text-[12px]">☰</span>
            {!isMobile && <span>Sort: {memberSortObj.label}</span>}
            <span className="text-[10px] opacity-60">▼</span>
          </button>

          {/* Sort Dropdown Menu */}
          {isSortOpen && (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setIsSortOpen(false)}
                className="fixed inset-0 z-[1098]"
              />
              {/* Menu */}
              <div
                className="absolute top-[calc(100%+4px)] right-0 z-[1099] rounded-xl border border-th-border overflow-hidden"
                style={{
                  background: dropdownBg,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  minWidth: '160px',
                }}
              >
                {sortOptions.map((sort) => (
                  <button
                    key={sort.id}
                    onClick={() => handleSortClick(sort.id)}
                    className="flex items-center gap-2.5 w-full border-none text-th-text text-[13px] cursor-pointer transition-all duration-200 text-left"
                    style={{
                      padding: '14px 14px',
                      background: memberSort === sort.id ? 'var(--color-inner-bg)' : 'transparent',
                      fontWeight: memberSort === sort.id ? '600' : '500',
                    }}
                    onMouseEnter={(e) => {
                      if (memberSort !== sort.id) {
                        e.currentTarget.style.background = 'var(--color-inner-bg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (memberSort !== sort.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span className="text-[12px]">{sort.icon}</span>
                    <span>{sort.label}</span>
                    {memberSort === sort.id && (
                      <span className="ml-auto text-th-accent">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-1.5 rounded-[10px] border border-th-border text-th-text text-[13px] font-medium cursor-pointer transition-all duration-200"
            style={{
              padding: isMobile ? '6px 10px' : '8px 14px',
              background: 'var(--color-card-bg)',
              backdropFilter: 'var(--effect-backdrop-blur)',
              WebkitBackdropFilter: 'var(--effect-backdrop-blur)',
            }}
          >
            <span className="text-[12px]">▽</span>
            {!isMobile && <span>Filter: {memberFilterObj.label}</span>}
            <span className="text-[10px] opacity-60">▼</span>
          </button>

          {/* Filter Dropdown Menu */}
          {isFilterOpen && (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setIsFilterOpen(false)}
                className="fixed inset-0 z-[1098]"
              />
              {/* Menu */}
              <div
                className="absolute top-[calc(100%+4px)] right-0 z-[1099] rounded-xl border border-th-border overflow-hidden"
                style={{
                  background: dropdownBg,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  minWidth: '160px',
                }}
              >
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterClick(filter.id)}
                    className="flex items-center gap-2.5 w-full border-none text-th-text text-[13px] cursor-pointer transition-all duration-200 text-left"
                    style={{
                      padding: '14px 14px',
                      background: memberFilter === filter.id ? 'var(--color-inner-bg)' : 'transparent',
                      fontWeight: memberFilter === filter.id ? '600' : '500',
                    }}
                    onMouseEnter={(e) => {
                      if (memberFilter !== filter.id) {
                        e.currentTarget.style.background = 'var(--color-inner-bg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (memberFilter !== filter.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span style={{ color: filter.colorVar || 'var(--color-text)' }}>{filter.icon}</span>
                    <span>{filter.label}</span>
                    {memberFilter === filter.id && (
                      <span className="ml-auto text-th-accent">✓</span>
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
