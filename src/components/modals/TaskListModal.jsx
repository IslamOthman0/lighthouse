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

// Desktop column grid template
const DESKTOP_COLS = 'minmax(200px, 1fr) 70px 70px 80px minmax(100px, 140px) minmax(100px, 140px) 85px 85px 85px';

const TaskListModal = ({ isOpen, onClose, project, status, tasks, theme }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.ceil(filteredTasks.length / TASKS_PER_PAGE);
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * TASKS_PER_PAGE;
    return filteredTasks.slice(start, start + TASKS_PER_PAGE);
  }, [filteredTasks, currentPage]);

  React.useEffect(() => { setCurrentPage(1); }, [searchQuery]);
  React.useEffect(() => { if (!isOpen) { setSearchQuery(''); setCurrentPage(1); } }, [isOpen]);

  const statusColor = useMemo(() => {
    if (tasks.length > 0 && tasks[0].statusColor) return tasks[0].statusColor;
    return '#6b7280';
  }, [tasks]);

  const summaryStats = useMemo(() => {
    if (!tasks || tasks.length === 0) return { totalTasks: 0, totalTrackedMinutes: 0, avgTrackedMinutes: 0, byPriority: {}, byAssignee: {}, urgentCount: 0 };

    const totalTrackedMinutes = tasks.reduce((sum, t) => sum + (t.trackedTime || 0), 0);
    const byPriority = tasks.reduce((acc, t) => { const p = t.priority || 'None'; acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    const byAssignee = tasks.reduce((acc, t) => {
      const n = t.assignee?.name || 'Unassigned';
      if (!acc[n]) acc[n] = { count: 0, tracked: 0, avatar: t.assignee?.avatar, initials: t.assignee?.initials };
      acc[n].count += 1;
      acc[n].tracked += (t.trackedTime || 0);
      return acc;
    }, {});
    const urgentCount = tasks.filter(t => t.priority === 'Urgent').length;

    return { totalTasks: tasks.length, totalTrackedMinutes, avgTrackedMinutes: tasks.length > 0 ? Math.round(totalTrackedMinutes / tasks.length) : 0, byPriority, byAssignee, urgentCount };
  }, [tasks]);

  const isDoneStatus = status.toLowerCase().includes('done') || status.toLowerCase().includes('complete') || status.toLowerCase().includes('closed');
  const modalTitle = `${project} — ${getStatusDisplayName(status)}`;

  // Reusable mini avatar circle
  const AvatarCircle = ({ avatar, initials, size = 24 }) => (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{
        width: size, height: size,
        background: avatar ? `url(${avatar}) center/cover` : 'var(--color-accent)',
        fontSize: size <= 18 ? '7px' : '9px',
      }}
    >
      {!avatar && initials}
    </div>
  );

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
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-[var(--color-inner-bg)] rounded-[10px] border border-[var(--color-border-light)] flex-wrap"
            style={{ gap: isMobile ? '8px' : '16px' }}>
            <span className="text-sm font-bold text-[var(--color-text)]" style={{ ...tabularNumberStyle, fontFamily: getFontFamily('english') }}>
              {summaryStats.totalTasks} Task{summaryStats.totalTasks !== 1 ? 's' : ''}
            </span>
            <span className="text-[var(--color-text-muted)] text-xs">·</span>
            <span className="text-[13px] font-semibold text-[var(--color-text-secondary)]" style={{ ...tabularNumberStyle, fontFamily: getFontFamily('english') }}>
              {formatMinutesToHM(summaryStats.totalTrackedMinutes)} Total
            </span>
            <span className="text-[var(--color-text-muted)] text-xs">·</span>
            <span className="text-[13px] font-semibold text-[var(--color-text-secondary)]" style={{ ...tabularNumberStyle, fontFamily: getFontFamily('english') }}>
              {formatMinutesToHM(summaryStats.avgTrackedMinutes)}{isMobile ? '/task' : ' Avg/Task'}
            </span>
            {summaryStats.urgentCount > 0 && (
              <>
                <span className="text-[var(--color-text-muted)] text-xs">·</span>
                <span className="text-xs font-semibold text-[#ef4444]" style={{ fontFamily: getFontFamily('english') }}>
                  🚩 {summaryStats.urgentCount} Urgent
                </span>
              </>
            )}
          </div>

          {/* Priority & Assignee Breakdown - Desktop only */}
          {!isMobile && (
            <div className="grid grid-cols-2 gap-4 mb-5">
              <ModalSection theme={theme} title="By Priority" icon="🚩">
                {Object.entries(summaryStats.byPriority).length === 0 ? (
                  <div className="text-xs text-[var(--color-text-muted)]">No priority data</div>
                ) : (
                  Object.entries(summaryStats.byPriority)
                    .sort((a, b) => {
                      const order = ['Urgent', 'High', 'Normal', 'Medium', 'Low', 'None'];
                      return order.indexOf(a[0]) - order.indexOf(b[0]);
                    })
                    .map(([priority, count]) => {
                      const config = priorityConfig[priority] || { color: 'var(--color-text-muted)', label: priority };
                      return (
                        <div key={priority} className="flex items-center justify-between py-1">
                          <PriorityFlag priority={priority} size={13} fontSize="12px" />
                          <span className="text-[13px] font-semibold" style={{ color: config.color, ...tabularNumberStyle }}>{count}</span>
                        </div>
                      );
                    })
                )}
              </ModalSection>

              <ModalSection theme={theme} title="By Assignee" icon="👥">
                {Object.entries(summaryStats.byAssignee).length === 0 ? (
                  <div className="text-xs text-[var(--color-text-muted)]">No assignee data</div>
                ) : (
                  Object.entries(summaryStats.byAssignee)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5)
                    .map(([name, data]) => (
                      <div key={name} className="flex justify-between items-center py-[6px]">
                        <div className="flex items-center gap-2">
                          <AvatarCircle avatar={data.avatar} initials={data.initials || name.slice(0, 2).toUpperCase()} size={20} />
                          <span className="text-[11px] text-[var(--color-text-secondary)]" style={{ fontFamily: getAdaptiveFontFamily(name) }}>{name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--color-text-muted)]" style={tabularNumberStyle}>{formatMinutesToHM(data.tracked)}</span>
                          <span className="text-xs font-semibold text-[var(--color-text)]" style={tabularNumberStyle}>{data.count}</span>
                        </div>
                      </div>
                    ))
                )}
              </ModalSection>
            </div>
          )}

          {/* Search Input */}
          <div className="mb-4">
            <div className="flex items-center gap-[10px] px-[14px] py-[10px] bg-[var(--color-inner-bg)] rounded-[10px] border border-[var(--color-border)]">
              <span className="text-sm opacity-60">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by name, assignee, publisher..."
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-[var(--color-text)]"
                style={{ fontFamily: getFontFamily('english') }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="bg-transparent border-none cursor-pointer text-xs text-[var(--color-text-muted)] px-[6px] py-[2px]"
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                Found {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </div>
            )}
          </div>

          {/* Task List Section */}
          <ModalSection theme={theme} title={`Task List (${filteredTasks.length})`} icon="📝" noPadding>
            {/* Column Headers - Desktop only */}
            {!isMobile && (
              <div
                className="grid gap-[10px] px-4 py-3 border-b border-[var(--color-border-light)] text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.5px]"
                style={{ gridTemplateColumns: DESKTOP_COLS, fontFamily: getFontFamily('english') }}
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
            <div className="max-h-[350px] overflow-y-auto">
              {paginatedTasks.map((task, index) => {
                const dateClosed = task.dateClosed || task.closedDate || task.date_closed;
                const taskStatusColor = task.statusColor || statusColor;
                const dateCreated = task.date_created;
                const dateUpdated = task.date_updated;

                return (
                  <div
                    key={task.id || index}
                    className="border-b border-[var(--color-border-light)] transition-[background] duration-150"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-subtle-bg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Desktop Layout */}
                    {!isMobile ? (
                      <div className="grid gap-[10px] px-4 py-3 items-center" style={{ gridTemplateColumns: DESKTOP_COLS }}>
                        {/* Task Name */}
                        <div className="flex items-center gap-[6px] min-w-0">
                          <a
                            href={task.clickUpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-[var(--color-accent)] overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0 no-underline cursor-pointer transition-opacity duration-150"
                            style={{ fontFamily: getAdaptiveFontFamily(task.name) }}
                            title={task.name}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                          >
                            {task.name}
                          </a>
                        </div>

                        {/* Assignee */}
                        <div className="flex items-center justify-center">
                          {task.assignee
                            ? <AvatarCircle avatar={task.assignee.avatar} initials={task.assignee.initials} size={24} />
                            : <span className="text-[var(--color-text-muted)] text-sm opacity-30">—</span>
                          }
                        </div>

                        {/* Tracked Time */}
                        <div
                          className={`text-[11px] ${task.trackedTime > 0 ? 'text-[var(--color-text)] font-semibold' : 'text-[var(--color-text-muted)]'}`}
                          style={{ ...tabularNumberStyle, fontFamily: getFontFamily('english') }}
                        >
                          {task.trackedTime > 0 ? formatMinutesToHM(task.trackedTime) : '—'}
                        </div>

                        {/* Priority */}
                        <div className="flex items-center">
                          {task.priority
                            ? <PriorityFlag priority={task.priority} size={13} fontSize="11px" />
                            : <span className="text-[11px] text-[var(--color-text-muted)] opacity-50">—</span>
                          }
                        </div>

                        {/* Publisher */}
                        <div
                          className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap"
                          style={{
                            color: task.publisher ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                            fontFamily: getAdaptiveFontFamily(task.publisher || ''),
                            opacity: task.publisher ? 1 : 0.5,
                          }}
                          title={task.publisher}
                        >
                          {task.publisher || '—'}
                        </div>

                        {/* Genre */}
                        <div
                          className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap"
                          style={{
                            color: task.genre ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                            fontFamily: getAdaptiveFontFamily(task.genre || ''),
                            opacity: task.genre ? 1 : 0.5,
                          }}
                          title={task.genre}
                        >
                          {task.genre || '—'}
                        </div>

                        {/* Date Created */}
                        <div className="text-[11px] text-[var(--color-text-secondary)]" style={{ ...tabularNumberStyle, fontFamily: getFontFamily('english') }}>
                          {dateCreated ? formatClickUpDate(dateCreated) : <span className="opacity-50">—</span>}
                        </div>

                        {/* Date Updated */}
                        <div className="text-[11px] text-[var(--color-text-secondary)]" style={{ ...tabularNumberStyle, fontFamily: getFontFamily('english') }}>
                          {dateUpdated ? formatClickUpDate(dateUpdated) : <span className="opacity-50">—</span>}
                        </div>

                        {/* Date Closed */}
                        <div
                          className={`text-[11px] ${dateClosed ? 'text-[var(--color-text)] font-semibold' : 'text-[var(--color-text-muted)]'}`}
                          style={{ ...tabularNumberStyle, fontFamily: getFontFamily('english') }}
                        >
                          {dateClosed ? formatClickUpDate(dateClosed) : <span className="opacity-50">—</span>}
                        </div>
                      </div>
                    ) : (
                      /* Mobile Layout */
                      <div className="px-4 py-[14px]">
                        {/* Task name */}
                        <div className="flex items-start gap-[6px] mb-3">
                          <span className="shrink-0 mt-[5px] text-[8px]" style={{ color: taskStatusColor }}>●</span>
                          <span
                            className="flex-1 text-[13px] font-medium text-[var(--color-text)] leading-[1.4]"
                            style={{ fontFamily: getAdaptiveFontFamily(task.name) }}
                          >
                            {task.name}
                          </span>
                        </div>

                        {/* Mobile grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[10px] text-[var(--color-text-secondary)]">
                          {/* Assignee */}
                          <div className="flex flex-col gap-1">
                            <span className="opacity-60 uppercase" style={{ fontFamily: getFontFamily('english') }}>Assignee</span>
                            <div className="flex items-center gap-[5px]">
                              {task.assignee ? (
                                <>
                                  <AvatarCircle avatar={task.assignee.avatar} initials={task.assignee.initials} size={18} />
                                  <span className="text-[11px]" style={{ fontFamily: getAdaptiveFontFamily(task.assignee.name || '') }}>
                                    {task.assignee.name ? task.assignee.name.split(' ')[0] : ''}
                                  </span>
                                </>
                              ) : <span className="opacity-50">—</span>}
                            </div>
                          </div>

                          {/* Time tracked */}
                          <div className="flex flex-col gap-1">
                            <span className="opacity-60 uppercase" style={{ fontFamily: getFontFamily('english') }}>Tracked</span>
                            <span className="text-[11px]" style={tabularNumberStyle}>
                              {task.trackedTime > 0 ? formatMinutesToHM(task.trackedTime) : <span className="opacity-50">0m</span>}
                            </span>
                          </div>

                          {/* Priority */}
                          <div className="flex flex-col gap-1">
                            <span className="opacity-60 uppercase" style={{ fontFamily: getFontFamily('english') }}>Priority</span>
                            <div className="flex items-center">
                              {task.priority
                                ? <PriorityFlag priority={task.priority} showLabel={false} size={13} />
                                : <span className="opacity-50 text-[var(--color-text-muted)]">—</span>
                              }
                            </div>
                          </div>

                          {/* Genre */}
                          <div className="flex flex-col gap-1">
                            <span className="opacity-60 uppercase" style={{ fontFamily: getFontFamily('english') }}>Genre</span>
                            <span
                              className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap"
                              style={{ fontFamily: getAdaptiveFontFamily(task.genre || ''), opacity: task.genre ? 1 : 0.5 }}
                            >
                              {task.genre || '—'}
                            </span>
                          </div>

                          {/* Publisher */}
                          <div className="flex flex-col gap-1">
                            <span className="opacity-60 uppercase" style={{ fontFamily: getFontFamily('english') }}>Publisher</span>
                            <span
                              className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap"
                              style={{ fontFamily: getAdaptiveFontFamily(task.publisher || ''), opacity: task.publisher ? 1 : 0.5 }}
                            >
                              {task.publisher || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {task.tags.map((tag, i) => {
                              const tagStyle = tagColors[i % tagColors.length];
                              return (
                                <span
                                  key={i}
                                  className="px-[5px] py-[2px] rounded text-[9px] font-medium"
                                  style={{
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
              <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-inner-bg)]">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-[6px] rounded-badge border border-[var(--color-border)] text-xs transition-all duration-150"
                  style={{
                    background: currentPage === 1 ? 'transparent' : 'var(--color-card-bg)',
                    color: currentPage === 1 ? 'var(--color-text-muted)' : 'var(--color-text)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    fontFamily: getFontFamily('english'),
                  }}
                >
                  ← Prev
                </button>
                <span className="text-xs text-[var(--color-text-secondary)]" style={{ ...tabularNumberStyle, fontFamily: getFontFamily('english') }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-[6px] rounded-badge border border-[var(--color-border)] text-xs transition-all duration-150"
                  style={{
                    background: currentPage === totalPages ? 'transparent' : 'var(--color-card-bg)',
                    color: currentPage === totalPages ? 'var(--color-text-muted)' : 'var(--color-text)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    fontFamily: getFontFamily('english'),
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
