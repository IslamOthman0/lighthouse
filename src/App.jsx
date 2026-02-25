import React, { useEffect, useMemo } from 'react';
import { useTheme } from './hooks/useTheme';
import { useAppStore } from './stores/useAppStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { useClickUpSync } from './hooks/useClickUpSync';
import { useSettings } from './hooks/useSettings';
import Header from './components/layout/Header';
import MainTabs from './components/layout/MainTabs';
import FilterSortControls from './components/layout/FilterSortControls';
import MobileBottomNav from './components/layout/MobileBottomNav';
import SettingsModal from './components/modals/SettingsModal';
import OverviewCard from './components/cards/OverviewCard';
import ScoreBreakdownCard from './components/cards/ScoreBreakdownCard';
import TeamStatusCard from './components/cards/TeamStatusCard';
import TeamStatusOverview from './components/cards/TeamStatusOverview';
import ProjectBreakdownCard from './components/cards/ProjectBreakdownCard';
import RankingTable from './components/table/RankingTable';
import ListView from './components/views/ListView';
import LeavesTab from './components/views/LeavesTab';
import MemberDetailModal from './components/modals/MemberDetailModal';
import DashboardDetailModal from './components/modals/DashboardDetailModal';
import { formatHoursToHM } from './utils/timeFormat';
import { getMetricColor } from './utils/metricColor';
import { useWindowSize } from './hooks/useWindowSize';
import { useState as useReactState } from 'react';
import {
  SkeletonMemberCard,
  SkeletonOverviewCard,
  SkeletonScoreCard,
  SkeletonProjectCard,
  SkeletonStyles
} from './components/ui/Skeleton';

