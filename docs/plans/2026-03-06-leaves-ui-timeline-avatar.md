# Leaves UI, Timeline & Avatar Enhancements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix and enhance 4 areas: (1) add Sick & Bonus quota fields to Settings, (2) add colored avatar rings to Leave calendar, (3) widen Overview cards, (4) redesign Timeline task cards.

**Architecture:** All changes are UI-layer only — no new data fetching, no schema changes. The leave data pipeline is already wired; fixes are rendering and settings storage issues.

**Tech Stack:** React 18.2, Vite, JavaScript, inline styles (no Tailwind in target components), Zustand settings, Dexie IndexedDB.

---

## Pre-flight: Key Facts

- `getMemberLeaveBalance(memberId, allLeaves, settings)` — signature confirmed (leaveHelpers.js:108)
- `settings.team.leaveQuotas[memberId]` stores a **flat number** (not an object). Sick/bonus always fell back to defaults because the code tried to read `.sickLeaveQuota` off a number.
- `Avatar.jsx` props: `{ name, status, theme, size, profilePicture, clickUpColor }`. Border is always `theme.border` (line 61).
- `TYPE_COLORS` from `leaves/constants.js`: `annual: '#3b82f6'`, `sick: '#ef4444'`, `wfh: '#10b981'`, `bonus: '#8b5cf6'`
- `hexToRgba` is already imported in `MemberDetailModal.jsx` (line 13)
- `BreakCard` in `MemberDetailModal.jsx` (lines 515-547) is a different component from `member-states/BreakCard.jsx`

---

## Feature 1: Settings — Add Sick & Bonus Quota Columns

**Files:**
- Modify: `src/components/modals/SettingsModal.jsx`
- Modify: `src/utils/leaveHelpers.js`
- Modify: `src/constants/defaults.js`
- Create: `src/utils/__tests__/leaveHelpers.test.js`

### Task 1.1 — Add `handleUpdateSickQuota` and `handleUpdateBonusQuota` handlers

**File:** `src/components/modals/SettingsModal.jsx`

**Step 1: Identify insertion point** — After `handleUpdateWfhQuota` (line 363).

**Step 2: Write the change** — Insert after line 363:

```javascript
const handleUpdateSickQuota = (memberId, days) => {
  updateSettings({
    team: {
      ...settings.team,
      sickQuotas: { ...(settings.team?.sickQuotas || {}), [memberId]: days },
    },
  });
};

const handleUpdateBonusQuota = (memberId, days) => {
  updateSettings({
    team: {
      ...settings.team,
      bonusQuotas: { ...(settings.team?.bonusQuotas || {}), [memberId]: days },
    },
  });
};
```

**Step 3: Visual verify** — `npm run dev`, confirm no syntax errors.

**Step 4: Commit:**
```bash
git add src/components/modals/SettingsModal.jsx
git commit -m "feat(settings): add handleUpdateSickQuota and handleUpdateBonusQuota handlers"
```

---

### Task 1.2 — Add default summary cards for Sick and Bonus

**File:** `src/components/modals/SettingsModal.jsx` (lines 629-638)

**Step 1: Identify** — The summary cards flex row currently shows "Default Annual" and "Default WFH".

**Step 2: Replace** the `<div style={{ display: 'flex', gap: '16px', marginBottom: '16px'... }}>` block:

