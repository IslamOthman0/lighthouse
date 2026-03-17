# Lighthouse Dashboard — UI & Visual Testing Plan

> **Purpose:** Instructions for Claude Opus 4.6 (Plan Mode) to direct Sonnet 4.6 (Act Mode) in Claude Code.
> **Prerequisite:** LIGHTHOUSE_FIX_PLAN.md completed (logic bugs fixed, unit + E2E tests in place).
> **Focus:** Part A — Visual correctness, settings reactivity, responsive, edge cases.
> **Part B (UX Audit + Design Consistency):** Separate plan, later.

---

## Context Limit Strategy

**Problem:** Screenshots and visual test logs are huge — they fill the context fast.

**Solution — NO screenshots in context:**
- Playwright saves screenshots to `test-results/visual/` — Sonnet never reads them
- All assertions are **code-based**: `toBeVisible()`, `toHaveText()`, `toHaveCSS()`, `toHaveCount()`
- Results are **text summaries** in PROGRESS.md: "✅ Grid View: 14/14 assertions passed"
- If a test fails, the failure message (text) is enough — no screenshot needed in context
- HTML report generated with `--reporter=html` for YOU to review visually

**Session Management:** Same as fix plan — read PROGRESS.md at start of each session.

---

## How to Use This Plan

Same protocol as the fix plan:
1. Read `CLAUDE.md` and `PROGRESS.md` before every task
2. One task per Sonnet execution
3. Update `PROGRESS.md` after each task
4. Resume from PROGRESS.md in new sessions

---

## Phase 0 — Setup

### Task 0.1 — Assess Existing Test Infrastructure & Mock Data

```
Read CLAUDE.md, LIGHTHOUSE_FIX_PLAN.md (for context), and PROGRESS.md.

I need you to assess the current state of the project for visual testing readiness.

CHECK 1 — Existing E2E Tests:
- Read ALL files in tests/ directory
- Read playwright.config.js
- Is there existing mock data / API interception setup?
- What Playwright projects are configured (browsers, viewports)?
- Are there any existing screenshot or visual comparison tests?

CHECK 2 — Mock Data Availability:
- Does the app have a mock mode or demo mode?
- Is there a way to populate IndexedDB with test data without ClickUp API?
- Check if any test file already sets up mock members/time entries
- Check if API routes are intercepted anywhere

CHECK 3 — App Startup Without API:
- What happens when the app loads without a valid API key?
- Does it show a login screen? Error screen? Empty dashboard?
- Can we bypass auth for testing?

OUTPUT: A summary report answering all checks above.
Based on findings, recommend:
A) Build on existing mock setup (if sufficient)
B) Create new mock layer (if nothing exists)
C) Hybrid approach

Update PROGRESS.md with new "UI Testing Plan" section and mark 0.1 complete.
Commit: "audit: assess visual testing readiness"
```

### Task 0.2 — Create Comprehensive Mock Data Fixtures

