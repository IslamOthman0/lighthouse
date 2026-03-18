import React, { useMemo } from 'react';
import { tabularNumberStyle, getFontFamily, getAdaptiveFontFamily } from '../../utils/typography';
import { formatHoursToHM } from '../../utils/timeFormat';
import { useWindowSize } from '../../hooks/useWindowSize';
import ModalShell, { ModalHero, ModalSection, StatRow, ProgressBar, EmptyState } from './ModalShell';

/**
 * Dashboard Detail Modal - Shows detailed breakdowns for Time/Tasks/Score cards
 * Uses real data only - no fake/estimated values
 */
const DashboardDetailModal = ({ isOpen, onClose, type, theme, members, scoreMetrics, dateRangeInfo }) => {
  const { isMobile } = useWindowSize();

  const getPerformanceColor = (percent) => {
    if (percent >= 90) return 'var(--color-success)';
    if (percent >= 70) return 'var(--color-accent)';
    if (percent >= 50) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  // Calculate time data from real values
  const timeData = useMemo(() => {
    if (!members || members.length === 0) return null;

    const workingDays = dateRangeInfo?.workingDays || 1;
    const totalTracked = members.reduce((sum, m) => {
      const t = (typeof m.tracked === 'number' && isFinite(m.tracked)) ? m.tracked : 0;
      return sum + t;
    }, 0);
    const totalTarget = members.reduce((sum, m) => {
      const dailyTarget = m.target || 6.5;
      const mWorkingDays = m.workingDays || workingDays;
      return sum + (dailyTarget * mWorkingDays);
    }, 0);
    const progress = totalTarget > 0 ? Math.min((totalTracked / totalTarget) * 100, 100) : 0;

    const totalDoneForAvg = members.reduce((s, m) => s + (m.done || 0), 0);
    const avgTimePerTask = (totalDoneForAvg > 0 && totalTracked > 0)
      ? totalTracked / totalDoneForAvg
      : null;

    const memberBreakdown = members.map(m => {
      const dailyTarget = m.target || 6.5;
      const memberTarget = dailyTarget * (m.workingDays || workingDays);
      const tracked = (typeof m.tracked === 'number' && isFinite(m.tracked)) ? m.tracked : 0;
      return {
        id: m.id,
        name: m.name,
        status: m.status,
        tracked,
        target: memberTarget,
        timer: m.timer || 0,
        percent: memberTarget > 0 ? Math.min(Math.round((tracked / memberTarget) * 100), 100) : 0,
      };
    }).sort((a, b) => b.tracked - a.tracked);

    const statusCounts = members.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalTracked, totalTarget, progress, memberBreakdown, statusCounts,
      avgTimePerTask, workingDays,
      activeCount: members.filter(m => m.status === 'working').length,
      totalMembers: members.length
    };
  }, [members, dateRangeInfo]);

  // Calculate tasks data from real values
  const tasksData = useMemo(() => {
    if (!members || members.length === 0) return null;

    const workingDays = dateRangeInfo?.workingDays || 1;

    const memberBreakdown = members.map(m => ({
      name: m.name,
      done: m.done || 0,
      total: m.tasks || 0,
      percent: m.tasks > 0 ? Math.round(((m.done || 0) / m.tasks) * 100) : 0
    })).sort((a, b) => b.done - a.done);

    const totalDone = memberBreakdown.reduce((sum, m) => sum + m.done, 0);
    const totalTasks = memberBreakdown.reduce((sum, m) => sum + m.total, 0);
    const progress = totalTasks > 0 ? Math.min((totalDone / totalTasks) * 100, 100) : 0;
    const avgTasksPerMember = members.length > 0 ? (totalTasks / members.length / workingDays) : 0;

    return { totalDone, totalTasks, progress, memberBreakdown, inProgress: totalTasks - totalDone, avgTasksPerMember, workingDays };
  }, [members, dateRangeInfo]);

  // Calculate score data from real values
  const scoreData = useMemo(() => {
    if (!members || members.length === 0 || !scoreMetrics) return null;

    const totalScore = scoreMetrics.total || 0;
    const breakdown = [
      { icon: '⏱️', label: 'Time Tracked', weight: 40, ratio: scoreMetrics.time || 0, points: (scoreMetrics.time || 0) * 0.4 },
      { icon: '📋', label: 'Workload', weight: 20, ratio: scoreMetrics.workload || 0, points: (scoreMetrics.workload || 0) * 0.2 },
      { icon: '✅', label: 'Completion', weight: 30, ratio: scoreMetrics.tasks || 0, points: (scoreMetrics.tasks || 0) * 0.3 },
      { icon: '🎯', label: 'Compliance', weight: 10, ratio: scoreMetrics.compliance || 0, points: (scoreMetrics.compliance || 0) * 0.1 }
    ];
    const rankings = members
      .map(m => ({ name: m.name, score: m.score || 0 }))
      .sort((a, b) => b.score - a.score)
      .map((m, i) => ({ ...m, rank: i + 1 }));
    const grade = totalScore >= 90 ? 'A' : totalScore >= 80 ? 'B' : totalScore >= 70 ? 'C' : totalScore >= 60 ? 'D' : 'F';

    return { totalScore, breakdown, rankings, grade };
  }, [members, scoreMetrics]);

  const getModalInfo = () => {
    switch (type) {
      case 'time': return { title: 'Time Tracked Details', icon: '⏱️' };
      case 'tasks': return { title: 'Tasks Progress Details', icon: '✅' };
      case 'score': return { title: 'Team Score Details', icon: '🏆' };
      default: return { title: 'Details', icon: '📊' };
    }
  };

  const modalInfo = getModalInfo();

  // Reusable inline stat grid item
  const StatGridItem = ({ icon, value, label, color }) => (
    <div className="bg-[var(--color-inner-bg)] rounded-[10px] text-center border border-[var(--color-border)]"
      style={{ padding: isMobile ? '10px 6px' : '12px' }}>
      <div className="text-sm mb-[3px]">{icon}</div>
      <div className="font-bold font-mono" style={{ fontSize: isMobile ? '13px' : '16px', color }}>{value}</div>
      <div className="text-[9px] text-[var(--color-text-muted)] mt-[2px]">{label}</div>
    </div>
  );

  // Reusable member row header for desktop table
  const TableHeader = ({ cols }) => (
    <div className="grid gap-2 px-4 py-2 border-b border-[var(--color-border)] text-[9px] font-semibold text-[var(--color-text-muted)] uppercase"
      style={{ gridTemplateColumns: cols }}>
      {['Member', 'Tracked', 'Target', 'Progress'].map((h, i) => (
        <span key={h} style={{ textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
      ))}
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={modalInfo.title}
      icon={modalInfo.icon}
      theme={theme}
      maxWidth="min(800px, 95vw)"
      testId={`dashboard-detail-modal-${type}`}
    >
      {/* ========== TIME VIEW ========== */}
      {type === 'time' && (
        timeData ? (
          <>
            <ModalHero
              theme={theme}
              label="Total Time Tracked"
              value={formatHoursToHM(timeData.totalTracked)}
              subValue={`/ ${formatHoursToHM(timeData.totalTarget)} target`}
              progress={timeData.progress}
              progressColor="var(--color-working)"
              rightContent={
                <span className="font-bold" style={{ fontSize: isMobile ? '20px' : '24px', color: getPerformanceColor(timeData.progress), ...tabularNumberStyle }}>
                  {Math.round(timeData.progress)}%
                </span>
              }
            />

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <StatGridItem icon="📅" value={timeData.workingDays} label="Working Days" color="var(--color-text)" />
              <StatGridItem icon="👤" value={formatHoursToHM(timeData.totalTracked / timeData.totalMembers)} label="Avg / Member" color="var(--color-text)" />
              <StatGridItem icon="⏱" value={timeData.avgTimePerTask ? formatHoursToHM(timeData.avgTimePerTask) : '—'} label="Avg / Task" color="var(--color-working)" />
            </div>

            {/* Member Breakdown */}
            <ModalSection theme={theme} title="Member Breakdown" icon="👥" noPadding>
              {isMobile ? (
                <div className="pb-1">
                  {timeData.memberBreakdown.map((m, i) => (
                    <div key={m.id || i} className="px-[14px] py-[10px]"
                      style={{ borderBottom: i < timeData.memberBreakdown.length - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
                      <div className="flex justify-between items-center mb-[6px]">
                        <span className="text-[13px] font-semibold text-[var(--color-text)]" style={{ fontFamily: getAdaptiveFontFamily(m.name) }}>{m.name}</span>
                        <span className="text-xs font-bold" style={{ color: getPerformanceColor(m.percent), ...tabularNumberStyle }}>{m.percent}%</span>
                      </div>
                      <div className="flex justify-between items-center mb-[6px]">
                        <span className="text-[11px] text-[var(--color-text-muted)]">Tracked: <span className="text-[var(--color-text)] font-semibold" style={tabularNumberStyle}>{formatHoursToHM(m.tracked)}</span></span>
                        <span className="text-[11px] text-[var(--color-text-muted)]">Target: <span className="text-[var(--color-text-secondary)]" style={tabularNumberStyle}>{formatHoursToHM(m.target)}</span></span>
                      </div>
                      <ProgressBar theme={theme} value={m.tracked} max={m.target} color={getPerformanceColor(m.percent)} height={4} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid gap-2 px-4 py-2 border-b border-[var(--color-border)] text-[9px] font-semibold text-[var(--color-text-muted)] uppercase"
                    style={{ gridTemplateColumns: '2fr 70px 80px 100px' }}>
                    <span>Member</span><span className="text-right">Tracked</span><span className="text-right">Target</span><span className="text-right">Progress</span>
                  </div>
                  {timeData.memberBreakdown.map((m, i) => (
                    <div key={m.id || i} className="grid gap-2 px-4 py-[10px] items-center"
                      style={{ gridTemplateColumns: '2fr 70px 80px 100px', borderBottom: i < timeData.memberBreakdown.length - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
                      <span className="text-xs font-medium text-[var(--color-text)]" style={{ fontFamily: getAdaptiveFontFamily(m.name) }}>{m.name}</span>
                      <span className="text-[11px] font-semibold text-[var(--color-text)] text-right" style={tabularNumberStyle}>{formatHoursToHM(m.tracked)}</span>
                      <span className="text-[10px] text-[var(--color-text-secondary)] text-right" style={tabularNumberStyle}>{formatHoursToHM(m.target)}</span>
                      <div className="flex items-center gap-[6px] justify-end">
                        <ProgressBar theme={theme} value={m.tracked} max={m.target} color={getPerformanceColor(m.percent)} height={4} />
                        <span className="text-[10px] font-semibold min-w-7 text-right" style={{ color: getPerformanceColor(m.percent), ...tabularNumberStyle }}>{m.percent}%</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </ModalSection>

            {/* Insight */}
            <div className="px-[14px] py-3 bg-[rgba(255,255,255,0.06)] rounded-[10px] mt-2 flex items-start gap-[10px]">
              <span className="text-base">💡</span>
              <p className="m-0 text-[11px] text-[var(--color-text)] leading-relaxed" style={{ fontFamily: getFontFamily('english') }}>
                <strong>Insight:</strong> {timeData.progress >= 80
                  ? 'Team is on track to meet daily targets.'
                  : timeData.progress >= 60
                    ? 'Some members may need support to reach their targets.'
                    : 'Team tracking is below target - consider checking in with members.'}
              </p>
            </div>
          </>
        ) : (
          <EmptyState theme={theme} icon="⏱️" title="No time data" subtitle="Time tracking data will appear once members start tracking" />
        )
      )}

      {/* ========== TASKS VIEW ========== */}
      {type === 'tasks' && (
        tasksData ? (
          <>
            <ModalHero
              theme={theme}
              label="Tasks Completed"
              value={`${tasksData.totalDone}`}
              subValue={`/ ${tasksData.totalTasks} total tasks`}
              progress={tasksData.progress}
              progressColor="var(--color-accent)"
              rightContent={
                <span className="font-bold" style={{ fontSize: isMobile ? '20px' : '24px', color: getPerformanceColor(tasksData.progress), ...tabularNumberStyle }}>
                  {Math.round(tasksData.progress)}%
                </span>
              }
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-[10px] mb-4">
              {[
                { label: 'Completed', value: tasksData.totalDone, color: 'var(--color-success)', icon: '✅' },
                { label: 'In Progress', value: tasksData.inProgress, color: 'var(--color-accent)', icon: '🔄' },
                { label: 'Total Tasks', value: tasksData.totalTasks, color: 'var(--color-text)', icon: '📋' },
                { label: 'Avg / Member / Day', value: tasksData.avgTasksPerMember.toFixed(1), color: 'var(--color-text)', icon: '📊' },
              ].map((stat, i) => (
                <div key={i} className="bg-[var(--color-inner-bg)] rounded-[10px] text-center border border-[var(--color-border-light)]"
                  style={{ padding: isMobile ? '10px' : '14px' }}>
                  <div className="text-base mb-1">{stat.icon}</div>
                  <div className="font-bold" style={{ fontSize: isMobile ? '17px' : '20px', color: stat.color, ...tabularNumberStyle }}>{stat.value}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: getFontFamily('english') }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Member Breakdown */}
            <ModalSection theme={theme} title="By Member" icon="👥" noPadding>
              {isMobile ? (
                <div className="pb-1">
                  {tasksData.memberBreakdown.map((m, i) => (
                    <div key={i} className="px-[14px] py-[10px]"
                      style={{ borderBottom: i < tasksData.memberBreakdown.length - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
                      <div className="flex justify-between items-center mb-[6px]">
                        <span className="text-[13px] font-semibold text-[var(--color-text)]" style={{ fontFamily: getAdaptiveFontFamily(m.name) }}>{m.name}</span>
                        <span className="text-xs font-bold" style={{ color: getPerformanceColor(m.percent), ...tabularNumberStyle }}>
                          {m.percent}%{m.percent >= 80 ? ' ⭐' : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-[6px]">
                        <span className="text-[11px] text-[var(--color-text-muted)]">Done: <span className="text-[var(--color-success)] font-semibold" style={tabularNumberStyle}>{m.done}</span></span>
                        <span className="text-[11px] text-[var(--color-text-muted)]">Total: <span className="text-[var(--color-text-secondary)]" style={tabularNumberStyle}>{m.total}</span></span>
                      </div>
                      <ProgressBar theme={theme} value={m.done} max={m.total} color={getPerformanceColor(m.percent)} height={4} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid gap-2 px-4 py-2 border-b border-[var(--color-border)] text-[9px] font-semibold text-[var(--color-text-muted)] uppercase"
                    style={{ gridTemplateColumns: '2fr 60px 60px 100px' }}>
                    <span>Member</span><span className="text-right">Done</span><span className="text-right">Total</span><span className="text-right">Completion</span>
                  </div>
                  {tasksData.memberBreakdown.map((m, i) => (
                    <div key={i} className="grid gap-2 px-4 py-[10px] items-center"
                      style={{ gridTemplateColumns: '2fr 60px 60px 100px', borderBottom: i < tasksData.memberBreakdown.length - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
                      <span className="text-xs font-medium text-[var(--color-text)]" style={{ fontFamily: getAdaptiveFontFamily(m.name) }}>{m.name}</span>
                      <span className="text-xs font-semibold text-[var(--color-success)] text-right" style={tabularNumberStyle}>{m.done}</span>
                      <span className="text-[11px] text-[var(--color-text-secondary)] text-right" style={tabularNumberStyle}>{m.total}</span>
                      <div className="flex items-center gap-[6px] justify-end">
                        <ProgressBar theme={theme} value={m.done} max={m.total} color={getPerformanceColor(m.percent)} height={4} />
                        <span className="text-[10px] font-semibold min-w-7 text-right" style={{ color: getPerformanceColor(m.percent), ...tabularNumberStyle }}>
                          {m.percent}%{m.percent >= 80 && ' ⭐'}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </ModalSection>
          </>
        ) : (
          <EmptyState theme={theme} icon="✅" title="No task data" subtitle="Task data will appear once tasks are assigned" />
        )
      )}

      {/* ========== SCORE VIEW ========== */}
      {type === 'score' && (
        scoreData ? (
          <>
            <ModalHero
              theme={theme}
              label="Team Score"
              value={Math.round(scoreData.totalScore)}
              subValue={`/ 100 · Grade: ${scoreData.grade}`}
              progress={scoreData.totalScore}
              progressColor="var(--color-accent)"
              rightContent={
                <div className="text-right">
                  <span
                    className="font-bold whitespace-nowrap rounded-badge"
                    style={{
                      padding: isMobile ? '3px 7px' : '4px 10px',
                      fontSize: isMobile ? '11px' : '14px',
                      background: scoreData.totalScore >= 70 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                      color: scoreData.totalScore >= 70 ? 'var(--color-success)' : 'var(--color-warning)',
                    }}
                  >
                    {scoreData.totalScore >= 85 ? '🌟 Excellent' : scoreData.totalScore >= 70 ? '👍 Good' : scoreData.totalScore >= 50 ? '📊 Fair' : '⚠️ Needs Work'}
                  </span>
                </div>
              }
            />

            {/* Score summary stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {scoreData.breakdown.map((item, i) => (
                <div key={i} className="bg-[var(--color-inner-bg)] rounded-[10px] text-center border border-[var(--color-border)]"
                  style={{ padding: isMobile ? '10px 8px' : '12px' }}>
                  <div className="text-sm mb-[3px]">{item.icon}</div>
                  <div className="font-bold font-mono" style={{ fontSize: isMobile ? '14px' : '16px', color: getPerformanceColor(item.ratio) }}>{Math.round(item.ratio)}%</div>
                  <div className="text-[10px] text-[var(--color-text-muted)] mt-[2px]">{item.label}</div>
                  <div className="text-[9px] text-[var(--color-text-muted)] mt-[1px]">weight {item.weight}%</div>
                </div>
              ))}
            </div>

            {/* Score Breakdown */}
            <ModalSection theme={theme} title="Score Formula Breakdown" icon="📊">
              {scoreData.breakdown.map((item, i) => (
                <div key={i} style={{ marginBottom: i < scoreData.breakdown.length - 1 ? '14px' : '0' }}>
                  <div className="flex justify-between items-center mb-[6px] gap-2">
                    <span className="text-xs text-[var(--color-text)] shrink-0" style={{ fontFamily: getFontFamily('english') }}>
                      {item.icon} {item.label} <span className="text-[var(--color-text-muted)]">({item.weight}%)</span>
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-accent)] whitespace-nowrap" style={tabularNumberStyle}>
                      {Math.round(item.ratio)}% → {Math.round(item.points)} pts
                    </span>
                  </div>
                  <ProgressBar theme={theme} value={item.ratio} max={100} color="var(--color-accent)" height={6} />
                </div>
              ))}
              {/* Total */}
              <div className="border-t-2 border-[var(--color-border)] pt-3 mt-[14px] flex justify-between items-center">
                <span className="text-[13px] font-bold text-[var(--color-text)]">Total Score</span>
                <span className="text-lg font-bold text-[var(--color-accent)]" style={tabularNumberStyle}>
                  {Math.round(scoreData.breakdown.reduce((sum, item) => sum + item.points, 0))} pts
                </span>
              </div>
            </ModalSection>

            {/* Member Rankings */}
            <ModalSection theme={theme} title="Member Rankings" icon="🏅" noPadding>
              {scoreData.rankings.map((m, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                return (
                  <div
                    key={i}
                    className="grid items-center gap-2 px-[14px] py-[10px]"
                    style={{
                      gridTemplateColumns: isMobile ? '44px 1fr 44px' : '50px 1fr 50px 80px',
                      borderBottom: i < scoreData.rankings.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                      background: i < 3 ? 'rgba(16,185,129,0.05)' : 'transparent',
                    }}
                  >
                    <span className="text-xs font-bold text-[var(--color-text-muted)]" style={tabularNumberStyle}>
                      #{m.rank} {medal}
                    </span>
                    <span className="text-xs font-medium text-[var(--color-text)]" style={{ fontFamily: getAdaptiveFontFamily(m.name) }}>
                      {m.name}
                    </span>
                    <span className="text-sm font-bold text-right" style={{ color: i < 3 ? 'var(--color-success)' : 'var(--color-text)', ...tabularNumberStyle }}>
                      {Math.round(m.score)}
                    </span>
                    {!isMobile && (
                      <ProgressBar theme={theme} value={m.score} max={100} color={i < 3 ? 'var(--color-success)' : 'var(--color-accent)'} height={5} />
                    )}
                  </div>
                );
              })}
            </ModalSection>

            {/* Insight */}
            <div className="px-[14px] py-3 bg-[rgba(255,255,255,0.06)] rounded-[10px] mt-2 flex items-start gap-[10px]">
              <span className="text-base">💡</span>
              <p className="m-0 text-[11px] text-[var(--color-text)] leading-relaxed" style={{ fontFamily: getFontFamily('english') }}>
                <strong>Insight:</strong> {
                  scoreData.breakdown.reduce((lowest, item) =>
                    item.ratio < lowest.ratio ? item : lowest
                  ).label
                } is the lowest scoring area at {Math.round(scoreData.breakdown.reduce((lowest, item) =>
                  item.ratio < lowest.ratio ? item : lowest
                ).ratio)}%. Focus on improving this to boost team score.
              </p>
            </div>
          </>
        ) : (
          <EmptyState theme={theme} icon="🏆" title="No score data" subtitle="Score data will appear once team activity is tracked" />
        )
      )}
    </ModalShell>
  );
};

export default DashboardDetailModal;
