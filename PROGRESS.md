# Lighthouse Fix Plan -- Progress Tracker

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Failed (see notes)
- [-] Skipped (see notes)

## Phase 0: Setup
- [x] 0.1 Create PROGRESS.md
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
| 1 | 2026-03-12 | 0.1 | Created progress tracker |