```
Read CLAUDE.md. Read PROGRESS.md (check Task 0.1 findings).

Create tests/fixtures/mock-data.js with comprehensive test data.

This file must export mock data that covers ALL visual states:

1. MOCK_MEMBERS (8 members) — each in a different state:
   - Member 1: "working" — high score (85), tracked 5.2h of 6.5h target, active timer
   - Member 2: "working" — overworking (7.8h tracked, over target), timer in orange
   - Member 3: "break" — last activity 8 min ago, score 62
   - Member 4: "offline" — last activity 2.5h ago, score 41
   - Member 5: "noActivity" — 0h tracked, 0 tasks, score 0
   - Member 6: "leave" — on approved leave, purple card
   - Member 7: "working" — low score (28), 1.8h tracked, falling behind
   - Member 8: "offline" — decent score (55), went offline recently

   Each member must have ALL fields used by the UI:
   id, name, initials, clickUpId, profilePicture (null ok),
   status, timer, tracked, target, tasks, done, completionDenominator,
   score, task, taskStatus, project, priority, publisher, genre, tags,
   startTime, previousTimer, breaks, complianceHours,
   lastSeen, isOverworking, runningEntry (for working members)

2. MOCK_TEAM_STATS:
   - tracked: { value: total, target: total, progress: % }
   - tasks: { done: total, total: total, progress: % }

3. MOCK_SCORE_METRICS:
   - total, time, workload, tasks, compliance
   - weighted: { time, workload, completion, compliance }
   - weights: { TIME, WORKLOAD, COMPLETION, COMPLIANCE }

4. MOCK_PROJECT_BREAKDOWN:
   - 3 projects with different statuses and task counts

5. MOCK_SETTINGS (DEFAULT + variations):
   - DEFAULT_SETTINGS (from constants/defaults.js)
   - CUSTOM_WEIGHTS: { trackedTime: 0.60, tasksWorked: 0.10, tasksDone: 0.20, compliance: 0.10 }
   - CUSTOM_SCHEDULE: { workDays: [1,2,3,4,5], ... } (Mon-Fri instead of Sun-Thu)

6. MOCK_DATE_RANGES:
   - TODAY: { startDate: null, endDate: null, preset: 'today' }
   - LAST_7_DAYS: { startDate: '...', endDate: '...', preset: 'last7' }
   - CUSTOM_RANGE: { startDate: '2026-02-01', endDate: '2026-02-15', preset: 'custom' }

7. MOCK_LEAVES:
   - 2-3 leave records for the "leave" member
   - 1 WFH record for another member

8. EDGE_CASE_MEMBERS:
   - EMPTY_TEAM: [] (no members)
   - SINGLE_MEMBER: [one working member]
   - ALL_ON_LEAVE: [8 members all on leave]
   - ALL_OVERWORKING: [8 members all over target]
   - ALL_NO_ACTIVITY: [8 members with 0 tracked]

Commit: "test: create comprehensive mock data fixtures"
Update PROGRESS.md.
```

### Task 0.3 — Create Playwright Test Helper (Page Setup)

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/fixtures/test-setup.js — a shared helper that ALL visual tests use.

This helper must:

1. setupMockApp(page, options) function:
   a. Intercept ALL ClickUp API routes → return empty/mock responses
   b. Pre-populate localStorage with settings (from options.settings or defaults)
   c. Navigate to the app
   d. Inject mock data into Zustand store via page.evaluate():
      - Set store.members
      - Set store.teamStats
      - Set store.scoreMetrics
      - Set store.projectBreakdown
      - Set store.dateRange
      - Set store.dateRangeInfo
   e. Wait for the dashboard to render (wait for member cards visible)

2. changeSettings(page, settingPath, value) function:
   - Opens settings modal
   - Navigates to correct tab
   - Changes the value
   - Saves and closes
   - Waits for UI to update

3. changeDateRange(page, preset) function:
   - Opens date picker
   - Selects preset (today, last7, last30, custom)
   - Confirms selection
   - Waits for UI to update

4. getScreenData(page) function:
   - Extracts visible text values from the current screen
   - Returns { memberCount, teamScore, trackedHours, targetHours, etc. }
   - Used to verify data consistency across screens

5. Viewport helpers:
   - MOBILE: { width: 375, height: 812 }    // iPhone SE
   - TABLET: { width: 768, height: 1024 }   // iPad
   - LAPTOP: { width: 1024, height: 768 }
   - DESKTOP: { width: 1440, height: 900 }

IMPORTANT: The Zustand store injection must work even if the app
initializes with auth/API checks. Find the correct approach based on
Task 0.1 findings (bypass auth, or mock auth response, or inject after load).

Run a smoke test to verify the setup works:
- Load app with mock data
- Verify 8 member cards are visible
- Verify team score is displayed

