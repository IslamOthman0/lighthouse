import React, { useMemo } from 'react';
import Avatar from '../../ui/Avatar';
import QuotaBar from './QuotaBar';
import { TYPE_ICONS, TYPE_COLORS, TYPE_LABELS, STATUS_COLORS_MAP, formatDateShort, formatDateRange, getMember, toLocalDateStr } from './constants';
import { db } from '../../../db';
import { getMemberLeaveBalance, calculateLeaveDays } from '../../../utils/leaveHelpers';
import { tabularNumberStyle } from '../../../utils/typography';

/**
 * Team Overview Panel - compact member quota cards + today's status + upcoming leaves
 */
const TeamOverviewPanel = ({ leaves, members, theme, settings, isMobile, onSelectMember }) => {
  const todayStr = toLocalDateStr();

  // Members on leave / WFH today
  const { membersOnLeave, membersWfh, availableCount } = useMemo(() => {
    const onLeave = [];
    const onWfh = [];
    const seen = new Set();

    leaves.forEach(l => {
      if (l.status === 'rejected') return;
      const end = l.endDate || l.startDate;
      if (todayStr < l.startDate || todayStr > end) return;

      const member = getMember(l, members);
      if (!member || seen.has(String(member.clickUpId || member.id))) return;
      seen.add(String(member.clickUpId || member.id));

      if (l.type === 'wfh') onWfh.push({ member, leave: l });
      else onLeave.push({ member, leave: l });
    });

    return {
      membersOnLeave: onLeave,
      membersWfh: onWfh,
      // WFH members are still working, so they count as available
      availableCount: members.length - onLeave.length,
    };
  }, [leaves, members, todayStr]);

  // Per-member balances
  const memberBalances = useMemo(() => {
    return members.map(m => {
      const id = m.clickUpId || m.id;
      const balance = getMemberLeaveBalance(id, leaves, settings);
      const leaveToday = leaves.find(l => {
        if (l.status === 'rejected') return false;
        const end = l.endDate || l.startDate;
        if (todayStr < l.startDate || todayStr > end) return false;
        return String(l.memberId) === String(id) || String(l.memberClickUpId) === String(id);
      });
      const nextLeave = leaves
        .filter(l => {
          if (l.status === 'rejected') return false;
          if (l.type === 'wfh') return false;
          const match = String(l.memberId) === String(id) || String(l.memberClickUpId) === String(id);
          return match && l.startDate > todayStr;
        })
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

      return { member: m, balance, leaveToday, nextLeave };
    });
  }, [members, leaves, settings, todayStr]);

  // Upcoming leaves (next 14 days)
  const upcoming = useMemo(() => {
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + 14);
    const limitStr = toLocalDateStr(futureLimit);

    return leaves
      .filter(l => l.status !== 'rejected' && l.startDate > todayStr && l.startDate <= limitStr)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 6);
  }, [leaves, todayStr]);

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Today's Status Strip */}
      <div className="flex gap-2 flex-wrap">
        <StatusChip
          icon={TYPE_ICONS.annual}
          count={membersOnLeave.length}
          label="on leave"
          items={membersOnLeave}
          color={TYPE_COLORS.annual}
          theme={theme}
        />
        <StatusChip
          icon={TYPE_ICONS.wfh}
          count={membersWfh.length}
          label="WFH"
          items={membersWfh}
          color={TYPE_COLORS.wfh}
          theme={theme}
        />
        <StatusChip
          icon="&#x2705;"
          count={availableCount}
          label="available"
          items={[]}
          color={theme.success || '#059669'}
          theme={theme}
        />
      </div>

      <PendingRequestsSection leaves={leaves} members={members} theme={theme} />

      {/* Member Quota Cards Grid — auto-fill desktop, 1 col mobile */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))' }}
      >
        {memberBalances.map(({ member, balance, leaveToday, nextLeave }) => (
          <MemberQuotaCard
            key={member.id || member.clickUpId}
            member={member}
            balance={balance}
            leaveToday={leaveToday}
            nextLeave={nextLeave}
            theme={theme}
            isMobile={isMobile}
            onClick={() => onSelectMember(member)}
          />
        ))}
      </div>

      {/* Upcoming Leaves */}
      {upcoming.length > 0 && (
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-[10px] p-[14px]">
          <div className="text-xs font-semibold text-[var(--color-text)] mb-[10px]">
            Upcoming (next 14 days)
          </div>
          <div className="flex flex-col gap-1">
            {upcoming.map(l => {
              const member = getMember(l, members);
              const days = l.requestedDays || calculateLeaveDays(l.startDate, l.endDate);
              return (
                <div key={l.id} className="flex items-center gap-2 py-[6px] border-b border-[var(--color-border)] text-xs">
                  <span className="text-[var(--color-text-secondary)] min-w-[48px] text-[11px]" style={tabularNumberStyle}>
                    {formatDateShort(l.startDate)}
                  </span>
                  {member && (
                    <Avatar name={member.name} status={member.status} theme={theme} size={20}
                      profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
                  )}
                  <span className="text-[var(--color-text)] flex-1">
                    {member?.name || l.memberName}
                  </span>
                  <span
                    className="text-[10px] px-[6px] py-[2px] rounded text-white font-semibold"
                    style={{ background: TYPE_COLORS[l.type] || TYPE_COLORS.annual }}
                  >
                    {TYPE_LABELS[l.type] || 'Leave'}
                  </span>
                  <span className="text-[var(--color-text-secondary)] text-[11px]" style={tabularNumberStyle}>
                    {days}d
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---

const StatusChip = ({ icon, count, label, items, color, theme }) => (
  <div
    className="flex items-center gap-[6px] px-[10px] py-[5px] rounded-button text-xs font-semibold"
    style={{
      background: `${color}18`,
      border: `1px solid ${color}30`,
      color,
    }}
  >
    <span className="text-[13px]">{icon}</span>
    <span style={tabularNumberStyle}>{count}</span>
    <span className="font-medium">{label}</span>
    {items.length > 0 && (
      <div className="flex ml-[2px]">
        {items.slice(0, 3).map(({ member }, i) => (
          <div key={member.id || member.clickUpId} style={{ marginLeft: i > 0 ? -6 : 0 }}>
            <Avatar name={member.name} status={member.status} theme={theme} size={18}
              profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
          </div>
        ))}
        {items.length > 3 && (
          <span className="text-[10px] ml-[3px] self-center" style={{ color }}>+{items.length - 3}</span>
        )}
      </div>
    )}
  </div>
);

const PendingRequestsSection = ({ leaves, members, theme }) => {
  const pending = leaves.filter(l => l.status === 'pending');
  if (pending.length === 0) return null;

  const rejectColor = '#ef4444';

  const handleApprove = async (leave) => {
    await db.leaves.update(leave.id, { status: 'approved', updated: Date.now() });
  };

  const handleReject = async (leave) => {
    await db.leaves.update(leave.id, { status: 'rejected', updated: Date.now() });
  };

  return (
    <div
      className="bg-[var(--color-card-bg)] rounded-[10px] p-[14px]"
      style={{ border: `1px solid ${TYPE_COLORS.annual}40` }}
    >
      <div className="text-xs font-semibold text-[var(--color-text)] mb-[10px]">
        ⏳ Pending Requests ({pending.length})
      </div>
      <div className="flex flex-col gap-[6px]">
        {pending.map((l, index) => {
          const member = getMember(l, members);
          const days = l.requestedDays || calculateLeaveDays(l.startDate, l.endDate);
          const typeColor = TYPE_COLORS[l.type] || TYPE_COLORS.annual;
          return (
            <div
              key={l.id}
              className="flex items-center gap-2 py-[6px] text-xs"
              style={{ borderBottom: index < pending.length - 1 ? '1px solid var(--color-border)' : 'none' }}
            >
              {member && (
                <Avatar name={member.name} status={member.status} theme={theme} size={22}
                  profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
              )}
              <span className="text-[var(--color-text)] flex-1 font-medium">
                {member?.name || l.memberName}
              </span>
              <span
                className="text-[10px] px-[6px] py-[2px] rounded font-semibold"
                style={{
                  background: `${typeColor}20`,
                  color: typeColor,
                }}
              >
                {TYPE_ICONS[l.type]} {TYPE_LABELS[l.type] || 'Leave'}
              </span>
              <span className="text-[var(--color-text-secondary)] text-[11px]" style={tabularNumberStyle}>
                {formatDateRange(l.startDate, l.endDate)} · {days}d
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleApprove(l); }}
                className="text-[10px] px-2 py-[3px] rounded cursor-pointer font-semibold"
                style={{
                  border: `1px solid ${STATUS_COLORS_MAP.approved}60`,
                  background: `${STATUS_COLORS_MAP.approved}15`,
                  color: STATUS_COLORS_MAP.approved,
                }}
              >
                Approve
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleReject(l); }}
                className="text-[10px] px-2 py-[3px] rounded cursor-pointer font-semibold"
                style={{
                  border: `1px solid ${rejectColor}60`,
                  background: `${rejectColor}15`,
                  color: rejectColor,
                }}
              >
                Reject
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MemberQuotaCard = ({ member, balance, leaveToday, nextLeave, theme, isMobile, onClick }) => {
  const isOnLeave = leaveToday && leaveToday.type !== 'wfh';
  const isWfh = leaveToday && leaveToday.type === 'wfh';
  const defaultBorder = 'var(--color-border)';
  const activeBorder = isOnLeave ? `${TYPE_COLORS.annual}50` : isWfh ? `${TYPE_COLORS.wfh}50` : defaultBorder;

  return (
    <div
      onClick={onClick}
      className={`bg-[var(--color-card-bg)] rounded-[10px] cursor-pointer transition-[border-color,transform] duration-200 ${isMobile ? 'p-[14px]' : 'p-4'}`}
      style={{ border: `1px solid ${activeBorder}` }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.38)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = activeBorder;
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Header: Avatar + Name */}
      <div className="flex items-center gap-[10px] mb-[10px]">
        <Avatar name={member.name} status={member.status} theme={theme} size={40}
          profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[var(--color-text)] whitespace-nowrap overflow-hidden text-ellipsis">
            {member.name}
          </div>
          {isOnLeave && (
            <span className="text-[11px] font-semibold" style={{ color: TYPE_COLORS.annual }}>
              {TYPE_ICONS[leaveToday.type]} On Leave
            </span>
          )}
          {isWfh && (
            <span className="text-[11px] font-semibold" style={{ color: TYPE_COLORS.wfh }}>
              {TYPE_ICONS.wfh} WFH
            </span>
          )}
          {!isOnLeave && !isWfh && (
            <span className="text-[11px] text-[var(--color-text-secondary)]">Available</span>
          )}
        </div>
      </div>

      {/* Stacked Quota Bars */}
      <div className="flex flex-col gap-1 mb-2">
        <QuotaBar label="Annual" used={balance.annual.used} total={balance.annual.total} color={TYPE_COLORS.annual} theme={theme} compact />
        <QuotaBar label="Sick" used={balance.sick.used} total={balance.sick.total} color={TYPE_COLORS.sick} theme={theme} compact />
        <QuotaBar label="Bonus" used={balance.bonus.used} total={balance.bonus.total} color={TYPE_COLORS.bonus} theme={theme} compact />
        <QuotaBar label="WFH" used={balance.wfh.usedThisMonth} total={balance.wfh.monthly} color={TYPE_COLORS.wfh} theme={theme} compact />
      </div>

      {/* Footer: Next leave */}
      {!isOnLeave && !isWfh && nextLeave && (
        <div className="mt-[6px] text-[10px] text-[var(--color-text-secondary)]">
          Next: {formatDateShort(nextLeave.startDate)}
        </div>
      )}
    </div>
  );
};

export default TeamOverviewPanel;
