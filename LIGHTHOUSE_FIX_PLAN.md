# Lighthouse Dashboard — Comprehensive Fix & Verification Plan

> **Purpose:** Instructions for Claude Opus 4.6 (Plan Mode) to direct Sonnet 4.6 (Act Mode) in Claude Code on VS Code.
> **Project:** https://github.com/IslamOthman0/lighthouse
> **Date:** March 2026

---

## How to Use This Plan

This plan is divided into **6 Phases**, each with **numbered Tasks**. Each task is self-contained and can be executed in a fresh Claude Code session.

### Session Management Rules
- **Before starting any task:** Read `CLAUDE.md` and `PROGRESS.md` (see Phase 0)
- **After completing any task:** Update `PROGRESS.md` with task ID, status, and summary
- **If session runs out mid-task:** The next session reads `PROGRESS.md` and resumes from the last incomplete task
- **Never combine tasks** — one task per Sonnet execution to stay within context limits

### Execution Protocol for Sonnet 4.6
Every task prompt to Sonnet must start with:
```
Read CLAUDE.md completely. Then read PROGRESS.md to check current status.
Then execute Task [X.Y] below.
```

---

## Phase 0 — Setup (Run Once)

### Task 0.1 — Create PROGRESS.md Tracker

```
Read CLAUDE.md completely.

Create a file called PROGRESS.md in the project root with this content:

# Lighthouse Fix Plan — Progress Tracker

## Status Legend
- ⬜ Not started
- 🔄 In progress
- ✅ Complete
- ❌ Failed (see notes)
- ⏭️ Skipped (see notes)

## Phase 0: Setup
- [ ] 0.1 Create PROGRESS.md
- [ ] 0.2 Update CLAUDE.md with fix rules
- [ ] 0.3 Clean up temp files

## Phase 1: Diagnosis
- [ ] 1.1 Audit date flow
- [ ] 1.2 Audit settings flow
- [ ] 1.3 Audit screen data consistency
- [ ] 1.4 Audit member status logic
- [ ] 1.5 Audit leave system
- [ ] 1.6 Compile bug report

## Phase 2: Safety Net Tests
- [ ] 2.1 Tests for calculations.js
- [ ] 2.2 Tests for scoreCalculation.js
- [ ] 2.3 Tests for settingsValidation + timeFormat
- [ ] 2.4 Tests for useAppStore
- [ ] 2.5 Tests for leaveHelpers

## Phase 3: Bug Fixes
- [ ] 3.x (one entry per confirmed bug from Phase 1)

## Phase 4: Screen Verification
- [ ] 4.1 Grid View data flow
- [ ] 4.2 List View data flow
- [ ] 4.3 MemberDetailModal
- [ ] 4.4 SettingsModal pipeline
- [ ] 4.5 Leaves system

## Phase 5: E2E Tests
- [ ] 5.1 Core E2E tests with mocked API

## Phase 6: Final Sweep
- [ ] 6.1 Full test suite + build + cleanup

## Bug Registry
(Populated after Phase 1)

| Bug ID | File:Line | Description | Severity | Fix Task | Status |
|--------|-----------|-------------|----------|----------|--------|

## Session Log
| Session | Date | Tasks Completed | Notes |
|---------|------|-----------------|-------|

---

After creating the file, mark Task 0.1 as complete in the file.
Commit: "chore: add fix plan progress tracker"
```

### Task 0.2 — Update CLAUDE.md with Fix Rules

