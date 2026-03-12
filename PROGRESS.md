# Lighthouse Fix Plan -- Progress Tracker

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Failed (see notes)
- [-] Skipped (see notes)

## Phase 0: Setup
- [x] 0.1 Create PROGRESS.md
- [x] 0.2 Update CLAUDE.md with fix rules
- [x] 0.3 Clean up temp files (deleted MainTabs.jsx.tmp; reported 2 unused imports in useClickUpSync.js)

## Phase 1: Diagnosis
- [x] 1.1 Audit date flow — 3 bugs found (see Bug Registry)
- [x] 1.2 Audit settings flow — 3 bugs found (see Bug Registry)
- [x] 1.3 Audit screen data consistency — 6 active bugs found (see Bug Registry)
- [x] 1.4 Audit member status logic — 4 bugs found (see Bug Registry)
- [x] 1.5 Audit leave system — 1 new bug found (BUG-017); BUG-016 confirmed
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
(Populated after Phase 1 audits complete)

| Bug ID | File:Line | Description | Severity | Fix Task | Status |
|--------|-----------|-------------|----------|----------|--------|
| BUG-001 | useClickUpSync.js:278 | `yesterday.toISOString().split('T')[0]` uses UTC date — wrong day for Egypt at midnight | LOW | TBD | Open |
| BUG-002 | useClickUpSync.js:608,627 | `new Date().toISOString().split('T')[0]` for snapshot date uses UTC — off-by-one at midnight | LOW | TBD | Open |
| BUG-003 | orchestrator.js:695-700 | `dateRangeInfo.startDate` and `endDate` stored as Date objects (not ISO strings) into Zustand store — type inconsistency with `dateRange.startDate` which is always string | MEDIUM | TBD | Open |
| BUG-004 | App.jsx:213-216 | `displayScoreMetrics` computed with hardcoded weights (40/20/30/10) — does NOT read from `store.scoreWeights` — so SettingsModal weight changes never reflect in team score display | HIGH | TBD | Open |
| BUG-005 | App.jsx:208 | `taskBaseline` for workload ratio missing `workingDays` multiplier — `filteredMembers.length * teamBaseline` (no `* workingDays`) — workload ratio inflated for multi-day ranges vs the store's `updateStats` which correctly uses `* workingDays` | MEDIUM | TBD | Open |
| BUG-006 | useClickUpSync.js:694-700 | Polling interval ignores settings changes — `interval` dependency in useEffect (line 694) does re-fire when `settings.sync.intervalMs` changes, BUT the `setInterval` is set on line 675 with `effectiveInterval` computed at setup time. If user changes interval from 30s→60s, the effect re-runs, clears the old interval, and re-creates with new interval. CORRECT — not a bug. |  |  | CLOSED |
| BUG-007 | ListView.jsx:212 | `RankingTable` inside List View is called without `dateRangeInfo` prop — falls back to `workingDays=1` always — compliance % wrong for multi-day ranges. Grid View correctly passes `dateRangeInfo`. | HIGH | TBD | Open |
| BUG-008 | MemberDetailModal.jsx:694-729 | Timeline tab fetches only a single day (`selectedDate`) while the card shows N-day aggregate — card and modal never match for any range other than "today" | HIGH | TBD | Open |
| BUG-009 | MemberDetailModal.jsx:738 | Performance tab always uses hardcoded "this week" (`getThisWeekRange()`), ignores `globalDateRange` entirely | HIGH | TBD | Open |
| BUG-010 | MemberDetailModal.jsx:1045 | Header label hardcoded "Today's Progress" regardless of selected date range | MEDIUM | TBD | Open |
| BUG-011 | ListView.jsx:196 | "Team Tracked" label in List View is static; Grid View dynamically appends "(N days)" when workingDays > 1 | MEDIUM | TBD | Open |
| BUG-012 | ProjectBreakdownCard.jsx:405 | "Today:" label hardcoded — wrong for non-today date ranges | LOW | TBD | Open |
| BUG-013 | calculations.js:26 | `offlineThreshold` declared but never used — after `breakThreshold` check, function returns 'offline' unconditionally, ignoring the user-configured offline minutes | HIGH | TBD | Open |
| BUG-014 | calculations.js:29 | `runningEntry.duration === 0` not caught by `< 0` — zero-duration running timer misclassifies member as noActivity/offline | MEDIUM | TBD | Open |
| BUG-015 | calculations.js:40-42 | All entries have `duration <= 0` (running timers in entries list) → `completedEntries` empty → returns 'noActivity' instead of checking for active timers | MEDIUM | TBD | Open |
| BUG-016 | leaveHelpers.js:30 | Pending leaves not filtered — `status === 'rejected'` is the only exclusion, so pending/unconfirmed leaves show member as 'leave' | MEDIUM | TBD | Open |
| BUG-017 | LeaveCalendar.jsx:99, TeamOverviewPanel.jsx:86 | `${theme.accent}20` (white at 20% opacity) invisible as filter pill background in True Black theme — selected filter state not visible | MEDIUM | TBD | Open |