```jsx
<div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
  <div style={{ padding: '10px 16px', background: theme.innerBg, borderRadius: '8px', border: `1px solid ${theme.border}`, flex: 1, minWidth: '120px' }}>
    <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase' }}>Default Annual</div>
    <div style={{ fontSize: '18px', fontWeight: '600', color: theme.text }}>{DEFAULT_MEMBER_QUOTAS.annualLeave} days/yr</div>
  </div>
  <div style={{ padding: '10px 16px', background: theme.innerBg, borderRadius: '8px', border: `1px solid ${theme.border}`, flex: 1, minWidth: '120px' }}>
    <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase' }}>Default Sick</div>
    <div style={{ fontSize: '18px', fontWeight: '600', color: theme.text }}>{DEFAULT_MEMBER_QUOTAS.sickLeaveQuota} days/yr</div>
  </div>
  <div style={{ padding: '10px 16px', background: theme.innerBg, borderRadius: '8px', border: `1px solid ${theme.border}`, flex: 1, minWidth: '120px' }}>
    <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase' }}>Default Bonus</div>
    <div style={{ fontSize: '18px', fontWeight: '600', color: theme.text }}>{DEFAULT_MEMBER_QUOTAS.bonusLeaveQuota} days/yr</div>
  </div>
  <div style={{ padding: '10px 16px', background: theme.innerBg, borderRadius: '8px', border: `1px solid ${theme.border}`, flex: 1, minWidth: '120px' }}>
    <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase' }}>Default WFH</div>
    <div style={{ fontSize: '18px', fontWeight: '600', color: theme.text }}>{DEFAULT_MEMBER_QUOTAS.wfhDays} days/mo</div>
  </div>
</div>
```

**Step 3: Visual verify** — Settings → Team tab shows 4 summary cards.

**Step 4: Commit:**
```bash
git add src/components/modals/SettingsModal.jsx
git commit -m "feat(settings): add Sick and Bonus default quota summary cards"
```

---

### Task 1.3 — Expand the quota table to 5 columns

**File:** `src/components/modals/SettingsModal.jsx` (lines 628, 640-665)

**Step 1: Identify** — Section header (line 628), header row (line 641), member row (line 654).

**Step 2: Apply 3 changes:**

Update `SectionHeader` description:
```jsx
<SectionHeader
  title="Leave & WFH Quotas"
  description="Set annual, sick, bonus, and WFH allowances per member"
  theme={theme}
/>
```

Update header row (`gridTemplateColumns` + add 2 new headers):
```jsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 90px', gap: '8px', padding: '10px 16px', borderBottom: `1px solid ${theme.border}` }}>
  <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase' }}>Member</span>
  <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>Annual/yr</span>
  <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>Sick/yr</span>
  <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>Bonus/yr</span>
  <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>WFH/mo</span>
</div>
```

Update member row inside `.map()` callback:
```jsx
const leaveQuota = settings.team?.leaveQuotas?.[memberId] ?? DEFAULT_MEMBER_QUOTAS.annualLeave;
const sickQuota = settings.team?.sickQuotas?.[memberId] ?? DEFAULT_MEMBER_QUOTAS.sickLeaveQuota;
const bonusQuota = settings.team?.bonusQuotas?.[memberId] ?? DEFAULT_MEMBER_QUOTAS.bonusLeaveQuota;
const wfhQuota = settings.team?.wfhQuotas?.[memberId] ?? DEFAULT_MEMBER_QUOTAS.wfhDays;

return (
  <div key={memberId} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 90px', gap: '8px', padding: '10px 16px', borderBottom: `1px solid ${theme.border}`, alignItems: 'center' }}>
    <span style={{ fontSize: '13px', color: theme.text, fontFamily: getAdaptiveFontFamily(memberName) }}>{memberName}</span>
    <input type="number" min="0" max="365" value={leaveQuota}
      onChange={(e) => handleUpdateLeaveQuota(memberId, parseInt(e.target.value) || 0)}
      style={{ width: '72px', padding: '6px 8px', background: theme.subtleBg || theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text, fontSize: '13px', textAlign: 'center', justifySelf: 'center' }} />
    <input type="number" min="0" max="365" value={sickQuota}
      onChange={(e) => handleUpdateSickQuota(memberId, parseInt(e.target.value) || 0)}
      style={{ width: '72px', padding: '6px 8px', background: theme.subtleBg || theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text, fontSize: '13px', textAlign: 'center', justifySelf: 'center' }} />
    <input type="number" min="0" max="365" value={bonusQuota}
      onChange={(e) => handleUpdateBonusQuota(memberId, parseInt(e.target.value) || 0)}
      style={{ width: '72px', padding: '6px 8px', background: theme.subtleBg || theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text, fontSize: '13px', textAlign: 'center', justifySelf: 'center' }} />
    <input type="number" min="0" max="31" value={wfhQuota}
      onChange={(e) => handleUpdateWfhQuota(memberId, parseInt(e.target.value) || 0)}
      style={{ width: '72px', padding: '6px 8px', background: theme.subtleBg || theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text, fontSize: '13px', textAlign: 'center', justifySelf: 'center' }} />
  </div>
);
```

