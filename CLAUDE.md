# Lighthouse Dashboard - Project Guide

**Version:** 2.0.0
**Last Updated:** 2026-02-08
**Status:** Production-Ready

---

## Context

Lighthouse is a team monitoring PWA for tracking a book digitization team (8 members) via the ClickUp API. Built for personal use (manager + coordinator), deployed on GitHub Pages from a private repo. Each member works on ONE book at a time with a fixed 6.5h daily target (no overtime).

**Business Rules:**
- Daily target: 6.5 hours (Sun-Thu, 8AM-6PM)
- ClickUp statuses: pre-backlog → backlog → in progress → ready (done) | stopped (rejected) | hold (deferred) | help (needs assistance)
- Score formula: Time 40% + Workload 20% + Completion 30% + Compliance 10%
- Compliance = hours tracked within 8AM-6PM work window
- Completion = ready / (ready + inProgress), excluding stopped/hold/help tasks
- When finishing a book, members pull next from backlog themselves

---

## Tech Stack

- **React 18.2.0** + **Vite 5.0.8** (JavaScript, NOT TypeScript)
- **Styling:** Tailwind CSS 3.3.6 (new components) + inline styles (legacy components)
- **State:** Zustand 4.4.7 (global) + Dexie.js 3.2.7 (IndexedDB persistence)
- **API:** ClickUp REST API (30s polling, optimized for rate limits - see API Optimization section)
- **PWA:** vite-plugin-pwa 0.17.4

### API Request Optimization
**Rate Limit**: 100 requests/minute (ClickUp API)
**Achieved**: ~26 requests/minute (74% under limit)

**Strategy:**
- **Member filtering**: Only sync 8 monitored members (configurable in Settings → Team)
- **Running timers**: Individual calls per monitored member (~8 calls)
- **Time entries**: 3 batched calls (90-day window, 30-day chunks due to ClickUp limitation)
- **Tasks**: Filtered `/team/{id}/task?assignees[]=...&dateUpdatedGt=...` endpoint (~2-5 calls for 90-day window)
- **Baseline**: 3 batched calls (3-month history, cached for 24h)
- **Historical data**: One-time load on first launch, throttled at 1 req/600ms, weekly refresh

**Per-Sync Breakdown** (single cycle):
```
├─ Running timers (8 members):           8 requests
├─ Time entries (3 × 30-day chunks):     3 requests
├─ Tasks (90-day, paginated):           ~2 requests
└─ Total per sync:                      ~13 requests

At 30s interval: 26 requests/minute (74% under limit ✅)
```

**ClickUp API Limitation**: Time entry endpoint max 30 days per request → fetched in 3 parallel chunks for 90-day window.

---

## Project Structure

```
Lighthouse/
├── .github/workflows/         # GitHub Actions (Pages deployment)
├── public/
│   ├── 404.html              # SPA routing fallback
│   └── fonts/                # Dune Rise custom font
├── src/
│   ├── components/
│   │   ├── cards/
│   │   │   ├── member-states/     # 5 state components (Working, Break, Offline, NoActivity, Leave)
│   │   │   ├── MemberCard.jsx     # Thin wrapper (routes to state components)
│   │   │   ├── OverviewCard.jsx
│   │   │   ├── ScoreBreakdownCard.jsx
│   │   │   ├── TeamStatusCard.jsx
│   │   │   ├── TeamStatusOverview.jsx
│   │   │   └── ProjectBreakdownCard.jsx
│   │   ├── layout/
│   │   │   ├── Header.jsx              # Tailwind: "LIGHTHOUSE" text, sync dot, date, settings
│   │   │   ├── Logo.jsx
│   │   │   ├── MainTabs.jsx            # Tailwind: Dashboard / Leaves tabs
│   │   │   ├── ViewTabs.jsx
│   │   │   ├── FilterSortControls.jsx
│   │   │   └── MobileBottomNav.jsx
│   │   ├── modals/
│   │   │   ├── MemberDetailModal.jsx   # 3 tabs: Timeline, Performance, Leaves
│   │   │   ├── DashboardDetailModal.jsx
│   │   │   ├── TaskListModal.jsx
│   │   │   ├── SettingsModal.jsx       # 7 tabs (1972 lines)
│   │   │   ├── ModalShell.jsx
│   │   │   └── DatePickerModal.jsx
│   │   ├── table/
│   │   │   ├── RankingTable.jsx
│   │   │   └── MemberRow.jsx
│   │   ├── ui/
│   │   │   ├── Avatar.jsx              # 12px rounded square
│   │   │   ├── LiveTimer.jsx           # HH:MM:SS format
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── ProgressRing.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   ├── Skeleton.jsx
│   │   │   └── Sparkline.jsx
│   │   └── views/
│   │       ├── ListView.jsx            # Tailwind: dense table
│   │       └── LeavesTab.jsx
│   ├── constants/
│   │   ├── themes.js                   # True Black + Noir Glass (accent: white, NOT green)
│   │   ├── defaults.js                 # Default settings structure
│   │   ├── statusColors.js
│   │   └── projectColors.js
│   ├── db/
│   │   └── index.js                    # Dexie schema v15 (consolidated)
│   ├── hooks/
│   │   ├── useTheme.js
│   │   ├── useWindowSize.js
│   │   ├── useClickUpSync.js           # Main polling hook (60s on mobile)
│   │   ├── useSettings.js
│   │   └── useOnlineStatus.js
│   ├── services/
│   │   ├── sync/                       # clickupSync.js split into 5 modules
│   │   │   ├── calculations.js
│   │   │   ├── transform.js
│   │   │   ├── projects.js
│   │   │   ├── orchestrator.js
│   │   │   └── index.js
│   │   ├── clickup.js                  # Low-level API client
│   │   ├── taskCache.js
│   │   ├── taskCacheV2.js              # IndexedDB-backed cache
│   │   ├── baselineService.js          # 3-month averages
│   │   └── syncQueue.js                # Offline support
│   ├── stores/
│   │   └── useAppStore.js              # Zustand store (347 lines)
│   ├── utils/
│   │   ├── logger.js                   # [Lighthouse] prefix wrapper
│   │   ├── timeFormat.js               # formatHoursToHM, formatMinutesToHM
│   │   ├── typography.js               # RTL detection, font helpers
│   │   ├── scoreCalculation.js         # 40/20/30/10 formula
│   │   ├── metricColor.js              # Dynamic color by percentage
│   │   ├── settingsValidation.js
│   │   └── clickupHelpers.js
│   ├── utils/__tests__/                # Vitest unit tests
│   │   ├── scoreCalculation.test.js
│   │   ├── timeFormat.test.js
│   │   └── metricColor.test.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css                       # Tailwind directives + CSS custom properties
├── .env.local                          # API keys (gitignored)
├── .env.example                        # Template (committed)
├── .gitignore
├── package.json
├── vite.config.js                      # base: '/REPO_NAME/' for GitHub Pages
├── tailwind.config.js                  # Full design tokens
├── postcss.config.js
└── CLAUDE.md                           # This file
```

