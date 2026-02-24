import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Avatar from '../ui/Avatar';
import StatusBadge from '../ui/StatusBadge';
import Sparkline, { SparklineWithStats } from '../ui/Sparkline';
import PriorityFlag from '../ui/PriorityFlag';
import { getFontFamily, getAdaptiveFontFamily, tabularNumberStyle } from '../../utils/typography';
import { formatHoursToHM, formatMinutesToHM } from '../../utils/timeFormat';
import { clickup } from '../../services/clickup';
import { taskCacheV2 } from '../../services/taskCacheV2';
import { useSettings } from '../../hooks/useSettings';
import { DEFAULT_MEMBER_QUOTAS } from '../../constants/defaults';
import { db } from '../../db';
import { hexToRgba } from '../../utils/colorHelpers';
import { useAppStore } from '../../stores/useAppStore';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

// ClickUp status colors
const statusColors = {
  todo: { bg: '#6b7280', dot: '#6b7280' },
  inProgress: { bg: '#f59e0b', dot: '#f59e0b' },
  done: { bg: '#10b981', dot: '#10b981' },
  ready: { bg: '#10b981', dot: '#10b981' },
  review: { bg: '#8b5cf6', dot: '#8b5cf6' },
  blocked: { bg: '#ef4444', dot: '#ef4444' },
};

// Priority config (kept for backward compat in grouping logic)
const priorityConfig = {
  Urgent: { color: '#F50537' },
  High: { color: '#FFCC00' },
  Normal: { color: '#6FDDFF' },
  Medium: { color: '#6FDDFF' },
  Low: { color: '#D8D8D8' },
};

// Format time in 12-hour format
const formatTime12h = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();
};

// Format date for display
const formatDisplayDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};

// Get date range for "This Week" (Sunday to Today, Cairo timezone)
const getThisWeekRange = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);
  return { start: sunday, end: today };
};

/**
 * Fetch weekly performance data from ClickUp API
 * @param {Object} member - Member object with clickUpId
 * @returns {Promise<Object>} Weekly hours data and project breakdown
 */
const fetchWeeklyPerformanceData = async (member) => {
  if (!member?.clickUpId) {
    return { weeklyHours: [], byProject: [], totalTracked: 0, totalTasks: 0 };
  }

  const { start, end } = getThisWeekRange();
  const startTimestamp = Math.floor(start.getTime() / 1000);
  const endTimestamp = Math.floor(end.getTime() / 1000);

  try {
    // Fetch time entries for the week
    const timeEntries = await clickup.getTimeEntries(startTimestamp, endTimestamp, [member.clickUpId]);

    if (!timeEntries || timeEntries.length === 0) {
      return { weeklyHours: [], byProject: [], totalTracked: 0, totalTasks: 0 };
    }

    // Group time entries by day
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyHoursMap = {};
    const projectMap = {};
    const taskIds = new Set();

    // Initialize all days from Sunday to today
    const current = new Date(start);
    while (current <= end) {
      const dayName = dayNames[current.getDay()];
      weeklyHoursMap[dayName] = { day: dayName, hours: 0, isFuture: false };
      current.setDate(current.getDate() + 1);
    }

    // Mark future days
    const today = new Date();
    for (let i = today.getDay() + 1; i <= 6; i++) {
      const dayName = dayNames[i];
      weeklyHoursMap[dayName] = { day: dayName, hours: 0, isFuture: true };
    }

    // Process time entries
    timeEntries.forEach(entry => {
      const duration = parseInt(entry.duration, 10);
      const isLive = duration < 0;
      const startTime = new Date(parseInt(entry.start));
      const dayName = dayNames[startTime.getDay()];

      // Calculate hours
      const trackedMinutes = isLive
        ? Math.floor((Date.now() - startTime.getTime()) / 60000)
        : Math.floor(duration / 60000);
      const trackedHours = trackedMinutes / 60;

      // Add to daily total
      if (weeklyHoursMap[dayName]) {
        weeklyHoursMap[dayName].hours += trackedHours;
      }

      // Track unique tasks
      if (entry.task?.id) {
        taskIds.add(entry.task.id);
      }

      // Group by project
      const projectName = entry.task_location?.list_name || 'Other';
      if (!projectMap[projectName]) {
        projectMap[projectName] = { name: projectName, hours: 0, tasks: new Set() };
      }
      projectMap[projectName].hours += trackedHours;
      if (entry.task?.id) {
        projectMap[projectName].tasks.add(entry.task.id);
      }
    });

    // Convert to arrays
    const weeklyHours = dayNames
      .slice(0, today.getDay() + 1)
      .map(day => ({
        ...weeklyHoursMap[day],
        hours: Math.round(weeklyHoursMap[day]?.hours * 10) / 10 || 0,
      }));

    // Add future days
    for (let i = today.getDay() + 1; i <= 6; i++) {
      weeklyHours.push({ day: dayNames[i], hours: 0, isFuture: true });
    }

    const byProject = Object.values(projectMap)
      .map(p => ({
        name: p.name,
        hours: Math.round(p.hours * 10) / 10,
        tasks: p.tasks.size,
      }))
      .sort((a, b) => b.hours - a.hours);

    const totalTracked = weeklyHours
      .filter(d => !d.isFuture)
      .reduce((sum, d) => sum + d.hours, 0);

    return {
      weeklyHours,
      byProject,
      totalTracked: Math.round(totalTracked * 10) / 10,
      totalTasks: taskIds.size,
    };
  } catch (error) {
    console.error('Failed to fetch weekly performance data:', error);
    return { weeklyHours: [], byProject: [], totalTracked: 0, totalTasks: 0 };
  }
};

// Calculate number of days between two dates (inclusive)
const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate || startDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

// Format leave date range for display
const formatLeaveDate = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate || startDate);
  const options = { month: 'short', day: 'numeric' };

  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', options);
  }
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
};

