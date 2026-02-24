import React from 'react';
import WorkingCard from './member-states/WorkingCard';
import BreakCard from './member-states/BreakCard';
import OfflineCard from './member-states/OfflineCard';
import NoActivityCard from './member-states/NoActivityCard';
import LeaveCard from './member-states/LeaveCard';

/**
 * MemberCard - Thin router component
 * Routes to appropriate state-specific card component based on member status
 */
const MemberCard = ({ member, theme, onMemberClick, workingDays = 1 }) => {
  // Check for leave status first (takes precedence)
  if (member.onLeave || member.status === 'leave') {
    return <LeaveCard member={member} theme={theme} onClick={onMemberClick} workingDays={workingDays} />;
  }

  // Route based on status
  switch (member.status) {
    case 'working':
      return <WorkingCard member={member} theme={theme} onClick={onMemberClick} workingDays={workingDays} />;

    case 'break':
      return <BreakCard member={member} theme={theme} onClick={onMemberClick} workingDays={workingDays} />;

    case 'offline':
      return <OfflineCard member={member} theme={theme} onClick={onMemberClick} workingDays={workingDays} />;

    case 'noActivity':
      return <NoActivityCard member={member} theme={theme} onClick={onMemberClick} workingDays={workingDays} />;

    default:
      // Fallback to offline card for unknown states
      return <OfflineCard member={member} theme={theme} onClick={onMemberClick} workingDays={workingDays} />;
  }
};

export default MemberCard;