---

## Key Design Decisions

### Tailwind + Inline Styles Coexistence
- **New/refactored components:** Tailwind classes + CSS custom properties
- **Legacy components:** Inline styles with `theme` prop (themes.js)
- **Bridge:** CSS custom properties in `:root` and `.theme-noir-glass`

### Accent Color: White (NOT Green)
- `theme.accent`: `#ffffff` (True Black) / `#111827` (Noir Glass)
- **Green stays ONLY for:** `working` status + "good" metric range (70-99%)
- All 142 `theme.accent` usages audited and fixed for white visibility

### Score Calculation (40/20/30/10)
```javascript
trackedScore = min(tracked / 6.5, 1) × 40
tasksWorkedScore = min(tasks / 3, 1) × 20       // baseline: 3 tasks/day
tasksDoneScore = (ready / (ready + inProgress)) × 30  // excludes stopped/hold/help
complianceScore = min(complianceHours / 6.5, 1) × 10
totalScore = sum (max 100, never >100 even with overtime)
```

### Member Card States (5)
1. **Working** — emerald border, pulsing dot, live timer, full task info. If `isOverworking`: timer in orange + "⚠ Over target"
2. **Break** — amber border, "On break · Xm", last task dimmed
3. **Offline** — gray border, 70% opacity, "Offline · last seen Xh ago"
4. **NoActivity** — compact (~50% height), dark gray border, 50% opacity, no metrics
5. **Leave** — purple border, compact, leave info badge

### Default Sort: Activity-Based
Working (by score desc) → Break (by duration asc) → Offline (by lastSeen asc) → NoActivity (alpha) → Leave (alpha)

### API Request Optimization (Rate Limit: 100 req/min)

**Strategy:** Filter to monitored members + batch requests + 90-day rolling window

**Per Sync Cycle (~30s interval):**
1. **Running timers:** Individual calls for monitored members only (~8 calls)
2. **Time entries:** 3 batched calls (90-day window, 30-day chunks): `GET /time_entries?assignee=id1,id2,...` (3 calls)
3. **Tasks:** Filtered `/team/{id}/task?assignees[]=...&dateUpdatedGt=...` with pagination (~5 pages = 5 calls)
4. **Total:** ~16 API calls per sync (84% under rate limit)

**At 30s polling:** 32 calls/min (68% under 100/min limit)

**Historical Data (First Launch Only):**
- One-time fetch of ALL historical tasks for monitored members
- Throttled at 1 req/600ms to respect rate limits (~100 req/min)
- ~80-100 pages for 8000 tasks = ~48-60 seconds load time
- Cached in IndexedDB with weekly refresh (7 days)
- Loading UI: "Loading historical data (page X/Y)..."

**Member Filtering:**
- Sync fetches data ONLY for `settings.team.membersToMonitor` members
- If filter empty, defaults to all team members (backwards compat)
- Reduces running timer calls from 22 → 8 (14 fewer requests)

**Time Window:**
- 90-day rolling window for time entries (3 × 30-day batched calls, ClickUp API limitation)
- 90-day `dateUpdatedGt` filter for task fetching
- Provides fresh data for Performance tab (7/30/90-day metrics)