**Step 3: Visual verify** — 5-column quota table in Settings → Team.

**Step 4: Commit:**
```bash
git add src/components/modals/SettingsModal.jsx
git commit -m "feat(settings): expand leave quota table to 5 columns (annual/sick/bonus/wfh)"
```

---

### Task 1.4 — Add `sickQuotas` and `bonusQuotas` to default settings

**File:** `src/constants/defaults.js`

**Step 1: Identify** — Find the `DEFAULT_SETTINGS.team` object which has `leaveQuotas: {}` and `wfhQuotas: {}`.

**Step 2: Add** `sickQuotas: {}` and `bonusQuotas: {}` alongside them:

```javascript
team: {
  membersToMonitor: [],
  leaveQuotas: {},
  sickQuotas: {},
  bonusQuotas: {},
  wfhQuotas: {},
  // ... rest of team settings
},
```

**Step 3: Visual verify** — No visible change. Confirm no errors.

**Step 4: Commit:**
```bash
git add src/constants/defaults.js
git commit -m "feat(defaults): add sickQuotas and bonusQuotas to DEFAULT_SETTINGS.team"
```

---

### Task 1.5 — Fix `getMemberLeaveBalance` to read sick/bonus from settings

**File:** `src/utils/leaveHelpers.js` (lines 114-122)

**Step 1: Write the failing test** — Create `src/utils/__tests__/leaveHelpers.test.js`:

```javascript
// NOTE: globals: true in vite.config.js — do NOT import from 'vitest'
import { getMemberLeaveBalance } from '../leaveHelpers';

describe('getMemberLeaveBalance', () => {
  const memberId = '123';
  const emptyLeaves = [];

  test('uses default quotas when settings is empty', () => {
    const balance = getMemberLeaveBalance(memberId, emptyLeaves, {});
    expect(balance.annual.total).toBe(30);
    expect(balance.sick.total).toBe(10);
    expect(balance.bonus.total).toBe(5);
    expect(balance.wfh.monthly).toBe(2);
  });

  test('reads sickQuota from settings.team.sickQuotas', () => {
    const settings = { team: { sickQuotas: { '123': 15 } } };
    const balance = getMemberLeaveBalance(memberId, emptyLeaves, settings);
    expect(balance.sick.total).toBe(15);
  });

  test('reads bonusQuota from settings.team.bonusQuotas', () => {
    const settings = { team: { bonusQuotas: { '123': 8 } } };
    const balance = getMemberLeaveBalance(memberId, emptyLeaves, settings);
    expect(balance.bonus.total).toBe(8);
  });

  test('reads annualQuota from settings.team.leaveQuotas as flat number', () => {
    const settings = { team: { leaveQuotas: { '123': 21 } } };
    const balance = getMemberLeaveBalance(memberId, emptyLeaves, settings);
    expect(balance.annual.total).toBe(21);
  });
});
```

**Step 2: Run test to verify it fails:**
```bash
npm test -- leaveHelpers
```
Expected: 3 tests FAIL (sickQuota, bonusQuota return defaults regardless of settings).

**Step 3: Write the fix** — Replace lines 114-122 in `leaveHelpers.js`:

```javascript
// Get per-member quotas from settings (flat numbers), fallback to defaults
const annualTotal = settings?.team?.leaveQuotas?.[String(memberId)] ?? DEFAULT_MEMBER_QUOTAS.annualLeave;
const sickTotal = settings?.team?.sickQuotas?.[String(memberId)] ?? DEFAULT_MEMBER_QUOTAS.sickLeaveQuota;
const bonusTotal = settings?.team?.bonusQuotas?.[String(memberId)] ?? DEFAULT_MEMBER_QUOTAS.bonusLeaveQuota;
const wfhMonthly = settings?.team?.wfhQuotas?.[String(memberId)] ?? DEFAULT_MEMBER_QUOTAS.wfhDays;
const maxTransfer = DEFAULT_MEMBER_QUOTAS.maxTransferDays;
```

**Step 4: Run tests to verify they pass:**
```bash
npm test -- leaveHelpers
```
Expected: 4 tests PASS.

**Step 5: Commit:**
```bash
git add src/utils/leaveHelpers.js src/utils/__tests__/leaveHelpers.test.js
git commit -m "fix(leaveHelpers): read sick/bonus quotas from settings.team.sickQuotas/bonusQuotas"
```

---

## Feature 2: Calendar Avatar Colored Rings

**Files:**
- Modify: `src/components/ui/Avatar.jsx`
- Modify: `src/components/views/leaves/LeaveCalendar.jsx`

### Task 2.1 — Add `ringColor` prop to Avatar component

**File:** `src/components/ui/Avatar.jsx`

**Step 1: Identify lines** — Line 4 (prop destructuring) and the `border` style property in the avatar `<div>`.

**Step 2: Write changes:**

Line 4 — add `ringColor = null`:
```javascript
const Avatar = ({ name, status, theme, size = 48, profilePicture = null, clickUpColor = null, ringColor = null }) => {
```

Find the `border: \`2px solid ${theme.border}\`` line inside the main avatar `<div>` style and replace with:
```javascript
border: ringColor ? `3px solid ${ringColor}` : `2px solid ${theme.border}`,
```

**Step 3: Visual verify** — No visual change to existing usage. Confirm no regressions via `npm run dev`.

**Step 4: Commit:**
```bash
git add src/components/ui/Avatar.jsx
git commit -m "feat(Avatar): add ringColor prop for colored border highlight"
```

---

### Task 2.2 — Use `ringColor` in calendar cells

**File:** `src/components/views/leaves/LeaveCalendar.jsx` (lines 202-223)

**Step 1: Identify** — The `entries.slice(...).map()` block with `<div style={{ position: 'relative' }}>` wrapping each Avatar + the type-color dot div.

**Step 2: Replace** the entire map block (remove the wrapping div and dot div, move `key` to Avatar, increase size, add `ringColor`):

```jsx
{entries.slice(0, isMobile ? 2 : 3).map(({ member, leave }) => (
  <Avatar
    key={member.id || member.clickUpId}
    name={member.name}
    status={member.status}
    theme={theme}
    size={isMobile ? 22 : 28}
    profilePicture={member.profilePicture}
    clickUpColor={member.clickUpColor}
    ringColor={TYPE_COLORS[leave.type] || TYPE_COLORS.annual}
  />
))}
```

**Step 3: Visual verify** — Calendar cells show larger avatars with colored border rings. No more dots underneath.

**Step 4: Commit:**
```bash
git add src/components/views/leaves/LeaveCalendar.jsx
git commit -m "feat(calendar): replace type-color dot with colored ring Avatar in calendar cells"
```

---

### Task 2.3 — Use `ringColor` in calendar popover

**File:** `src/components/views/leaves/LeaveCalendar.jsx` (lines 262-263)

**Step 1: Identify** — The `<Avatar>` inside the expanded popover (line 262).

**Step 2: Add `ringColor` prop:**

```jsx
<Avatar
  name={member.name}
  status={member.status}
  theme={theme}
  size={22}
  profilePicture={member.profilePicture}
  clickUpColor={member.clickUpColor}
  ringColor={TYPE_COLORS[leave.type] || TYPE_COLORS.annual}
/>
```