// Build calendar events object from leaves array
const buildCalendarEvents = (leaves) => {
  const events = {};
  leaves.forEach(leave => {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate || leave.startDate);
    const current = new Date(start);

    while (current <= end) {
      const day = current.getDate();
      events[day] = leave.type === 'wfh' ? 'wfh' : 'leave';
      current.setDate(current.getDate() + 1);
    }
  });
  return events;
};

/**
 * Fetch real timeline data from ClickUp API
 * @param {Object} member - Member object with clickUpId
 * @param {Date} selectedDate - Date to fetch entries for
 * @returns {Promise<Object>} { tasks: Array, breaks: Array }
 */
const fetchTimelineData = async (member, selectedDate) => {
  if (!member?.clickUpId) {
    return { tasks: [], breaks: [] };
  }

  // Calculate date range (start of day to end of day in Unix seconds)
  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
  const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

  try {
    // Fetch time entries from ClickUp
    const timeEntries = await clickup.getTimeEntries(startTimestamp, endTimestamp, [member.clickUpId]);

    if (!timeEntries || timeEntries.length === 0) {
      return { tasks: [], breaks: [] };
    }

    // Transform time entries to timeline tasks
    const tasks = timeEntries
      .filter(entry => entry.task?.id)
      .map(entry => {
        const duration = parseInt(entry.duration, 10);
        const isLive = duration < 0; // Negative duration = active timer
        const startTime = new Date(parseInt(entry.start));
        const endTime = entry.end ? new Date(parseInt(entry.end)) : null;
        const trackedMinutes = isLive
          ? Math.floor((Date.now() - startTime.getTime()) / 60000)
          : Math.floor(duration / 60000);

        // Get task details from cache
        const cachedTask = taskCacheV2.get(entry.task.id);

        // Map ClickUp status type to our status keys
        const statusType = entry.task?.status?.type || 'custom';
        let status = 'todo';
        if (statusType === 'done' || statusType === 'closed') status = 'done';
        else if (statusType === 'in progress' || statusType === 'open') status = 'inProgress';
        else if (entry.task?.status?.status?.toLowerCase()?.includes('ready')) status = 'ready';
        else if (entry.task?.status?.status?.toLowerCase()?.includes('review')) status = 'review';

        // Get priority from cache or time entry
        let priority = 'Normal';
        if (cachedTask?.priority) {
          const p = cachedTask.priority.priority;
          if (p === 'urgent' || p === 1) priority = 'Urgent';
          else if (p === 'high' || p === 2) priority = 'High';
          else if (p === 'normal' || p === 3) priority = 'Normal';
          else if (p === 'low' || p === 4) priority = 'Low';
        }

        return {
          id: entry.id,
          taskId: entry.task.id,
          name: entry.task.name || 'Unknown Task',
          project: entry.task_location?.list_name || cachedTask?.list?.name || 'Unknown',
          status,
          priority,
          startTime,
          endTime,
          trackedMinutes,
          clickUpUrl: cachedTask?.url || `https://app.clickup.com/t/${entry.task.id}`,
          isLive,
        };
      })
      .sort((a, b) => a.startTime - b.startTime);

    // Calculate breaks (gaps > 5 minutes between consecutive tasks)
    const breaks = [];
    for (let i = 0; i < tasks.length - 1; i++) {
      const currentEnd = tasks[i].endTime;
      const nextStart = tasks[i + 1].startTime;
      if (currentEnd && nextStart) {
        const gapMinutes = Math.round((nextStart - currentEnd) / (1000 * 60));
        if (gapMinutes > 5) { // Only show breaks > 5 minutes
          breaks.push({
            id: `break-${i}`,
            afterTaskId: tasks[i].id,
            startTime: currentEnd,
            endTime: nextStart,
            durationMinutes: gapMinutes,
          });
        }
      }
    }

    return { tasks, breaks };
  } catch (error) {
    console.error('Failed to fetch timeline data:', error);
    return { tasks: [], breaks: [] };
  }
};

// Tab Button Component
const TabButton = ({ label, isActive, onClick, theme }) => (
  <button
    onClick={onClick}
    data-testid={`tab-${label.toLowerCase()}`}
    style={{
      padding: '8px 16px',
      border: 'none',
      background: isActive ? hexToRgba(theme.accent, 0.12) : 'transparent',
      color: isActive ? theme.accent : theme.textSecondary,
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      borderRadius: '6px',
      transition: 'all 0.15s',
      fontFamily: getFontFamily('english'),
    }}
  >
    {label}
  </button>
);

// Date Picker Button Component
const DatePickerButton = ({ label, isActive, onClick, theme }) => (
  <button
    onClick={onClick}
    style={{
      padding: '6px 12px',
      border: `1px solid ${isActive ? theme.accent : theme.borderLight}`,
      background: isActive ? hexToRgba(theme.accent, 0.08) : 'transparent',
      color: isActive ? theme.accent : theme.textSecondary,
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      borderRadius: '6px',
      transition: 'all 0.15s',
      fontFamily: getFontFamily('english'),
    }}
  >
    {label}
  </button>
);