**Cache Strategy:**
- Historical tasks cached in IndexedDB (taskCacheV2)
- Weekly refresh (7 days) to catch late updates
- Fresh 90-day tasks fetched every sync (replaces old incremental sync approach)

---

## Critical Patterns

### 1. Time Formatting
```javascript
import { formatHoursToHM, formatMinutesToHM } from '../utils/timeFormat';

formatHoursToHM(6.45)  // → "6h 27m"
formatMinutesToHM(387) // → "6h 27m"
```
**Never display raw `{value}h` or `{value}m`** — always use utilities.

### 2. RTL Support
```javascript
import { getAdaptiveFontFamily, getFontFamily, tabularNumberStyle } from '../utils/typography';

// Auto-detect Arabic vs English
fontFamily: getAdaptiveFontFamily(task.name)

// Static
fontFamily: getFontFamily('english')  // → 'Inter', sans-serif
fontFamily: getFontFamily('arabic')   // → 'Noto Sans Arabic', sans-serif

// Numbers (tabular alignment)
...tabularNumberStyle  // → 'JetBrains Mono', monospace
```

### 3. Dynamic Metric Colors
```javascript
import { getMetricColor, getMetricColorClass } from '../utils/metricColor';

// For inline styles (hex value)
color: getMetricColor(score)  // 0-29 red, 30-49 orange, 50-69 amber, 70-99 green, 100 white

// For Tailwind classes
<span className={getMetricColorClass(compliance, {isTime: true})}>
  {value}%
</span>
```
**Ranges:** critical (0-29), low (30-49), moderate (50-69), good (70-99), perfect (100), overwork (>100 with `isTime: true`)

### 4. Logger Usage
```javascript
import { logger } from '../utils/logger';

logger.info('Synced 8 members');    // [Lighthouse] Synced 8 members
logger.warn('Cache miss');           // [Lighthouse] Cache miss
logger.error('API failed', error);   // [Lighthouse] API failed ...
logger.debug('Dev info');            // Only in DEV mode
```

### 5. Modal Pattern
```javascript
const MyModal = ({ isOpen, onClose, theme }) => {
  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e) => e.key === 'Escape' && onClose();
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEsc);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-1 rounded-card max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Content */}
      </div>
    </div>
  );
};
```

---

## Settings System

**Hook:** `useSettings()` returns `{ settings, updateSettings, resetSettings, getSetting, setSetting }`

**Persistence:** localStorage key `lighthouse_settings`

**Structure:** See [defaults.js](src/constants/defaults.js)

**Key Settings:**
- `team.membersToMonitor` — filter which members to track
- `schedule.dailyTargetHours` — default 6.5
- `schedule.startTime` / `endTime` — compliance window (default 08:00 - 18:00)
- `thresholds.breakGapMinutes` — gap >Xmin counts as break (default 5)
- `thresholds.offlineMinutes` — inactive >Xmin = offline (default 60)
- `sync.intervalMs` — polling interval (default 30000, auto 60000 on mobile)
- `score.weights` — 40/20/30/10 customizable
- `display.theme` — 'trueBlack' or 'noirGlass'
- `display.defaultView` — 'grid' or 'list'

---

## Team Members (8)

| ID | Name | ClickUp ID | Initials |
|----|------|------------|----------|
| 1 | Dina Ibrahim | 87657591 | DI |
| 2 | Alaa Soliman | 93604849 | AS |
| 3 | Nada Meshref | 93604850 | NM |
| 4 | Nada Amr | 93604848 | NA |
| 5 | Islam Othman | 87650455 | IO |
| 6 | Riham | 87657592 | RI |
| 7 | Samar Magdy | 87657593 | SA |
| 8 | Merit Fouad | 87708246 | MF |

---

## Quick Commands

```bash
npm run dev         # Dev server (http://localhost:5173)
npm run build       # Production build
npm run preview     # Preview production build
npm test            # Run Vitest tests
npm run test:unit   # Run unit tests once
```

---

## Deployment

**Target:** GitHub Pages (from `main` branch)

**Workflow:** `.github/workflows/deploy.yml` auto-deploys on push to main

**Base Path:** Set in `vite.config.js` — `base: '/REPO_NAME/'`

**Environment Variables:**
- Development: `.env.local` (gitignored)
- Production: GitHub Secrets (not yet configured — repo not created)

---

## Security Notes

- ✅ API key in `.env.local` (gitignored)
- ✅ No hardcoded secrets in source code
- ✅ No `console.log` exposing credentials
- ⚠️ API key bundled in frontend (acceptable for private repo + personal use)
- ⚠️ No authentication system (single-user app)

---

## Known Limitations

- **Single-user only** — no multi-tenancy
- **ClickUp API dependency** — offline mode queues operations but requires eventual sync
- **No backend** — all API calls from browser (API key visible in DevTools)
- **Private repo only** — must NOT be made public (API key in deployed bundle)

---

**For detailed implementation plan, see:** `.claude/plans/misty-juggling-teapot.md`
