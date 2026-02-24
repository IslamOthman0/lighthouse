import React from 'react';

const ViewTabs = ({ theme, activeView, setActiveView }) => {
  const views = [
    { id: 'grid', label: '▣', title: 'Grid View' },
    { id: 'list', label: '≡', title: 'List View' },
    { id: 'feed', label: '📡', title: 'Feed View (Mobile)' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '20px',
        padding: '4px',
        background: theme.secondaryBg,
        borderRadius: '10px',
        border: `1px solid ${theme.borderLight}`,
        width: 'fit-content',
      }}
    >
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => setActiveView(view.id)}
          title={view.title}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeView === view.id ? theme.cardBg : 'transparent',
            color: activeView === view.id ? theme.accent : theme.textMuted,
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            boxShadow:
              activeView === view.id
                ? `0 2px 4px ${theme.type === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`
                : 'none',
          }}
          onMouseEnter={(e) => {
            if (activeView !== view.id) {
              e.currentTarget.style.background = theme.cardBg;
              e.currentTarget.style.color = theme.text;
            }
          }}
          onMouseLeave={(e) => {
            if (activeView !== view.id) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = theme.textMuted;
            }
          }}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
};

export default ViewTabs;
