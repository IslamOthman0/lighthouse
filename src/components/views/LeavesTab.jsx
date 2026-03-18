/**
 * Leaves & WFH Tab Component (Redesigned)
 *
 * 2-tab layout with drill-down:
 * - Overview: Team quota cards + today's status + upcoming (click card → member detail)
 * - Calendar: Full month calendar with member avatars + filters
 *
 * Uses useLiveQuery for reactive leave data (auto-updates when sync writes to db.leaves).
 */

import React, { useState, useMemo } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../stores/useAppStore';
import { useSettings } from '../../hooks/useSettings';
import { useWindowSize } from '../../hooks/useWindowSize';
import TeamOverviewPanel from './leaves/TeamOverviewPanel';
import MemberLeaveDetail from './leaves/MemberLeaveDetail';
import LeaveCalendar from './leaves/LeaveCalendar';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'calendar', label: 'Calendar' },
];

const LeavesTab = ({ theme }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMember, setSelectedMember] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');

  const { settings } = useSettings();
  const allMembers = useAppStore(state => state.members) || [];
  const { width } = useWindowSize();
  const isMobile = width < 768;

  // Apply same membersToMonitor filter as the main dashboard
  const members = useMemo(() => {
    const monitored = (settings?.team?.membersToMonitor || []).map(String);
    if (monitored.length === 0) return allMembers;
    return allMembers.filter(m => monitored.includes(String(m.clickUpId)));
  }, [allMembers, settings?.team?.membersToMonitor]);

  // Reactive leave data from IndexedDB
  const leaves = useLiveQuery(() => db.leaves.toArray(), []) || [];

  // When a member is selected in Overview, show detail panel
  if (selectedMember && activeTab === 'overview') {
    return (
      <div className={isMobile ? 'p-3' : 'p-4'}>
        <MemberLeaveDetail
          member={selectedMember}
          leaves={leaves}
          theme={theme}
          settings={settings}
          isMobile={isMobile}
          onBack={() => setSelectedMember(null)}
        />
      </div>
    );
  }

  return (
    <div className={isMobile ? 'p-3' : 'p-4'}>
      {/* Tab Switcher */}
      <div className="flex gap-1 mb-4 bg-[var(--color-inner-bg)] rounded-button p-[3px] w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedMember(null); }}
            className={`px-4 py-[15px] rounded-badge text-[13px] font-medium border-none cursor-pointer transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[var(--color-card-bg)] text-[var(--color-text)] shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
                : 'bg-transparent text-[var(--color-text-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <TeamOverviewPanel
          leaves={leaves}
          members={members}
          theme={theme}
          settings={settings}
          isMobile={isMobile}
          onSelectMember={setSelectedMember}
        />
      )}

      {activeTab === 'calendar' && (
        <LeaveCalendar
          leaves={leaves}
          members={members}
          theme={theme}
          isMobile={isMobile}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          memberFilter={memberFilter}
          onMemberFilterChange={setMemberFilter}
        />
      )}
    </div>
  );
};

export default LeavesTab;
