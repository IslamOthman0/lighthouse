import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';

// Date range picker modal with comprehensive quick filters
const DatePickerModal = ({ isOpen, onClose, theme }) => {
  const setDateRange = useAppStore(state => state.setDateRange);
  const dateRange = useAppStore(state => state.dateRange);

  // Local state for temporary selection before applying
  const [tempRange, setTempRange] = useState({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    preset: dateRange.preset,
  });
  const [viewDate, setViewDate] = useState(new Date());

  // Click handling for date selection (single click for single date, range selection)
  const [selectionMode, setSelectionMode] = useState('start'); // 'start' or 'end'

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset temp state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempRange({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        preset: dateRange.preset,
      });
      setViewDate(dateRange.startDate || new Date());
      setSelectionMode('start'); // Reset selection mode
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
        // Sunday to Saturday (current week)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return { startDate: weekStart, endDate: weekEnd > today ? today : weekEnd };
      }

      case 'last_week': {
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1); // Saturday of last week
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // Sunday of last week
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
  ];

  const handlePresetClick = (preset) => {
    const range = getDateRange(preset);
    setTempRange({ ...range, preset });
    if (range.startDate) {
      setViewDate(range.startDate);
    }
  };

  const handleApply = () => {
    setDateRange(tempRange.startDate, tempRange.endDate, tempRange.preset);
    onClose();
  };

  const handleCancel = () => {
    setTempRange({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      preset: dateRange.preset,
    });
    onClose();
  };

  // Calendar logic
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();

  const calendarDays = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(currentYear, currentMonth, day));
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDateClick = (date) => {
    if (!date) return;

    if (selectionMode === 'start') {
      // First click - set start date
      setTempRange({ startDate: date, endDate: date, preset: 'custom' });
      setSelectionMode('end');
    } else {
      // Second click - set end date
      if (date < tempRange.startDate) {
        // If clicked date is before start, swap them
        setTempRange({ startDate: date, endDate: tempRange.startDate, preset: 'custom' });
      } else {
        setTempRange({ ...tempRange, endDate: date, preset: 'custom' });
      }
      setSelectionMode('start');
    }
  };

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isInRange = (date) => {
    if (!date || !tempRange.startDate || !tempRange.endDate) return false;
    const d = startOfDay(date).getTime();
    const start = startOfDay(tempRange.startDate).getTime();
    const end = startOfDay(tempRange.endDate).getTime();
    return d >= start && d <= end;
  };

  const isStartDate = (date) => isSameDay(date, tempRange.startDate);
  const isEndDate = (date) => isSameDay(date, tempRange.endDate);
  const isToday = (date) => {
    if (!date) return false;
    return isSameDay(date, new Date());
  };

  // Format display of selected range
  const formatRangeDisplay = () => {
    if (tempRange.preset === 'today' && !tempRange.startDate) return 'Today';
    if (!tempRange.startDate) return 'Select dates';

    const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (isSameDay(tempRange.startDate, tempRange.endDate)) {
      return formatDate(tempRange.startDate);
    }
    return `${formatDate(tempRange.startDate)} — ${formatDate(tempRange.endDate)}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          background: theme.type === 'dark' ? 'rgba(18, 18, 18, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px',
          maxWidth: '400px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: '20px',
          border: `1px solid ${theme.border}`,
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: theme.text, margin: 0 }}>
            Select Date Range
          </h3>
          <button
            onClick={handleCancel}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: theme.textMuted,
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Selected Range Display */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: `1px solid ${theme.border}`,
            marginBottom: '16px',
            textAlign: 'center',
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
        </div>

        {/* Quick Filters */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: theme.textMuted, marginBottom: '10px' }}>
            Quick Select
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {quickPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: tempRange.preset === preset.value
                    ? '2px solid #ffffff'
                    : `1px solid ${theme.border}`,
                  background: tempRange.preset === preset.value
                    ? 'rgba(255, 255, 255, 0.12)'
                    : theme.innerBg,
                  color: tempRange.preset === preset.value
                    ? '#ffffff'
                    : theme.textSecondary,
                  fontSize: '12px',
                  fontWeight: tempRange.preset === preset.value ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (tempRange.preset !== preset.value) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (tempRange.preset !== preset.value) {
                    e.currentTarget.style.background = theme.innerBg;
                    e.currentTarget.style.borderColor = theme.border;
                  }
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: theme.textMuted, marginBottom: '10px' }}>
            Or Select Custom Range (click twice)
          </div>

          {/* Month/Year Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <button
              onClick={handlePrevMonth}
              style={{
                background: theme.innerBg,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: theme.text,
                fontSize: '16px',
              }}
            >
              ‹
            </button>
            <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>
              {monthNames[currentMonth]} {currentYear}
            </div>
            <button
              onClick={handleNextMonth}
              style={{
                background: theme.innerBg,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: theme.text,
                fontSize: '16px',
              }}
            >
              ›
            </button>
          </div>

          {/* Day Names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {dayNames.map(day => (
              <div
                key={day}
                style={{
                  textAlign: 'center',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: theme.textMuted,
                  padding: '4px 0',
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} style={{ padding: '6px' }} />;
              }

              const inRange = isInRange(date);
              const isStart = isStartDate(date);
              const isEnd = isEndDate(date);
              const isTodayDate = isToday(date);

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  style={{
                    padding: '6px',
                    borderRadius: isStart || isEnd ? '6px' : '0',
                    border: isTodayDate && !inRange && !isStart && !isEnd ? '1px solid rgba(255, 255, 255, 0.4)' : 'none',
                    background: isStart || isEnd
                      ? '#ffffff'
                      : inRange
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'transparent',
                    color: isStart || isEnd
                      ? '#000000'
                      : inRange
                        ? '#ffffff'
                        : theme.text,
                    fontSize: '12px',
                    fontWeight: isStart || isEnd || isTodayDate ? '600' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!inRange && !isStart && !isEnd) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!inRange && !isStart && !isEnd) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${theme.border}`,
              background: theme.innerBg,
              color: theme.textSecondary,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: '#ffffff',
              color: '#000000',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;