## Task 1.1 — Date Flow Audit Findings

### PATH A — User selects date in DatePickerModal → setDateRange
- CORRECT: DatePickerModal calls `setDateRange(tempRange.startDate, tempRange.endDate, tempRange.preset)` with Date objects (line 178)
- CORRECT: `useAppStore.setDateRange()` normalizes Date objects to ISO strings using local date components (getFullYear/getMonth/getDate) — no UTC offset bug (lines 44-49)
- CORRECT: `useClickUpSync.js` separate `dateRange` useEffect detects changes via `JSON.stringify` comparison (line 708)
- CORRECT: AbortController aborts in-progress sync immediately on date change (line 723-725)
- CORRECT: 500ms debounce handles rapid preset switching (line 813)
- CORRECT: `syncMemberData()` receives `dateRange` with ISO string dates (line 772)
- CORRECT: In orchestrator, `new Date(dateRange.startDate)` + immediate `setHours(0,0,0,0)` corrects UTC parsing to local midnight (lines 353-354) — not a bug despite `new Date("YYYY-MM-DD")` parsing UTC
- BUG-003: orchestrator returns `dateRangeInfo.startDate` and `dateRangeInfo.endDate` as Date objects (lines 695-700), stored in Zustand store, creating type inconsistency with `store.dateRange.startDate` (always string). Not consumed elsewhere (only `workingDays` is used from `dateRangeInfo`) — LOW practical impact but violates type contract.

### PATH B — "Today" mode (null/null)
- CORRECT: `dateRange.preset === 'today'` with `startDate: null, endDate: null` is the default state
- CORRECT: Orchestrator correctly detects today mode: `(!dateRange.startDate && dateRange.preset === 'today')` (line 344)
- CORRECT: Today's date computed with `new Date()` + `setHours(0,0,0,0)` = local midnight (correct for Egypt UTC+2)
- CORRECT: Running timers fetched only when `rangeIncludesToday` (which is always true for today mode)

### PATH C — Historical range
- CORRECT: `isRangeFullyPast()` uses local date string comparison: builds today as `${y}-${m}-${d}` and compares to `dr.endDate` (ISO string) — correct
- CORRECT: Poll sync returns early when range is fully past: `console.log('⏭️ Skipping poll')` + `return` (lines 512-515)
- CORRECT: When switching back to 'today', `previousDateRangeRef` detects change → triggers immediate debounced sync (line 713)

