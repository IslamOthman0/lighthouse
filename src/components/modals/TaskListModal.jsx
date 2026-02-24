import React, { useMemo, useState } from 'react';
import { getFontFamily, getAdaptiveFontFamily, tabularNumberStyle } from '../../utils/typography';
import { formatMinutesToHM } from '../../utils/timeFormat';
import PriorityFlag, { PRIORITIES } from '../ui/PriorityFlag';
import ModalShell, { ModalSection, EmptyState } from './ModalShell';

// Pagination constants
const TASKS_PER_PAGE = 20;

// Priority config for grouping/sorting (colors from shared PRIORITIES)
const priorityConfig = {
  Urgent: { color: PRIORITIES.urgent.color, label: 'Urgent' },
  High: { color: PRIORITIES.high.color, label: 'High' },
  Normal: { color: PRIORITIES.normal.color, label: 'Normal' },
  Low: { color: PRIORITIES.low.color, label: 'Low' },
  // Legacy fallback
  Medium: { color: PRIORITIES.normal.color, label: 'Normal' },
};

// Tag colors (cycling through for variety)
const tagColors = [
  { bg: 'rgba(139, 92, 246, 0.2)', text: '#8b5cf6', border: '#8b5cf6' },
  { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6', border: '#3b82f6' },
  { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981', border: '#10b981' },
  { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', border: '#f59e0b' },
  { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', border: '#ef4444' },
];

// Format date like ClickUp (e.g., "9 Dec", "10 Nov", or time if today)
const formatClickUpDate = (dateInput) => {
  if (!dateInput) return null;

  let date;
  if (typeof dateInput === 'number' || (typeof dateInput === 'string' && /^\d+$/.test(dateInput))) {
    const timestamp = parseInt(dateInput, 10);
    date = new Date(timestamp);
  } else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  }

  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

// Get status display name
const getStatusDisplayName = (status) => {
  return status.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const TaskListModal = ({ isOpen, onClose, project, status, tasks, theme }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;

    const query = searchQuery.toLowerCase();
    return tasks.filter(task =>
      task.name?.toLowerCase().includes(query) ||
      task.assignee?.name?.toLowerCase().includes(query) ||
      task.publisher?.toLowerCase().includes(query) ||
      task.genre?.toLowerCase().includes(query) ||
      task.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [tasks, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTasks.length / TASKS_PER_PAGE);
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * TASKS_PER_PAGE;
    return filteredTasks.slice(start, start + TASKS_PER_PAGE);
  }, [filteredTasks, currentPage]);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setCurrentPage(1);
    }
  }, [isOpen]);

  // Get status color from first task or default
  const statusColor = useMemo(() => {
    if (tasks.length > 0 && tasks[0].statusColor) {
      return tasks[0].statusColor;
    }
    return '#6b7280';
  }, [tasks]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        totalTasks: 0,
        totalTrackedMinutes: 0,
        avgTrackedMinutes: 0,
        byPriority: {},
        byAssignee: {},
        urgentCount: 0,
      };
    }

    const totalTrackedMinutes = tasks.reduce((sum, t) => sum + (t.trackedTime || 0), 0);

    // Group by priority
    const byPriority = tasks.reduce((acc, t) => {
      const priority = t.priority || 'None';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    // Group by assignee
    const byAssignee = tasks.reduce((acc, t) => {
      const assigneeName = t.assignee?.name || 'Unassigned';
      if (!acc[assigneeName]) {
        acc[assigneeName] = {
          count: 0,
          tracked: 0,
          avatar: t.assignee?.avatar,
          initials: t.assignee?.initials,
        };
      }
      acc[assigneeName].count += 1;
      acc[assigneeName].tracked += (t.trackedTime || 0);
      return acc;
    }, {});

    const urgentCount = tasks.filter(t => t.priority === 'Urgent').length;

    return {
      totalTasks: tasks.length,
      totalTrackedMinutes,
      avgTrackedMinutes: tasks.length > 0 ? Math.round(totalTrackedMinutes / tasks.length) : 0,
      byPriority,
      byAssignee,
      urgentCount,
    };
  }, [tasks]);

  // Determine if this is a "done" status
  const isDoneStatus = status.toLowerCase().includes('done') ||
                       status.toLowerCase().includes('complete') ||
                       status.toLowerCase().includes('closed');

  // Modal title with status
  const modalTitle = `${project} — ${getStatusDisplayName(status)}`;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      icon="📋"
      theme={theme}
      maxWidth="1200px"
      headerColor={statusColor}
      testId="task-list-modal"
    >
      {tasks.length === 0 ? (
        <EmptyState
          theme={theme}
          icon="📋"
          title={`No ${getStatusDisplayName(status).toLowerCase()} tasks`}
          subtitle="Tasks will appear here when they match this status"
        />
      ) : (
        <>
          {/* Inline Stats Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '8px' : '16px',
              padding: '12px 16px',
              marginBottom: '16px',
              background: theme.innerBg || theme.secondaryBg,
              borderRadius: '10px',
              border: `1px solid ${theme.borderLight || theme.border}`,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: '700', color: theme.text, fontFamily: getFontFamily('english'), ...tabularNumberStyle }}>
              {summaryStats.totalTasks} Task{summaryStats.totalTasks !== 1 ? 's' : ''}
            </span>
            <span style={{ color: theme.textMuted, fontSize: '12px' }}>·</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: theme.textSecondary, fontFamily: getFontFamily('english'), ...tabularNumberStyle }}>
              {formatMinutesToHM(summaryStats.totalTrackedMinutes)} Total
            </span>
            <span style={{ color: theme.textMuted, fontSize: '12px' }}>·</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: theme.textSecondary, fontFamily: getFontFamily('english'), ...tabularNumberStyle }}>
              {formatMinutesToHM(summaryStats.avgTrackedMinutes)}{isMobile ? '/task' : ' Avg/Task'}
            </span>
            {summaryStats.urgentCount > 0 && (
              <>
                <span style={{ color: theme.textMuted, fontSize: '12px' }}>·</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#ef4444', fontFamily: getFontFamily('english') }}>
                  🚩 {summaryStats.urgentCount} Urgent
                </span>
              </>
            )}
          </div>

          {/* Priority & Assignee Breakdown - Side by Side */}
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* By Priority */}
              <ModalSection theme={theme} title="By Priority" icon="🚩">
                {Object.entries(summaryStats.byPriority).length === 0 ? (
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>No priority data</div>
                ) : (
                  Object.entries(summaryStats.byPriority)
                    .sort((a, b) => {
                      const order = ['Urgent', 'High', 'Normal', 'Medium', 'Low', 'None'];
                      return order.indexOf(a[0]) - order.indexOf(b[0]);
                    })
                    .map(([priority, count]) => {
                      const config = priorityConfig[priority] || { color: theme.textMuted, label: priority };
                      return (
                        <div key={priority} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                          <PriorityFlag priority={priority} size={13} fontSize="12px" />
                          <span style={{ fontSize: '13px', fontWeight: '600', color: config.color, ...tabularNumberStyle }}>{count}</span>
                        </div>
                      );
                    })
                )}
              </ModalSection>

              {/* By Assignee */}
              <ModalSection theme={theme} title="By Assignee" icon="👥">
                {Object.entries(summaryStats.byAssignee).length === 0 ? (
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>No assignee data</div>
                ) : (
                  Object.entries(summaryStats.byAssignee)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5)
                    .map(([name, data]) => (
                      <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: data.avatar ? `url(${data.avatar})` : theme.accent,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '8px',
                              fontWeight: '600',
                            }}
                          >
                            {!data.avatar && (data.initials || name.slice(0, 2).toUpperCase())}
                          </div>
                          <span style={{ fontSize: '11px', color: theme.textSecondary, fontFamily: getAdaptiveFontFamily(name) }}>
                            {name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: theme.textMuted, ...tabularNumberStyle }}>
                            {formatMinutesToHM(data.tracked)}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: theme.text, ...tabularNumberStyle }}>
                            {data.count}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </ModalSection>
            </div>
          )}

          {/* Search Input */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: theme.innerBg || theme.secondaryBg,
                borderRadius: '10px',
                border: `1px solid ${theme.border}`,
              }}
            >
              <span style={{ fontSize: '14px', opacity: 0.6 }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by name, assignee, publisher..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: theme.text,
                  fontFamily: getFontFamily('english'),
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: theme.textMuted,
                    padding: '2px 6px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: theme.textMuted }}>
                Found {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </div>
            )}
          </div>

          {/* Task List Section */}
          <ModalSection theme={theme} title={`Task List (${filteredTasks.length})`} icon="📝" noPadding>
            {/* Column Headers - Desktop only */}
            {!isMobile && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(200px, 1fr) 70px 70px 80px minmax(100px, 140px) minmax(100px, 140px) 85px 85px 85px',
                  gap: '10px',
                  padding: '12px 16px',
                  borderBottom: `1px solid ${theme.borderLight || theme.border}`,
                  fontSize: '11px',
                  fontWeight: '600',
                  color: theme.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: getFontFamily('english'),
                }}
              >
                <span>Task Name</span>
                <span>Assignee</span>
                <span>Tracked</span>
                <span>Priority</span>
                <span>Publisher</span>
                <span>Genre</span>
                <span>Created</span>
                <span>Updated</span>
                <span>Closed</span>
              </div>
            )}

            {/* Task Rows */}
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {paginatedTasks.map((task, index) => {
                const closedDate = task.dateClosed || task.closedDate;
                const dueDate = task.dueDate;
                const displayDate = isDoneStatus ? closedDate : dueDate;
                const priorityStyle = priorityConfig[task.priority] || priorityConfig.Low;
                const taskStatusColor = task.statusColor || statusColor;

                // Format dates for display
                const dateCreated = task.date_created;
                const dateUpdated = task.date_updated;
                const dateClosed = task.dateClosed || task.closedDate || task.date_closed;

                return (
                  <div
                    key={task.id || index}
                    style={{
                      borderBottom: `1px solid ${theme.borderLight || theme.border}`,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme.subtleBg || 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Desktop Layout */}
                    {!isMobile ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(200px, 1fr) 70px 70px 80px minmax(100px, 140px) minmax(100px, 140px) 85px 85px 85px',
                          gap: '10px',
                          padding: '12px 16px',
                          alignItems: 'center',
                        }}
                      >
                        {/* Task Name (clickable link) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <a
                            href={task.clickUpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: '12px',
                              fontWeight: '500',
                              color: theme.accent,
                              fontFamily: getAdaptiveFontFamily(task.name),
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                              minWidth: 0,
                              textDecoration: 'none',
                              cursor: 'pointer',
                              transition: 'opacity 0.15s',
                            }}
                            title={task.name}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            {task.name}
                          </a>
                        </div>

                        {/* Assignee */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {task.assignee ? (
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: task.assignee.avatar ? `url(${task.assignee.avatar})` : theme.accent,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '9px',
                                fontWeight: '600',
                                fontFamily: getFontFamily('english'),
                              }}
                              title={task.assignee.name}
                            >
                              {!task.assignee.avatar && task.assignee.initials}
                            </div>
                          ) : (
                            <span style={{ color: theme.textMuted, fontSize: '14px', opacity: 0.3 }}>—</span>
                          )}
                        </div>

                        {/* Tracked Time */}
                        <div
                          style={{
                            fontSize: '11px',
                            color: task.trackedTime > 0 ? theme.text : theme.textMuted,
                            fontFamily: getFontFamily('english'),
                            fontWeight: task.trackedTime > 0 ? '600' : 'normal',
                            ...tabularNumberStyle,
                          }}
                        >
                          {task.trackedTime > 0 ? formatMinutesToHM(task.trackedTime) : '—'}
                        </div>

                        {/* Priority (Flag Icon) */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                          {task.priority ? (
                            <PriorityFlag priority={task.priority} size={13} fontSize="11px" />
                          ) : (
                            <span style={{ fontSize: '11px', color: theme.textMuted, opacity: 0.5 }}>—</span>
                          )}
                        </div>

                        {/* Publisher */}
                        <div
                          style={{
                            fontSize: '11px',
                            color: task.publisher ? theme.textSecondary : theme.textMuted,
                            fontFamily: getAdaptiveFontFamily(task.publisher || ''),
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            opacity: task.publisher ? 1 : 0.5,
                          }}
                          title={task.publisher}
                        >
                          {task.publisher || '—'}
                        </div>

                        {/* Genre */}
                        <div
                          style={{
                            fontSize: '11px',
                            color: task.genre ? theme.textSecondary : theme.textMuted,
                            fontFamily: getAdaptiveFontFamily(task.genre || ''),
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            opacity: task.genre ? 1 : 0.5,
                          }}
                          title={task.genre}
                        >
                          {task.genre || '—'}
                        </div>

                        {/* Date Created */}
                        <div
                          style={{
                            fontSize: '11px',
                            color: theme.textSecondary,
                            fontFamily: getFontFamily('english'),
                            ...tabularNumberStyle,
                          }}
                        >
                          {dateCreated ? formatClickUpDate(dateCreated) : <span style={{ opacity: 0.5 }}>—</span>}
                        </div>

                        {/* Date Updated */}
                        <div
                          style={{
                            fontSize: '11px',
                            color: theme.textSecondary,
                            fontFamily: getFontFamily('english'),
                            ...tabularNumberStyle,
                          }}
                        >
                          {dateUpdated ? formatClickUpDate(dateUpdated) : <span style={{ opacity: 0.5 }}>—</span>}
                        </div>

                        {/* Date Closed */}
                        <div
                          style={{
                            fontSize: '11px',
                            color: dateClosed ? theme.text : theme.textMuted,
                            fontWeight: dateClosed ? '600' : 'normal',
                            fontFamily: getFontFamily('english'),
                            ...tabularNumberStyle,
                          }}
                        >
                          {dateClosed ? formatClickUpDate(dateClosed) : <span style={{ opacity: 0.5 }}>—</span>}
                        </div>
                      </div>
                    ) : (
                      /* Mobile Layout */
                      <div style={{ padding: '12px 16px' }}>
                        {/* Task name */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '10px' }}>
                          <span style={{ color: taskStatusColor, fontSize: '8px', marginTop: '5px', flexShrink: 0 }}>●</span>
                          <span
                            style={{
                              flex: 1,
                              fontSize: '13px',
                              fontWeight: '500',
                              color: theme.text,
                              fontFamily: getAdaptiveFontFamily(task.name),
                              lineHeight: '1.4',
                            }}
                          >
                            {task.name}
                          </span>
                        </div>

                        {/* Mobile grid */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '8px',
                            fontSize: '10px',
                            color: theme.textSecondary,
                          }}
                        >
                          {/* Assignee */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '10px', opacity: 0.6, textTransform: 'uppercase', fontFamily: getFontFamily('english') }}>Assignee</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {task.assignee ? (
                                <>
                                  <div
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      background: task.assignee.avatar ? `url(${task.assignee.avatar})` : theme.accent,
                                      backgroundSize: 'cover',
                                      color: '#fff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '7px',
                                      fontWeight: '600',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {!task.assignee.avatar && task.assignee.initials}
                                  </div>
                                  <span style={{ fontSize: '10px', fontFamily: getAdaptiveFontFamily(task.assignee.name || '') }}>
                                    {task.assignee.name ? task.assignee.name.split(' ')[0] : ''}
                                  </span>
                                </>
                              ) : (
                                <span style={{ opacity: 0.5 }}>—</span>
                              )}
                            </div>
                          </div>

                          {/* Date */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '10px', opacity: 0.6, textTransform: 'uppercase', fontFamily: getFontFamily('english') }}>
                              {isDoneStatus ? 'Closed' : 'Due'}
                            </span>
                            <span style={{ fontSize: '11px', ...tabularNumberStyle }}>
                              {displayDate ? formatClickUpDate(displayDate) : <span style={{ opacity: 0.5 }}>—</span>}
                            </span>
                          </div>

                          {/* Time tracked */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '10px', opacity: 0.6, textTransform: 'uppercase', fontFamily: getFontFamily('english') }}>Tracked</span>
                            <span style={{ fontSize: '11px', ...tabularNumberStyle }}>
                              {task.trackedTime > 0 ? formatMinutesToHM(task.trackedTime) : <span style={{ opacity: 0.5 }}>0m</span>}
                            </span>
                          </div>

                          {/* Priority */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '10px', opacity: 0.6, textTransform: 'uppercase', fontFamily: getFontFamily('english') }}>Priority</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {task.priority ? <PriorityFlag priority={task.priority} showLabel={false} size={13} /> : <span style={{ opacity: 0.5, color: theme.textMuted }}>—</span>}
                            </div>
                          </div>

                          {/* Genre */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '10px', opacity: 0.6, textTransform: 'uppercase', fontFamily: getFontFamily('english') }}>Genre</span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontFamily: getAdaptiveFontFamily(task.genre || ''),
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                opacity: task.genre ? 1 : 0.5,
                              }}
                            >
                              {task.genre || '—'}
                            </span>
                          </div>

                          {/* Publisher */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '10px', opacity: 0.6, textTransform: 'uppercase', fontFamily: getFontFamily('english') }}>Publisher</span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontFamily: getAdaptiveFontFamily(task.publisher || ''),
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                opacity: task.publisher ? 1 : 0.5,
                              }}
                            >
                              {task.publisher || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {task.tags.map((tag, i) => {
                              const tagStyle = tagColors[i % tagColors.length];
                              return (
                                <span
                                  key={i}
                                  style={{
                                    padding: '2px 5px',
                                    borderRadius: '3px',
                                    fontSize: '9px',
                                    fontWeight: '500',
                                    background: tagStyle.bg,
                                    color: tagStyle.text,
                                    border: `1px solid ${tagStyle.border}40`,
                                    fontFamily: getFontFamily('english'),
                                  }}
                                >
                                  {tag}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderTop: `1px solid ${theme.border}`,
                  background: theme.innerBg || 'rgba(0,0,0,0.03)',
                }}
              >
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.border}`,
                    background: currentPage === 1 ? 'transparent' : theme.cardBg,
                    color: currentPage === 1 ? theme.textMuted : theme.text,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontFamily: getFontFamily('english'),
                    opacity: currentPage === 1 ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  ← Prev
                </button>

                <span style={{ fontSize: '12px', color: theme.textSecondary, fontFamily: getFontFamily('english'), ...tabularNumberStyle }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.border}`,
                    background: currentPage === totalPages ? 'transparent' : theme.cardBg,
                    color: currentPage === totalPages ? theme.textMuted : theme.text,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontFamily: getFontFamily('english'),
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </ModalSection>
        </>
      )}
    </ModalShell>
  );
};

export default TaskListModal;