Commit: "test: create visual test setup helper"
Update PROGRESS.md.
```

---

## Phase 1 — Screen Data Correctness

> **Goal:** Every screen displays the RIGHT data from mock fixtures. All assertions are code-based (no screenshots in context).

### Task 1.1 — Grid View: All Cards Display Correct Data

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/grid-view.spec.js

Using the mock setup helper, verify the Grid View (main dashboard):

TEST GROUP 1 — Overview Cards:
- OverviewCard shows tracked hours matching MOCK_TEAM_STATS.tracked.value (formatted as Xh Ym)
- OverviewCard shows target hours matching MOCK_TEAM_STATS.tracked.target
- OverviewCard progress bar width corresponds to progress %

TEST GROUP 2 — Score Breakdown:
- ScoreBreakdownCard shows total score matching MOCK_SCORE_METRICS.total
- Shows 4 metric values: time, workload, tasks, compliance
- Each metric value matches MOCK_SCORE_METRICS

TEST GROUP 3 — Member Cards:
- Exactly 8 member cards rendered
- Working member card: shows green border, name, score, tracked hours, timer
- Break member card: shows amber border, "On break" text
- Offline member card: shows gray border, reduced opacity
- NoActivity member card: compact, no metrics shown
- Leave member card: shows purple border, leave info
- Overworking member: shows orange warning indicator

TEST GROUP 4 — Team Status Overview:
- Correct count per status (e.g., "Working: 3", "Break: 1", etc.)
- Counts sum to 8

TEST GROUP 5 — Project Breakdown:
- Shows 3 projects from MOCK_PROJECT_BREAKDOWN
- Task counts match mock data

All assertions use: toBeVisible(), toHaveText(), toContainText(), toHaveCount()
NO screenshot comparisons. NO image assertions.

Run: npx playwright test tests/visual/grid-view.spec.js
Report: X passed, Y failed (text only).

Commit: "test: grid view data correctness — [X/Y passed]"
Update PROGRESS.md.
```

### Task 1.2 — List View: Same Data as Grid View

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/list-view.spec.js

TEST GROUP 1 — Data Consistency:
- Load Grid View → extract team score, tracked hours, member count via getScreenData()
- Switch to List View
- Extract same values via getScreenData()
- ASSERT: all values match exactly

TEST GROUP 2 — Table Content:
- Table has 8 rows (one per member)
- Each row shows: name, status, tracked, tasks, score
- Values match what Grid View member cards show for the same member
- Sorting works: click "Score" header → sorted by score desc

TEST GROUP 3 — Member Row Interaction:
- Click a member row → MemberDetailModal opens
- Modal shows the same member name
- Close modal → back to list view

Run: npx playwright test tests/visual/list-view.spec.js
Commit: "test: list view data correctness"
Update PROGRESS.md.
```

### Task 1.3 — Member Detail Modal: Correct Individual Data

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/member-detail.spec.js

For EACH member state (working, break, offline, noActivity, leave), open their modal:

TEST GROUP 1 — Header:
- Shows correct member name and initials
- Shows correct status badge
- Shows correct score

TEST GROUP 2 — Timeline Tab:
- For working member: shows time entries
- For noActivity member: shows empty state message
- For leave member: shows leave info

TEST GROUP 3 — Data Match:
- Modal tracked hours = same as card tracked hours
- Modal tasks = same as card tasks
- Modal score = same as card score

TEST GROUP 4 — Close Behavior:
- Clicking X closes modal
- Pressing Escape closes modal
- Clicking backdrop closes modal

Run: npx playwright test tests/visual/member-detail.spec.js
Commit: "test: member detail modal correctness"
Update PROGRESS.md.
```

### Task 1.4 — Dashboard Detail Modal

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/dashboard-detail.spec.js

TEST GROUP 1 — Open from Overview Cards:
- Click tracked hours card → DashboardDetailModal opens with hours detail
- Shows data consistent with overview card
- Close modal

TEST GROUP 2 — Open from Score Card:
- Click score breakdown → modal opens with score details
- Shows weighted scores matching MOCK_SCORE_METRICS.weighted

Assertions are text-based only.

