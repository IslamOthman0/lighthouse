import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

// Helper: ensure a value is always a proper Date object (not a string or null)
const toDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// Date range picker modal with comprehensive quick filters
const DatePickerModal = ({ isOpen, onClose, theme }) => {
  const setDateRange = useAppStore(state => state.setDateRange);
  const dateRange = useAppStore(state => state.dateRange);

  // Local state for temporary selection before applying
  // IMPORTANT: always store actual Date objects here, never strings
  const [tempRange, setTempRange] = useState({
    startDate: toDate(dateRange.startDate),
    endDate: toDate(dateRange.endDate),
    preset: dateRange.preset,
  });
  const [viewDate, setViewDate] = useState(new Date());

  // Selection mode: 'start' = waiting for first click, 'end' = waiting for second click
  const [selectionMode, setSelectionMode] = useState('start');

  // Year/month picker mode: null | 'year' | 'month'
  const [navMode, setNavMode] = useState(null);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (navMode) { setNavMode(null); return; }
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      lockScroll();
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      if (isOpen) unlockScroll();
    };
  }, [isOpen, onClose, navMode]);

  // Reset temp state when modal opens — always convert strings to Date objects
  useEffect(() => {
    if (isOpen) {
      const start = toDate(dateRange.startDate);
      const end = toDate(dateRange.endDate);
      setTempRange({ startDate: start, endDate: end, preset: dateRange.preset });
      setViewDate(start || new Date());
      setSelectionMode('start');
      setNavMode(null);
    }
  }, [isOpen, dateRange]);

  if (!isOpen) return null;

  // Helper to get start of day
  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Helper to get end of day
  const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  // Calculate date ranges for quick filters
  const getDateRange = (preset) => {
    const today = startOfDay(new Date());

    switch (preset) {
      case 'today':
        return { startDate: null, endDate: null }; // null = today

      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { startDate: yesterday, endDate: yesterday };
      }

      case 'this_week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return { startDate: weekStart, endDate: weekEnd > today ? today : weekEnd };
      }

      case 'last_week': {
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        return { startDate: lastWeekStart, endDate: lastWeekEnd };
      }

      case 'this_month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: monthStart, endDate: today };
      }

      case 'last_month': {
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return { startDate: lastMonthStart, endDate: lastMonthEnd };
      }

      case 'this_quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
        return { startDate: quarterStart, endDate: today };
      }

      case 'last_quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        const lastQuarterEnd = new Date(today.getFullYear(), quarter * 3, 0);
        const lastQuarterStart = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
        return { startDate: lastQuarterStart, endDate: lastQuarterEnd };
      }

      case 'half_year': {
        const halfYearStart = new Date(today);
        halfYearStart.setMonth(today.getMonth() - 6);
        return { startDate: halfYearStart, endDate: today };
      }

      case 'this_year': {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { startDate: yearStart, endDate: today };
      }

      case 'last_year': {
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        return { startDate: lastYearStart, endDate: lastYearEnd };
      }

      default:
        return { startDate: null, endDate: null };
    }
  };

  // Quick filter presets
  const quickPresets = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'this_week' },
    { label: 'Last Week', value: 'last_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'This Quarter', value: 'this_quarter' },
    { label: 'Last Quarter', value: 'last_quarter' },
    { label: 'Half Year', value: 'half_year' },
    { label: 'This Year', value: 'this_year' },
    { label: 'Last Year', value: 'last_year' },
  ];

  const handlePresetClick = (preset) => {
    const range = getDateRange(preset);
    setTempRange({ ...range, preset });
    if (range.startDate) setViewDate(range.startDate);
    setSelectionMode('start');
  };

  const handleApply = () => {
    setDateRange(tempRange.startDate, tempRange.endDate, tempRange.preset);
    onClose();
  };

  const handleCancel = () => {
    setTempRange({
      startDate: toDate(dateRange.startDate),
      endDate: toDate(dateRange.endDate),
      preset: dateRange.preset,
    });
    onClose();
  };

  // Calendar logic
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();

  const calendarDays = [];
  for (let i = 0; i < startDayOfWeek; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(currentYear, currentMonth, day));
  }

  const handlePrevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1));

  // Year list: 2024 to current year
  const thisYear = new Date().getFullYear();
  const yearList = [];
  for (let y = thisYear; y >= 2024; y--) yearList.push(y);

  const isFutureDate = (date) => {
    if (!date) return false;
    return startOfDay(date).getTime() > startOfDay(new Date()).getTime();
  };

  const handleDateClick = (date) => {
    if (!date || isFutureDate(date)) return;

    if (selectionMode === 'start') {
      setTempRange({ startDate: date, endDate: date, preset: 'custom' });
      setSelectionMode('end');
    } else {
      if (date < tempRange.startDate) {
        setTempRange({ startDate: date, endDate: tempRange.startDate, preset: 'custom' });
      } else {
        setTempRange({ ...tempRange, endDate: date, preset: 'custom' });
      }
      setSelectionMode('start');
    }
  };

  const isSameDay = (date1, date2) => {
    const d1 = toDate(date1);
    const d2 = toDate(date2);
    if (!d1 || !d2) return false;
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const isInRange = (date) => {
    if (!date || !tempRange.startDate || !tempRange.endDate) return false;
    const d = startOfDay(date).getTime();
    const start = startOfDay(toDate(tempRange.startDate)).getTime();
    const end = startOfDay(toDate(tempRange.endDate)).getTime();
    return d >= start && d <= end;
  };

  const isStartDate = (date) => isSameDay(date, tempRange.startDate);
  const isEndDate = (date) => isSameDay(date, tempRange.endDate);
  const isToday = (date) => {
    if (!date) return false;
    return isSameDay(date, new Date());
  };

  // Check if selected range is very long (> 90 days) — sync will make more API calls
  const getLongRangeInfo = () => {
    if (!tempRange.startDate || !tempRange.endDate) return null;
    const start = toDate(tempRange.startDate);
    const end = toDate(tempRange.endDate);
    if (!start || !end) return null;
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 90) return null;
    const chunks = Math.ceil(diffDays / 30);
    return { diffDays, chunks };
  };

  // Format display of selected range
  const formatRangeDisplay = () => {
    if (tempRange.preset === 'today' && !tempRange.startDate) return 'Today';
    if (!tempRange.startDate) return 'Select dates';

    const d = toDate(tempRange.startDate);
    if (!d) return 'Select dates';

    const formatDate = (val) => {
      const date = toDate(val);
      if (!date) return '—';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (isSameDay(tempRange.startDate, tempRange.endDate)) {
      return formatDate(tempRange.startDate);
    }
    return `${formatDate(tempRange.startDate)} — ${formatDate(tempRange.endDate)}`;
  };

  // theme.type needed for dynamic accent/bg values (no CSS var equivalent for selection colors)
  const isDark = theme.type === 'dark';
  const accent = isDark ? '#ffffff' : '#111827';
  const accentBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(17,24,39,0.08)';
  // SVG chevron color for native select element (must be inline data URI)
  const chevronColor = isDark ? '%23ffffff' : '%23374151';

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-[420px] max-h-[90vh] overflow-auto rounded-2xl border border-[var(--color-border)] p-5 shadow-2xl"
        style={{ background: 'var(--color-card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--color-text)] m-0">
            Select Date Range
          </h3>
          <button
            onClick={handleCancel}
            className="bg-transparent border-none text-2xl cursor-pointer text-[var(--color-text-muted)] p-0 w-8 h-8 flex items-center justify-center rounded-lg"
          >×</button>
        </div>

        {/* Selected Range Display */}
        <div
          className="px-4 py-3 rounded-[10px] border border-[var(--color-border)] mb-4 text-center"
          style={{ background: accentBg }}
        >
          <div className="text-[11px] text-[var(--color-text-muted)] mb-1">
            Selected Range
          </div>
          <div className="text-[15px] font-semibold text-[var(--color-text)]">
            {formatRangeDisplay()}
          </div>
          {tempRange.preset !== 'custom' && tempRange.preset !== 'today' && (
            <div className="text-[11px] text-[var(--color-text-muted)] mt-[2px]">
              {quickPresets.find(p => p.value === tempRange.preset)?.label}
            </div>
          )}
          {getLongRangeInfo() && (
            <div className="text-[11px] text-[var(--color-text-muted)] mt-[6px] flex items-center gap-1 justify-center">
              ℹ Syncing {getLongRangeInfo().chunks} chunks — may take a moment
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="mb-4">
          <div className="text-[12px] font-semibold text-[var(--color-text-muted)] mb-2">
            Quick Select
          </div>
          <select
            value={tempRange.preset === 'custom' ? '' : tempRange.preset}
            onChange={(e) => { if (e.target.value) handlePresetClick(e.target.value); }}
            className="w-full px-3 py-[9px] rounded-lg border border-[var(--color-border)] bg-[var(--color-inner-bg)] text-[var(--color-text)] text-[13px] font-medium cursor-pointer outline-none pr-8"
            style={{
              appearance: 'none', WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${chevronColor}' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            <option value="" disabled>— pick a preset —</option>
            {quickPresets.map((preset) => (
              <option key={preset.value} value={preset.value}>{preset.label}</option>
            ))}
          </select>
        </div>

        {/* Calendar */}
        <div className="mb-4">
          <div className="text-[12px] font-semibold text-[var(--color-text-muted)] mb-2">
            Custom Range
          </div>

          {/* Selection mode hint */}
          {tempRange.preset === 'custom' && (
            <div
              className="text-[11px] text-center mb-2 font-medium"
              style={{ color: selectionMode === 'start' ? 'var(--color-text-muted)' : accent }}
            >
              {selectionMode === 'start' ? 'Click a day to set start date' : '▶ Now click end date'}
            </div>
          )}

          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between mb-[10px]">
            <button
              onClick={handlePrevMonth}
              className="bg-[var(--color-inner-bg)] border border-[var(--color-border)] rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer text-[var(--color-text)] text-base"
            >‹</button>

            {/* Month/Year header — click to open year/month picker */}
            <div className="flex gap-1">
              <button
                onClick={() => setNavMode(navMode === 'month' ? null : 'month')}
                className="rounded-[6px] px-2 py-1 text-[14px] font-semibold text-[var(--color-text)] cursor-pointer"
                style={{
                  background: navMode === 'month' ? accentBg : 'transparent',
                  border: `1px solid ${navMode === 'month' ? accent : 'transparent'}`,
                }}
              >
                {monthNames[currentMonth]}
              </button>
              <button
                onClick={() => setNavMode(navMode === 'year' ? null : 'year')}
                className="rounded-[6px] px-2 py-1 text-[14px] font-semibold text-[var(--color-text)] cursor-pointer"
                style={{
                  background: navMode === 'year' ? accentBg : 'transparent',
                  border: `1px solid ${navMode === 'year' ? accent : 'transparent'}`,
                }}
              >
                {currentYear}
              </button>
            </div>

            <button
              onClick={handleNextMonth}
              className="bg-[var(--color-inner-bg)] border border-[var(--color-border)] rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer text-[var(--color-text)] text-base"
            >›</button>
          </div>

          {/* Year picker dropdown */}
          {navMode === 'year' && (
            <div
              className="grid gap-1 mb-[10px] p-2 rounded-lg border border-[var(--color-border)] max-h-[120px] overflow-y-auto"
              style={{
                gridTemplateColumns: 'repeat(3, 1fr)',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              {yearList.map(y => (
                <button
                  key={y}
                  onClick={() => {
                    setViewDate(new Date(y, currentMonth, 1));
                    setNavMode(null);
                  }}
                  className="px-1 py-[6px] rounded-[6px] text-[13px] cursor-pointer"
                  style={{
                    fontWeight: y === currentYear ? '700' : '400',
                    border: y === currentYear ? `1px solid ${accent}` : '1px solid transparent',
                    background: y === currentYear ? accentBg : 'transparent',
                    color: y === currentYear ? accent : 'var(--color-text)',
                  }}
                >{y}</button>
              ))}
            </div>
          )}

          {/* Month picker dropdown */}
          {navMode === 'month' && (
            <div
              className="grid gap-1 mb-[10px] p-2 rounded-lg border border-[var(--color-border)]"
              style={{
                gridTemplateColumns: 'repeat(4, 1fr)',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              {monthShort.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => {
                    setViewDate(new Date(currentYear, idx, 1));
                    setNavMode(null);
                  }}
                  className="px-1 py-[6px] rounded-[6px] text-[12px] cursor-pointer"
                  style={{
                    fontWeight: idx === currentMonth ? '700' : '400',
                    border: idx === currentMonth ? `1px solid ${accent}` : '1px solid transparent',
                    background: idx === currentMonth ? accentBg : 'transparent',
                    color: idx === currentMonth ? accent : 'var(--color-text)',
                  }}
                >{m}</button>
              ))}
            </div>
          )}

          {/* Day Names + Calendar Grid */}
          {!navMode && (
            <>
              <div className="grid gap-[2px] mb-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {dayNames.map(day => (
                  <div key={day} className="text-center text-[10px] font-semibold text-[var(--color-text-muted)] py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {calendarDays.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className="p-[6px]" />;

                  const inRange = isInRange(date);
                  const isStart = isStartDate(date);
                  const isEnd = isEndDate(date);
                  const isTodayDate = isToday(date);
                  const isFuture = isFutureDate(date);

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(date)}
                      disabled={isFuture}
                      className="p-[6px] text-[12px] transition-all duration-150"
                      style={{
                        borderRadius: isStart || isEnd ? '6px' : '0',
                        border: isTodayDate && !inRange && !isStart && !isEnd
                          ? `1px solid ${isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'}` : 'none',
                        background: isStart || isEnd ? accent : inRange ? accentBg : 'transparent',
                        color: isStart || isEnd
                          ? (isDark ? '#000000' : '#ffffff')
                          : inRange ? accent : 'var(--color-text)',
                        fontWeight: isStart || isEnd || isTodayDate ? '600' : '400',
                        cursor: isFuture ? 'not-allowed' : 'pointer',
                        opacity: isFuture ? 0.25 : 1,
                      }}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-inner-bg)] text-[var(--color-text-secondary)] text-[14px] font-semibold cursor-pointer"
          >Cancel</button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-[10px] border-none text-[14px] font-semibold cursor-pointer"
            style={{
              background: accent,
              color: isDark ? '#000000' : '#ffffff',
            }}
          >Apply</button>
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;
