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
(Populated after Phase 1 audits complete)

| Bug ID | File:Line | Description | Severity | Fix Task | Status |
|--------|-----------|-------------|----------|----------|--------|
| BUG-001 | useClickUpSync.js:278 | `yesterday.toISOString().split('T')[0]` uses UTC date — wrong day for Egypt at midnight | LOW | TBD | Open |
| BUG-002 | useClickUpSync.js:608,627 | `new Date().toISOString().split('T')[0]` for snapshot date uses UTC — off-by-one at midnight | LOW | TBD | Open |
| BUG-003 | orchestrator.js:695-700 | `dateRangeInfo.startDate` and `endDate` stored as Date objects (not ISO strings) into Zustand store — type inconsistency with `dateRange.startDate` which is always string | MEDIUM | TBD | Open |
| BUG-004 | App.jsx:213-216 | `displayScoreMetrics` computed with hardcoded weights (40/20/30/10) — does NOT read from `store.scoreWeights` — so SettingsModal weight changes never reflect in team score display | HIGH | TBD | Open |
| BUG-005 | App.jsx:208 | `taskBaseline` for workload ratio missing `workingDays` multiplier — `filteredMembers.length * teamBaseline` (no `* workingDays`) — workload ratio inflated for multi-day ranges vs the store's `updateStats` which correctly uses `* workingDays` | MEDIUM | TBD | Open |
| BUG-006 | useClickUpSync.js:694-700 | Polling interval ignores settings changes — `interval` dependency in useEffect (line 694) does re-fire when `settings.sync.intervalMs` changes, BUT the `setInterval` is set on line 675 with `effectiveInterval` computed at setup time. If user changes interval from 30s→60s, the effect re-runs, clears the old interval, and re-creates with new interval. CORRECT — not a bug. |  |  | CLOSED |

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

## Session Log
| Session | Date | Tasks Completed | Notes |
|---------|------|-----------------|-------|
| 1 | 2026-03-12 | 0.1, 0.2, 0.3 | Phase 0 complete. Unused imports: useCallback, isSyncInProgress in useClickUpSync.js |
| 2 | 2026-03-12 | 1.1 | Date flow audit: 3 bugs found (2 LOW timezone, 1 MEDIUM type inconsistency) |
| 3 | 2026-03-12 | 1.2 | Settings pipeline audit: 2 bugs found (BUG-004 HIGH, BUG-005 MEDIUM) |
