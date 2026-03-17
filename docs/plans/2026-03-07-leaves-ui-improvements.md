# Leaves UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Three focused UI fixes — (1) show profile picture in MemberDetailModal header, (2) make WFH color more distinct from Leave in the calendar, (3) stack quota info in member cards and add a Pending Requests section to the Overview tab.

**Architecture:** All changes are purely presentational (no data model changes). Change 1 is a one-line prop fix. Change 2 is a one-line color token change in `constants.js`. Change 3 replaces `QuotaMini` grid with `QuotaBar` rows in `MemberQuotaCard` and adds a `PendingRequestsSection` component to `TeamOverviewPanel`. Leave approval/rejection updates `db.leaves` directly via Dexie.

**Tech Stack:** React 18, Dexie.js (IndexedDB), inline styles, existing components (`Avatar`, `QuotaBar`).

---

## Task 1: Profile Picture in MemberDetailModal Header

**Files:**
- Modify: `src/components/modals/MemberDetailModal.jsx` (line ~985)

**Context:** The `Avatar` component already accepts `profilePicture` and `clickUpColor` props and falls back gracefully to initials. The modal just isn't passing them despite having `member.profilePicture` available.

**Step 1: Find the Avatar usage in MemberDetailModal**

Open `src/components/modals/MemberDetailModal.jsx` and search for `<Avatar`. It's around line 985 in the header section and looks like:

```jsx
<Avatar name={member.name} status={member.status} theme={theme} size={50} />
```

**Step 2: Add the missing props**

Change that line to:

```jsx
<Avatar name={member.name} status={member.status} theme={theme} size={50}
  profilePicture={member.profilePicture}
  clickUpColor={member.clickUpColor} />
```

**Step 3: Verify visually**

Run `npm run dev`, open the app, click any member card to open the modal. The header should now show their profile picture instead of initials (if they have one set in ClickUp). Falls back to initials if no picture.

**Step 4: Commit**

```bash
git add src/components/modals/MemberDetailModal.jsx
git commit -m "fix(modal): show profile picture in MemberDetailModal header"
```

---

## Task 2: Distinct WFH Color in Calendar/Cards

**Files:**
- Modify: `src/components/views/leaves/constants.js` (line 24)

