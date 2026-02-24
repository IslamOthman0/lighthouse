import React from 'react';

const MainTabs = ({ theme, activeMainTab, setActiveMainTab }) => {
  const tabs = [
    { id: 'dashboard', label: '🏠 Dashboard' },
    { id: 'leaves', label: '📅 Leaves & WFH' },
  ];

  return (
    <div
      className="flex gap-2 mb-4"
      style={{ borderBottom: `1px solid ${theme.borderLight}` }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveMainTab(tab.id)}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'transparent',
            color: activeMainTab === tab.id ? theme.text : theme.textSecondary,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            borderBottom: `2px solid ${activeMainTab === tab.id ? theme.text : 'transparent'}`,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (activeMainTab !== tab.id) {
              e.currentTarget.style.color = theme.text;
            }
          }}
          onMouseLeave={(e) => {
            if (activeMainTab !== tab.id) {
              e.currentTarget.style.color = theme.textSecondary;
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default MainTabs;