Run: npx playwright test tests/visual/dashboard-detail.spec.js
Commit: "test: dashboard detail modal"
Update PROGRESS.md.
```

### Task 1.5 — Leaves Tab

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/leaves-tab.spec.js

Setup: inject MOCK_LEAVES into IndexedDB (db.leaves) via page.evaluate()

TEST GROUP 1 — Tab Navigation:
- Click "Leaves" tab → leaves view loads
- Calendar component is visible

TEST GROUP 2 — Leave Data Display:
- Member on leave shows in the team overview panel
- Leave days are marked on calendar
- WFH days shown separately from leave days

TEST GROUP 3 — Member Leave Detail:
- Click a member → shows their leave records
- Quota bar shows used/remaining if quotas configured

Run: npx playwright test tests/visual/leaves-tab.spec.js
Commit: "test: leaves tab display"
Update PROGRESS.md.
```

---

## Phase 2 — Settings Reactivity

> **Goal:** Changing a setting IMMEDIATELY reflects in the UI without refresh.

### Task 2.1 — Score Weights Reactivity

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/settings-reactivity.spec.js

FLOW:
1. Load app with DEFAULT mock data
2. Record team score from dashboard (e.g., "67")
3. Open Settings → Score Weights tab
4. Change Time weight from 40% to 60% (and adjust others to sum to 100%)
5. Save settings
6. Back to dashboard — WITHOUT page reload
7. Assert: team score has CHANGED (not "67" anymore)
8. Assert: individual member scores have changed too

ALSO TEST:
- Change weights → switch to List View → scores updated there too
- Change weights → open Member Detail Modal → score updated there too
- Reset weights to default → scores return to original values

Run: npx playwright test tests/visual/settings-reactivity.spec.js
Commit: "test: score weights reactivity"
Update PROGRESS.md.
```

### Task 2.2 — Member Filter Reactivity

```
Read CLAUDE.md. Read PROGRESS.md.

Add to tests/visual/settings-reactivity.spec.js (or new file):

FLOW:
1. Load app with 8 members
2. Assert: 8 member cards visible
3. Open Settings → Team tab
4. Remove 3 members from membersToMonitor
5. Save settings
6. Assert: only 5 member cards visible (no refresh)
7. Team stats should recalculate for 5 members only
8. Switch to List View → only 5 rows

ALSO TEST:
- Remove all members → dashboard shows empty state
- Add members back → they reappear

Run and commit.
Update PROGRESS.md.
```

### Task 2.3 — Theme & Display Settings

```
Read CLAUDE.md. Read PROGRESS.md.

Add to settings reactivity tests:

FLOW 1 — Theme Change:
1. Load app (True Black theme by default)
2. Record background color of body/main container
3. Open Settings → Display → change to Noir Glass
4. Assert: background color has changed (CSS check with toHaveCSS)
5. Assert: all cards still visible and readable

FLOW 2 — Default View:
1. Load app in Grid View
2. Open Settings → Display → set default view to "list"
3. Save → assert current view switches to List View (or on next load)

FLOW 3 — Schedule Change:
1. Load app with workDays [0,1,2,3,4] (Sun-Thu)
2. Record target hours displayed
3. Change workDays to [1,2,3,4,5] (Mon-Fri) — this might change working days count
4. If date range is "today" and today's a Friday, target should change

Run and commit.
Update PROGRESS.md.
```

### Task 2.4 — Threshold Settings

```
Read CLAUDE.md. Read PROGRESS.md.

Add to settings reactivity tests:

NOTE: Threshold changes affect member STATUS, which requires a sync to recalculate.
The test should verify:

1. Check if threshold change triggers a re-derivation of status in the UI
2. If not (requires next sync cycle), document this as expected behavior

This is a VERIFICATION task, not necessarily a pass/fail test.
Report whether threshold changes are immediate or require sync.

