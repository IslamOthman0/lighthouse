import React, { useMemo } from 'react';
import { tabularNumberStyle, getFontFamily, getAdaptiveFontFamily } from '../../utils/typography';
import { formatHoursToHM } from '../../utils/timeFormat';
import ModalShell, { ModalHero, ModalSection, StatRow, ProgressBar, EmptyState } from './ModalShell';
import Sparkline, { SparklineWithStats } from '../ui/Sparkline';

/**
 * Dashboard Detail Modal - Shows detailed breakdowns for Time/Tasks/Score cards
 * Uses real data only - no fake/estimated values
 */
const DashboardDetailModal = ({ isOpen, onClose, type, theme, members, teamStats, scoreMetrics, dateRangeInfo }) => {

  // Helper to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'working': return theme.working;
      case 'break': return theme.break;
      case 'offline': return theme.offline;
      case 'leave': return theme.leave;
      default: return theme.textMuted;
    }
  };

  // Helper to get status emoji
  const getStatusEmoji = (status) => {
    switch (status) {
      case 'working': return '🟢';
      case 'break': return '🟡';
      case 'offline': return '⚪';
      case 'leave': return '🔴';
      default: return '⚪';
    }
  };

  // Helper to get performance color based on percentage
  const getPerformanceColor = (percent) => {
    if (percent >= 90) return theme.success || theme.working;
    if (percent >= 70) return theme.accent;
    if (percent >= 50) return theme.warning || '#F59E0B';
    return theme.error || '#EF4444';
  };

  // Calculate time data from real values
  const timeData = useMemo(() => {
    if (!members || members.length === 0 || !teamStats) return null;

    const rawTracked = teamStats.tracked?.value;
    const rawTarget = teamStats.tracked?.target;
    const totalTracked = (typeof rawTracked === 'number' && isFinite(rawTracked)) ? rawTracked : 0;
    const workingDays = dateRangeInfo?.workingDays || 1;
    // Use store-computed target (already accounts for workingDays); fallback if missing
    const totalTarget = (typeof rawTarget === 'number' && rawTarget > 0)
      ? rawTarget
      : members.length * 6.5 * workingDays;
    const progress = totalTarget > 0 ? Math.min((totalTracked / totalTarget) * 100, 100) : 0;

    // Avg time per task (across all members in range)
    const totalDoneForAvg = members.reduce((s, m) => s + (m.done || 0), 0);
    const avgTimePerTask = (totalDoneForAvg > 0 && totalTracked > 0)
      ? totalTracked / totalDoneForAvg
      : null;

    // Per-member target = daily target × working days in range
    const memberBreakdown = members.map(m => {
      const dailyTarget = m.target || 6.5;
      const memberTarget = dailyTarget * workingDays;
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

    // Count by status
    const statusCounts = members.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalTracked,
      totalTarget,
      progress,
      memberBreakdown,
      statusCounts,
      avgTimePerTask,
      workingDays,
      activeCount: members.filter(m => m.status === 'working').length,
      totalMembers: members.length
    };
  }, [members, teamStats, dateRangeInfo]);

  // Calculate tasks data from real values
  const tasksData = useMemo(() => {
    if (!members || members.length === 0 || !teamStats) return null;

    const totalDone = teamStats.tasks?.done || 0;
    const totalTasks = teamStats.tasks?.total || 0;
    const progress = teamStats.tasks?.progress || 0;
    const workingDays = dateRangeInfo?.workingDays || 1;
    const avgTasksPerMember = members.length > 0
      ? (totalTasks / members.length / workingDays)
      : 0;

    // Member breakdown
    const memberBreakdown = members.map(m => ({
      name: m.name,
      done: m.done || 0,
      total: m.tasks || 0,
      percent: m.tasks > 0 ? Math.round(((m.done || 0) / m.tasks) * 100) : 0
    })).sort((a, b) => b.done - a.done);

    return {
      totalDone,
      totalTasks,
      progress,
      memberBreakdown,
      inProgress: totalTasks - totalDone,
      avgTasksPerMember,
      workingDays,
    };
  }, [members, teamStats, dateRangeInfo]);

  // Calculate score data from real values
  const scoreData = useMemo(() => {
    if (!members || members.length === 0 || !scoreMetrics) return null;

    const totalScore = scoreMetrics.total || 0;

    // 4-component breakdown (40/20/30/10)
    const breakdown = [
      { icon: '⏱️', label: 'Time Tracked', weight: 40, ratio: scoreMetrics.time || 0, points: (scoreMetrics.time || 0) * 0.4 },
      { icon: '📋', label: 'Workload', weight: 20, ratio: scoreMetrics.workload || 0, points: (scoreMetrics.workload || 0) * 0.2 },
      { icon: '✅', label: 'Completion', weight: 30, ratio: scoreMetrics.tasks || 0, points: (scoreMetrics.tasks || 0) * 0.3 },
      { icon: '🎯', label: 'Compliance', weight: 10, ratio: scoreMetrics.compliance || 0, points: (scoreMetrics.compliance || 0) * 0.1 }
    ];

    // Member rankings from real scores
    const rankings = members
      .map(m => ({ name: m.name, score: m.score || 0 }))
      .sort((a, b) => b.score - a.score)
      .map((m, i) => ({ ...m, rank: i + 1 }));

    // Grade calculation
    const grade = totalScore >= 90 ? 'A' : totalScore >= 80 ? 'B' : totalScore >= 70 ? 'C' : totalScore >= 60 ? 'D' : 'F';

    return { totalScore, breakdown, rankings, grade };
  }, [members, scoreMetrics]);

  // Get modal title and icon based on type
  const getModalInfo = () => {
    switch (type) {
      case 'time': return { title: 'Time Tracked Details', icon: '⏱️' };
      case 'tasks': return { title: 'Tasks Progress Details', icon: '✅' };
      case 'score': return { title: 'Team Score Details', icon: '🏆' };
      default: return { title: 'Details', icon: '📊' };
    }
  };

  const modalInfo = getModalInfo();

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
            {/* Hero */}
            <ModalHero
              theme={theme}
              label="Total Time Tracked"
              value={formatHoursToHM(timeData.totalTracked)}
              subValue={`/ ${formatHoursToHM(timeData.totalTarget)} target`}
              progress={timeData.progress}
              progressColor={theme.working}
              rightContent={
                <span style={{ fontSize: '24px', fontWeight: '700', color: getPerformanceColor(timeData.progress), ...tabularNumberStyle }}>
                  {Math.round(timeData.progress)}%
                </span>
              }
            />

            {/* Summary stats row: working days + avg time per task */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Working Days', value: timeData.workingDays, icon: '📅', color: theme.text },
                { label: 'Avg / Member', value: formatHoursToHM(timeData.totalTracked / timeData.totalMembers), icon: '👤', color: theme.text },
                { label: 'Avg / Task', value: timeData.avgTimePerTask ? formatHoursToHM(timeData.avgTimePerTask) : '—', icon: '⏱', color: theme.working },
              ].map((s, i) => (
                <div key={i} style={{ background: theme.innerBg, borderRadius: '10px', padding: '12px', textAlign: 'center', border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: theme.textMuted, marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Member Breakdown */}
            <ModalSection theme={theme} title="Member Breakdown" icon="👥" noPadding>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 80px 100px', gap: '8px', padding: '8px 16px', borderBottom: `1px solid ${theme.border}`, fontSize: '9px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase' }}>
                <span>Member</span>
                <span style={{ textAlign: 'right' }}>Tracked</span>
                <span style={{ textAlign: 'right' }}>Target</span>
                <span style={{ textAlign: 'right' }}>Progress</span>
              </div>
              {/* Rows */}
              {timeData.memberBreakdown.map((m, i) => (
                <div
                  key={m.id || i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 70px 80px 100px',
                    gap: '8px',
                    padding: '10px 16px',
                    alignItems: 'center',
                    borderBottom: i < timeData.memberBreakdown.length - 1 ? `1px solid ${theme.borderLight || theme.border}` : 'none',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: '500', color: theme.text, fontFamily: getAdaptiveFontFamily(m.name) }}>{m.name}</span>
                  <span style={{ fontSize: '11px', color: theme.text, fontWeight: '600', textAlign: 'right', ...tabularNumberStyle }}>{formatHoursToHM(m.tracked)}</span>
                  <span style={{ fontSize: '10px', color: theme.textSecondary, textAlign: 'right', ...tabularNumberStyle }}>{formatHoursToHM(m.target)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                    <ProgressBar theme={theme} value={m.tracked} max={m.target} color={getPerformanceColor(m.percent)} height={4} />
                    <span style={{ fontSize: '10px', fontWeight: '600', color: getPerformanceColor(m.percent), ...tabularNumberStyle, minWidth: '28px', textAlign: 'right' }}>{m.percent}%</span>
                  </div>
                </div>
              ))}
            </ModalSection>

            {/* Insight */}
            <div style={{
              padding: '12px 14px',
              background: `${theme.accent}10`,
              borderRadius: '10px',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <span style={{ fontSize: '16px' }}>💡</span>
              <p style={{ margin: 0, fontSize: '11px', color: theme.text, lineHeight: 1.5, fontFamily: getFontFamily('english') }}>
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
            {/* Hero */}
            <ModalHero
              theme={theme}
              label="Tasks Completed"
              value={`${tasksData.totalDone}`}
              subValue={`/ ${tasksData.totalTasks} total tasks`}
              progress={tasksData.progress}
              progressColor={theme.accent}
              rightContent={
                <span style={{ fontSize: '24px', fontWeight: '700', color: getPerformanceColor(tasksData.progress), ...tabularNumberStyle }}>
                  {Math.round(tasksData.progress)}%
                </span>
              }
            />

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Completed', value: tasksData.totalDone, color: theme.success || '#10b981', icon: '✅' },
                { label: 'In Progress', value: tasksData.inProgress, color: theme.accent, icon: '🔄' },
                { label: 'Total Tasks', value: tasksData.totalTasks, color: theme.text, icon: '📋' },
                { label: `Avg / Member / Day`, value: tasksData.avgTasksPerMember.toFixed(1), color: theme.text, icon: '📊' },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    background: theme.innerBg || theme.secondaryBg,
                    borderRadius: '10px',
                    padding: '14px',
                    textAlign: 'center',
                    border: `1px solid ${theme.borderLight || theme.border}`,
                  }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: stat.color, ...tabularNumberStyle }}>{stat.value}</div>
                  <div style={{ fontSize: '10px', color: theme.textMuted, fontFamily: getFontFamily('english') }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Member Breakdown */}
            <ModalSection theme={theme} title="By Member" icon="👥" noPadding>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 60px 100px', gap: '8px', padding: '8px 16px', borderBottom: `1px solid ${theme.border}`, fontSize: '9px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase' }}>
                <span>Member</span>
                <span style={{ textAlign: 'right' }}>Done</span>
                <span style={{ textAlign: 'right' }}>Total</span>
                <span style={{ textAlign: 'right' }}>Completion</span>
              </div>
              {/* Rows */}
              {tasksData.memberBreakdown.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 60px 60px 100px',
                    gap: '8px',
                    padding: '10px 16px',
                    alignItems: 'center',
                    borderBottom: i < tasksData.memberBreakdown.length - 1 ? `1px solid ${theme.borderLight || theme.border}` : 'none',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: '500', color: theme.text, fontFamily: getAdaptiveFontFamily(m.name) }}>{m.name}</span>
                  <span style={{ fontSize: '12px', color: theme.success || '#10b981', fontWeight: '600', textAlign: 'right', ...tabularNumberStyle }}>{m.done}</span>
                  <span style={{ fontSize: '11px', color: theme.textSecondary, textAlign: 'right', ...tabularNumberStyle }}>{m.total}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                    <ProgressBar theme={theme} value={m.done} max={m.total} color={getPerformanceColor(m.percent)} height={4} />
                    <span style={{ fontSize: '10px', fontWeight: '600', color: getPerformanceColor(m.percent), ...tabularNumberStyle, minWidth: '28px', textAlign: 'right' }}>
                      {m.percent}%
                      {m.percent >= 80 && ' ⭐'}
                    </span>
                  </div>
                </div>
              ))}
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
            {/* Hero */}
            <ModalHero
              theme={theme}
              label="Team Score"
              value={Math.round(scoreData.totalScore)}
              subValue={`/ 100 · Grade: ${scoreData.grade}`}
              progress={scoreData.totalScore}
              progressColor={theme.accent}
              rightContent={
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '700',
                    background: scoreData.totalScore >= 70 ? `${theme.success}20` : `${theme.warning}20`,
                    color: scoreData.totalScore >= 70 ? theme.success : theme.warning,
                  }}>
                    {scoreData.totalScore >= 85 ? '🌟 Excellent' : scoreData.totalScore >= 70 ? '👍 Good' : scoreData.totalScore >= 50 ? '📊 Fair' : '⚠️ Needs Work'}
                  </span>
                </div>
              }
            />

            {/* Score summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              {scoreData.breakdown.map((item, i) => (
                <div key={i} style={{ background: theme.innerBg, borderRadius: '10px', padding: '12px', textAlign: 'center', border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{item.icon}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: getPerformanceColor(item.ratio), fontFamily: 'JetBrains Mono, monospace' }}>{Math.round(item.ratio)}%</div>
                  <div style={{ fontSize: '10px', color: theme.textMuted, marginTop: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '9px', color: theme.textMuted, marginTop: '1px' }}>weight {item.weight}%</div>
                </div>
              ))}
            </div>

            {/* Score Breakdown - INTEGER POINTS */}
            <ModalSection theme={theme} title="Score Formula Breakdown" icon="📊">
              {scoreData.breakdown.map((item, i) => (
                <div key={i} style={{ marginBottom: i < scoreData.breakdown.length - 1 ? '14px' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: theme.text, fontFamily: getFontFamily('english') }}>
                      {item.icon} {item.label} <span style={{ color: theme.textMuted }}>({item.weight}%)</span>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: theme.accent, ...tabularNumberStyle }}>
                      {Math.round(item.ratio)}% → {Math.round(item.points)} pts
                    </span>
                  </div>
                  <ProgressBar theme={theme} value={item.ratio} max={100} color={theme.accent} height={6} />
                </div>
              ))}
              {/* Total */}
              <div style={{ borderTop: `2px solid ${theme.border}`, paddingTop: '12px', marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: theme.text }}>Total Score</span>
                <span style={{ fontSize: '18px', fontWeight: '700', color: theme.accent, ...tabularNumberStyle }}>
                  {Math.round(scoreData.breakdown.reduce((sum, item) => sum + item.points, 0))} pts
                </span>
              </div>
            </ModalSection>

            {/* Member Rankings with mini sparklines */}
            <ModalSection theme={theme} title="Member Rankings" icon="🏅" noPadding>
              {scoreData.rankings.map((m, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '50px 1fr 50px 80px',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      borderBottom: i < scoreData.rankings.length - 1 ? `1px solid ${theme.borderLight || theme.border}` : 'none',
                      background: i < 3 ? `${theme.success}08` : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700', color: theme.textMuted, ...tabularNumberStyle }}>
                      #{m.rank} {medal}
                    </span>
                    <span style={{ fontSize: '12px', color: theme.text, fontWeight: '500', fontFamily: getAdaptiveFontFamily(m.name) }}>
                      {m.name}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: i < 3 ? theme.success : theme.text, ...tabularNumberStyle, textAlign: 'right' }}>
                      {Math.round(m.score)}
                    </span>
                    <div>
                      <ProgressBar theme={theme} value={m.score} max={100} color={i < 3 ? theme.success : theme.accent} height={5} />
                    </div>
                  </div>
                );
              })}
            </ModalSection>

            {/* Insight */}
            <div style={{
              padding: '12px 14px',
              background: `${theme.accent}10`,
              borderRadius: '10px',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <span style={{ fontSize: '16px' }}>💡</span>
              <p style={{ margin: 0, fontSize: '11px', color: theme.text, lineHeight: 1.5, fontFamily: getFontFamily('english') }}>
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