function App() {
  const { theme, themes, currentTheme, setTheme } = useTheme();
  const { isMobile } = useWindowSize();
  const { settings } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useReactState(false);
  const [mobileTab, setMobileTab] = useReactState('dashboard');

  // Zustand store selectors (replaces useState)
  const activeMainTab = useAppStore(state => state.activeMainTab);
  const activeView = useAppStore(state => state.activeView);
  const setActiveMainTab = useAppStore(state => state.setActiveMainTab);
  const setActiveView = useAppStore(state => state.setActiveView);

  // Modal state from Zustand
  const selectedMember = useAppStore(state => state.selectedMember);
  const isMemberModalOpen = useAppStore(state => state.isMemberModalOpen);
  const dashboardDetailType = useAppStore(state => state.dashboardDetailType);
  const isDashboardDetailOpen = useAppStore(state => state.isDashboardDetailOpen);

  const openMemberModal = useAppStore(state => state.openMemberModal);
  const closeMemberModal = useAppStore(state => state.closeMemberModal);
  const openDashboardDetail = useAppStore(state => state.openDashboardDetail);
  const closeDashboardDetail = useAppStore(state => state.closeDashboardDetail);

  // Members data and stats from Zustand
  const members = useAppStore(state => state.members);
  const teamStats = useAppStore(state => state.teamStats);
  const scoreMetrics = useAppStore(state => state.scoreMetrics);
  const setMembers = useAppStore(state => state.setMembers);
  const updateStats = useAppStore(state => state.updateStats);
  const updateProjectBreakdown = useAppStore(state => state.updateProjectBreakdown);

  // Filter/Sort state from Zustand
  const memberFilter = useAppStore(state => state.memberFilter);
  const memberSort = useAppStore(state => state.memberSort);

  // Filtered and sorted members (memoized for performance)
  const filteredMembers = useMemo(() => {
    if (!members || members.length === 0) return [];

    // Apply "Members to Monitor" setting — if the user selected specific members, only show those
    let result = [...members];
    const monitored = (settings?.team?.membersToMonitor || []).map(String);
    if (monitored.length > 0) {
      result = result.filter(m => monitored.includes(String(m.clickUpId)));
    }

    // Apply status filter
    if (memberFilter !== 'all') {
      result = result.filter(m => {
        if (memberFilter === 'noActivity') {
          // No activity = status is explicitly 'noActivity'
          return m.status === 'noActivity';
        }
        return m.status === memberFilter;
      });
    }

    // Apply sort
    result.sort((a, b) => {
      switch (memberSort) {
        case 'activity': {
          // Activity-based sort: working → break → offline → noActivity → leave
          const statusOrder = { working: 1, break: 2, offline: 3, noActivity: 4, leave: 5 };
          const aOrder = statusOrder[a.status] || 6;
          const bOrder = statusOrder[b.status] || 6;

          if (aOrder !== bOrder) return aOrder - bOrder;

          // Within same status, apply specific sort
          if (a.status === 'working') {
            // Working: sort by score desc
            return (b.score || 0) - (a.score || 0);
          } else if (a.status === 'break') {
            // Break: sort by duration asc (shortest break first)
            return (a.breakDuration || 0) - (b.breakDuration || 0);
          } else if (a.status === 'offline') {
            // Offline: sort by lastSeen asc (most recently seen first)
            return (b.lastSeen || 0) - (a.lastSeen || 0);
          } else {
            // NoActivity/Leave: alphabetically
            return (a.name || '').localeCompare(b.name || '');
          }
        }
        case 'hours':
          return (b.tracked || 0) - (a.tracked || 0); // Descending
        case 'tasks':
          return (b.tasks || 0) - (a.tasks || 0); // Descending
        case 'name':
          return (a.name || '').localeCompare(b.name || ''); // Ascending alphabetically
        case 'rank':
        default:
          return (b.score || 0) - (a.score || 0); // Descending by score
      }
    });

    return result;
  }, [members, memberFilter, memberSort, settings?.team?.membersToMonitor]);

  // Sync status
  const syncStatus = useAppStore(state => ({
    lastSync: state.lastSync,
    error: state.syncError,
    isSyncing: state.isSyncing
  }));

  // Handle member click to open detail modal
  const handleMemberClick = (member) => {
    openMemberModal(member);
  };

  // Handle dashboard card click
  const handleDashboardCardClick = (type) => {
    openDashboardDetail(type);
  };

  // Load members from IndexedDB using Dexie
  const dbMembers = useLiveQuery(() => db.members.toArray(), []);

  // ClickUp API configuration from environment variables
  const useClickUpAPI = import.meta.env.VITE_USE_CLICKUP_API === 'true';
  const apiKey = import.meta.env.VITE_CLICKUP_API_KEY;
  const teamId = import.meta.env.VITE_CLICKUP_TEAM_ID;

  // Initialize ClickUp sync (only if enabled)
  // Sync interval comes from settings (default: 30000ms / 30 seconds)
  useClickUpSync({
    enabled: useClickUpAPI,
    apiKey,
    teamId,
    interval: settings.sync.intervalMs
  });

  // Initialize activeView from settings on mount
  useEffect(() => {
    if (settings?.display?.defaultView) {
      setActiveView(settings.display.defaultView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Database initialization: team members are discovered from ClickUp API
  // by useClickUpSync's discoverAndMergeTeamMembers() on first sync init.
  // No hardcoded mock data — ClickUp API is the single source of truth.
  // The useLiveQuery(db.members) above will automatically pick up new members.

  // Update Zustand store when database changes
  useEffect(() => {
    if (dbMembers && dbMembers.length > 0) {
      setMembers(dbMembers);
      updateStats();
      updateProjectBreakdown();
    }
  }, [dbMembers, setMembers, updateStats, updateProjectBreakdown]);

  // Pull workingDays from store (set by sync based on date range)
  const dateRangeInfo = useAppStore(state => state.dateRangeInfo);
  const teamBaseline = useAppStore(state => state.teamBaseline);

  // Compute stats from the VISIBLE (filtered) members so overview cards stay in sync
  const { displayTeamStats, displayScoreMetrics, teamScore } = useMemo(() => {
    if (!filteredMembers || filteredMembers.length === 0) {
      return { displayTeamStats: null, displayScoreMetrics: null, teamScore: 0 };
    }

    const workingDays = dateRangeInfo?.workingDays || 1;
    const totalTracked = filteredMembers.reduce((sum, m) => sum + (m.tracked || 0), 0);
    const totalTarget = filteredMembers.length * 6.5 * workingDays;
    const totalTasksDone = filteredMembers.reduce((sum, m) => sum + (m.done || 0), 0);
    const totalTasks = filteredMembers.reduce((sum, m) => sum + (m.tasks || 0), 0);
    const totalComplianceHours = filteredMembers.reduce((sum, m) => sum + (m.complianceHours ?? (m.tracked || 0) * 0.85), 0);

    const timeRatio = totalTarget > 0 ? Math.min((totalTracked / totalTarget) * 100, 100) : 0;
    const taskBaseline = filteredMembers.length * (teamBaseline || 3);
    const workloadRatio = taskBaseline > 0 ? Math.min((totalTasks / taskBaseline) * 100, 100) : 0;
    const completionRatio = totalTasks > 0 ? (totalTasksDone / totalTasks) * 100 : 0;
    const complianceRatio = totalTarget > 0 ? Math.min((totalComplianceHours / totalTarget) * 100, 100) : 0;

    const timeScore = (timeRatio / 100) * 40;
    const workloadScore = (workloadRatio / 100) * 20;
    const completionScore = (completionRatio / 100) * 30;
    const complianceScore = (complianceRatio / 100) * 10;
    const total = Math.round(timeScore + workloadScore + completionScore + complianceScore);

    return {
      displayTeamStats: {
        tracked: {
          value: formatHoursToHM(totalTracked),
          sub: `/ ${formatHoursToHM(totalTarget)}`,
          progress: timeRatio
        },
        tasks: {
          value: `${totalTasksDone}/${totalTasks}`,
          sub: `${Math.round(completionRatio)}% done`,
          progress: completionRatio
        }
      },
      displayScoreMetrics: {
        time: Math.round(timeRatio),
        tasks: Math.round(completionRatio),
        workload: Math.round(workloadRatio),
        compliance: Math.round(complianceRatio),
        total
      },
      teamScore: total
    };
  }, [filteredMembers, dateRangeInfo, teamBaseline]);

  // Show skeleton loading state while database initializes
  const isInitialLoad = !members || members.length === 0;
  const showSkeletons = isInitialLoad || (syncStatus.isSyncing && !syncStatus.lastSync);

  if (isInitialLoad) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: theme.bg,
          color: theme.text,
          fontFamily: "'Inter', sans-serif",
          padding: isMobile ? '12px' : '20px',
        }}
      >
        <SkeletonStyles />

        {/* Header Skeleton */}
        <div style={{ marginBottom: isMobile ? '12px' : '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '150px',
                height: '36px',
                borderRadius: '8px',
                background: theme.innerBg,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <div
                style={{
                  width: '100px',
                  height: '32px',
                  borderRadius: '10px',
                  background: theme.innerBg,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  width: '80px',
                  height: '32px',
                  borderRadius: '10px',
                  background: theme.innerBg,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>

        {/* Overview Cards Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <SkeletonOverviewCard theme={theme} />
          <SkeletonOverviewCard theme={theme} />
          <SkeletonScoreCard theme={theme} />
          <SkeletonProjectCard theme={theme} />
        </div>

        {/* Member Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <SkeletonMemberCard key={i} theme={theme} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <SkeletonStyles />
      <div
        style={{
        minHeight: '100vh',
        background: theme.bg,
        color: theme.text,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Scrollbar styling */}
      <style>{`
        ::-webkit-scrollbar-track {
          background: ${theme.secondaryBg};
        }
        ::-webkit-scrollbar-thumb {
          background: ${theme.border};
        }
      `}</style>

      {/* Main Container */}
      <div
        style={{
          maxWidth: '1800px',
          margin: '0 auto',
          padding: isMobile ? '16px' : '24px 40px',
          paddingBottom: isMobile ? '72px' : '24px', // Space for compact bottom nav on mobile (56px + 16px buffer)
        }}
      >
        {/* Header with Logo and Theme Switcher */}
        <Header
          theme={theme}
          themes={themes}
          currentTheme={currentTheme}
          setTheme={setTheme}
          onSettingsClick={() => setIsSettingsOpen(true)}
        />

        {/* Main Tabs - Dashboard / Leaves & WFH (Desktop only) */}
        {!isMobile && (
          <MainTabs
            theme={theme}
            activeMainTab={activeMainTab}
            setActiveMainTab={setActiveMainTab}
          />
        )}

        {/* Dashboard Content */}
        {activeMainTab === 'dashboard' && (
          <>
            {/* Grid View Content */}
            {activeView === 'grid' && (
              <>
                {/* Overview Row - 3 columns */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '16px',
                    marginBottom: '16px',
                  }}
                >
                  {/* Stacked Overview Cards (Column 1) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                    <OverviewCard
                      theme={theme}
                      value={displayTeamStats?.tracked.value || '0h'}
                      subValue={displayTeamStats?.tracked.sub || '/ 0h'}
                      label={(dateRangeInfo?.workingDays || 1) > 1 ? `Team Tracked (${dateRangeInfo.workingDays} days)` : 'Team Tracked'}
                      progress={displayTeamStats?.tracked.progress || 0}
                      color={theme.working}
                      onClick={() => handleDashboardCardClick('time')}
                    />
                    <OverviewCard
                      theme={theme}
                      value={displayTeamStats?.tasks.value || '0/0'}
                      subValue={displayTeamStats?.tasks.sub || '0% done'}
                      label="Tasks Progress"
                      progress={displayTeamStats?.tasks.progress || 0}
                      color={getMetricColor(displayTeamStats?.tasks.progress || 0)}
                      onClick={() => handleDashboardCardClick('tasks')}
                    />
                  </div>

                  {/* Score Breakdown Card (Column 2) */}
                  <ScoreBreakdownCard theme={theme} teamScore={teamScore} metrics={displayScoreMetrics} onClick={() => handleDashboardCardClick('score')} />

                  {/* Team Status Overview (Column 3) */}
                  <TeamStatusOverview members={filteredMembers} theme={theme} />
                </div>

                {/* Project Breakdown - Full Width */}
                <div style={{ marginBottom: '16px' }}>
                  <ProjectBreakdownCard theme={theme} />
                </div>

                {/* Filter/Sort Controls - Above member cards */}
                <FilterSortControls
                  theme={theme}
                  activeView={activeView}
                  setActiveView={setActiveView}
                />

                {/* Member Cards Grid - Cards on main background */}
                <div style={{ marginBottom: '16px' }}>
                  <TeamStatusCard members={filteredMembers} theme={theme} onMemberClick={handleMemberClick} workingDays={dateRangeInfo?.workingDays || 1} />
                </div>

                {/* Ranking Table - Full Width */}
                <div style={{ marginBottom: '16px' }}>
                  <RankingTable members={filteredMembers} theme={theme} onMemberClick={handleMemberClick} dateRangeInfo={dateRangeInfo} />
                </div>

                
              </>
            )}

            {/* List View Content */}
            {activeView === 'list' && (
              <ListView
                members={filteredMembers}
                theme={theme}
                teamStats={displayTeamStats}
                scoreMetrics={displayScoreMetrics}
                onMemberClick={handleMemberClick}
                onDashboardCardClick={handleDashboardCardClick}
                controls={
                  <FilterSortControls
                    theme={theme}
                    activeView={activeView}
                    setActiveView={setActiveView}
                  />
                }
              />
            )}
          </>
        )}

        {/* Feed View Content (Placeholder) */}
        {activeMainTab === 'dashboard' && activeView === 'feed' && (
          <div
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center',
              color: theme.textMuted,
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: theme.text, marginBottom: '8px' }}>
              Feed View
            </div>
            <div style={{ fontSize: '14px' }}>
              This section will contain a live activity feed showing real-time updates.
              <br />
              Coming soon!
            </div>
          </div>
        )}

        {/* Leaves & WFH Content */}
        {activeMainTab === 'leaves' && (
          <LeavesTab theme={theme} isMobile={isMobile} />
        )}
      </div>

      {/* Member Detail Modal */}
      <MemberDetailModal
        isOpen={isMemberModalOpen}
        onClose={closeMemberModal}
        member={selectedMember}
        theme={theme}
      />

      {/* Dashboard Detail Modal */}
      <DashboardDetailModal
        isOpen={isDashboardDetailOpen}
        onClose={closeDashboardDetail}
        type={dashboardDetailType}
        theme={theme}
        members={filteredMembers}
        teamStats={displayTeamStats}
        scoreMetrics={displayScoreMetrics}
        dateRangeInfo={dateRangeInfo}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        currentTheme={currentTheme}
        setTheme={setTheme}
      />

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav
          theme={theme}
          activeTab={mobileTab}
          onTabChange={(tab) => {
            setMobileTab(tab);
            if (tab === 'dashboard') {
              setActiveMainTab('dashboard');
            } else if (tab === 'leaves') {
              setActiveMainTab('leaves');
            } else if (tab === 'settings') {
              setIsSettingsOpen(true);
            }
            // TODO: Add feed view
          }}
        />
      )}
      </div>
    </>
  );
}

export default App;