**Step 3: Visual verify** — Click a day cell. Popover avatars also have colored rings.

**Step 4: Commit:**
```bash
git add src/components/views/leaves/LeaveCalendar.jsx
git commit -m "feat(calendar): add ringColor to popover Avatar entries"
```

---

## Feature 3: Wider Leaves Overview Cards

**File:** `src/components/views/leaves/TeamOverviewPanel.jsx`

### Task 3.1 — Widen the card grid

**Step 1: Identify** — Line 114: `minmax(220px, 1fr)`. Line 115: `gap: 10`.

**Step 2: Write change:**

```jsx
<div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 16,
}}>
```

**Step 3: Visual verify** — Overview cards are wider, fewer per row.

**Step 4: Commit:**
```bash
git add src/components/views/leaves/TeamOverviewPanel.jsx
git commit -m "feat(overview): widen member quota card grid from 220px to 300px minwidth"
```

---

### Task 3.2 — Enlarge `MemberQuotaCard` internals

**File:** `src/components/views/leaves/TeamOverviewPanel.jsx` (lines 222-280)

**Step 1: Identify** — Card padding (line 233), avatar size (line 242), name font (line 245), quota grid (line 262).

**Step 2: Apply changes:**

Card padding (line 233): `padding: isMobile ? 14 : 16,`

Header block — increase avatar to 40px, name to 15px, add "Available" fallback status:
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
  <Avatar name={member.name} status={member.status} theme={theme} size={40}
    profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {member.name}
    </div>
    {isOnLeave && (
      <span style={{ fontSize: 11, color: TYPE_COLORS.annual, fontWeight: 600 }}>
        {TYPE_ICONS[leaveToday.type]} On Leave
      </span>
    )}
    {isWfh && (
      <span style={{ fontSize: 11, color: TYPE_COLORS.wfh, fontWeight: 600 }}>
        {TYPE_ICONS.wfh} WFH
      </span>
    )}
    {!isOnLeave && !isWfh && (
      <span style={{ fontSize: 11, color: theme.textSecondary }}>Available</span>
    )}
  </div>
</div>
```

Quota grid — change to 4-column single row:
```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
  <QuotaMini label="Annual" used={balance.annual.used} total={balance.annual.total} color={TYPE_COLORS.annual} theme={theme} />
  <QuotaMini label="Sick" used={balance.sick.used} total={balance.sick.total} color={TYPE_COLORS.sick} theme={theme} />
  <QuotaMini label="Bonus" used={balance.bonus.used} total={balance.bonus.total} color={TYPE_COLORS.bonus} theme={theme} />
  <QuotaMini label="WFH" used={balance.wfh.usedThisMonth} total={balance.wfh.monthly} color={TYPE_COLORS.wfh} theme={theme} />
