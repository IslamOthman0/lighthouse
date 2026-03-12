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
(Populated after Phase 1 audits complete)

| Bug ID | File:Line | Description | Severity | Fix Task | Status |
|--------|-----------|-------------|----------|----------|--------|
| BUG-001 | useClickUpSync.js:278 | `yesterday.toISOString().split('T')[0]` uses UTC date — wrong day for Egypt at midnight | LOW | TBD | Open |
| BUG-002 | useClickUpSync.js:608,627 | `new Date().toISOString().split('T')[0]` for snapshot date uses UTC — off-by-one at midnight | LOW | TBD | Open |
| BUG-003 | orchestrator.js:695-700 | `dateRangeInfo.startDate` and `endDate` stored as Date objects (not ISO strings) into Zustand store — type inconsistency with `dateRange.startDate` which is always string | MEDIUM | TBD | Open |

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

## Session Log
| Session | Date | Tasks Completed | Notes |
|---------|------|-----------------|-------|
| 1 | 2026-03-12 | 0.1, 0.2, 0.3 | Phase 0 complete. Unused imports: useCallback, isSyncInProgress in useClickUpSync.js |
| 2 | 2026-03-12 | 1.1 | Date flow audit: 3 bugs found (2 LOW timezone, 1 MEDIUM type inconsistency) |