Update PROGRESS.md with findings.
Commit: "test: threshold settings behavior documented"
```

---

## Phase 3 — Date Range Impact

> **Goal:** Changing date range updates ALL screens correctly.

### Task 3.1 — Date Range Changes Update All Data

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/date-range.spec.js

FLOW:
1. Load app with "today" preset (default mock data)
2. Record: team score, tracked hours, target hours, member scores
3. Change to "Last 7 Days" (need to update mock data for multi-day range)
   - Use page.evaluate to inject multi-day mock data with:
     - Higher tracked hours (multi-day total)
     - Higher target (6.5h × 5 working days = 32.5h)
     - Different scores
4. Assert ALL of these changed:
   - Overview card: tracked and target values
   - Score breakdown: all 4 metrics
   - Member cards: tracked hours per member
   - Header: date display shows range

TEST GROUP 2 — Grid and List Consistency After Date Change:
- After date change, switch Grid → List → Grid
- All values remain consistent

TEST GROUP 3 — Modal After Date Change:
- Open member detail after date change
- Modal shows data for the selected range, not "today"

Run: npx playwright test tests/visual/date-range.spec.js
Commit: "test: date range impact on all screens"
Update PROGRESS.md.
```

---

## Phase 4 — Mobile Responsive

> **Goal:** Dashboard works correctly on 4 viewport sizes.

### Task 4.1 — Mobile (375px) Layout

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/responsive-mobile.spec.js

Set viewport: { width: 375, height: 812 }

TEST GROUP 1 — Layout:
- All member cards visible (may need scrolling)
- No horizontal overflow (page width = viewport width)
- Bottom navigation visible (MobileBottomNav)
- Header doesn't overflow or clip text

TEST GROUP 2 — Interactions:
- Member card tap → modal opens, fills most of screen
- Settings gear → settings modal opens, usable on small screen
- Date picker → opens and is usable
- Grid/List toggle works

TEST GROUP 3 — Content:
- Member card shows essential info (name, status, score)
- Numbers are readable (not clipped or overlapping)
- No text truncation that hides critical info

Assertions: toBeVisible(), toBeInViewport(), NO horizontal scrollbar check.

Run: npx playwright test tests/visual/responsive-mobile.spec.js
Commit: "test: mobile responsive (375px)"
Update PROGRESS.md.
```

### Task 4.2 — Tablet (768px) Layout

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/responsive-tablet.spec.js

Set viewport: { width: 768, height: 1024 }

TEST GROUP 1 — Layout:
- Cards may be in 2-column grid
- Overview cards and score card visible without scrolling
- No horizontal overflow

TEST GROUP 2 — Modals:
- MemberDetailModal: properly sized (not too small, not full screen)
- SettingsModal: all tabs accessible

TEST GROUP 3 — Navigation:
- Check whether desktop nav or mobile bottom nav is shown
- Both should work correctly at this breakpoint

Run and commit.
Update PROGRESS.md.
```

### Task 4.3 — Laptop (1024px) & Desktop (1440px)

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/responsive-desktop.spec.js

Test BOTH viewports: 1024×768 and 1440×900

TEST GROUP 1 — Layout:
- Member cards in multi-column grid
- All overview cards visible above the fold
- RankingTable (if visible) shows full columns

TEST GROUP 2 — No Overflow:
- No horizontal scrollbar at either size
- Modals centered and appropriately sized

TEST GROUP 3 — Content Density:
- At 1440px, cards should use available space (not cramped on left)
- At 1024px, content still readable, no overlap