// Timeline Task Card Component
const TimelineTaskCard = ({ task, theme, isLive }) => {
  const taskStatusStyle = statusColors[task.status] || statusColors.todo;
  const priorityStyle = priorityConfig[task.priority] || priorityConfig.Low;

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        background: theme.secondaryBg,
        borderRadius: '8px',
        border: `1px solid ${theme.borderLight}`,
        cursor: task.clickUpUrl ? 'pointer' : 'default',
        transition: 'all 0.15s',
        animation: isLive ? 'softPulse 2s ease-in-out infinite' : 'none',
        boxShadow: isLive ? `0 0 12px ${theme.working}30` : 'none',
      }}
      onClick={() => task.clickUpUrl && window.open(task.clickUpUrl, '_blank')}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme.tertiaryBg || theme.cardBg;
        e.currentTarget.style.borderColor = hexToRgba(theme.accent, 0.25);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = theme.secondaryBg;
        e.currentTarget.style.borderColor = theme.borderLight;
      }}
    >
      {/* Time Column */}
      <div
        style={{
          minWidth: '75px',
          textAlign: 'right',
          paddingRight: '8px',
          borderRight: `2px solid ${taskStatusStyle.dot}`,
          ...tabularNumberStyle,
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: '600', color: theme.text }}>
          {formatTime12h(task.startTime)}
        </div>
        <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>
          {task.endTime ? formatTime12h(task.endTime) : (
            <span style={{ color: theme.working }}>ongoing</span>
          )}
        </div>
      </div>

      {/* Task Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Task Name */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: theme.text,
            fontFamily: getAdaptiveFontFamily(task.name),
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {/* Status dot */}
          <span style={{ color: taskStatusStyle.dot, fontSize: '8px' }}>●</span>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.name}
          </span>
          {isLive && (
            <span
              style={{
                fontSize: '9px',
                padding: '2px 6px',
                background: hexToRgba(theme.working, 0.12),
                color: theme.working,
                borderRadius: '4px',
                fontWeight: '600',
                fontFamily: getFontFamily('english'),
              }}
            >
              LIVE
            </span>
          )}
        </div>

        {/* Task Meta */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px',
            color: theme.textSecondary,
          }}
        >
          {/* Project */}
          <span style={{ fontFamily: getFontFamily('english') }}>
            📁 {task.project}
          </span>

          {/* Time tracked */}
          <span style={{ ...tabularNumberStyle }}>
            ⏱️ {formatMinutesToHM(task.trackedMinutes)}
          </span>

          {/* Priority */}
          <PriorityFlag priority={task.priority} showLabel={false} size={13} />

          {/* ClickUp link indicator */}
          {task.clickUpUrl && (
            <span style={{ fontSize: '10px', opacity: 0.5 }}>↗</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Break Card Component
const BreakCard = ({ breakData, theme }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      marginLeft: '87px',
      borderLeft: `2px dashed ${theme.break}40`,
    }}
  >
    <span style={{ fontSize: '14px' }}>☕</span>
    <span
      style={{
        fontSize: '11px',
        color: theme.break,
        fontWeight: '500',
        ...tabularNumberStyle,
      }}
    >
      {formatMinutesToHM(breakData.durationMinutes)} break
    </span>
    <span
      style={{
        fontSize: '10px',
        color: theme.textMuted,
        ...tabularNumberStyle,
      }}
    >
      {formatTime12h(breakData.startTime)} → {formatTime12h(breakData.endTime)}
    </span>
  </div>
);

