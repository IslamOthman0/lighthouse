import React, { useMemo } from 'react';
import Avatar from '../../ui/Avatar';
import QuotaBar from './QuotaBar';
import { TYPE_ICONS, TYPE_COLORS, TYPE_LABELS, STATUS_COLORS_MAP, formatDateShort, getMember, toLocalDateStr } from './constants';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Today's Status Strip */}
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
      }}>
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

      {/* Member Quota Cards Grid — 4 per row desktop, 2 tablet, 1 mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16,
      }}>
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
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          padding: 14,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, marginBottom: 10 }}>
            Upcoming (next 14 days)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {upcoming.map(l => {
              const member = getMember(l, members);
              const days = l.requestedDays || calculateLeaveDays(l.startDate, l.endDate);
              return (
                <div key={l.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 0',
                  borderBottom: `1px solid ${theme.border}`,
                  fontSize: 12,
                }}>
                  <span style={{ color: theme.textSecondary, ...tabularNumberStyle, minWidth: 48, fontSize: 11 }}>
                    {formatDateShort(l.startDate)}
                  </span>
                  {member && (
                    <Avatar name={member.name} status={member.status} theme={theme} size={20}
                      profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
                  )}
                  <span style={{ color: theme.text, flex: 1 }}>
                    {member?.name || l.memberName}
                  </span>
                  <span style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: TYPE_COLORS[l.type] || TYPE_COLORS.annual,
                    color: '#fff',
                    fontWeight: 600,
                  }}>
                    {TYPE_LABELS[l.type] || 'Leave'}
                  </span>
                  <span style={{ ...tabularNumberStyle, color: theme.textSecondary, fontSize: 11 }}>
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
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    borderRadius: 8,
    background: `${color}18`,
    border: `1px solid ${color}30`,
    fontSize: 12,
    fontWeight: 600,
    color,
  }}>
    <span style={{ fontSize: 13 }}>{icon}</span>
    <span style={{ ...tabularNumberStyle }}>{count}</span>
    <span style={{ fontWeight: 500 }}>{label}</span>
    {items.length > 0 && (
      <div style={{ display: 'flex', marginLeft: 2 }}>
        {items.slice(0, 3).map(({ member }, i) => (
          <div key={member.id || member.clickUpId} style={{ marginLeft: i > 0 ? -6 : 0 }}>
            <Avatar name={member.name} status={member.status} theme={theme} size={18}
              profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
          </div>
        ))}
        {items.length > 3 && (
          <span style={{ fontSize: 10, color, marginLeft: 3, alignSelf: 'center' }}>+{items.length - 3}</span>
        )}
      </div>
    )}
  </div>
);

const MemberQuotaCard = ({ member, balance, leaveToday, nextLeave, theme, isMobile, onClick }) => {
  const isOnLeave = leaveToday && leaveToday.type !== 'wfh';
  const isWfh = leaveToday && leaveToday.type === 'wfh';

  return (
    <div
      onClick={onClick}
      style={{
        background: theme.cardBg,
        border: `1px solid ${isOnLeave ? `${TYPE_COLORS.annual}50` : isWfh ? `${TYPE_COLORS.wfh}50` : theme.border}`,
        borderRadius: 10,
        padding: isMobile ? 12 : 10,
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent + '60'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isOnLeave ? `${TYPE_COLORS.annual}50` : isWfh ? `${TYPE_COLORS.wfh}50` : theme.border; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Header: Avatar + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Avatar name={member.name} status={member.status} theme={theme} size={28}
          profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {member.name}
          </div>
          {isOnLeave && (
            <span style={{ fontSize: 10, color: TYPE_COLORS.annual, fontWeight: 600 }}>
              {TYPE_ICONS[leaveToday.type]} On Leave
            </span>
          )}
          {isWfh && (
            <span style={{ fontSize: 10, color: TYPE_COLORS.wfh, fontWeight: 600 }}>
              {TYPE_ICONS.wfh} WFH
            </span>
          )}
        </div>
      </div>

      {/* Compact Quota Summary — 2x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
        <QuotaMini label="Annual" used={balance.annual.used} total={balance.annual.total} color={TYPE_COLORS.annual} theme={theme} />
        <QuotaMini label="Sick" used={balance.sick.used} total={balance.sick.total} color={TYPE_COLORS.sick} theme={theme} />
        <QuotaMini label="Bonus" used={balance.bonus.used} total={balance.bonus.total} color={TYPE_COLORS.bonus} theme={theme} />
        <QuotaMini label="WFH" used={balance.wfh.usedThisMonth} total={balance.wfh.monthly} color={TYPE_COLORS.wfh} theme={theme} />
      </div>

      {/* Footer: Next leave */}
      {!isOnLeave && !isWfh && nextLeave && (
        <div style={{
          marginTop: 6,
          fontSize: 10,
          color: theme.textSecondary,
        }}>
          Next: {formatDateShort(nextLeave.startDate)}
        </div>
      )}
    </div>
  );
};

/** Compact quota display for card grid — single line with mini bar */
const QuotaMini = ({ label, used, total, color, theme }) => {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 10,
        color: theme.textSecondary,
        marginBottom: 2,
      }}>
        <span>{label}</span>
        <span style={{ ...tabularNumberStyle, fontWeight: 600, color: used > 0 ? theme.text : theme.textSecondary }}>
          {used}/{total}
        </span>
      </div>
      <div style={{
        height: 3,
        borderRadius: 2,
        background: theme.type === 'light' ? `${color}15` : `${theme.text}10`,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 2,
          background: color,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
};

export default TeamOverviewPanel;
