# QA Test Suite - Session Resume Document

**Created:** 2026-02-26
**Purpose:** Pick up this QA implementation in a new Claude Code session if interrupted.
**Plan file:** `C:\Users\Islam\.claude\plans\humble-brewing-rossum.md`

---

## What This Is

A comprehensive one-time QA verification suite for the Lighthouse dashboard app before launch. Tests use **real ClickUp API** (live data). Structure: feature-grouped Playwright spec files + a truth-checker Node.js script.

## Files Status — ALL COMPLETE ✅

| File | Status |
|------|--------|
| `tests/qa-overview-modals.spec.js` | ✅ Done — reviewed + fixed (spec + quality) |
| `tests/qa-member-modals.spec.js` | ✅ Done — reviewed + fixed (spec + quality) |
| `tests/qa-task-list-modal.spec.js` | ✅ Done |
| `tests/qa-settings-modal.spec.js` | ✅ Done |
| `tests/qa-date-picker.spec.js` | ✅ Done |
| `tests/qa-mobile.spec.js` | ✅ Done |
| `tests/scripts/truth-checker.js` | ✅ Done |
| `tests/results/.gitkeep` | ✅ Done |

**Implementation complete — all tests passing (0 failed, 3 flaky/retry, 144 pass). ✅**

## Bugs Fixed During QA (2026-02-27)

| File | Bug | Fix |
|------|-----|-----|
| `src/stores/useAppStore.js` | `Date.toISOString()` used UTC, causing timezone off-by-one (e.g. midnight UTC+2 → previous day) | Use `getFullYear/getMonth/getDate` for local YYYY-MM-DD conversion |
| `src/components/cards/member-states/CardShell.jsx` | `target * workingDays` produced NaN when `target` undefined | Added `(target || 6.5)` fallback |
| `src/utils/timeFormat.js` | `formatHoursToHM(undefined)` produced "NaNh NaNm" | Guard with early return `'0m'` for null/undefined/NaN |
| `src/components/modals/MemberDetailModal.jsx` | `member.tracked` could be undefined | Added `|| 0` and `|| 6.5` fallbacks |
| `src/stores/useAppStore.js` | `memberScore` used as number but was an object | Fixed to `memberScore.total` |
| `src/components/layout/Header.jsx` | YYYY-MM-DD strings parsed as UTC midnight | Parse with `T00:00:00` suffix for local time |

---

## Key Context for New Session

### Project
- React 18 + Vite + Tailwind, Zustand state, Dexie IndexedDB
- ClickUp API integration (real team monitoring app)
- Playwright tests in `tests/` dir, config at `playwright.config.js`
- Dev server: `npm run dev` → `http://localhost:5173`
- Env vars: `VITE_CLICKUP_API_KEY`, `VITE_CLICKUP_TEAM_ID`, `VITE_USE_CLICKUP_API`

### Test IDs (confirmed in codebase)
- `[data-testid="overview-card-team-tracked"]` — Time overview card
- `[data-testid="overview-card-tasks-progress"]` — Tasks overview card
- `[data-testid="overview-card-team-score"]` — Score overview card
- `[data-testid="dashboard-detail-modal-time"]` — Time modal
- `[data-testid="dashboard-detail-modal-tasks"]` — Tasks modal
- `[data-testid="dashboard-detail-modal-score"]` — Score modal
- `[data-testid="member-card"]` — Member cards
- `[data-testid="member-detail-modal"]` — Member detail modal
- `[data-testid="tab-timeline"]` — Timeline tab
- `[data-testid="tab-performance"]` — Performance tab
- `[data-testid="tab-leaves"]` — Leaves tab
- `[data-testid^="status-pill-"]` — Project breakdown status pills
- `[data-testid="task-list-modal"]` — Task list modal

### Console Error Filter (add to every spec)
```js
// Known benign errors to ignore:
const BENIGN_ERRORS = [
  'ResizeObserver loop limit exceeded',
  'favicon.ico',
  'Failed to load resource: the server responded with a status of 404',
];
function isRealError(text) {
  return !BENIGN_ERRORS.some(b => text.includes(b));
}
```

### Date Picker Button
The calendar button in the header uses 📅 emoji text or a button with date-related title. Fallback:
```js
const calBtn = page.locator('button').filter({ hasText: '📅' }).first();
// or:
const calBtn = page.locator('[data-testid="date-picker-button"]');
```

### Truth Checker Env Vars
```js
// Read from process.env (truth-checker runs in Node, not Vite)
// Must load .env.local manually:
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const API_KEY = process.env.VITE_CLICKUP_API_KEY;
const TEAM_ID = process.env.VITE_CLICKUP_TEAM_ID;
```

### Member IDs (from CLAUDE.md)
```js
const MONITORED_MEMBERS = [
  { id: '87657591', name: 'Dina Ibrahim', initials: 'DI' },
  { id: '93604849', name: 'Alaa Soliman', initials: 'AS' },
  { id: '93604850', name: 'Nada Meshref', initials: 'NM' },
  { id: '93604848', name: 'Nada Amr', initials: 'NA' },
  { id: '87650455', name: 'Islam Othman', initials: 'IO' },
  { id: '87657592', name: 'Riham', initials: 'RI' },
  { id: '87657593', name: 'Samar Magdy', initials: 'SA' },
  { id: '87708246', name: 'Merit Fouad', initials: 'MF' },
];
```

### Score Formula
- Time 40% + Workload 20% + Completion 30% + Compliance 10%
- Daily target: 6.5 hours
- Compliance window: 08:00–18:00
- Completion = ready / (ready + inProgress), excludes stopped/hold/help

---

## How to Run When Done

```bash
# 1. Start dev server
npm run dev

# 2. Run all QA specs
npx playwright test tests/qa-*.spec.js --reporter=html

# 3. View report
npx playwright show-report

# 4. Run data accuracy checker
node tests/scripts/truth-checker.js
```

---

## Implementation Notes

- Each spec file has a `waitForDashboard()` helper that waits for the overview card testid + 3s sync time
- All specs collect console errors but only fail on unexpected ones (filter benign errors)
- Date picker tests use 60s timeout override (per-file `test.setTimeout(60000)`)
- Mobile tests use `test.use({ viewport: { width: 390, height: 844 } })`
- Truth checker outputs to `tests/results/truth-check-YYYY-MM-DD.txt`
- Truth checker exits code 0 (all match) or 1 (mismatches found)
- Tolerance: ±1 minute for time comparisons (rounding differences between API and dashboard)

---

## To Resume in New Session

Tell Claude:
> "Resume implementing the QA test suite for Lighthouse. The session resume doc is at `tests/QA_SESSION_RESUME.md` and the plan is at `C:\Users\Islam\.claude\plans\humble-brewing-rossum.md`. Check which files are already created in `tests/qa-*.spec.js` and `tests/scripts/truth-checker.js`, then continue with the remaining ones."