// Summary Metrics Component
const SummaryMetrics = ({ tasks, breaks, member, theme }) => {
  const totalTracked = tasks.reduce((sum, t) => sum + t.trackedMinutes, 0);
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const totalBreaks = breaks.reduce((sum, b) => sum + b.durationMinutes, 0);

  // Calculate efficiency (tracked time / total time since first task start)
  const firstTask = tasks[0];
  const lastTask = tasks[tasks.length - 1];
  let efficiency = 0;

  if (firstTask && lastTask) {
    const startTime = firstTask.startTime;
    const endTime = lastTask.endTime || new Date();
    const totalSpanMinutes = Math.round((endTime - startTime) / (1000 * 60));
    if (totalSpanMinutes > 0) {
      efficiency = Math.round((totalTracked / totalSpanMinutes) * 100);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        padding: '10px 16px',
        background: theme.secondaryBg,
        borderRadius: '8px',
        marginBottom: '16px',
      }}
    >
      {[
        { label: 'Tracked', value: formatMinutesToHM(totalTracked), icon: '⏱️' },
        { label: 'Tasks', value: `${completedTasks}/${tasks.length}`, icon: '✅' },
        { label: 'Breaks', value: formatMinutesToHM(totalBreaks), icon: '☕' },
        { label: 'Efficiency', value: `${efficiency}%`, icon: '📊' },
      ].map((metric, i) => (
        <div key={i} style={{ textAlign: 'center', flex: 1 }}>
          <div
            style={{
              fontSize: '10px',
              color: theme.textMuted,
              marginBottom: '2px',
              fontFamily: getFontFamily('english'),
            }}
          >
            {metric.icon} {metric.label}
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: '700',
              color: theme.text,
              ...tabularNumberStyle,
            }}
          >
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
};

// Main Modal Component
const MemberDetailModal = ({ isOpen, onClose, member, theme }) => {
  const { settings } = useSettings();
  const storeMembers = useAppStore(state => state.members);
  const globalDateRange = useAppStore(state => state.dateRange);
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Initialize from global date range if available, otherwise today
    if (globalDateRange?.startDate) {
      const [y, m, d] = globalDateRange.startDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  const [dateMode, setDateMode] = useState('today'); // today, yesterday, thisWeek, custom
  const [weekDayIndex, setWeekDayIndex] = useState(null); // For week navigation
  const [isLoading, setIsLoading] = useState(false);
  const [timelineData, setTimelineData] = useState({ tasks: [], breaks: [] });
  const [leavesData, setLeavesData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [isPerfLoading, setIsPerfLoading] = useState(false);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      lockScroll();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (isOpen) unlockScroll();
    };
  }, [isOpen, onClose]);

  // Sync selectedDate with global date range when modal opens
  useEffect(() => {
    if (isOpen && globalDateRange?.startDate) {
      const [y, m, d] = globalDateRange.startDate.split('-').map(Number);
      setSelectedDate(new Date(y, m - 1, d));
      setDateMode('custom');
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch timeline data when member or date changes (debounced 300ms)
  useEffect(() => {
    if (!isOpen || !member) return;

    let isCancelled = false;
    const timer = setTimeout(() => {
      setIsLoading(true);
      fetchTimelineData(member, selectedDate)
        .then(data => {
          if (!isCancelled) {
            setTimelineData(data);
            setIsLoading(false);
          }
        })
        .catch(error => {
          console.error('Error fetching timeline:', error);
          if (!isCancelled) {
            setTimelineData({ tasks: [], breaks: [] });
            setIsLoading(false);
          }
        });
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, member, selectedDate]);

  // Fetch performance data when Performance tab is active
  useEffect(() => {
    if (!isOpen || !member || activeTab !== 'performance') return;

    let isCancelled = false;
    setIsPerfLoading(true);

    fetchWeeklyPerformanceData(member)
      .then(data => {
        if (!isCancelled) {
          setPerformanceData(data);
          setIsPerfLoading(false);
        }
      })
      .catch(error => {
        console.error('Error fetching performance data:', error);
        if (!isCancelled) {
          setPerformanceData({ weeklyHours: [], byProject: [], totalTracked: 0, totalTasks: 0 });
          setIsPerfLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, member, activeTab]);

  // Fetch leaves data when member changes
  useEffect(() => {
    if (!isOpen || !member) return;

    const fetchLeavesData = async () => {
      try {
        // Get member's leave quota from settings
        const memberId = member.clickUpId || member.id;
        const leaveQuota = settings?.team?.leaveQuotas?.[memberId] ?? DEFAULT_MEMBER_QUOTAS.annualLeave;
        const wfhQuota = settings?.team?.wfhQuotas?.[memberId] ?? DEFAULT_MEMBER_QUOTAS.wfhDays;

        // Try to fetch leaves from database
        const currentYear = new Date().getFullYear();
        let memberLeaves = [];

        try {
          const allMemberLeaves = await db.leaves.toArray();
          memberLeaves = allMemberLeaves.filter(l =>
            String(l.memberId) === String(memberId) ||
            String(l.memberClickUpId) === String(memberId)
          );

          // Filter for current year
          memberLeaves = memberLeaves.filter(l => {
            const year = new Date(l.startDate).getFullYear();
            return year === currentYear;
          });
        } catch (err) {
          console.log('No leaves data in DB:', err);
        }

        // Calculate used days by type
        const annualUsed = memberLeaves
          .filter(l => l.type === 'annual')
          .reduce((sum, l) => sum + calculateDays(l.startDate, l.endDate), 0);
        const sickUsed = memberLeaves
          .filter(l => l.type === 'sick')
          .reduce((sum, l) => sum + calculateDays(l.startDate, l.endDate), 0);
        const bonusUsed = memberLeaves
          .filter(l => l.type === 'bonus')
          .reduce((sum, l) => sum + calculateDays(l.startDate, l.endDate), 0);

        // Calculate WFH this month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const wfhThisMonth = memberLeaves
          .filter(l => {
            if (l.type !== 'wfh') return false;
            const date = new Date(l.startDate);
            return date >= monthStart && date <= monthEnd;
          }).length;

        // Build upcoming leaves
        const upcoming = memberLeaves
          .filter(l => new Date(l.startDate) >= new Date())
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
          .slice(0, 4)
          .map(l => ({
            type: l.type,
            icon: l.type === 'annual' ? '🏖️' : l.type === 'sick' ? '🏥' : l.type === 'wfh' ? '🏠' : '🎁',
            date: formatLeaveDate(l.startDate, l.endDate),
            label: `${l.type.charAt(0).toUpperCase() + l.type.slice(1)} Leave`,
            days: calculateDays(l.startDate, l.endDate),
            status: l.status || 'scheduled',
          }));

        setLeavesData({
          year: currentYear,
          annual: { total: leaveQuota, used: annualUsed, maxTransfer: 10 },
          sick: { total: 10, used: sickUsed },
          bonus: { total: 5, used: bonusUsed },
          wfh: { monthlyQuota: wfhQuota, usedThisMonth: wfhThisMonth },
          upcoming,
          suggestions: annualUsed < leaveQuota / 2 ? [`${leaveQuota - annualUsed} days remaining - consider planning vacation`] : [],
          calendarEvents: buildCalendarEvents(memberLeaves),
        });
      } catch (error) {
        console.error('Error fetching leaves data:', error);
        // Set default values if fetch fails
        setLeavesData({
          year: new Date().getFullYear(),
          annual: { total: DEFAULT_MEMBER_QUOTAS.annualLeave, used: 0, maxTransfer: 10 },
          sick: { total: 10, used: 0 },
          bonus: { total: 5, used: 0 },
          wfh: { monthlyQuota: DEFAULT_MEMBER_QUOTAS.wfhDays, usedThisMonth: 0 },
          upcoming: [],
          suggestions: [],
          calendarEvents: {},
        });
      }
    };

    fetchLeavesData();
  }, [isOpen, member, settings]);

  // Week days for navigation (when in "This Week" mode)
  const weekDays = useMemo(() => {
    const { start, end } = getThisWeekRange();
    const days = [];
    const current = new Date(start);

    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, []);

  // Handle date selection
  const handleDateModeChange = (mode) => {
    setDateMode(mode);
    setWeekDayIndex(null);

    if (mode === 'today') {
      setSelectedDate(new Date());
    } else if (mode === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setSelectedDate(yesterday);
    } else if (mode === 'thisWeek') {
      setSelectedDate(new Date());
      setWeekDayIndex(weekDays.length - 1); // Default to today
    }
  };

  // Handle week day navigation
  const handleWeekDaySelect = (index) => {
    setWeekDayIndex(index);
    setSelectedDate(weekDays[index]);
  };

  // Refresh timeline data from API
  const handleSync = useCallback(() => {
    if (!member) return;

    setIsLoading(true);
    fetchTimelineData(member, selectedDate)
      .then(data => {
        setTimelineData(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error refreshing timeline:', error);
        setIsLoading(false);
      });
  }, [member, selectedDate]);

  if (!isOpen || !member) return null;

  const isMobile = window.innerWidth < 768;

  // Calculate progress for header
  const progressPercent = member.target > 0
    ? Math.round((member.tracked / member.target) * 100)
    : 0;

  const getProgressColor = (percent) => {
    if (percent >= 80) return theme.success;
    if (percent >= 60) return theme.warning;
    return theme.danger;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '8px' : '16px',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(32px)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="member-detail-modal"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isMobile ? '100%' : '700px',
          maxHeight: '90vh',
          background: theme.type === 'dark'
            ? 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))'
            : 'linear-gradient(155deg, rgba(255,255,255,0.98), rgba(255,255,255,0.95))',
          borderRadius: '12px',
          border: `1px solid ${theme.border}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalSlideIn 0.2s ease-out',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: `1px solid ${theme.borderLight}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <Avatar name={member.name} status={member.status} theme={theme} size={50} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: theme.text,
                  fontFamily: getAdaptiveFontFamily(member.name),
                  marginBottom: '4px',
                }}
              >
                {member.name}
              </div>
              <StatusBadge status={member.status} theme={theme} />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                background: theme.secondaryBg,
                color: theme.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = theme.danger + '20';
                e.target.style.color = theme.danger;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = theme.secondaryBg;
                e.target.style.color = theme.textSecondary;
              }}
            >
              ✕
            </button>
          </div>

          {/* Progress bar */}
          {member.status !== 'leave' && (
            <div style={{ marginTop: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '11px', color: theme.textMuted }}>
                  Today's Progress
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: getProgressColor(progressPercent),
                    ...tabularNumberStyle,
                  }}
                >
                  {formatHoursToHM(member.tracked)} / {formatHoursToHM(member.target)} ({progressPercent}%)
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: theme.secondaryBg,
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(progressPercent, 100)}%`,
                    height: '100%',
                    background: getProgressColor(progressPercent),
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '8px 16px',
            borderBottom: `1px solid ${theme.borderLight}`,
            background: theme.secondaryBg,
          }}
        >
          <TabButton
            label="Timeline"
            isActive={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
            theme={theme}
          />
          <TabButton
            label="Performance"
            isActive={activeTab === 'performance'}
            onClick={() => setActiveTab('performance')}
            theme={theme}
          />
          <TabButton
            label="Leaves"
            isActive={activeTab === 'leaves'}
            onClick={() => setActiveTab('leaves')}
            theme={theme}
          />
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <>
              {/* Date Navigation */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <DatePickerButton
                  label="Today"
                  isActive={dateMode === 'today'}
                  onClick={() => handleDateModeChange('today')}
                  theme={theme}
                />
                <DatePickerButton
                  label="Yesterday"
                  isActive={dateMode === 'yesterday'}
                  onClick={() => handleDateModeChange('yesterday')}
                  theme={theme}
                />
                <DatePickerButton
                  label="This Week"
                  isActive={dateMode === 'thisWeek'}
                  onClick={() => handleDateModeChange('thisWeek')}
                  theme={theme}
                />
                <DatePickerButton
                  label="Custom"
                  isActive={dateMode === 'custom'}
                  onClick={() => handleDateModeChange('custom')}
                  theme={theme}
                />

                {/* Sync button */}
                <button
                  onClick={handleSync}
                  disabled={isLoading}
                  style={{
                    marginLeft: 'auto',
                    padding: '6px 10px',
                    border: 'none',
                    background: 'transparent',
                    color: theme.textSecondary,
                    fontSize: '14px',
                    cursor: isLoading ? 'wait' : 'pointer',
                    borderRadius: '6px',
                    transition: 'all 0.15s',
                    animation: isLoading ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  ⟳
                </button>
              </div>

              {/* Week Day Navigation (when This Week is selected) */}
              {dateMode === 'thisWeek' && (
                <div
                  style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '16px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                  }}
                >
                  {weekDays.map((day, index) => {
                    const isSelected = weekDayIndex === index;
                    const isToday = day.toDateString() === new Date().toDateString();

                    return (
                      <button
                        key={index}
                        onClick={() => handleWeekDaySelect(index)}
                        style={{
                          padding: '8px 12px',
                          border: `1px solid ${isSelected ? theme.accent : theme.borderLight}`,
                          background: isSelected ? hexToRgba(theme.accent, 0.08) : 'transparent',
                          color: isSelected ? theme.accent : theme.textSecondary,
                          fontSize: '11px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          transition: 'all 0.15s',
                          textAlign: 'center',
                          minWidth: '50px',
                          flexShrink: 0,
                          fontFamily: getFontFamily('english'),
                        }}
                      >
                        <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px' }}>
                          {day.getDate()}
                        </div>
                        {isToday && (
                          <div
                            style={{
                              width: '4px',
                              height: '4px',
                              background: theme.accent,
                              borderRadius: '50%',
                              margin: '4px auto 0',
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected Date Display */}
              <div
                style={{
                  fontSize: '12px',
                  color: theme.textMuted,
                  marginBottom: '12px',
                  fontFamily: getFontFamily('english'),
                }}
              >
                📅 {formatDisplayDate(selectedDate)}
              </div>

              {/* Summary Metrics */}
              <SummaryMetrics
                tasks={timelineData.tasks}
                breaks={timelineData.breaks}
                member={member}
                theme={theme}
              />

              {/* Timeline */}
              {isLoading ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: theme.textMuted,
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                  <div style={{ fontSize: '13px' }}>Loading timeline...</div>
                </div>
              ) : timelineData.tasks.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: theme.textMuted,
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📋</div>
                  <div style={{ fontSize: '13px', fontFamily: getFontFamily('english') }}>
                    No tasks recorded for this day
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {timelineData.tasks.map((task, index) => {
                    // Find break after this task
                    const breakAfter = timelineData.breaks.find(b => b.afterTaskId === task.id);

                    return (
                      <React.Fragment key={task.id}>
                        <TimelineTaskCard
                          task={task}
                          theme={theme}
                          isLive={task.isLive}
                        />
                        {breakAfter && (
                          <BreakCard breakData={breakAfter} theme={theme} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (() => {
            // Show loading state
            if (isPerfLoading) {
              return (
                <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                  <div style={{ fontSize: '13px' }}>Loading performance data...</div>
                </div>
              );
            }

            // Use real data from member object and fetched performance data
            const targetHours = member.target || 6.5;
            const trackedHours = member.tracked || 0;
            const totalTasks = member.tasks || 0;
            const completedTasks = member.done || 0;

            // Use fetched weekly data if available
            const weeklyData = performanceData?.weeklyHours || [];
            const projectData = performanceData?.byProject || [];

            // Calculate percentages
            const timePercent = targetHours > 0 ? Math.round((trackedHours / targetHours) * 100) : 0;
            const tasksPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const onTimePercent = member.compliance || 85;

            // Build performance data
            const perfData = {
              timePercent,
              tasksPercent,
              onTimePercent,
              score: member.score || Math.round(timePercent * 0.4 + tasksPercent * 0.2 + onTimePercent * 0.3 + 10),
              previousScore: 0,
              rank: member.rank || 1,
              teamSize: storeMembers?.length || 8,
              tracked: { current: trackedHours, target: targetHours },
              tasks: { completed: completedTasks, total: totalTasks, onTime: Math.round(completedTasks * 0.85) },
              weeklyHours: weeklyData.length > 0 ? weeklyData : [
                { day: 'Sun', hours: 0, isFuture: false },
                { day: 'Mon', hours: 0, isFuture: false },
                { day: 'Tue', hours: 0, isFuture: false },
                { day: 'Wed', hours: 0, isFuture: false },
                { day: 'Thu', hours: trackedHours, isFuture: false },
                { day: 'Fri', hours: 0, isFuture: true },
                { day: 'Sat', hours: 0, isFuture: true },
              ],
              byProject: projectData,
            };

            // Calculate insights from real data
            const actualDays = perfData.weeklyHours.filter(d => !d.isFuture && d.hours > 0);
            const bestDay = actualDays.length > 0
              ? actualDays.reduce((a, b) => a.hours > b.hours ? a : b)
              : { day: 'N/A', hours: 0 };

            const scoreDiff = perfData.score - perfData.previousScore;
            const percentile = Math.round(((perfData.teamSize - perfData.rank + 1) / perfData.teamSize) * 100);
            const totalWeekHours = perfData.weeklyHours.filter(d => !d.isFuture).reduce((sum, d) => sum + d.hours, 0);

            // Prepare sparkline data (hours per day)
            const sparklineData = perfData.weeklyHours.filter(d => !d.isFuture).map(d => d.hours);
            const sparklineLabels = perfData.weeklyHours.filter(d => !d.isFuture).map(d => d.day);

            return (
              <>
                {/* Performance Score Hero Card */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${hexToRgba(theme.accent, 0.08)}, ${hexToRgba(theme.accent, 0.03)})`,
                    border: `1px solid ${hexToRgba(theme.accent, 0.25)}`,
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '8px', fontFamily: getFontFamily('english') }}>
                    🏆 Performance Score
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '36px', fontWeight: '700', color: theme.text, ...tabularNumberStyle }}>
                      {perfData.score}
                    </div>
                    <div style={{ fontSize: '18px', color: theme.textMuted, ...tabularNumberStyle }}>/100</div>
                    {scoreDiff !== 0 && (
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: scoreDiff >= 0 ? theme.success : theme.error,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        {scoreDiff >= 0 ? '↑' : '↓'} {Math.abs(scoreDiff)}
                      </div>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '6px', background: theme.border, borderRadius: '3px', marginBottom: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${perfData.score}%`, height: '100%', background: theme.accent, borderRadius: '3px' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
                    #{perfData.rank} of {perfData.teamSize} team members • Top {percentile}%
                  </div>
                </div>

                {/* 3 Metric Cards: Time, Tasks, On-Time */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {[
                    {
                      icon: '⏱️',
                      label: 'Time',
                      value: formatHoursToHM(perfData.tracked.current),
                      sub: `/ ${formatHoursToHM(perfData.tracked.target)}`,
                      percent: perfData.timePercent,
                      color: perfData.timePercent >= 90 ? theme.success : theme.warning,
                    },
                    {
                      icon: '✅',
                      label: 'Tasks',
                      value: `${perfData.tasks.completed}/${perfData.tasks.total}`,
                      sub: `${perfData.tasksPercent}%`,
                      percent: perfData.tasksPercent,
                      color: perfData.tasksPercent >= 80 ? theme.success : theme.warning,
                    },
                    {
                      icon: '🎯',
                      label: 'On-Time',
                      value: `${perfData.tasks.onTime}/${perfData.tasks.completed}`,
                      sub: `${perfData.onTimePercent}%`,
                      percent: perfData.onTimePercent,
                      color: perfData.onTimePercent >= 80 ? theme.success : theme.warning,
                    },
                  ].map((m, i) => (
                    <div
                      key={i}
                      style={{
                        background: theme.secondaryBg,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${theme.borderLight}`,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '9px', color: theme.textMuted, marginBottom: '4px', fontFamily: getFontFamily('english') }}>
                        {m.icon} {m.label}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: theme.text, ...tabularNumberStyle }}>
                        {m.value}
                      </div>
                      <div style={{ fontSize: '10px', color: theme.textSecondary, marginBottom: '6px', ...tabularNumberStyle }}>
                        {m.sub}
                      </div>
                      <div style={{ width: '100%', height: '4px', background: theme.border, borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(m.percent, 100)}%`, height: '100%', background: m.color, borderRadius: '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weekly Hours Trend - Sparkline */}
                <div
                  style={{
                    background: theme.secondaryBg,
                    padding: '14px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.borderLight}`,
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: theme.text, fontFamily: getFontFamily('english') }}>
                      📈 Weekly Hours Trend
                    </div>
                    <div style={{ fontSize: '10px', color: theme.textSecondary, ...tabularNumberStyle }}>
                      {formatHoursToHM(totalWeekHours)} total
                    </div>
                  </div>

                  {/* Sparkline Chart */}
                  {sparklineData.length >= 2 ? (
                    <SparklineWithStats
                      data={sparklineData}
                      labels={sparklineLabels}
                      width={300}
                      height={60}
                      color={theme.accent}
                      theme={theme}
                      formatValue={(v) => formatHoursToHM(v)}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: theme.textMuted, fontSize: '12px' }}>
                      Not enough data for trend chart
                    </div>
                  )}

                  {/* Daily breakdown bars */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
                      {perfData.weeklyHours.map((data, i) => {
                        const maxHours = 8;
                        const height = Math.max((data.hours / maxHours) * 100, data.isFuture ? 0 : 5);
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%', justifyContent: 'flex-end' }}>
                            {!data.isFuture && data.hours > 0 && (
                              <div style={{ fontSize: '8px', color: theme.textMuted, ...tabularNumberStyle }}>
                                {data.hours.toFixed(1)}h
                              </div>
                            )}
                            <div
                              style={{
                                width: '100%',
                                height: `${height}%`,
                                minHeight: data.isFuture ? '0' : '4px',
                                background: data.isFuture ? theme.border : data.hours >= 6.5 ? theme.success : data.hours > 0 ? theme.warning : theme.border,
                                borderRadius: '3px 3px 0 0',
                                opacity: data.isFuture ? 0.3 : 1,
                              }}
                            />
                            <div style={{ fontSize: '9px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
                              {data.day}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Target line indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '9px', color: theme.textMuted }}>
                      <span style={{ width: '12px', borderTop: `1px dashed ${theme.textMuted}` }} />
                      <span>6.5h target</span>
                    </div>
                  </div>
                </div>

                {/* Tasks by Project */}
                <div
                  style={{
                    background: theme.secondaryBg,
                    padding: '14px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.borderLight}`,
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '600', color: theme.text, marginBottom: '10px', fontFamily: getFontFamily('english') }}>
                    📁 Time by Project
                  </div>
                  {perfData.byProject.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: theme.textMuted, fontSize: '11px' }}>
                      No project data this week
                    </div>
                  ) : (
                    perfData.byProject.map((project, i) => {
                      const maxHours = Math.max(...perfData.byProject.map(p => p.hours), 1);
                      const percent = Math.round((project.hours / maxHours) * 100);
                      return (
                        <div key={i} style={{ marginBottom: i < perfData.byProject.length - 1 ? '10px' : '0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', color: theme.text, fontWeight: '600', fontFamily: getAdaptiveFontFamily(project.name) }}>
                              {project.name}
                            </span>
                            <span style={{ fontSize: '10px', color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: '4px', ...tabularNumberStyle }}>
                              {formatHoursToHM(project.hours)} • {project.tasks} tasks
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: theme.border, borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${percent}%`,
                                height: '100%',
                                background: theme.accent,
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Insights */}
                <div
                  style={{
                    background: theme.secondaryBg,
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.borderLight}`,
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '600', color: theme.text, marginBottom: '8px', fontFamily: getFontFamily('english') }}>
                    💡 Insights
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '10px', color: theme.textSecondary }}>
                    {bestDay.hours > 0 && (
                      <span style={{ background: theme.cardBg, padding: '4px 8px', borderRadius: '4px', fontFamily: getFontFamily('english') }}>
                        Best: {bestDay.day} ({formatHoursToHM(bestDay.hours)})
                      </span>
                    )}
                    <span style={{ background: theme.cardBg, padding: '4px 8px', borderRadius: '4px', fontFamily: getFontFamily('english') }}>
                      {performanceData?.totalTasks || totalTasks} tasks worked this week
                    </span>
                    {perfData.timePercent >= 90 && (
                      <span style={{ background: hexToRgba(theme.success, 0.12), color: theme.success, padding: '4px 8px', borderRadius: '4px', fontFamily: getFontFamily('english') }}>
                        On track! ⭐
                      </span>
                    )}
                    {perfData.timePercent < 70 && perfData.timePercent > 0 && (
                      <span style={{ background: hexToRgba(theme.warning, 0.12), color: theme.warning, padding: '4px 8px', borderRadius: '4px', fontFamily: getFontFamily('english') }}>
                        Below target
                      </span>
                    )}
                  </div>
                </div>
              </>
            );
          })()}

          {/* Leaves Tab */}
          {activeTab === 'leaves' && (() => {
            // Use real leaves data from state, or show loading/empty state
            if (!leavesData) {
              return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.textSecondary }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>📅</div>
                  <div style={{ fontSize: '14px' }}>Loading leave data...</div>
                </div>
              );
            }

            const annualRemaining = leavesData.annual.total - leavesData.annual.used;
            const usedPercent = leavesData.annual.total > 0
              ? Math.round((leavesData.annual.used / leavesData.annual.total) * 100)
              : 0;
            const daysToLose = Math.max(0, annualRemaining - leavesData.annual.maxTransfer);

            // Generate mini calendar for current month
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const firstDay = new Date(currentYear, currentMonth, 1).getDay();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            // Use calendar events from leavesData
            const calendarEvents = leavesData.calendarEvents || {};

            return (
              <>
                {/* Year Overview Hero Card */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${hexToRgba(theme.accent, 0.08)}, ${hexToRgba(theme.accent, 0.03)})`,
                    border: `1px solid ${hexToRgba(theme.accent, 0.25)}`,
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '8px', fontFamily: getFontFamily('english') }}>
                    📅 {leavesData.year} Leave Balance
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: theme.text, ...tabularNumberStyle }}>
                      {annualRemaining}
                    </div>
                    <div style={{ fontSize: '14px', color: theme.textMuted }}>days remaining</div>
                    <div style={{ fontSize: '12px', color: theme.textSecondary, ...tabularNumberStyle }}>
                      (of {leavesData.annual.total})
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '6px', background: theme.border, borderRadius: '3px', marginBottom: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${usedPercent}%`, height: '100%', background: theme.accent, borderRadius: '3px' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontFamily: getFontFamily('english') }}>
                    {daysToLose > 0 && (
                      <span style={{ color: theme.warning, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⚠️ {daysToLose} days expire Dec 31
                      </span>
                    )}
                    <span>Max {leavesData.annual.maxTransfer} days transfer</span>
                  </div>
                </div>

                {/* 3 Leave Type Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {[
                    { icon: '🏖️', type: 'Annual', used: leavesData.annual.used, total: leavesData.annual.total, color: theme.accent },
                    { icon: '🏥', type: 'Sick', used: leavesData.sick.used, total: leavesData.sick.total, color: theme.warning },
                    { icon: '🎁', type: 'Bonus', used: leavesData.bonus.used, total: leavesData.bonus.total, color: theme.success },
                  ].map((q, i) => (
                    <div
                      key={i}
                      style={{
                        background: theme.secondaryBg,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${theme.borderLight}`,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '9px', color: theme.textMuted, marginBottom: '4px', fontFamily: getFontFamily('english') }}>
                        {q.icon} {q.type}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: theme.text, ...tabularNumberStyle }}>
                        {q.total - q.used}
                      </div>
                      <div style={{ fontSize: '9px', color: theme.textSecondary, ...tabularNumberStyle }}>
                        {q.used}/{q.total} used
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini Calendar */}
                <div
                  style={{
                    background: theme.secondaryBg,
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.borderLight}`,
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '600', color: theme.text, marginBottom: '10px', fontFamily: getFontFamily('english') }}>
                    🗓️ {monthName}
                  </div>
                  {/* Day headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <div key={d} style={{ fontSize: '8px', color: theme.textMuted, textAlign: 'center', fontFamily: getFontFamily('english') }}>
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                    {/* Empty cells before first day */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} style={{ height: '24px' }} />
                    ))}
                    {/* Day cells */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const isToday = day === today.getDate();
                      const event = calendarEvents[day];
                      let bgColor = 'transparent';
                      let textColor = theme.textSecondary;
                      if (event === 'leave') { bgColor = theme.accent; textColor = '#fff'; }
                      if (event === 'wfh') { bgColor = '#8b5cf6'; textColor = '#fff'; }
                      if (event === 'holiday') { bgColor = theme.warning; textColor = '#fff'; }
                      return (
                        <div
                          key={day}
                          style={{
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            fontWeight: isToday ? '700' : '500',
                            color: textColor,
                            background: bgColor,
                            borderRadius: '4px',
                            border: isToday ? `2px solid ${theme.text}` : 'none',
                            ...tabularNumberStyle,
                          }}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '8px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', background: theme.accent, borderRadius: '2px' }} /> Leave
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', background: '#8b5cf6', borderRadius: '2px' }} /> WFH
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', background: theme.warning, borderRadius: '2px' }} /> Holiday
                    </span>
                  </div>
                </div>

                {/* Upcoming (Combined Leaves + WFH) */}
                <div
                  style={{
                    background: theme.secondaryBg,
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.borderLight}`,
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '600', color: theme.text, marginBottom: '10px', fontFamily: getFontFamily('english') }}>
                    📋 Upcoming
                  </div>
                  {leavesData.upcoming.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px',
                        background: theme.cardBg,
                        borderRadius: '6px',
                        marginBottom: i < leavesData.upcoming.length - 1 ? '6px' : '0',
                        border: `1px solid ${theme.borderLight}`,
                      }}
                    >
                      <div style={{ fontSize: '16px' }}>{item.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: theme.text, fontFamily: getFontFamily('english') }}>
                          {item.date} {item.day && `(${item.day})`}
                        </div>
                        <div style={{ fontSize: '9px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
                          {item.label} {item.days && `(${item.days}d)`}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontSize: '8px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          background:
                            item.status === 'approved' ? theme.success + '20' :
                            item.status === 'scheduled' ? '#8b5cf6' + '20' :
                            theme.warning + '20',
                          color:
                            item.status === 'approved' ? theme.success :
                            item.status === 'scheduled' ? '#8b5cf6' :
                            theme.warning,
                          fontFamily: getFontFamily('english'),
                        }}
                      >
                        {item.status}
                      </div>
                    </div>
                  ))}
                </div>

                {/* WFH This Month */}
                <div
                  style={{
                    background: theme.secondaryBg,
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.borderLight}`,
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: theme.text, fontFamily: getFontFamily('english') }}>
                      🏠 WFH This Month
                    </div>
                    <div style={{ fontSize: '10px', color: theme.textSecondary, ...tabularNumberStyle }}>
                      {leavesData.wfh.usedThisMonth}/{leavesData.wfh.monthlyQuota} used
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: theme.border, borderRadius: '3px', marginBottom: '8px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(leavesData.wfh.usedThisMonth / leavesData.wfh.monthlyQuota) * 100}%`,
                        height: '100%',
                        background: '#8b5cf6',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '9px', color: theme.textSecondary, fontFamily: getFontFamily('english') }}>
                    {leavesData.wfh.monthlyQuota} days/month quota
                  </div>
                </div>

                {/* Smart Suggestions */}
                <div
                  style={{
                    background: theme.secondaryBg,
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.borderLight}`,
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '600', color: theme.text, marginBottom: '8px', fontFamily: getFontFamily('english') }}>
                    💡 Suggestions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {leavesData.suggestions.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '10px',
                          color: theme.textSecondary,
                          padding: '6px 10px',
                          background: theme.cardBg,
                          borderRadius: '4px',
                          fontFamily: getFontFamily('english'),
                        }}
                      >
                        • {s}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.98) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes softPulse {
          0%, 100% { box-shadow: 0 0 12px ${theme.working}30; }
          50% { box-shadow: 0 0 20px ${theme.working}50; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MemberDetailModal;
