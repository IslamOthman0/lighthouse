// Status colors for task pills
export const taskStatusColors = {
  todo: {
    bg: 'rgba(107, 114, 128, 0.2)',
    border: '#6b7280',
    text: '#6b7280',
    icon: '○'
  },
  inProgress: {
    bg: 'rgba(59, 130, 246, 0.2)',
    border: '#3b82f6',
    text: '#3b82f6',
    icon: '◐'
  },
  done: {
    bg: 'rgba(16, 185, 129, 0.2)',
    border: '#10b981',
    text: '#10b981',
    icon: '✓'
  },
};

// Priority colors
export const priorityColors = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

export default taskStatusColors;