</div>
```

**Step 3: Visual verify** — Cards show larger avatar, bigger name, "Available" status text, 4 quota columns in a row.

**Step 4: Commit:**
```bash
git add src/components/views/leaves/TeamOverviewPanel.jsx
git commit -m "feat(overview): enlarge MemberQuotaCard (avatar 40px, name 15px, 4-col quota row)"
```

---

### Task 3.3 — Enhance `QuotaMini` (taller bar, larger label)

**File:** `src/components/views/leaves/TeamOverviewPanel.jsx` (lines 284-317)

**Step 1: Identify** — `QuotaMini` component entirely.

**Step 2: Replace the full `QuotaMini` component:**

```jsx
const QuotaMini = ({ label, used, total, color, theme }) => {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        color: theme.textSecondary,
        marginBottom: 3,
      }}>
        <span>{label}</span>
        <span style={{ ...tabularNumberStyle, fontWeight: 600, color: used > 0 ? theme.text : theme.textSecondary }}>
          {used}/{total}
        </span>
      </div>
      <div style={{
        height: 5,
        borderRadius: 3,
        background: theme.type === 'light' ? `${color}15` : `${theme.text}10`,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 3,
          background: color,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
};
```

**Step 3: Visual verify** — Progress bars are 5px tall, label text is 11px.

**Step 4: Commit:**
```bash
git add src/components/views/leaves/TeamOverviewPanel.jsx
git commit -m "feat(overview): increase QuotaMini bar height to 5px and label to 11px"
```

---

## Feature 4: Enhanced Timeline Task Cards

**File:** `src/components/modals/MemberDetailModal.jsx`

### Task 4.1 — Add `label` field to `statusColors` object

**Step 1: Identify** — Lines 18-25: the `statusColors` object.

**Step 2: Replace with labeled version:**

```javascript
const statusColors = {
  todo:       { bg: 'rgba(107,114,128,0.12)', dot: '#6b7280', label: 'To Do' },
  inProgress: { bg: 'rgba(245,158,11,0.12)',  dot: '#f59e0b', label: 'In Progress' },
  done:       { bg: 'rgba(16,185,129,0.12)',  dot: '#10b981', label: 'Done' },
  ready:      { bg: 'rgba(16,185,129,0.12)',  dot: '#10b981', label: 'Ready' },
  review:     { bg: 'rgba(139,92,246,0.12)',  dot: '#8b5cf6', label: 'Review' },
  blocked:    { bg: 'rgba(239,68,68,0.12)',   dot: '#ef4444', label: 'Blocked' },
  stopped:    { bg: 'rgba(239,68,68,0.12)',   dot: '#ef4444', label: 'Stopped' },
  hold:       { bg: 'rgba(107,114,128,0.12)', dot: '#6b7280', label: 'Hold' },
  help:       { bg: 'rgba(245,158,11,0.12)',  dot: '#f59e0b', label: 'Help' },
};
```

**Step 3: Visual verify** — No change yet. Confirm no errors.

**Step 4: Commit:**
```bash
git add src/components/modals/MemberDetailModal.jsx
git commit -m "feat(timeline): add label and bg to statusColors in MemberDetailModal"
```

---

### Task 4.2 — Redesign `TimelineTaskCard`

**File:** `src/components/modals/MemberDetailModal.jsx` (lines 389-512)

**Step 1: Identify** — `TimelineTaskCard` component, lines 390-511.

**Step 2: Replace the entire component:**

```jsx
const TimelineTaskCard = ({ task, theme, isLive }) => {
  const taskStatusStyle = statusColors[task.status] || statusColors.todo;
  const priorityStyle = priorityConfig[task.priority] || priorityConfig.Low;

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        background: theme.secondaryBg,
        borderRadius: '8px',
        border: `1px solid ${theme.borderLight}`,
        borderLeft: `4px solid ${taskStatusStyle.dot}`,
        cursor: task.clickUpUrl ? 'pointer' : 'default',
        transition: 'all 0.15s',
        animation: isLive ? 'softPulse 2s ease-in-out infinite' : 'none',
        boxShadow: isLive ? `0 0 12px ${theme.working}30` : 'none',
      }}
      onClick={() => task.clickUpUrl && window.open(task.clickUpUrl, '_blank')}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme.tertiaryBg || theme.cardBg;
        e.currentTarget.style.borderColor = hexToRgba(theme.accent, 0.25);
        e.currentTarget.style.borderLeftColor = taskStatusStyle.dot;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = theme.secondaryBg;
        e.currentTarget.style.borderColor = theme.borderLight;
        e.currentTarget.style.borderLeftColor = taskStatusStyle.dot;
      }}
    >
      {/* Time Column */}
      <div
        style={{
          minWidth: '85px',
          textAlign: 'right',
          paddingRight: '10px',
          borderRight: `2px solid ${taskStatusStyle.dot}`,
          ...tabularNumberStyle,
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: '700', color: theme.text }}>
          {formatTime12h(task.startTime)}
        </div>
        <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>
          {task.endTime ? formatTime12h(task.endTime) : (
            <span style={{ color: theme.working }}>ongoing</span>
          )}
        </div>
        {task.trackedMinutes > 0 && (
          <div style={{ fontSize: '11px', color: theme.break || '#f59e0b', marginTop: '4px', fontWeight: '500' }}>
            {formatMinutesToHM(task.trackedMinutes)}
          </div>
        )}
      </div>

      {/* Task Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Task Name row: status badge + name + LIVE badge */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: theme.text,
            fontFamily: getAdaptiveFontFamily(task.name),
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{
            fontSize: '9px',
            padding: '2px 6px',
            borderRadius: '4px',
            background: taskStatusStyle.bg,
            color: taskStatusStyle.dot,
            fontWeight: '600',
            flexShrink: 0,
            fontFamily: getFontFamily('english'),
          }}>
            {taskStatusStyle.label || task.status}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.name}
          </span>
          {isLive && (
            <span style={{
              fontSize: '9px',
              padding: '2px 6px',
              background: hexToRgba(theme.working, 0.12),
              color: theme.working,
              borderRadius: '4px',
              fontWeight: '600',
              fontFamily: getFontFamily('english'),
              flexShrink: 0,
            }}>
              LIVE
            </span>
          )}
        </div>

        {/* Meta Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '11px',
          color: theme.textSecondary,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: getFontFamily('english') }}>
            📁 {task.project}
          </span>
          <PriorityFlag priority={task.priority} showLabel={true} size={11} />
          {task.clickUpUrl && (
            <button
              onClick={(e) => { e.stopPropagation(); window.open(task.clickUpUrl, '_blank'); }}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                border: `1px solid ${theme.border}`,
                background: 'transparent',
                color: theme.textSecondary,
                cursor: 'pointer',
                fontFamily: getFontFamily('english'),
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.borderColor = theme.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.borderColor = theme.border; }}
            >
              ↗ Open
            </button>
          )}
        </div>

        {/* Tags row */}
        {Array.isArray(task.tags) && task.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {task.tags.map((tag, i) => (
              <span
                key={i}
                style={{
                  fontSize: '9px',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  background: tag.tag_bg ? `${tag.tag_bg}30` : `${theme.text}10`,
                  color: tag.tag_fg || theme.textSecondary,
                  fontFamily: getFontFamily('english'),
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

**Step 3: Visual verify** — Timeline cards show: 4px left colored border, duration in time column, status badge pill, `↗ Open` button, tags row when present.

**Step 4: Commit:**
```bash
git add src/components/modals/MemberDetailModal.jsx
git commit -m "feat(timeline): redesign TimelineTaskCard with status badge, left border, tags row, Open button"
```

---

### Task 4.3 — Redesign `BreakCard` as a pill

**File:** `src/components/modals/MemberDetailModal.jsx` (lines 515-547)

**Step 1: Identify** — `BreakCard` component.

**Step 2: Replace the component:**

```jsx
const BreakCard = ({ breakData, theme }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '6px 14px',
      marginLeft: '40px',
      borderRadius: '20px',
      background: hexToRgba(theme.break || '#f59e0b', 0.08),
      border: `1px dashed ${hexToRgba(theme.break || '#f59e0b', 0.3)}`,
      alignSelf: 'flex-start',
    }}
  >
    <span style={{ fontSize: '13px' }}>☕</span>
    <span style={{ fontSize: '12px', color: theme.break || '#f59e0b', fontWeight: '600', ...tabularNumberStyle }}>
      {formatMinutesToHM(breakData.durationMinutes)}
    </span>
    <span style={{ fontSize: '11px', color: theme.textMuted, ...tabularNumberStyle }}>
      {formatTime12h(breakData.startTime)} → {formatTime12h(breakData.endTime)}
    </span>
  </div>
);
```

**Step 3: Visual verify** — Breaks appear as pill-shaped amber cards.

**Step 4: Commit:**
```bash
git add src/components/modals/MemberDetailModal.jsx
git commit -m "feat(timeline): redesign BreakCard as pill with amber background"
```

---

### Task 4.4 — Add subtitle to Efficiency in `SummaryMetrics`

**File:** `src/components/modals/MemberDetailModal.jsx` (lines 580-608)

**Step 1: Identify** — The metrics array and its render block inside `SummaryMetrics`.

**Step 2: Replace the metrics array and render:**

```jsx
{[
  { label: 'Tracked', value: formatMinutesToHM(totalTracked), icon: '⏱️', subtitle: null },
  { label: 'Tasks Done', value: `${completedTasks}/${tasks.length}`, icon: '✅', subtitle: 'completed' },
  { label: 'Breaks', value: formatMinutesToHM(totalBreaks), icon: '☕', subtitle: null },
  { label: 'Efficiency', value: `${efficiency}%`, icon: '📊', subtitle: 'tracked / session span' },
].map((metric, i) => (
  <div key={i} style={{ textAlign: 'center', flex: 1 }}>
    <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '2px', fontFamily: getFontFamily('english') }}>
      {metric.icon} {metric.label}
    </div>
    <div style={{ fontSize: '14px', fontWeight: '700', color: theme.text, ...tabularNumberStyle }}>
      {metric.value}
    </div>
    {metric.subtitle && (
      <div style={{ fontSize: '9px', color: theme.textMuted, marginTop: '2px', fontFamily: getFontFamily('english') }}>
        {metric.subtitle}
      </div>
    )}
  </div>
))}
```

**Step 3: Visual verify** — Efficiency metric shows "tracked / session span" below the percentage.

**Step 4: Commit:**
```bash
git add src/components/modals/MemberDetailModal.jsx
git commit -m "feat(timeline): add subtitle explanation to Efficiency metric in SummaryMetrics"
```

---

## Full Commit Sequence

```
feat(settings): add handleUpdateSickQuota and handleUpdateBonusQuota handlers
feat(settings): add Sick and Bonus default quota summary cards
feat(settings): expand leave quota table to 5 columns (annual/sick/bonus/wfh)
feat(defaults): add sickQuotas and bonusQuotas to DEFAULT_SETTINGS.team
fix(leaveHelpers): read sick/bonus quotas from settings.team.sickQuotas/bonusQuotas
feat(Avatar): add ringColor prop for colored border highlight
feat(calendar): replace type-color dot with colored ring Avatar in calendar cells
feat(calendar): add ringColor to popover Avatar entries
feat(overview): widen member quota card grid from 220px to 300px minwidth
feat(overview): enlarge MemberQuotaCard (avatar 40px, name 15px, 4-col quota row)
feat(overview): increase QuotaMini bar height to 5px and label to 11px
feat(timeline): add label and bg to statusColors in MemberDetailModal
feat(timeline): redesign TimelineTaskCard with status badge, left border, tags row, Open button
feat(timeline): redesign BreakCard as pill with amber background
feat(timeline): add subtitle explanation to Efficiency metric in SummaryMetrics
```

---

## Verification Checklist

1. **Settings → Team tab:** 4 default summary cards (Annual 30, Sick 10, Bonus 5, WFH 2). Table has 5 columns. Changing values persists on reload.
2. **Leaves → Calendar tab:** Leave entries appear as avatars with a colored border ring (blue=annual, red=sick, green=WFH, purple=bonus). Clicking a day shows the popover with the same rings.
3. **Leaves → Overview tab:** Cards are ~300px wide with 40px avatars, larger names, "Available" status text, all 4 quotas in one horizontal row, 5px progress bars.
4. **Member modal → Timeline tab:** Task cards have a 4px colored left border, status badge pill, duration below end time, `↗ Open` button, tags row when applicable. Breaks appear as amber pill-shaped cards.
5. **Unit tests:** `npm test` — all tests pass including the new `leaveHelpers.test.js`.