**Context:** `TYPE_COLORS.wfh` is currently `#10b981` (emerald green), which looks too similar to `STATUS_COLORS_MAP.approved` and can conflict visually with `TYPE_COLORS.annual` (#3b82f6 blue) in the mini calendar. Changing it to `#06b6d4` (cyan/teal) creates clear separation. This single change cascades to ALL places that use `TYPE_COLORS.wfh`: quota bars, calendar cells, status chips, legends.

**Step 1: Update the WFH color token**

In `src/components/views/leaves/constants.js`, change line 24:

```js
// Before
wfh: '#10b981',

// After
wfh: '#06b6d4',
```

**Step 2: Verify no hardcoded WFH colors elsewhere**

Run a search to confirm no components hardcode `#10b981` for WFH:

```bash
grep -r "10b981" src/components/views/leaves/
```

Expected: 0 results (all WFH colors come from `TYPE_COLORS.wfh`).

**Step 3: Verify visually**

Run `npm run dev`, open the Leaves tab. Check:
- Status strip: WFH chip should be cyan, not green
- Member cards: WFH quota bar should be cyan
- Mini calendar: WFH days should be cyan, leave days remain blue — now clearly distinct
- Legend: WFH label should show cyan

**Step 4: Commit**

```bash
git add src/components/views/leaves/constants.js
git commit -m "fix(leaves): change WFH color to cyan for better contrast with leave blue"
```

---

## Task 3: Stacked Quota Info + Pending Requests Section

**Files:**
- Modify: `src/components/views/leaves/TeamOverviewPanel.jsx`

**Context:** The current `MemberQuotaCard` uses a 4-column `QuotaMini` grid (cramped on mobile). Replace it with full-width `QuotaBar` rows (already used in `MemberLeaveDetail`). Also add a `PendingRequestsSection` above the member grid that shows leaves with `status === 'pending'`, with Approve/Reject buttons that update the record in IndexedDB.

### Step 3a: Replace QuotaMini grid with QuotaBar rows in MemberQuotaCard

**In `TeamOverviewPanel.jsx`, find the `MemberQuotaCard` component** (around line 222). The compact quota section (lines 264–270) currently is:

```jsx
{/* Compact Quota Summary — 4-column single row */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
  <QuotaMini label="Annual" used={balance.annual.used} total={balance.annual.total} color={TYPE_COLORS.annual} theme={theme} />
  <QuotaMini label="Sick" used={balance.sick.used} total={balance.sick.total} color={TYPE_COLORS.sick} theme={theme} />
  <QuotaMini label="Bonus" used={balance.bonus.used} total={balance.bonus.total} color={TYPE_COLORS.bonus} theme={theme} />
  <QuotaMini label="WFH" used={balance.wfh.usedThisMonth} total={balance.wfh.monthly} color={TYPE_COLORS.wfh} theme={theme} />
</div>
```

**Replace it with:**

```jsx
{/* Stacked Quota Bars */}
<div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
  <QuotaBar label="Annual" used={balance.annual.used} total={balance.annual.total} color={TYPE_COLORS.annual} theme={theme} compact />
  <QuotaBar label="Sick" used={balance.sick.used} total={balance.sick.total} color={TYPE_COLORS.sick} theme={theme} compact />
  <QuotaBar label="Bonus" used={balance.bonus.used} total={balance.bonus.total} color={TYPE_COLORS.bonus} theme={theme} compact />
  <QuotaBar label="WFH" used={balance.wfh.usedThisMonth} total={balance.wfh.monthly} color={TYPE_COLORS.wfh} theme={theme} compact />
</div>
```

**Also add `QuotaBar` to the import** at the top of the file. Current import (line 3):
```js
import QuotaBar from './QuotaBar';
```
It's already imported. No change needed.

**Delete the `QuotaMini` sub-component** (lines 287–320 — the entire `const QuotaMini = ...` block) since it's now unused.

### Step 3b: Add PendingRequestsSection component and wire it up

**Add the `PendingRequestsSection` component** at the bottom of `TeamOverviewPanel.jsx`, before `export default`:

```jsx
const PendingRequestsSection = ({ leaves, members, theme }) => {
  const pending = leaves.filter(l => l.status === 'pending');
  if (pending.length === 0) return null;

  const handleApprove = async (leave) => {
    await db.leaves.update(leave.id, { status: 'approved', updated: Date.now() });
  };

  const handleReject = async (leave) => {
    await db.leaves.update(leave.id, { status: 'rejected', updated: Date.now() });
  };

  return (
    <div style={{
      background: theme.cardBg,
      border: `1px solid ${TYPE_COLORS.annual}40`,
      borderRadius: 10,
      padding: 14,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, marginBottom: 10 }}>
        ⏳ Pending Requests ({pending.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pending.map(l => {
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
              {member && (
                <Avatar name={member.name} status={member.status} theme={theme} size={22}
                  profilePicture={member.profilePicture} clickUpColor={member.clickUpColor} />
              )}
              <span style={{ color: theme.text, flex: 1, fontWeight: 500 }}>
                {member?.name || l.memberName}
              </span>
              <span style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: `${TYPE_COLORS[l.type] || TYPE_COLORS.annual}20`,
                color: TYPE_COLORS[l.type] || TYPE_COLORS.annual,
                fontWeight: 600,
              }}>
                {TYPE_ICONS[l.type]} {TYPE_LABELS[l.type] || 'Leave'}
              </span>
              <span style={{ color: theme.textSecondary, fontSize: 11, ...tabularNumberStyle }}>
                {formatDateRange(l.startDate, l.endDate)} · {days}d
              </span>
              <button
                onClick={() => handleApprove(l)}
                style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: `1px solid #10b98160`,
                  background: '#10b98115',
                  color: '#10b981',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(l)}
                style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: `1px solid #ef444460`,
                  background: '#ef444415',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontWeight: 600,
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
```

**Add `db` import** at the top of `TeamOverviewPanel.jsx` (currently missing):
```js
import { db } from '../../../db';
```

**Wire `PendingRequestsSection` into the `TeamOverviewPanel` return** — insert it between the status strip and the member grid (around line 110):

```jsx
return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    {/* Today's Status Strip */}
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {/* ... StatusChips ... */}
    </div>

    {/* Pending Requests — NEW */}
    <PendingRequestsSection leaves={leaves} members={members} theme={theme} />

    {/* Member Quota Cards Grid */}
    <div style={{ ... }}>
      {/* ... member cards ... */}
    </div>

    {/* Upcoming Leaves */}
    {/* ... */}
  </div>
);
```

### Step 3c: Verify visually

Run `npm run dev`:
- Member cards should now show 4 stacked full-width quota bars instead of the cramped 4-column grid
- If any leaves have `status === 'pending'` in IndexedDB, the Pending Requests section appears above the member grid
- Approve button sets status to `approved` (card updates reactively via `useLiveQuery`)
- Reject button sets status to `rejected` (leave disappears from all views)

**To test with a pending record** (if none exist), open browser DevTools console and run:
```js
await db.leaves.add({ memberId: '87657591', memberClickUpId: '87657591', memberName: 'Dina Ibrahim', type: 'annual', startDate: '2026-03-10', endDate: '2026-03-12', status: 'pending', created: Date.now(), updated: Date.now() });
```

### Step 3d: Commit

```bash
git add src/components/views/leaves/TeamOverviewPanel.jsx
git commit -m "feat(leaves): stacked quota bars + pending requests section in Overview tab"
```

---

## Verification Checklist

- [ ] MemberDetailModal header shows profile picture (falls back to initials gracefully)
- [ ] WFH color is cyan (#06b6d4) — visually distinct from leave blue (#3b82f6) in calendar
- [ ] Member cards in Overview show stacked quota bars (Annual, Sick, Bonus, WFH)
- [ ] Pending Requests section appears when `status === 'pending'` leaves exist
- [ ] Approve sets status to `approved`, card updates reactively
- [ ] Reject sets status to `rejected`, record disappears from all views
- [ ] No regressions in MemberLeaveDetail (still uses its own QuotaBars correctly)
