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

  // Check if selected range extends beyond 90 days (time entry limit)
  const isLongRange = () => {
    if (!tempRange.startDate || !tempRange.endDate) return false;
    const start = toDate(tempRange.startDate);
    const end = toDate(tempRange.endDate);
    if (!start || !end) return false;
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 90;
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

  const isDark = theme.type === 'dark';
  const accent = isDark ? '#ffffff' : '#111827';
  const accentBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(17,24,39,0.08)';
  const modalBg = isDark ? 'rgba(18, 18, 18, 0.98)' : 'rgba(255, 255, 255, 0.98)';

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: '20px',
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          background: modalBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px',
          maxWidth: '420px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '20px',
          border: `1px solid ${theme.border}`,
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: theme.text, margin: 0 }}>
            Select Date Range
          </h3>
          <button
            onClick={handleCancel}
            style={{
              background: 'transparent', border: 'none', fontSize: '24px',
              cursor: 'pointer', color: theme.textMuted, padding: '0',
              width: '32px', height: '32px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', borderRadius: '8px',
            }}
          >×</button>
        </div>

        {/* Selected Range Display */}
        <div
          style={{
            padding: '12px 16px', borderRadius: '10px',
            background: accentBg,
            border: `1px solid ${theme.border}`,
            marginBottom: '16px', textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>
            Selected Range
          </div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: theme.text }}>
            {formatRangeDisplay()}
          </div>
          {tempRange.preset !== 'custom' && tempRange.preset !== 'today' && (
            <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>
              {quickPresets.find(p => p.value === tempRange.preset)?.label}
            </div>
          )}
          {isLongRange() && (
            <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              ⚠ Time entries available for last 90 days only. Older dates show task data only.
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: theme.textMuted, marginBottom: '10px' }}>
            Quick Select
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {quickPresets.map((preset) => {
              const isActive = tempRange.preset === preset.value;
              return (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset.value)}
                  style={{
                    padding: '8px 10px', borderRadius: '8px',
                    border: isActive ? `2px solid ${accent}` : `1px solid ${theme.border}`,
                    background: isActive ? accentBg : theme.innerBg,
                    color: isActive ? accent : theme.textSecondary,
                    fontSize: '12px', fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: theme.textMuted, marginBottom: '8px' }}>
            Custom Range
          </div>

          {/* Selection mode hint */}
          {tempRange.preset === 'custom' && (
            <div style={{
              fontSize: '11px', textAlign: 'center', marginBottom: '8px',
              color: selectionMode === 'start' ? theme.textMuted : accent,
              fontWeight: '500',
            }}>
              {selectionMode === 'start' ? 'Click a day to set start date' : '▶ Now click end date'}
            </div>
          )}

          {/* Month/Year Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button
              onClick={handlePrevMonth}
              style={{
                background: theme.innerBg, border: `1px solid ${theme.border}`,
                borderRadius: '8px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: theme.text, fontSize: '16px',
              }}
            >‹</button>

            {/* Month/Year header — click to open year/month picker */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setNavMode(navMode === 'month' ? null : 'month')}
                style={{
                  background: navMode === 'month' ? accentBg : 'transparent',
                  border: `1px solid ${navMode === 'month' ? accent : 'transparent'}`,
                  borderRadius: '6px', padding: '4px 8px',
                  fontSize: '14px', fontWeight: '600', color: theme.text,
                  cursor: 'pointer',
                }}
              >
                {monthNames[currentMonth]}
              </button>
              <button
                onClick={() => setNavMode(navMode === 'year' ? null : 'year')}
                style={{
                  background: navMode === 'year' ? accentBg : 'transparent',
                  border: `1px solid ${navMode === 'year' ? accent : 'transparent'}`,
                  borderRadius: '6px', padding: '4px 8px',
                  fontSize: '14px', fontWeight: '600', color: theme.text,
                  cursor: 'pointer',
                }}
              >
                {currentYear}
              </button>
            </div>

            <button
              onClick={handleNextMonth}
              style={{
                background: theme.innerBg, border: `1px solid ${theme.border}`,
                borderRadius: '8px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: theme.text, fontSize: '16px',
              }}
            >›</button>
          </div>

          {/* Year picker dropdown */}
          {navMode === 'year' && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px',
              marginBottom: '10px', padding: '8px', borderRadius: '8px',
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${theme.border}`,
              maxHeight: '120px', overflowY: 'auto',
            }}>
              {yearList.map(y => (
                <button
                  key={y}
                  onClick={() => {
                    setViewDate(new Date(y, currentMonth, 1));
                    setNavMode(null);
                  }}
                  style={{
                    padding: '6px 4px', borderRadius: '6px', fontSize: '13px',
                    fontWeight: y === currentYear ? '700' : '400',
                    border: y === currentYear ? `1px solid ${accent}` : '1px solid transparent',
                    background: y === currentYear ? accentBg : 'transparent',
                    color: y === currentYear ? accent : theme.text,
                    cursor: 'pointer',
                  }}
                >{y}</button>
              ))}
            </div>
          )}

          {/* Month picker dropdown */}
          {navMode === 'month' && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px',
              marginBottom: '10px', padding: '8px', borderRadius: '8px',
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${theme.border}`,
            }}>
              {monthShort.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => {
                    setViewDate(new Date(currentYear, idx, 1));
                    setNavMode(null);
                  }}
                  style={{
                    padding: '6px 4px', borderRadius: '6px', fontSize: '12px',
                    fontWeight: idx === currentMonth ? '700' : '400',
                    border: idx === currentMonth ? `1px solid ${accent}` : '1px solid transparent',
                    background: idx === currentMonth ? accentBg : 'transparent',
                    color: idx === currentMonth ? accent : theme.text,
                    cursor: 'pointer',
                  }}
                >{m}</button>
              ))}
            </div>
          )}

          {/* Day Names */}
          {!navMode && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                {dayNames.map(day => (
                  <div key={day} style={{
                    textAlign: 'center', fontSize: '10px',
                    fontWeight: '600', color: theme.textMuted, padding: '4px 0',
                  }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {calendarDays.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} style={{ padding: '6px' }} />;

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
                      style={{
                        padding: '6px', borderRadius: isStart || isEnd ? '6px' : '0',
                        border: isTodayDate && !inRange && !isStart && !isEnd
                          ? `1px solid ${isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'}` : 'none',
                        background: isStart || isEnd
                          ? accent
                          : inRange ? accentBg : 'transparent',
                        color: isStart || isEnd
                          ? (isDark ? '#000000' : '#ffffff')
                          : inRange ? accent : theme.text,
                        fontSize: '12px',
                        fontWeight: isStart || isEnd || isTodayDate ? '600' : '400',
                        cursor: isFuture ? 'not-allowed' : 'pointer',
                        opacity: isFuture ? 0.25 : 1,
                        transition: 'all 0.15s ease',
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: `1px solid ${theme.border}`, background: theme.innerBg,
              color: theme.textSecondary, fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleApply}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: 'none', background: accent,
              color: isDark ? '#000000' : '#ffffff',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}
          >Apply</button>
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;
