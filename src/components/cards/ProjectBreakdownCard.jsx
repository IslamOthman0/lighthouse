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

// Returns black or white text color with sufficient contrast against a hex background
const getContrastColor = (hexBg) => {
  if (!hexBg || !hexBg.startsWith('#')) return '#ffffff';
  const r = parseInt(hexBg.slice(1, 3), 16);
  const g = parseInt(hexBg.slice(3, 5), 16);
  const b = parseInt(hexBg.slice(5, 7), 16);
  // WCAG relative luminance
  const toLinear = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? '#000000' : '#ffffff';
};

// Status Pill Component - uses dynamic ClickUp status colors
const StatusPill = ({ statusName, statusColor, count, theme, onClick }) => {
  // Validate color - must be a proper hex/rgb value, not CSS variable
  const isValidColor = statusColor &&
                       statusColor.trim() !== '' &&
                       !statusColor.includes('var(') &&
                       !statusColor.startsWith('--') &&
                       (statusColor.startsWith('#') || statusColor.startsWith('rgb'));

  // Use ClickUp color if valid, otherwise generate consistent color from name
  const bgColor = isValidColor ? statusColor : generateStatusColor(statusName);

  // Debug logging
  if (!isValidColor) {
    console.log(`[StatusPill] Invalid/missing color for "${statusName}" (was: "${statusColor}"), generated: ${bgColor}`);
  }

  // Capitalize first letter of status name
  const capitalizedName = statusName.charAt(0).toUpperCase() + statusName.slice(1);

  // Generate test ID from status name
  const testId = `status-pill-${statusName.toLowerCase().replace(/\s+/g, '-')}`;

  // Use accessible text color based on background luminance
  const textColor = getContrastColor(bgColor);
  const badgeBg = textColor === '#000000' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)';

  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        color: textColor,
        background: bgColor,
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: getFontFamily('english'),
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.85';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <span style={{ fontSize: '10px' }}>●</span>
      <span>{capitalizedName}</span>
      <span
        style={{
          background: badgeBg,
          padding: '2px 6px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '600',
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
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
      style={{
        background: theme.cardBg,
        backdropFilter: theme.backdropBlur,
        WebkitBackdropFilter: theme.backdropBlur,
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow || 'none',
      }}
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
        <div
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: theme.text,
            fontFamily: getFontFamily('english'),
          }}
        >
          Projects Breakdown
        </div>
        <div
          style={{
            fontSize: '12px',
            color: theme.textMuted,
            fontFamily: getFontFamily('english'),
          }}
        >
          {projects.length} active {projects.length === 1 ? 'project' : 'projects'}
        </div>
      </div>

      {/* No Data Placeholder */}
      {!hasData && (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            color: theme.textMuted,
            fontSize: '13px',
            fontFamily: getFontFamily('english'),
          }}
        >
          <div style={{ marginBottom: '8px', fontSize: '24px', opacity: 0.5 }}>📂</div>
          No projects with tracked time today
        </div>
      )}

      {/* Project Grid */}
      {hasData && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '24px',
            maxWidth: '1600px',
            margin: '0 auto',
          }}
        >
          {projects.map((project, i) => (
            <div
              key={i}
              style={{
                background: theme.innerBg,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${theme.borderLight || theme.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Header: Icon + Name + Subtitle */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <ProjectIcon projectName={project.name} color={project.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: theme.text,
                      marginBottom: '4px',
                      fontFamily: getAdaptiveFontFamily(project.name),
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {project.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: theme.textMuted,
                      fontFamily: getFontFamily('english'),
                    }}
                  >
                    {getActiveTasks(project)} active {getActiveTasks(project) === 1 ? 'task' : 'tasks'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color: theme.textSecondary,
                      fontFamily: getFontFamily('english'),
                    }}
                  >
                    Progress
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: theme.text,
                      ...tabularNumberStyle,
                    }}
                  >
                    {getProgressPercent(project)}%
                  </span>
                </div>
                <div
                  style={{
                    height: '6px',
                    background: theme.subtleBg || 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${getProgressPercent(project)}%`,
                      background: `linear-gradient(90deg, ${project.color}, ${project.color}dd)`,
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Today's Time */}
              <div
                style={{
                  fontSize: '13px',
                  color: theme.textSecondary,
                  fontFamily: getFontFamily('english'),
                }}
              >
                <span style={{ color: theme.textMuted }}>Today: </span>
                <span style={{ fontWeight: '600', color: theme.text, ...tabularNumberStyle }}>
                  {formatHoursToHM(project.trackedToday)}
                </span>
              </div>

              {/* Status Pills */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                }}
              >
                {project.statuses.length === 0 ? (
                  <span style={{ color: theme.textMuted, fontSize: '11px' }}>No tasks</span>
                ) : (
                  project.statuses.map((status, j) => {
                    // CRITICAL: Always generate a valid color (never pass undefined)
                    const pillColor = status.color && status.color !== '' ? status.color : generateStatusColor(status.name);

                    if (!status.color) {
                      console.log(`[ProjectBreakdown] "${status.name}" missing color, generated: ${pillColor}`);
                    }

                    return (
                      <StatusPill
                        key={`${project.name}-${status.name}-${j}`}
                        statusName={status.name}
                        statusColor={pillColor}
                        count={status.count}
                        theme={theme}
                        onClick={() => handlePillClick(project.name, status.name, status.tasks)}
                      />
                    );
                  })
                )}
              </div>

              {/* Assignee Avatars */}
              {project.assignees.length > 0 && (
                <div style={{ paddingTop: '8px', borderTop: `1px solid ${theme.borderLight || theme.border}` }}>
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
