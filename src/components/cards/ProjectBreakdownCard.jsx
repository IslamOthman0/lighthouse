import React, { useState } from 'react';
import { tabularNumberStyle, getFontFamily, getAdaptiveFontFamily } from '../../utils/typography';
import { formatHoursToHM } from '../../utils/timeFormat';
import { useAppStore } from '../../stores/useAppStore';
import TaskListModal from '../modals/TaskListModal';
import Avatar from '../ui/Avatar';

// Project Icon Component - colored circle with emoji
const ProjectIcon = ({ projectName, color }) => {
  // Map project names to emojis (customize as needed)
  const getProjectEmoji = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('digitization') || lowerName.includes('queue')) return '📁';
    if (lowerName.includes('audiobook') || lowerName.includes('audio')) return '🎧';
    if (lowerName.includes('hero') || lowerName.includes('digital')) return '⚡';
    if (lowerName.includes('ebook')) return '📚';
    return '📋'; // Default
  };

  return (
    <div
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        // Dynamic project color with hex suffix — keep inline
        background: `${color}20`,
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        flexShrink: 0,
      }}
    >
      {getProjectEmoji(projectName)}
    </div>
  );
};

// Generate consistent color from status name if ClickUp color not available
const generateStatusColor = (statusName) => {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#06b6d4', // cyan
    '#6366f1', // indigo
    '#ef4444', // red
    '#14b8a6', // teal
  ];

  // Generate consistent hash from status name
  let hash = 0;
  for (let i = 0; i < statusName.length; i++) {
    hash = statusName.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use absolute value and modulo to get consistent index
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Status Pill Component - matches WorkingCard's native ClickUp status badge style
const StatusPill = ({ statusName, statusColor, count, theme, onClick }) => {
  const bgColor = statusColor || generateStatusColor(statusName);

  // Capitalize first letter of status name
  const capitalizedName = statusName.charAt(0).toUpperCase() + statusName.slice(1);

  const testId = `status-pill-${statusName.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: '700',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: '#ffffff',
        background: bgColor,
        border: 'none',
        cursor: 'pointer',
        transition: 'opacity 0.15s, transform 0.15s',
        fontFamily: getFontFamily('english'),
        whiteSpace: 'nowrap',
      }}
      className="status-pill-btn"
    >
      <span>{capitalizedName}</span>
      <span
        style={{
          background: 'rgba(255,255,255,0.25)',
          padding: '1px 5px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '700',
          ...tabularNumberStyle,
        }}
      >
        {count}
      </span>
    </button>
  );
};

// Avatar Stack Component - shows assignees
const AvatarStack = ({ assignees, max = 3, theme }) => {
  if (!assignees || assignees.length === 0) return null;

  const visible = assignees.slice(0, max);
  const overflow = assignees.length - max;

  return (
    <div className="flex items-center gap-1">
      {visible.map((assignee) => (
        <Avatar
          key={assignee.id}
          name={assignee.name}
          profilePicture={assignee.profilePicture}
          size={24}
          status={null}
          theme={theme}
        />
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(107, 114, 128, 0.2)',
            border: '1px solid rgba(107, 114, 128, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: '600',
            color: '#6b7280',
            ...tabularNumberStyle,
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};

// Project Breakdown Card - redesigned with new layout
const ProjectBreakdownCard = ({ theme }) => {
  const projectBreakdown = useAppStore(state => state.projectBreakdown);
  const dateRange = useAppStore(state => state.dateRange);
  const isToday = !dateRange?.startDate || dateRange?.preset === 'today';

  const [modalState, setModalState] = useState({
    isOpen: false,
    project: '',
    status: '',
    tasks: [],
  });

  // Convert breakdown object to array for rendering
  // Filter out "Unknown" projects (tasks with no list assigned)
  const projects = Object.entries(projectBreakdown)
    .filter(([name]) => name !== 'Unknown')
    .map(([name, data]) => ({
      name,
      color: data.color || '#3b82f6',
      totalTasks: data.totalTasks || 0,
      completedTasks: data.completedTasks || 0,
      trackedToday: data.trackedToday || 0,
      assignees: data.assignees || [],
      statuses: Object.entries(data.statuses || {}).map(([statusName, statusData]) => ({
        name: statusName,
        color: statusData.color,
        count: statusData.count,
        tasks: statusData.tasks || [],
      })),
    }));

  // Show placeholder if no data
  const hasData = projects.length > 0;

  const handlePillClick = (projectName, statusName, tasks) => {
    setModalState({
      isOpen: true,
      project: projectName,
      status: statusName,
      tasks: tasks || [],
    });
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      project: '',
      status: '',
      tasks: [],
    });
  };

  // Calculate active tasks (total - completed)
  const getActiveTasks = (project) => {
    return project.totalTasks - project.completedTasks;
  };

  // Calculate progress percentage
  const getProgressPercent = (project) => {
    if (project.totalTasks === 0) return 0;
    return Math.round((project.completedTasks / project.totalTasks) * 100);
  };

  return (
    <div
      className="rounded-[16px] p-5 border"
      style={{
        background: 'var(--color-card-bg)',
        backdropFilter: 'var(--effect-backdrop-blur)',
        WebkitBackdropFilter: 'var(--effect-backdrop-blur)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--effect-card-shadow)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="text-sm font-semibold"
          style={{
            color: 'var(--color-text)',
            fontFamily: getFontFamily('english'),
          }}
        >
          Projects Breakdown
        </div>
        <div
          className="text-xs"
          style={{
            color: 'var(--color-text-muted)',
            fontFamily: getFontFamily('english'),
          }}
        >
          {projects.length} active {projects.length === 1 ? 'project' : 'projects'}
        </div>
      </div>

      {/* No Data Placeholder */}
      {!hasData && (
        <div
          className="py-10 text-center text-[13px]"
          style={{
            color: 'var(--color-text-muted)',
            fontFamily: getFontFamily('english'),
          }}
        >
          <div className="mb-3 text-4xl opacity-30">📂</div>
          <div>No projects with tracked time today</div>
        </div>
      )}

      {/* Project Grid */}
      {hasData && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
            gap: '16px',
            maxWidth: '1600px',
            margin: '0 auto',
          }}
        >
          {projects.map((project, i) => (
            <div
              key={i}
              className="rounded-[12px] p-4 border flex flex-col gap-3.5"
              style={{
                background: 'var(--color-inner-bg)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              {/* Header: Icon + Name + Subtitle */}
              <div className="flex gap-3 items-center">
                <ProjectIcon projectName={project.name} color={project.color} />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold mb-1 whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{
                      color: 'var(--color-text)',
                      fontFamily: getAdaptiveFontFamily(project.name),
                    }}
                  >
                    {project.name}
                  </div>
                  <div
                    className="text-xs"
                    style={{
                      color: 'var(--color-text-muted)',
                      fontFamily: getFontFamily('english'),
                    }}
                  >
                    {getActiveTasks(project)} active {getActiveTasks(project) === 1 ? 'task' : 'tasks'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span
                    className="text-xs"
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontFamily: getFontFamily('english'),
                    }}
                  >
                    Progress
                  </span>
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color: 'var(--color-text)',
                      ...tabularNumberStyle,
                    }}
                  >
                    {getProgressPercent(project)}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded overflow-hidden"
                  style={{ background: 'var(--color-subtle-bg)' }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${getProgressPercent(project)}%`,
                      // Dynamic project color gradient — keep inline
                      background: `linear-gradient(90deg, ${project.color}, ${project.color}dd)`,
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Today's Time */}
              <div
                className="text-[13px]"
                style={{
                  color: 'var(--color-text-secondary)',
                  fontFamily: getFontFamily('english'),
                }}
              >
                <span style={{ color: 'var(--color-text-muted)' }}>{isToday ? 'Today:' : 'Tracked:'} </span>
                <span style={{ fontWeight: '600', color: 'var(--color-text)', ...tabularNumberStyle }}>
                  {formatHoursToHM(project.trackedToday)}
                </span>
              </div>

              {/* Status Pills */}
              <div
                className="flex flex-wrap gap-1.5"
                style={{ maxHeight: '140px', overflowY: 'auto' }}
              >
                {project.statuses.length === 0 ? (
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>No tasks</span>
                ) : (
                  project.statuses.map((status, j) => (
                    <StatusPill
                      key={`${project.name}-${status.name}-${j}`}
                      statusName={status.name}
                      statusColor={status.color}
                      count={status.count}
                      theme={theme}
                      onClick={() => handlePillClick(project.name, status.name, status.tasks)}
                    />
                  ))
                )}
              </div>

              {/* Assignee Avatars */}
              {project.assignees.length > 0 && (
                <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
                  <AvatarStack assignees={project.assignees} max={3} theme={theme} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Task List Modal */}
      <TaskListModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        project={modalState.project}
        status={modalState.status}
        tasks={modalState.tasks}
        theme={theme}
      />
    </div>
  );
};

export default ProjectBreakdownCard;