### Timezone Issues Found
- BUG-001: `useClickUpSync.js:278` — `yesterday.toISOString().split('T')[0]` uses UTC. For Egypt (UTC+2) at midnight local = 10pm previous day UTC → snapshot lookup uses wrong date key 0-2am local. Non-critical (only affects yesterday's score delta widget).
- BUG-002: `useClickUpSync.js:608` — `new Date().toISOString().split('T')[0]` for saving today's daily snapshot. At midnight-2am Egypt local, saves with UTC date = yesterday's key → snapshot might save to wrong date or overwrite. Also affects cutoff pruning at line 627.

### Type Consistency
- CORRECT: DatePickerModal always converts to Date objects internally, passes Date objects to `setDateRange`
- CORRECT: Store normalizes all Date objects to ISO strings on ingestion
- CORRECT: All store dateRange comparisons use ISO string comparison (correct)
- BUG-003: `dateRangeInfo` in store has `startDate`/`endDate` as Date objects (from orchestrator) — but only `workingDays` is consumed, so no downstream date-comparison bugs from this inconsistency

## Task 1.2 — Settings Pipeline Audit Findings

### PIPELINE A — Settings Load

- CORRECT: `useSettings.js` hook reads from `localStorage` (key `lighthouse_settings`) via `loadSettings()`, sanitizes with `sanitizeSettings()`, and stores in React state.
- CORRECT: `useClickUpSync.js` has its own `loadSettings()` function (lines 35-46) — identical implementation, same key, same sanitize call. These two are ALWAYS in sync because both read from the same `localStorage` key using the same code path.
- CORRECT: `useSettings` hook `useEffect` persists to `localStorage` on every state change — so sync's `loadSettings()` always sees the latest values on next call.
- POTENTIAL ISSUE: `loadSettings()` in sync is called inside closures (sync function, dateRange effect, useManualSync). Since it always reads fresh from `localStorage`, it cannot be stale. Not a bug — actually a correct pattern.

### PIPELINE B — Score Weights

- CORRECT: `useClickUpSync.js` (lines 260-270) — `useEffect` watches individual weight primitives (`trackedTime`, `tasksWorked`, `tasksDone`, `compliance`) and calls `setScoreWeights(settings.score.weights)` to update the store. Fires correctly when any weight changes.
- CORRECT: `store.scoreWeights` → `updateStats()` (line 218-228) uses stored weights, falls back to defaults if null. Recalculates member scores.
- CORRECT: `store.scoreWeights` → `batchSyncUpdate()` (lines 312-318) uses stored weights. Same correct logic.
- BUG-004: `App.jsx:213-216` — `displayScoreMetrics` (the DISPLAYED team score) uses hardcoded weights `* 40`, `* 20`, `* 30`, `* 10`. Does NOT read from `store.scoreWeights`. If user changes weights in SettingsModal (e.g., Time from 40%→60%), `store.scoreMetrics` updates correctly (via `updateStats`), but `displayScoreMetrics` still shows the score calculated with hardcoded 40/20/30/10. **The wrong value is displayed in the OverviewCard and ScoreBreakdownCard.**

### PIPELINE C — Member Filter

- CORRECT: `settings.team.membersToMonitor` → saved to `localStorage` via `useSettings` hook immediately on change.
- CORRECT: `App.jsx:79-82` — `filteredMembers` `useMemo` reads `settings?.team?.membersToMonitor` from the `useSettings` hook. Rerenders when settings change. UI immediately hides/shows members.
- CORRECT: `useClickUpSync.js` sync function (line 518-524) calls `loadSettings()` to get `membersToMonitor`, then filters `allMembers`. Next sync cycle uses the new filter.
- POTENTIAL ISSUE: There is a 1-sync-cycle delay between "user changes filter in SettingsModal" and "sync fetches data only for new filtered members". During that gap, the UI already shows the correct subset (via `filteredMembers`), but the pending sync may still fetch data for old members. This is acceptable behavior — not a bug.

### PIPELINE D — Thresholds

- CORRECT: `deriveStatus()` in `calculations.js` (line 23) — signature is `deriveStatus(runningEntry, timeEntries, settings = null)`. Defaults to `breakMinutes: 15`, `offlineMinutes: 60` if settings is null.
- CORRECT: `calculateBreaks()` (line 116) — signature is `calculateBreaks(timeEntries, settings = null)`. Uses `settings?.thresholds?.breakGapMinutes ?? 5` correctly.
- CORRECT: `syncSingleMember()` in orchestrator (line 149) receives `settings` param and passes it through to `transformMember()`.
- CORRECT: `syncMemberData()` passes settings all the way through — no null settings paths.
- NOT A BUG: First sync at app startup calls `loadSettings()` which returns `DEFAULT_SETTINGS` if localStorage is empty, so thresholds always have valid values.

### PIPELINE E — Schedule (calculateWorkingDays)

- CORRECT: `calculateWorkingDays(startDate, endDate, settings)` in `calculations.js` (line 378) uses `settings?.schedule?.workDays ?? [0,1,2,3,4]` and `settings?.schedule?.publicHolidays ?? []` — safe defaults.
- CORRECT: Called at orchestrator line 366 with `settings` from `loadSettings()` — always has the current schedule config.
- BUG-005: `App.jsx:208` — `taskBaseline = filteredMembers.length * (teamBaseline || 3)` missing `* workingDays` multiplier. In `store.updateStats()` (line 200), the same calculation correctly uses `filteredMembers.length * teamBaseline * workingDays`. For multi-day date ranges, `App.jsx` computes an inflated workload ratio (denominator too small → ratio too high). Example: 7-day range with `workingDays=5`, `teamBaseline=3`: store uses `8*3*5=120` tasks as baseline, App.jsx uses `8*3=24`. Workload ratio in App.jsx is 5× higher than the store's, causing displayed workload to wrongly show near 100% even if the team worked normally.

### PIPELINE F — Sync Interval

- CORRECT: `App.jsx:165` passes `settings.sync.intervalMs` as `interval` to `useClickUpSync`. This is in the hook's dependency array (line 694). When `intervalMs` changes, the effect re-runs: clears old interval, sets new interval. **Interval change takes effect immediately without page reload.**

## Task 1.3 — Screen Data Consistency Audit Findings

### CHECK 1 — Data Sources
- CORRECT: `displayTeamStats` and `displayScoreMetrics` in App.jsx computed from `filteredMembers` (correct — not all members)
- CORRECT: List View receives same `displayTeamStats`/`displayScoreMetrics` props as Grid View (App.jsx lines 458-460)
- CORRECT: `store.teamStats`/`store.scoreMetrics` (from `updateStats`) are computed but never passed to components — `displayTeamStats/displayScoreMetrics` recomputed from `filteredMembers` in App.jsx useMemo are what components actually use
- BUG-011: ListView.jsx:196 — "Team Tracked" label static in List View; Grid View dynamically shows "(N days)" when workingDays > 1

### CHECK 2 — MemberCard vs MemberRow
- CORRECT: `RankingTable.jsx` (active) uses `member.score` (pre-calculated), `formatHoursToHM`, `getMetricColor` — consistent with Grid View cards
- CORRECT: List View desktop table (ListView.jsx) uses `member.score`, `formatHoursToHM`, `getMetricColor` — consistent
- NOTE: `MemberRow.jsx` is dead code (never imported anywhere) — ignored

### CHECK 3 — MemberDetailModal vs Card
- CORRECT: Modal header shows same `member.tracked`, `member.score` as card (snapshot at click time)
- BUG-010: MemberDetailModal.jsx:1045 — Header label hardcoded "Today's Progress" regardless of date range
- BUG-008: MemberDetailModal.jsx:694-729 — Timeline tab shows only 1 day (`selectedDate`) while card shows N-day aggregate; data mismatch for any range > 1 day
- BUG-009: MemberDetailModal.jsx:738 — Performance tab uses hardcoded `getThisWeekRange()`, ignores `globalDateRange`

### CHECK 4 — DashboardDetailModal
- CORRECT: Receives `filteredMembers`, `displayScoreMetrics`, `dateRangeInfo` from App.jsx — consistent with overview cards
- CORRECT: All three views (time, tasks, score) use `dateRangeInfo.workingDays` for target calculations
- NOTE: Both modal and App.jsx use hardcoded `6.5` target instead of `settings.schedule.dailyTargetHours` — numbers match between card and modal so not a consistency bug (same shared issue)

### CHECK 5 — Date Range Display
- CORRECT: Header.jsx reads `store.dateRange` and correctly parses ISO strings as local midnight
- BUG-007: ListView.jsx:212 — `RankingTable` in List View called without `dateRangeInfo` prop → falls back to `workingDays=1` → compliance % always wrong for multi-day ranges. Grid View's RankingTable at App.jsx:447 correctly passes `dateRangeInfo`.
- BUG-012: ProjectBreakdownCard.jsx:405 — "Today:" label hardcoded for tracked-time stat — wrong for non-today ranges
- CORRECT: `TeamStatusOverview` receives `filteredMembers` in both Grid View (App.jsx:425) and List View (ListView.jsx:216)

## Task 1.4 — Member Status Logic Audit Findings

### CHECK 1 — deriveStatus() in calculations.js
- CORRECT: `runningEntry.duration < 0` correctly identifies active ClickUp timer
- CORRECT: Empty `timeEntries` → 'noActivity' is correct
- CORRECT: Break threshold check using `minutesSinceActivity < breakThreshold` is correct
- BUG-013: `calculations.js:26` — `offlineThreshold` declared but never used. After `breakThreshold` check, function falls through to unconditional `return 'offline'`. The user-configured `offlineMinutes` setting has no effect. A member 16 minutes inactive (past `breakThreshold=15`) immediately becomes 'offline' even with `offlineMinutes=60`. Expected: check `minutesSinceActivity >= offlineThreshold` before returning 'offline'.
- BUG-014: `calculations.js:29` — `duration === 0` not caught by `< 0`. Zero-duration running timer (possible edge case from API) misclassifies member as noActivity/offline instead of 'working'. Expected: use `duration <= 0`.
- BUG-015: `calculations.js:40-42` — If all timeEntries have `duration <= 0` (all are running/negative), `completedEntries` is empty and returns 'noActivity'. But a running timer in entries = active work. Expected: return 'working' when entries are all negative-duration (or when runningEntry is present even with zero duration).
- NOTE: `-0 < 0` is `false` in JS but this edge case is too theoretical to log as a bug — ClickUp API would not return -0.

### CHECK 2 — Leave Override
- CORRECT: WFH preserves member.status (only non-WFH leave forces status = 'leave')
- CORRECT: `getMemberLeaveToday()` uses local date components (no UTC shift bug)
- CORRECT: Non-WFH leave correctly overrides 'working' status (by design — leave takes priority)
- BUG-016: `leaveHelpers.js:30` — Only `status === 'rejected'` leaves are excluded. Pending/submitted leaves (not yet approved) also show member as 'leave'. Expected: only `['approved', 'confirmed', 'active']` statuses should trigger the leave override.
- NOTE: Leave always uses today's real date — this is intentional. Status cards show live state only. For historical ranges, status is decorative (not meaningful anyway).

### CHECK 3 — Status → Card Routing
- CORRECT: `onLeave || status === 'leave'` check before switch — leave card always shown for leave members
- CORRECT: WFH members fall through to their actual status card
- CORRECT: Five cases + default covers all values
- NOTE: Unknown status silently falls back to OfflineCard — acceptable since it never happens with current data model

### CHECK 4 — TeamStatusOverview Counts
- CORRECT: Receives `filteredMembers` — counts match displayed cards
- CORRECT: `status === 'leave'` check matches `enrichMembersWithLeaveStatus` output
- CORRECT: WFH members counted under their actual status, not 'leave'

### CHECK 5 — transform.js / Status for Multi-day Ranges
- CORRECT: For historical ranges, running timers are not fetched (`rangeIncludesToday = false`) — so `runningEntry = null` for all members. This is correct: no one can have a running timer from last week.
- CORRECT: For historical ranges, `timeEntries` contains the range entries. `deriveStatus` will return 'offline' for members who worked in the range (has completed entries from last week, `minutesSinceActivity` is large). This is expected behavior — status cards show live state; for historical views, 'offline' is the correct "was active but isn't now" state.
- NOTE: The `todayTimeEntries` variable name in orchestrator is misleading (it's range entries, not just today's) — this is a naming issue only, not a functional bug.

## Task 1.5 — Leave System Audit Findings

### CHECK 1 — Data Sync
- CORRECT: syncLeaveAndWfh() fetches from configurable leaveListId/wfhListId in settings
- CORRECT: performLeaveSync() stores in db.leaves with correct schema
- CORRECT: shouldSyncLeaves() uses toDateString() (local date, no UTC bug) — syncs once per calendar day
- CORRECT: All dates stored as ISO YYYY-MM-DD strings via toLocalDateStr(); status/type values normalized consistently

### CHECK 2 — Leave Display
- CORRECT: LeavesTab reads from db.leaves via useLiveQuery — reactive, auto-updates
- CORRECT: LeaveCalendar uses new Date(dateStr + 'T00:00:00') — no UTC shift bugs
- CORRECT: TeamOverviewPanel reads leaveQuotas from settings with correct fallbacks
- CORRECT: WFH displayed separately from leave
- BUG-017: LeaveCalendar.jsx:99 & TeamOverviewPanel.jsx:86 — filter pill uses ${theme.accent}20 (white 20% opacity) — invisible on True Black theme

### CHECK 3 — Leave Impact on Metrics
- CORRECT: countLeaveDaysInRange() filters to approved/confirmed/active only (line 428) — pending excluded
- CORRECT: Called per-member in orchestrator.js:227-241 — deducts from workingDays for each member
- CORRECT: Target = memberWorkingDays × 6.5h — correct for N-day ranges with leave deductions
- CORRECT: No off-by-one errors — both boundary dates counted, minimum 1 day enforced

### CHECK 4 — WFH Handling
- CORRECT: WFH type correctly distinguished; WFH members keep original status (not 'leave')
- CORRECT: WFH does NOT reduce working days target (only leave reduces it)
- CORRECT: WFH counted separately in its own monthly quota

### CHECK 5 — leaveHelpers.js
- BUG-016 (CONFIRMED): getMemberLeaveToday():30 — only rejects 'rejected' status; pending leaves still show as 'leave'
- CORRECT: All other date parsing in leaveHelpers uses local date components — no timezone bugs
- CORRECT: getMemberLeaveBalance(), calculateLeaveDays(), enrichMembersWithLeaveStatus() all correct

## Session Log
| Session | Date | Tasks Completed | Notes |
|---------|------|-----------------|-------|
| 1 | 2026-03-12 | 0.1, 0.2, 0.3 | Phase 0 complete. Unused imports: useCallback, isSyncInProgress in useClickUpSync.js |
| 2 | 2026-03-12 | 1.1 | Date flow audit: 3 bugs found (2 LOW timezone, 1 MEDIUM type inconsistency) |
| 3 | 2026-03-12 | 1.2 | Settings pipeline audit: 2 bugs found (BUG-004 HIGH, BUG-005 MEDIUM) |
| 4 | 2026-03-12 | 1.3 | Screen data consistency audit: 6 active bugs (3 HIGH, 2 MEDIUM, 1 LOW). Dead code bugs in MemberRow.jsx skipped. |
| 5 | 2026-03-12 | 1.4 | Member status audit: 4 bugs (1 HIGH offlineThreshold unused, 3 MEDIUM edge cases) |
| 6 | 2026-03-12 | 1.5 | Leave system audit: 1 new bug (BUG-017 MEDIUM filter pill); BUG-016 confirmed. Data sync, metrics, WFH all correct. |