Run and commit.
Update PROGRESS.md.
```

---

## Phase 5 — Edge Cases

> **Goal:** App doesn't crash or show wrong info in unusual states.

### Task 5.1 — Empty States

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/edge-cases.spec.js

TEST 1 — No Members:
- Load app with EDGE_CASE_MEMBERS.EMPTY_TEAM
- Assert: shows empty state message (not a crash, not blank screen)
- Overview cards show 0/0
- No JavaScript errors in console

TEST 2 — Single Member:
- Load with EDGE_CASE_MEMBERS.SINGLE_MEMBER
- Assert: 1 card displayed
- Team stats based on 1 member
- List view has 1 row

TEST 3 — All On Leave:
- Load with EDGE_CASE_MEMBERS.ALL_ON_LEAVE
- Assert: 8 leave cards
- Team stats: 0h tracked, still has target
- Score: meaningful value (not NaN, not crash)

TEST 4 — All Overworking:
- Load with EDGE_CASE_MEMBERS.ALL_OVERWORKING
- Assert: overwork indicators on all cards
- Score capped at 100 (not 105, not NaN)
- Orange/warning styling visible

TEST 5 — All No Activity:
- Load with EDGE_CASE_MEMBERS.ALL_NO_ACTIVITY
- Assert: 8 compact noActivity cards
- 0h tracked, 0 tasks
- Score = 0 (not NaN)

For EACH test, also check:
- page.on('pageerror') captures no JS errors
- page.on('console', msg => msg.type() === 'error') captures no console errors

Run: npx playwright test tests/visual/edge-cases.spec.js
Commit: "test: edge cases — empty states and extremes"
Update PROGRESS.md.
```

### Task 5.2 — Cross-Screen Consistency Check

```
Read CLAUDE.md. Read PROGRESS.md.

Create tests/visual/cross-screen.spec.js

THE ULTIMATE CONSISTENCY TEST:

1. Load app with default mock data
2. In Grid View, extract for EACH member: { name, status, tracked, score }
3. Switch to List View, extract same data per member
4. ASSERT: every member's data matches between views

5. Pick member #1 (working) — click to open modal
6. Extract: { tracked, tasks, score } from modal
7. ASSERT: matches Grid View and List View values

8. Close modal → back to Grid View
9. Open DashboardDetailModal for score
10. Extract: total score
11. ASSERT: matches ScoreBreakdownCard value

This is the single most important test — it proves data flows correctly
through ALL screens from the same Zustand store.

Run: npx playwright test tests/visual/cross-screen.spec.js
Commit: "test: cross-screen data consistency"
Update PROGRESS.md.
```

---

## Phase 6 — Final Sweep

### Task 6.1 — Run Full Visual Test Suite

```
Read CLAUDE.md. Read PROGRESS.md.

Run the ENTIRE visual test suite:
npx playwright test tests/visual/ --reporter=html

Report:
- Total tests: X
- Passed: Y
- Failed: Z
- Skipped: W

For any failures:
- List each failed test name and failure reason (text only)
- Categorize: is it a real bug or a test issue?

Generate the HTML report for Islam to review:
npx playwright show-report

Update PROGRESS.md with final summary:
- Total visual tests added
- Pass rate
- Any real bugs found
- Remaining issues

Commit: "test: final visual test sweep — [X/Y passed]"
```

---

## Quick Reference — Viewport Sizes

| Name | Width | Height | Use Case |
|------|-------|--------|----------|
| Mobile | 375 | 812 | iPhone SE/13 mini |
| Tablet | 768 | 1024 | iPad |
| Laptop | 1024 | 768 | Small laptop |
| Desktop | 1440 | 900 | Standard monitor |

## Quick Reference — Assertion Types (NO screenshots in context)

```javascript
// Element visibility
await expect(page.locator('.member-card')).toHaveCount(8);
await expect(page.getByText('Team Score')).toBeVisible();

// Text content
await expect(page.locator('.score-value')).toHaveText('67');
await expect(page.locator('.tracked')).toContainText('5h 12m');

// CSS properties
await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');

// No JS errors
const errors = [];
page.on('pageerror', e => errors.push(e.message));
// ... run test ...
expect(errors).toHaveLength(0);
```

## Quick Reference — Commands

```bash
npx playwright test tests/visual/              # Run all visual tests
npx playwright test tests/visual/ --reporter=html  # With HTML report
npx playwright test tests/visual/grid-view.spec.js # Single file
npx playwright show-report                     # Open HTML report
```