```
Read CLAUDE.md completely. Read PROGRESS.md.

Add the following section at the END of CLAUDE.md, before the last line:

---

## Fix Plan Rules (ACTIVE — March 2026)

### Golden Rules
1. **ONE fix per commit** — never change more than one logical unit per commit
2. **Run tests after EVERY change** — `npm test -- --run`
3. **No refactoring during fixes** — fix the bug, don't reorganize code
4. **If unsure, STOP and ask** — don't guess at business logic
5. **Preserve all existing functionality** — if it works, don't touch it
6. **Read PROGRESS.md first** — check what's done and what's next

### Commit Convention
- Diagnosis: `audit: [area] - [finding summary]`
- Tests: `test: [file] - [what's covered]`
- Fixes: `fix: [component] - [what was wrong]`
- Cleanup: `chore: [description]`

### Date Handling Rules
- "Today" = dateRange.preset === 'today' OR dateRange.startDate is null
- Date range = startDate + endDate as ISO strings (YYYY-MM-DD)
- All time comparisons use LOCAL time (Egypt UTC+2/+3)
- Working days respect settings.schedule.workDays + publicHolidays
- Member target = 6.5h × workingDays (after deducting leave days)

### Settings Pipeline (must flow in this order)
1. localStorage → useSettings hook → React state
2. useClickUpSync effect → store.setScoreWeights()
3. loadSettings() in sync → orchestrator uses for API calls
4. calculations.js uses settings for thresholds/schedule
5. App.jsx useMemo filters members by settings.team.membersToMonitor

### Data Flow for Screens
- Source of truth: useAppStore (Zustand)
- Grid View: reads from store via App.jsx computed props
- List View: receives same computed props as Grid View
- MemberDetailModal: reads individual member from store.members
- All must respect current dateRange from store

---

Commit: "docs: add fix plan rules to CLAUDE.md"
Update PROGRESS.md: mark 0.2 complete.
```

### Task 0.3 — Clean Up Temp Files

```
Read CLAUDE.md. Read PROGRESS.md.

Check for and clean up any temporary or leftover files:
1. Delete src/components/layout/MainTabs.jsx.tmp (it's 0 bytes)
2. Check for any other .tmp, .bak, or .orig files in the repo
3. Check for unused imports in key files (App.jsx, useClickUpSync.js, useAppStore.js)
   — only report, do NOT fix unused imports yet

Commit: "chore: remove temp files"
Update PROGRESS.md: mark 0.3 complete.
```

---

## Phase 1 — Diagnosis (Find ALL Bugs First)

> **Goal:** Methodical audit of every data pipeline. Report ONLY confirmed bugs with exact file:line references. No style issues, no "potential improvements".

### Task 1.1 — Audit: Date Range Flow

```
Read CLAUDE.md (especially Fix Plan Rules). Read PROGRESS.md.

AUDIT the date range data flow end-to-end. Trace these paths:

PATH A — User selects date in DatePickerModal:
1. DatePickerModal.jsx → what does it call? (setDateRange? setSelectedDate?)
2. useAppStore.setDateRange() → does it normalize correctly?
3. useClickUpSync.js dateRange useEffect → does it detect the change?
4. Does it abort the previous sync? Does it debounce correctly?
5. orchestrator.js syncMemberData() → how does it receive startDate/endDate?
6. Does it pass dates to ClickUp API correctly?

PATH B — "Today" mode (default):
1. When dateRange.preset === 'today', what are startDate/endDate? (null/null)
2. Does syncMemberData handle null dates correctly?
3. Does it default to today's date in the API call?
4. Is "today" calculated in LOCAL time (Egypt UTC+2)?

PATH C — Historical range (past dates only):
1. Does isRangeFullyPast() work correctly?
2. Does it stop polling as expected?
3. If user switches back to "today", does polling resume?

For EACH path, check:
- Are dates consistently ISO strings (YYYY-MM-DD)?
- Are timezone conversions correct (Egypt = UTC+2 or UTC+3 DST)?
- Can dates be Date objects in some paths and strings in others? (BUG if so)

OUTPUT FORMAT — for each finding:
✅ CORRECT: [description]
🐛 BUG: [file:line] — [what's wrong] → [expected behavior]

Do NOT fix anything. Only report.
Update PROGRESS.md with findings summary.
Commit: "audit: date range flow — [X bugs found]"
```

### Task 1.2 — Audit: Settings Application Pipeline

```
Read CLAUDE.md. Read PROGRESS.md.

AUDIT how settings flow through the entire app:

PIPELINE A — Settings Load:
1. useSettings.js hook loads from localStorage
2. useClickUpSync.js has a SEPARATE loadSettings() function
3. Are these always in sync? Can they diverge?

PIPELINE B — Score Weights:
1. settings.score.weights → useClickUpSync useEffect → store.setScoreWeights
2. store.scoreWeights → updateStats() → member scores
3. store.scoreWeights → batchSyncUpdate() → member scores
4. If user changes weights in SettingsModal:
   a. Does localStorage update immediately?
   b. Does the useEffect detect the change?
   c. Does it trigger score recalculation?
   d. Do ALL screens reflect new scores without a manual refresh?

PIPELINE C — Member Filter:
1. settings.team.membersToMonitor
2. useClickUpSync reads this via loadSettings() — not the hook
3. App.jsx filters using settings from useSettings hook
4. Can the sync fetch data for unmonitored members?
5. Can the UI show members not in the sync?

PIPELINE D — Thresholds:
1. settings.thresholds.breakMinutes, offlineMinutes, breakGapMinutes
2. deriveStatus() in calculations.js receives settings param
3. Is settings always passed? Or can it be null/undefined?
4. calculateBreaks() — does it receive settings?

PIPELINE E — Schedule:
1. settings.schedule.workDays, publicHolidays
2. calculateWorkingDays() in calculations.js
3. Is this called with settings in ALL places?
4. Can workingDays be wrong if settings aren't loaded yet?

For EACH pipeline, look for:
- Stale closures (using old settings ref)
- Missing settings param (defaults used instead of user config)
- Race conditions (settings change during sync)

OUTPUT: Same ✅/🐛 format as Task 1.1.
Update PROGRESS.md. Commit: "audit: settings pipeline — [X bugs found]"
```

### Task 1.3 — Audit: Screen Data Consistency

```
Read CLAUDE.md. Read PROGRESS.md.

AUDIT whether all screens show the same data for the same date range.

CHECK 1 — Data Sources:
- App.jsx: how are displayTeamStats and displayScoreMetrics computed?
- Are they computed from filteredMembers (after filter) or all members?
- Grid View (OverviewCard, ScoreBreakdownCard, etc.): what props do they receive?
- List View (ListView.jsx): does it receive the SAME data as Grid View?
- If Grid shows "Team Score: 67" and List shows "Team Score: 65", that's a bug.

CHECK 2 — Member Card vs List Row:
- MemberCard shows: status, tracked, tasks, score, timer
- MemberRow (in ListView): does it show the SAME values?
- Do both use the same formatHoursToHM?
- Do both use the same getMetricColor?

CHECK 3 — Modal vs Card:
- Click member card → MemberDetailModal opens
- Does the modal show the same tracked/tasks/score as the card?
- Does the modal respect the current dateRange?
- Or does it always show "today" regardless of selected range?

CHECK 4 — DashboardDetailModal:
- Clicking overview cards opens DashboardDetailModal
- Does it show data consistent with the overview cards?
- Does it respect date range?

CHECK 5 — Date Range Display:
- Header shows current date/range
- Do all components read from the same store.dateRange?
- If user selects "Last 7 days", do ALL components reflect this?

OUTPUT: Same ✅/🐛 format.
Update PROGRESS.md. Commit: "audit: screen data consistency — [X bugs found]"
```

### Task 1.4 — Audit: Member Status Derivation

```
Read CLAUDE.md. Read PROGRESS.md.

AUDIT the member status system (working/break/offline/noActivity/leave).

CHECK 1 — deriveStatus() in calculations.js:
- 'working' = runningEntry with negative duration → correct?
- 'noActivity' = no time entries at all → correct?
- 'break' = last activity within breakThreshold → correct?
- 'offline' = everything else → correct?
- Edge case: What if runningEntry exists but duration is 0 (not negative)?
- Edge case: What if timeEntries has entries but all have 0 duration?

CHECK 2 — Leave Override:
- enrichMembersWithLeaveStatus() in leaveHelpers.js
- When does leave override other statuses?
- Can a member be "working" AND "on leave" simultaneously? (BUG if so)
- Is WFH handled separately from leave?
- Does the leave check use the correct date (today vs selected range)?

CHECK 3 — Status → Card Routing:
- MemberCard.jsx routes to 5 state components
- Is the routing logic correct? (working→WorkingCard, etc.)
- Can a member get stuck in wrong state between syncs?
- What happens during the gap between sync completing and state updating?

CHECK 4 — Status Counts:
- TeamStatusOverview counts members per status
- Does it count from filteredMembers or all members?
- Do the counts match what's displayed in the cards grid?

OUTPUT: Same ✅/🐛 format.
Update PROGRESS.md. Commit: "audit: member status logic — [X bugs found]"
```

### Task 1.5 — Audit: Leave System

```
Read CLAUDE.md. Read PROGRESS.md.

AUDIT the leave & WFH system end-to-end.

CHECK 1 — Data Sync:
- syncLeaveAndWfh() in clickupSync.js — how does it fetch leave data?
- Is it using the correct ClickUp list IDs from settings?
- performLeaveSync() stores in db.leaves — is the schema correct?
- shouldSyncLeaves() checks once per day — can this miss updates?

CHECK 2 — Leave Display:
- LeavesTab.jsx and sub-components (LeaveCalendar, TeamOverviewPanel, etc.)
- Do they read from db.leaves correctly?
- Is the calendar showing correct dates?
- Are leave quotas from settings.team.leaveQuotas applied?

CHECK 3 — Leave Impact on Metrics:
- countLeaveDaysInRange() in calculations.js
- Is it called during score calculation?
- Does it correctly deduct leave days from working days target?
- If member has 2 leave days in a 5-day range, target = 3 × 6.5h?

CHECK 4 — WFH:
- Is WFH displayed separately from leave?
- Does WFH affect working days count? (it shouldn't — WFH is still a work day)

OUTPUT: Same ✅/🐛 format.
Update PROGRESS.md. Commit: "audit: leave system — [X bugs found]"
```

### Task 1.6 — Compile Bug Report

```
Read CLAUDE.md. Read PROGRESS.md.

Compile ALL bugs found in Tasks 1.1–1.5 into the Bug Registry table in PROGRESS.md.

For each bug, assign:
- Bug ID: BUG-001, BUG-002, etc.
- Severity: CRITICAL (data wrong), HIGH (feature broken), MEDIUM (edge case), LOW (cosmetic)
- Fix Task number: 3.1, 3.2, etc. (order by severity — CRITICAL first)

Also update the Phase 3 section in PROGRESS.md with one task entry per bug:
- [ ] 3.1 Fix BUG-001: [short description]
- [ ] 3.2 Fix BUG-002: [short description]
etc.

If NO bugs were found, note that in PROGRESS.md and skip to Phase 4.

Commit: "audit: compiled bug report — [X total bugs]"
```

---

## Phase 2 — Safety Net Tests

> **Goal:** Write tests for core functions BEFORE any fixes. These protect against regressions. Each task creates tests for one module.

### Task 2.1 — Tests: calculations.js

```
Read CLAUDE.md. Read PROGRESS.md.

Create src/services/sync/__tests__/calculations.test.js

Test these functions with Vitest:

1. deriveStatus()
   - Returns 'working' when runningEntry has negative duration
   - Returns 'noActivity' when timeEntries is empty or null
   - Returns 'noActivity' when all entries have duration=0
   - Returns 'break' when last activity is within breakThreshold
   - Returns 'offline' when last activity exceeds breakThreshold
   - Respects custom thresholds from settings

2. calculateTrackedHours()
   - Sums completed entries correctly (duration as STRING from API)
   - Adds running timer elapsed time
   - Handles empty/null array → returns 0
   - Does not count negative-duration entries

3. calculateTasksAndDone()
   - Counts unique tasks by task.id (deduplicates)
   - Identifies 'ready' tasks (closed/complete/done status)
   - Excludes stopped/hold/help from completionDenominator
   - Returns { tasks, done, completionDenominator }
   - Handles empty array

4. calculateWorkingDays()
   - Same start and end date (work day) → returns 1
   - Same start and end date (weekend) → returns 1 (minimum)
   - Respects custom workDays [0,1,2,3,4] (Sun-Thu)
   - Excludes publicHolidays
   - Multi-week range returns correct count

5. calculateBreaks()
   - Gaps > breakGapMinutes count as breaks
   - Gaps > 180 minutes are NOT breaks
   - Less than 2 entries → { total: 0, count: 0 }

Do NOT modify any source code. Only create test files.
Run: npm test -- --run
Report results.

Update PROGRESS.md. Commit: "test: calculations.js — [X tests, Y passing]"
```

### Task 2.2 — Tests: scoreCalculation.js

```
Read CLAUDE.md. Read PROGRESS.md.

Look at src/utils/scoreCalculation.js and existing tests in
src/utils/__tests__/scoreCalculation.test.js.

ADD tests to the existing file (or create new file if better organized):

1. calculateMemberScore()
   - Default weights (40/20/30/10) produce correct score
   - Custom weights work correctly
   - Score never exceeds 100 even with overtime
   - Zero tracked hours → score 0 for time component
   - workingDays > 1 scales target correctly
   - completionDenominator = 0 → completion score = 0 (not NaN/Infinity)

2. Edge cases:
   - All zeros → total = 0
   - All maxed → total = 100
   - Weights that don't sum to 1.0 — what happens?

Do NOT modify source code. Run: npm test -- --run
Update PROGRESS.md. Commit: "test: scoreCalculation.js — [X tests]"
```

### Task 2.3 — Tests: settingsValidation + timeFormat

```
Read CLAUDE.md. Read PROGRESS.md.

Check existing tests:
- src/utils/__tests__/settingsValidation.test.js
- src/utils/__tests__/timeFormat.test.js

ADD any missing coverage:

settingsValidation:
1. sanitizeSettings() with empty object → returns DEFAULT_SETTINGS
2. Deep-merge partial settings (only team.membersToMonitor changed)
3. Invalid values reset to defaults
4. Nested null values handled

timeFormat:
1. formatHoursToHM(0) → "0h 0m" or "0m"
2. formatHoursToHM(0.5) → "0h 30m"
3. formatHoursToHM(24.5) → "24h 30m"
4. formatMinutesToHM(0) → "0m"
5. formatMinutesToHM(-5) → handles gracefully

Run: npm test -- --run
Update PROGRESS.md. Commit: "test: settings + timeFormat — [X tests]"
```

### Task 2.4 — Tests: useAppStore

```
Read CLAUDE.md. Read PROGRESS.md.

Create src/stores/__tests__/useAppStore.test.js

Test these store actions (use Vitest, test Zustand store directly without React):

1. setDateRange()
   - Normalizes Date objects to ISO strings
   - Normalizes ISO datetime strings to date-only
   - Handles null values (today preset)

2. updateStats()
   - Calculates correct teamStats when members have data
   - Handles empty members array (sets null)
   - Score weights from store override defaults
   - workingDays scales targets correctly
   - Total score never exceeds 100
   - Members get recalculated scores

3. batchSyncUpdate()
   - Sets all fields in one call
   - Recalculates member scores
   - Sets lastSync and clears syncError

Run: npm test -- --run
Update PROGRESS.md. Commit: "test: useAppStore — [X tests]"
```

### Task 2.5 — Tests: leaveHelpers

```
Read CLAUDE.md. Read PROGRESS.md.

Check existing tests in src/utils/__tests__/leaveHelpers.test.js.

ADD any missing coverage:

1. enrichMembersWithLeaveStatus()
   - Member on leave today → status = 'leave'
   - Member NOT on leave → status unchanged
   - WFH member → status unchanged (WFH ≠ leave)
   - Leave overrides working/break/offline status

2. countLeaveDaysInRange()
   - Counts only approved/confirmed leaves
   - Deduplicates overlapping leave records
   - Respects workDays and publicHolidays
   - Returns 0 for empty leaves array

Run: npm test -- --run
Update PROGRESS.md. Commit: "test: leaveHelpers — [X tests]"
```

---

## Phase 3 — Bug Fixes (One Per Task)

> **Task numbers populated from Phase 1.6 Bug Registry.**
> Each fix follows this exact template:

### Fix Task Template (for each BUG-XXX)

```
Read CLAUDE.md (especially Fix Plan Rules). Read PROGRESS.md.

BUG: [BUG-XXX from Bug Registry]
File: [exact file:line]
Problem: [what's wrong]
Expected: [what should happen]

STEP 1: Write a failing test that demonstrates this bug.
Put it in the appropriate test file.
Run the test to confirm it FAILS.

STEP 2: Apply the MINIMAL fix needed.
Only change the file(s) directly related to this bug.
Do NOT refactor surrounding code.
Do NOT change any other behavior.

STEP 3: Run the failing test again to confirm it PASSES.

STEP 4: Run the FULL test suite: npm test -- --run
Check for regressions.

STEP 5: If all tests pass, commit:
"fix: [component] - [BUG-XXX] [concise description]"

If any test fails, STOP and report the failure.
Update PROGRESS.md: mark this bug as ✅ or ❌.
```

---

## Phase 4 — Screen Verification

> **Goal:** Verify every screen displays correct data for the current date range. These are code review tasks — Sonnet reads the code and reports issues.

### Task 4.1 — Verify Grid View

```
Read CLAUDE.md. Read PROGRESS.md.

Verify the Grid View (main dashboard) data flow:

1. App.jsx: trace displayTeamStats and displayScoreMetrics computation
   - Source: store.teamStats and store.scoreMetrics
   - Filtered by: settings.team.membersToMonitor via useMemo
   - Check: are they recomputed when filteredMembers changes?

2. For EACH card component, verify:
   - OverviewCard: receives tracked/target from teamStats
   - ScoreBreakdownCard: receives metrics from scoreMetrics
   - TeamStatusOverview: counts from filteredMembers (not all members)
   - ProjectBreakdownCard: reads store.projectBreakdown
   - TeamStatusCard: shows filteredMembers sorted correctly
   - RankingTable: sorted by score descending

3. For EACH component, check:
   - Handles dateRange "today" case
   - Handles dateRange with multiple days
   - Handles loading state (teamStats = null)
   - Uses formatHoursToHM (not raw numbers)
   - Uses getMetricColor correctly

Report any issues found with file:line references.
Update PROGRESS.md. Commit: "verify: grid view — [issues found or 'all clear']"
```

### Task 4.2 — Verify List View

```
Read CLAUDE.md. Read PROGRESS.md.

Verify src/components/views/ListView.jsx:

1. Does it receive the SAME data as Grid View? (same props from App.jsx)
2. Does the sort logic match Grid View? (activity sort order)
3. Do member rows show SAME values as member cards?
4. Does clicking a row open MemberDetailModal with correct data?
5. Does FilterSortControls behave identically in both views?
6. Are all numbers formatted with formatHoursToHM?

Report discrepancies only.
Update PROGRESS.md. Commit: "verify: list view — [result]"
```

### Task 4.3 — Verify MemberDetailModal

```
Read CLAUDE.md. Read PROGRESS.md.

Verify src/components/modals/MemberDetailModal.jsx (large file — focus on data, not UI):

1. How does it get member data? From store or from props?
2. Does it use the current dateRange from store?
3. Timeline tab: shows time entries for selected date range?
4. Performance tab: shows 7/30/90 day metrics — where does this data come from?
5. Do ALL metrics match what's shown on the member card?
6. Does it handle member being on leave correctly?

Report discrepancies only.
Update PROGRESS.md. Commit: "verify: member detail modal — [result]"
```

### Task 4.4 — Verify Settings → Store → Display Pipeline

```
Read CLAUDE.md. Read PROGRESS.md.

Verify the FULL settings pipeline for each category:

WEIGHTS:
- Change score weights in SettingsModal → saved to localStorage?
- useClickUpSync detects change → calls setScoreWeights?
- Store recalculates scores → all cards updated?
- Test: change Time weight from 40% to 60% — does total score change everywhere?

MEMBERS FILTER:
- Change membersToMonitor → localStorage updated?
- App.jsx useMemo recalculates filteredMembers?
- Next sync uses new filter?

SCHEDULE:
- Change workDays → working days recalculated?
- Change publicHolidays → targets updated?

THRESHOLDS:
- Change breakMinutes → member status changes on next sync?
- Change offlineMinutes → same?

SYNC:
- Change intervalMs → polling interval actually changes?
- Or does it require a page reload?

Report any broken links in each pipeline.
Update PROGRESS.md. Commit: "verify: settings pipeline — [result]"
```

### Task 4.5 — Verify Leaves System

```
Read CLAUDE.md. Read PROGRESS.md.

Verify the leave system end-to-end:

1. LeavesTab.jsx → reads from db.leaves via Dexie
2. LeaveCalendar shows correct days marked
3. TeamOverviewPanel shows member quotas from settings
4. MemberLeaveDetail shows individual leave records
5. WFH displayed separately from leave
6. Leave data synced from ClickUp via syncLeaveAndWfh
7. Leave impacts score calculation (deducts from working days)

Report discrepancies only.
Update PROGRESS.md. Commit: "verify: leaves system — [result]"
```

---

## Phase 5 — E2E Tests

### Task 5.1 — Core E2E Tests

```
Read CLAUDE.md. Read PROGRESS.md.
Check playwright.config.js for existing setup.
Check existing tests in tests/ directory.

Create tests/e2e/core-flow.spec.js with MINIMAL E2E tests:

Setup:
- Intercept ClickUp API calls → return mock data
- Pre-populate IndexedDB with 8 test members
- Set localStorage with default settings

Tests:
1. Dashboard loads → shows 8 member cards
2. Grid/List toggle → both show same member count
3. Date picker → selecting date triggers visual update
4. Click member card → modal opens with correct name
5. Settings modal → open, change theme, verify change persists
6. Score weight change → reflected in dashboard score

Keep tests minimal. Focus on data flow, not pixel-perfect UI.

Run: npx playwright test tests/e2e/core-flow.spec.js
Report results.

Update PROGRESS.md. Commit: "test: core E2E tests — [X tests]"
```

---

## Phase 6 — Final Sweep

### Task 6.1 — Final Verification

```
Read CLAUDE.md. Read PROGRESS.md.

Final sweep checklist:

1. Run ALL unit tests: npm test -- --run
   Report: X passed, Y failed

2. Run build: npm run build
   Report: any warnings or errors

3. Check for console.error/console.warn in production-relevant code
   (Not test files, not dev-only code)

4. Verify all imports are used in key files:
   - App.jsx
   - useClickUpSync.js
   - useAppStore.js
   - calculations.js

5. Check for leftover temp files (.tmp, .bak, .orig)

6. Verify .env.example has all needed variables

7. Update PROGRESS.md with final summary:
   - Total bugs found
   - Total bugs fixed
   - Total tests added
   - Remaining issues (if any)

Commit: "chore: final sweep complete"
```

---

## Quick Reference — Key Files

| File | Size | Role |
|------|------|------|
| `CLAUDE.md` | 15KB | Project guide (read FIRST always) |
| `src/App.jsx` | 20KB | Main app, data flow hub |
| `src/stores/useAppStore.js` | 19KB | Zustand store, score calculation |
| `src/hooks/useClickUpSync.js` | 36KB | Sync orchestration, polling |
| `src/hooks/useSettings.js` | 4KB | Settings hook (localStorage) |
| `src/services/sync/calculations.js` | 16KB | Pure calculation functions |
| `src/services/sync/orchestrator.js` | 41KB | Sync logic, API calls |
| `src/utils/scoreCalculation.js` | 10KB | Member score formula |
| `src/components/modals/MemberDetailModal.jsx` | 81KB | Member detail (3 tabs) |
| `src/components/modals/SettingsModal.jsx` | 67KB | Settings (7 tabs) |
| `src/components/views/ListView.jsx` | 62KB | Table view |
| `src/constants/defaults.js` | 4KB | Default settings structure |

## Quick Reference — Commands

```bash
npm run dev          # Dev server
npm test -- --run    # Run all Vitest tests once
npm run build        # Production build
npx playwright test  # Run E2E tests
```