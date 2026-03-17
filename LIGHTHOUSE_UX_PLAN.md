# Lighthouse Dashboard — UX Audit & Design Consistency Plan

> **Purpose:** Instructions for Claude Opus 4.6 (Plan Mode) to direct Sonnet 4.6 (Act Mode) in Claude Code on VS Code.
> **Prerequisite:** LIGHTHOUSE_FIX_PLAN.md + LIGHTHOUSE_UI_PLAN.md completed (19 bugs fixed, 228 unit + 177 UI tests passing).
> **Focus:** Part B — UX Audit, inline-style → Tailwind migration, CSS custom properties, design consistency.
> **Date:** March 2026

---

## How to Use This Plan

Same protocol as the fix and UI plans:
1. **Before starting any task:** Read `CLAUDE.md` and `PROGRESS.md`
2. **One task per Sonnet execution** — never combine tasks
3. **After completing any task:** Update `PROGRESS.md` with task ID, status, and summary
4. **If session runs out mid-task:** Read `PROGRESS.md` and resume from last incomplete task
5. **Never combine tasks** — context limits are real

### Execution Protocol for Sonnet 4.6
Every task prompt must start with:
```
Read CLAUDE.md completely. Then read PROGRESS.md to check current status.
Then execute Task [X.Y] below.
```

### Commit Convention (UX Plan)
- `audit: [area] - [finding summary]`
- `refactor: [component] - [what changed]`
- `fix: [component] - [what was wrong]`
- `chore: [description]`
- `docs: [description]`

---

## Migration Strategy

This is a **migration plan — not a redesign**. Every task must preserve exact visual appearance.

### The 3-Layer Approach
1. **Phase 1 (Foundation):** Define CSS custom properties in `index.css` + wire `useTheme` to set them at runtime. This is a **zero-visual-change** setup step.
2. **Phase 2–3 (Quick Wins):** Console cleanup + dead code removal. Independent of visual migration.
3. **Phases 4–7 (Component Migration):** Replace `style={{ color: theme.text }}` with `className="text-[var(--color-text)]"` or `style={{ color: 'var(--color-text)' }}`. Each component migrates independently.

### Why CSS Custom Properties?
- Two themes (True Black / Noir Glass) require dynamic values
- Tailwind alone can't switch themes at runtime without CSS vars
- Once `useTheme` sets vars on `:root`, Tailwind classes that reference `var()` just work
- Components no longer need the `theme` prop for styling

### Migration Per Component
For each component, the work is:
1. Add `import { useThemeStyles } from '../hooks/useThemeStyles'` (or use CSS vars directly)
2. Replace `style={{ background: theme.cardBg, border: \`1px solid ${theme.border}\` }}` with `className="bg-[var(--color-card-bg)] border border-[var(--color-border)]"`
3. Keep RTL/dynamic computed styles as inline (e.g., gradient text, size props)
4. Remove `theme` prop usage but keep prop signature for backward compat

---

## Phase 0 — Audit & Setup

### Task 0.1 — Create UX Tracking Section in PROGRESS.md

```
Read CLAUDE.md completely. Read PROGRESS.md.

Add a new section at the bottom of PROGRESS.md:

## UX Audit Plan (LIGHTHOUSE_UX_PLAN.md Part B)

### Phase 0: Audit & Setup
- [ ] 0.1 Add UX tracking section to PROGRESS.md
- [ ] 0.2 Audit: inline style inventory
- [ ] 0.3 Audit: console log inventory
- [ ] 0.4 Audit: touch targets + empty states
- [ ] 0.5 Audit: RTL/font coverage gaps

### Phase 1: Foundation (CSS Custom Properties)
- [ ] 1.1 Define CSS custom properties in index.css
- [ ] 1.2 Wire useTheme to set CSS vars at runtime
- [ ] 1.3 Extend tailwind.config.js to reference CSS vars
- [ ] 1.4 Create useThemeStyles helper hook
- [ ] 1.5 Verify foundation: build + visual check

### Phase 2: Console Cleanup
- [ ] 2.1 orchestrator.js (55 calls)
- [ ] 2.2 useClickUpSync.js (56 calls)
- [ ] 2.3 taskCacheV2.js (41 calls)
- [ ] 2.4 clickup.js (24 calls)
- [ ] 2.5 syncQueue.js (16 calls)
- [ ] 2.6 projects.js + taskCache.js + small files (32 calls)
- [ ] 2.7 Component files: MemberDetailModal + SettingsModal (9 calls)
- [ ] 2.8 Verify console cleanup

### Phase 3: Dead Code Removal
- [ ] 3.1 Remove MemberRow.jsx (425 lines, never imported)
- [ ] 3.2 Scan for other dead exports/components

### Phase 4: UI Component Migration (ui/)
- [ ] 4.1 ProgressRing.jsx (69 lines)
- [ ] 4.2 LiveTimer.jsx (105 lines)
- [ ] 4.3 Avatar.jsx (115 lines)
- [ ] 4.4 StatusBadge.jsx (161 lines)
- [ ] 4.5 PriorityFlag.jsx (122 lines)
- [ ] 4.6 Sparkline.jsx (183 lines)
- [ ] 4.7 Skeleton.jsx (318 lines)
- [ ] 4.8 Verify UI component migration

### Phase 5: Card Migration
- [ ] 5.1 OverviewCard.jsx (81 lines)
- [ ] 5.2 ScoreBreakdownCard.jsx (148 lines)
- [ ] 5.3 TeamStatusOverview.jsx (123 lines)
- [ ] 5.4 TeamStatusCard.jsx (157 lines)
- [ ] 5.5 NoActivityCard.jsx (62 lines)
- [ ] 5.6 LeaveCard.jsx (103 lines)
- [ ] 5.7 CardShell.jsx (224 lines) — complete Tailwind migration
- [ ] 5.8 OfflineCard.jsx (252 lines)
- [ ] 5.9 BreakCard.jsx (256 lines)
- [ ] 5.10 WorkingCard.jsx (291 lines)
- [ ] 5.11 ProjectBreakdownCard.jsx (463 lines)
- [ ] 5.12 Verify card migration

### Phase 6: Layout Migration
- [ ] 6.1 FilterSortControls.jsx (320 lines)
- [ ] 6.2 Header.jsx (396 lines)
- [ ] 6.3 MobileBottomNav.jsx (300 lines)
- [ ] 6.4 Verify layout migration

### Phase 7: Large Components
- [ ] 7.1 ModalShell.jsx (317 lines) — foundation for all modals
- [ ] 7.2 DashboardDetailModal.jsx (544 lines)
- [ ] 7.3 TaskListModal.jsx (775 lines)
- [ ] 7.4 DatePickerModal.jsx (608 lines)
- [ ] 7.5 MemberDetailModal.jsx: Timeline tab
- [ ] 7.6 MemberDetailModal.jsx: Performance tab
- [ ] 7.7 MemberDetailModal.jsx: Leaves tab
- [ ] 7.8 SettingsModal.jsx: shell + ClickUp tab
- [ ] 7.9 SettingsModal.jsx: Team + Score tabs
- [ ] 7.10 SettingsModal.jsx: remaining tabs
- [ ] 7.11 ListView.jsx: header + table structure
- [ ] 7.12 ListView.jsx: member rows + expanded content
- [ ] 7.13 ListView.jsx: footer + mobile adaptations
- [ ] 7.14 RankingTable.jsx (610 lines)
- [ ] 7.15 Leaves sub-components (5 files)
- [ ] 7.16 ErrorBoundary.jsx (259 lines)
- [ ] 7.17 App.jsx (563 lines)
- [ ] 7.18 Verify large component migration

### Phase 8: Touch Target Fixes
- [ ] 8.1 ModalShell close button (28px → 44px)
- [ ] 8.2 ProjectBreakdownCard StatusPill
- [ ] 8.3 FilterSortControls dropdown items
- [ ] 8.4 Header + MobileBottomNav menu items
- [ ] 8.5 SettingsModal form controls
- [ ] 8.6 LeavesTab tab buttons

### Phase 9: Empty States
- [ ] 9.1 Grid View (App.jsx) empty state
- [ ] 9.2 ListView empty state
- [ ] 9.3 LeavesTab empty state
- [ ] 9.4 ProjectBreakdownCard standardize empty state
- [ ] 9.5 RankingTable empty state

### Phase 10: RTL Polish
- [ ] 10.1 SettingsModal RTL font handling
- [ ] 10.2 TaskListModal RTL font handling
- [ ] 10.3 ScoreBreakdownCard verify RTL (likely no-op)
- [ ] 10.4 Leaves sub-components RTL font handling
- [ ] 10.5 RankingTable + ListView RTL coverage

### Phase 11: Final Verification
- [ ] 11.1 Full build + test suite
- [ ] 11.2 Visual regression check (both themes)
- [ ] 11.3 Spacing consistency audit
- [ ] 11.4 Update CLAUDE.md with migration notes
- [ ] 11.5 Final metrics + cleanup

## UX Session Log
| Session | Date | Tasks Completed | Notes |
|---------|------|-----------------|-------|

Mark 0.1 complete in PROGRESS.md.
Commit: "chore: add UX audit section to PROGRESS.md"
```

### Task 0.2 — Audit: Inline Style Inventory

```
Read CLAUDE.md. Read PROGRESS.md.

For each file in src/components/ and src/App.jsx, count:
(a) number of style={{ }} JSX attributes
(b) number of theme.* references
(c) number of Tailwind className usages

Create a table in PROGRESS.md under a new "## Inline Style Inventory" section:

| File | Inline style= | theme.* refs | Tailwind classes | Classification |
|------|--------------|--------------|------------------|----------------|

Classification:
- INLINE: >80% inline styles
- TAILWIND: >80% Tailwind classes
- MIXED: significant mix of both

Focus on these files (priority order):
1. src/App.jsx
2. src/components/cards/*.jsx
3. src/components/cards/member-states/*.jsx
4. src/components/ui/*.jsx
5. src/components/layout/*.jsx
6. src/components/modals/*.jsx
7. src/components/views/*.jsx + leaves/*.jsx
8. src/components/table/*.jsx

This table is the BASELINE. We'll compare after Phase 7 to measure progress.

Commit: "audit: inline style inventory -- baseline captured"
Update PROGRESS.md: mark 0.2 complete.
```

### Task 0.3 — Audit: Console Log Inventory

```
Read CLAUDE.md. Read PROGRESS.md.

Search all src/**/*.js and src/**/*.jsx files for raw console.* calls
(exclude src/utils/logger.js itself).

For each file, list:
- File path
- Count of raw console.log / console.warn / console.error / console.debug calls
- Whether it already imports logger.js

Create a table in PROGRESS.md under "## Console Log Inventory":

| File | console.log | console.warn | console.error | console.debug | Total | Has logger? |
|------|-------------|--------------|---------------|---------------|-------|-------------|

Also identify which calls should:
(a) Become logger.info / logger.warn / logger.error / logger.debug
(b) Be removed entirely (stale debugging)
(c) Be kept (e.g., ErrorBoundary.jsx — runs outside app lifecycle)

Expected counts (for verification):
- orchestrator.js: ~55
- useClickUpSync.js: ~56
- taskCacheV2.js: ~41
- clickup.js: ~24
- syncQueue.js: ~16

Commit: "audit: console log inventory -- [N] raw calls across [M] files"
Update PROGRESS.md: mark 0.3 complete.
```

### Task 0.4 — Audit: Touch Targets + Empty States

```
Read CLAUDE.md. Read PROGRESS.md.

PART A — Touch Target Audit:
Check every interactive element (button, clickable div with onClick, anchor, tab) in:
- src/components/modals/ModalShell.jsx — close button
- src/components/cards/ProjectBreakdownCard.jsx — StatusPill
- src/components/layout/FilterSortControls.jsx — dropdown items
- src/components/layout/Header.jsx — avatar menu items
- src/components/layout/MobileBottomNav.jsx — nav tabs + menu items
- src/components/modals/SettingsModal.jsx — tab buttons, toggles
- src/components/views/LeavesTab.jsx — tab buttons

For each, note the effective touch target size (height = padding-top + padding-bottom + line-height).
Flag any below 44px height.

PART B — Empty State Audit:
Check these screens for what renders when their data is empty ([] or null):
- Grid View: filteredMembers = [] in App.jsx
- List View: members = [] in ListView.jsx
- LeavesTab: db.leaves query returns []
- ProjectBreakdownCard: projectBreakdown = []
- RankingTable: members = []

Does each show:
(a) A proper EmptyState component with icon + message
(b) A blank screen (bug)
(c) A partial render (acceptable but inconsistent)

Create tables in PROGRESS.md for both audits.

Commit: "audit: touch targets + empty states -- [N] issues found"
Update PROGRESS.md: mark 0.4 complete.
```

### Task 0.5 — Audit: RTL/Font Coverage Gaps

```
Read CLAUDE.md. Read PROGRESS.md.

Search all src/components/**/*.jsx for usages of:
- getAdaptiveFontFamily
- getTextFontStyle (if it exists)
- getFontFamily
- tabularNumberStyle
- isRTL

Then check each component that DISPLAYS user-generated text (member names, task names,
project names, publisher, genre) — does it apply RTL-aware font handling?

Known user-text fields to check:
- Member names: Avatar.jsx, TeamStatusOverview.jsx, RankingTable.jsx, ListView.jsx, Header.jsx (avatar)
- Task names: WorkingCard.jsx ✅, BreakCard.jsx, OfflineCard.jsx, TaskListModal.jsx, MemberDetailModal.jsx
- Project names: ProjectBreakdownCard.jsx ✅, WorkingCard.jsx ✅, ListView.jsx
- Publisher/Genre: WorkingCard.jsx ✅
- Leave type/reason: MemberLeaveDetail.jsx, LeavesTab.jsx

Create a table in PROGRESS.md:

| Component | User text displayed | Has RTL font handling? | Gap? |
|-----------|--------------------|-----------------------|------|

Commit: "audit: RTL font coverage -- [N] gaps found"
Update PROGRESS.md: mark 0.5 complete.
```

---

## Phase 1 — Foundation (CSS Custom Properties)

> **Goal:** Set up the CSS variable infrastructure. These 5 tasks are zero-visual-change.
> All theme values continue to work exactly as before — we're just adding a new way to access them.

### Task 1.1 — Define CSS Custom Properties in index.css

```
Read CLAUDE.md. Read PROGRESS.md.

Add a :root block to src/index.css that defines CSS custom properties
mapping to the True Black theme values (the default dark theme).
Also add a .theme-noir-glass class block with Noir Glass overrides.

Structure to add AFTER the existing @tailwind directives:

:root {
  /* Backgrounds */
  --color-bg: #0A0A0A;
  --color-card-bg: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
  --color-inner-bg: rgba(255, 255, 255, 0.03);
  --color-subtle-bg: rgba(255, 255, 255, 0.02);

  /* Borders */
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-light: rgba(255, 255, 255, 0.06);

  /* Text */
  --color-text: #ffffff;
  --color-text-secondary: #a0a0a0;
  --color-text-muted: #606060;

  /* Status */
  --color-working: #10B981;
  --color-working-light: #34D399;
  --color-working-dark: #059669;
  --color-working-glow: rgba(16, 185, 129, 0.4);
  --color-break: #F59E0B;
  --color-break-light: #FCD34D;
  --color-break-dark: #D97706;
  --color-offline: #6B7280;
  --color-offline-light: #9CA3AF;
  --color-leave: #8B5CF6;
  --color-leave-light: #C4B5FD;
  --color-leave-dark: #7C3AED;
  --color-no-activity: rgba(255, 255, 255, 0.4);

  /* Accents */
  --color-accent: #ffffff;
  --color-accent-glow: rgba(255, 255, 255, 0.2);
  --color-danger: #EF4444;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-purple: #A855F7;

  /* Effects */
  --effect-backdrop-blur: blur(20px);
  --effect-card-shadow: none;

  /* Spacing tokens (match tailwind.config.js) */
  --spacing-card-padding: 16px;
  --spacing-section-gap: 24px;
  --spacing-card-gap: 16px;

  /* Border radius tokens */
  --radius-card: 12px;
  --radius-button: 8px;
  --radius-badge: 6px;
}

.theme-noir-glass {
  --color-bg: linear-gradient(170deg, #F9F9F7 0%, #F4F4F2 100%);
  --color-card-bg: linear-gradient(155deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.88) 100%);
  --color-inner-bg: linear-gradient(150deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.035) 100%);
  --color-subtle-bg: rgba(0, 0, 0, 0.015);
  --color-border: rgba(0, 0, 0, 0.08);
  --color-border-light: rgba(0, 0, 0, 0.05);
  --color-text: #1a1a1a;
  --color-text-secondary: #4a4a4a;
  --color-text-muted: #888888;
  --color-no-activity: rgba(0, 0, 0, 0.3);
  --color-accent: #111827;
  --color-accent-glow: rgba(17, 24, 39, 0.15);
  --effect-backdrop-blur: blur(20px) saturate(1.5);
  --effect-card-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
}

IMPORTANT: Copy the exact hex/rgba values from src/constants/themes.js
(trueBlack and noirGlass objects) — do not guess them.

Run: npm run build
Verify no errors.

Commit: "refactor: define CSS custom properties in index.css"
Update PROGRESS.md: mark 1.1 complete.
```

### Task 1.2 — Wire useTheme to Set CSS Custom Properties at Runtime

```
Read CLAUDE.md. Read PROGRESS.md.

Modify src/hooks/useTheme.js to set CSS custom properties on
document.documentElement.style whenever the theme changes.

The useThemeStore already has currentTheme state. Add a useEffect
(or do it imperatively in setTheme) that:

1. Maps the current theme object's properties to CSS variable names
2. Calls document.documentElement.style.setProperty('--color-text', theme.text)
   for every variable defined in Task 1.1
3. Also toggles the .theme-noir-glass class on document.documentElement
   (add when Noir Glass, remove when True Black)

The mapping function should match EXACTLY the variable names from Task 1.1:
  theme.text → --color-text
  theme.textSecondary → --color-text-secondary
  theme.textMuted → --color-text-muted
  theme.cardBg → --color-card-bg
  theme.bg → --color-bg
  theme.innerBg → --color-inner-bg
  theme.subtleBg → --color-subtle-bg
  theme.border → --color-border
  theme.borderLight → --color-border-light
  theme.working → --color-working
  theme.workingLight → --color-working-light
  theme.workingDark → --color-working-dark
  theme.workingGlow → --color-working-glow
  theme.break → --color-break
  theme.breakLight → --color-break-light
  theme.breakDark → --color-break-dark
  theme.offline → --color-offline
  theme.offlineLight → --color-offline-light
  theme.leave → --color-leave
  theme.leaveLight → --color-leave-light
  theme.leaveDark → --color-leave-dark
  theme.noActivity → --color-no-activity
  theme.accent → --color-accent
  theme.accentGlow → --color-accent-glow
  theme.danger → --color-danger
  theme.success → --color-success
  theme.warning → --color-warning
  theme.purple → --color-purple
  theme.backdropBlur → --effect-backdrop-blur
  theme.cardShadow → --effect-card-shadow

IMPORTANT: The existing theme prop system must continue to work.
This is ADDITIVE — just also set CSS vars. Do not remove any existing behavior.

Run: npm test -- --run
Run: npm run build
Open in browser — verify both themes still render correctly.

Commit: "refactor: useTheme sets CSS custom properties on theme change"
Update PROGRESS.md: mark 1.2 complete.
```

### Task 1.3 — Extend Tailwind Config to Reference CSS Custom Properties

```
Read CLAUDE.md. Read PROGRESS.md.

Update tailwind.config.js to extend the colors section so that
Tailwind utility classes can reference CSS custom properties.

In theme.extend.colors, add theme-aware color entries:

theme: {
  extend: {
    colors: {
      // ... existing static colors (keep them) ...
      // Add dynamic theme colors:
      'th-bg': 'var(--color-bg)',
      'th-card': 'var(--color-card-bg)',
      'th-inner': 'var(--color-inner-bg)',
      'th-border': 'var(--color-border)',
      'th-border-light': 'var(--color-border-light)',
      'th-text': 'var(--color-text)',
      'th-text-secondary': 'var(--color-text-secondary)',
      'th-text-muted': 'var(--color-text-muted)',
      'th-accent': 'var(--color-accent)',
      'th-working': 'var(--color-working)',
      'th-break': 'var(--color-break)',
      'th-offline': 'var(--color-offline)',
      'th-leave': 'var(--color-leave)',
      'th-success': 'var(--color-success)',
      'th-warning': 'var(--color-warning)',
      'th-danger': 'var(--color-danger)',
    },
    // Also add borderColor and textColor extensions as needed
  }
}

This allows: className="text-th-text bg-th-card border-th-border"
in components that have migrated.

Run: npm run build
Verify no errors.

Commit: "refactor: tailwind config adds CSS var color tokens (th-* prefix)"
Update PROGRESS.md: mark 1.3 complete.
```

### Task 1.4 — Create useThemeStyles Helper Hook

```
Read CLAUDE.md. Read PROGRESS.md.

Create src/hooks/useThemeStyles.js — a lightweight hook that returns
commonly-used style presets composed from CSS custom properties.
This is the bridge for components that can't easily use Tailwind
(e.g., when background is a gradient that Tailwind can't express).

Export these style presets:

export function useThemeStyles() {
  return {
    // Card container (most common pattern)
    card: {
      background: 'var(--color-card-bg)',
      backdropFilter: 'var(--effect-backdrop-blur)',
      borderRadius: 'var(--radius-card, 12px)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--effect-card-shadow)',
    },
    // Inner section inside a card
    section: {
      background: 'var(--color-inner-bg)',
      borderRadius: '8px',
      border: '1px solid var(--color-border-light)',
    },
    // Text color styles (for cases where Tailwind can't be used)
    textPrimary: { color: 'var(--color-text)' },
    textSecondary: { color: 'var(--color-text-secondary)' },
    textMuted: { color: 'var(--color-text-muted)' },
    // Border
    border: { borderColor: 'var(--color-border)' },
    borderLight: { borderColor: 'var(--color-border-light)' },
  };
}

This hook does NOT read the theme object — it only returns CSS var references.
Components use: const styles = useThemeStyles(); then style={styles.card}

Commit: "refactor: add useThemeStyles helper hook"
Update PROGRESS.md: mark 1.4 complete.
```

### Task 1.5 — Verify Foundation

```
Read CLAUDE.md. Read PROGRESS.md.

Verification checklist:
1. Run: npm test -- --run → all tests must pass (228 expected)
2. Run: npm run build → must succeed, no new errors
3. Run: npm run dev → open in browser
4. In browser DevTools → Elements panel → select <html> element
   → verify CSS custom properties are set on :root (--color-text, --color-bg, etc.)
5. Open Settings → change to Noir Glass → verify CSS vars update in DevTools
6. Switch back to True Black → verify vars update again
7. Confirm: no visual change from user perspective (everything looks identical)

If any test fails, investigate and fix before committing.

Commit: "chore: verify foundation -- CSS vars active, no visual changes"
Update PROGRESS.md: mark 1.5 complete.
```

---

## Phase 2 — Console Cleanup

> **Goal:** Replace all raw console.* calls with logger.* across 17 files.
> Each task handles one or more files. Run `npm test -- --run` after each task.
> logger.js is at `src/utils/logger.js` — exports `logger.info/warn/error/debug`.
> logger.debug only logs in DEV mode.

### Task 2.1 — Console Cleanup: orchestrator.js (~55 calls)

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/services/sync/orchestrator.js

Steps:
1. Add import { logger } from '../../utils/logger'; at the top
2. Replace ALL raw console.log/warn/error/debug calls:
   - console.log('...') → logger.info('...')  [operational status]
   - console.warn('...') → logger.warn('...')
   - console.error('...') → logger.error('...')
   - Verbose per-member debug logs → logger.debug('...')
3. Remove emoji prefixes (📋 etc.) — logger adds [Lighthouse] prefix automatically
4. Preserve all original message text (minus emoji prefix)

Run: npm test -- --run
Run: npm run build

Commit: "refactor: orchestrator.js -- replace ~55 console calls with logger"
Update PROGRESS.md: mark 2.1 complete.
```

### Task 2.2 — Console Cleanup: useClickUpSync.js (~56 calls)

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/hooks/useClickUpSync.js

NOTE: This file may already have `import { logger }` but still use raw console.*
alongside it. Replace ALL raw console.* calls — keep the import.

Same substitution rules as Task 2.1.
Emoji prefixes (📅, ⏭️, etc.) → remove.

Run: npm test -- --run
Run: npm run build

Commit: "refactor: useClickUpSync.js -- replace ~56 console calls with logger"
Update PROGRESS.md: mark 2.2 complete.
```

### Task 2.3 — Console Cleanup: taskCacheV2.js (~41 calls)

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/services/taskCacheV2.js

Add logger import. Replace ~41 raw console calls.
Cache hit/miss → logger.debug (only needed in dev)
Errors → logger.error

Run: npm test -- --run
Commit: "refactor: taskCacheV2.js -- replace ~41 console calls with logger"
Update PROGRESS.md: mark 2.3 complete.
```

### Task 2.4 — Console Cleanup: clickup.js (~24 calls)

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/services/clickup.js

Add logger import. Replace ~24 raw console calls.
API request/response details → logger.debug
Rate limit warnings → logger.warn
Errors → logger.error

Run: npm test -- --run
Commit: "refactor: clickup.js -- replace ~24 console calls with logger"
Update PROGRESS.md: mark 2.4 complete.
```

### Task 2.5 — Console Cleanup: syncQueue.js (~16 calls)

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/services/syncQueue.js

Add logger import. Replace ~16 raw console calls.

Run: npm test -- --run
Commit: "refactor: syncQueue.js -- replace ~16 console calls with logger"
Update PROGRESS.md: mark 2.5 complete.
```

### Task 2.6 — Console Cleanup: Service Files (small files)

```
Read CLAUDE.md. Read PROGRESS.md.

Files to clean (add logger import + replace all raw console calls):
1. src/services/sync/projects.js (~7 calls)
2. src/services/taskCache.js (~5 calls)
3. src/services/sync/calculations.js (~2 calls)
4. src/services/sync/transform.js (~1 call)
5. src/utils/clickupHelpers.js (~4 calls)
6. src/utils/leaveHelpers.js (~1 call)
7. src/hooks/useSettings.js (~2 calls)
8. src/hooks/useTheme.js (~1 call — the console.error in catch block)

Do all 8 files in one task. Run tests after all 8 are done.

Run: npm test -- --run
Commit: "refactor: service utils hooks -- replace ~23 console calls with logger"
Update PROGRESS.md: mark 2.6 complete.
```

### Task 2.7 — Console Cleanup: Component Files

```
Read CLAUDE.md. Read PROGRESS.md.

Files:
1. src/components/modals/MemberDetailModal.jsx (~7 calls)
2. src/components/modals/SettingsModal.jsx (~2 calls)

SKIP: src/components/ErrorBoundary.jsx (~1 call)
Reason: ErrorBoundary is a class component and catch-all handler that
runs outside the normal app lifecycle. Keep its console.error as-is.

Add logger imports where missing. Replace all raw calls in the 2 modal files.

Run: npm test -- --run
Commit: "refactor: modal components -- replace ~9 console calls with logger"
Update PROGRESS.md: mark 2.7 complete.
```

### Task 2.8 — Verify Console Cleanup

```
Read CLAUDE.md. Read PROGRESS.md.

Run this search and confirm results:
Search pattern: console\.(log|warn|error|debug|info)
In: src/ directory, all .js and .jsx files
EXPECTED remaining: only in src/utils/logger.js (4 calls) + src/components/ErrorBoundary.jsx (1 call)

If any other file still has raw console.* calls, fix them now.

Run: npm test -- --run
Run: npm run build

Commit: "chore: verify console cleanup -- only logger.js + ErrorBoundary remain"
Update PROGRESS.md: mark 2.8 complete.
```

---

## Phase 3 — Dead Code Removal

### Task 3.1 — Remove MemberRow.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/table/MemberRow.jsx (425 lines)

BEFORE deleting:
1. Verify: search for "import.*MemberRow" and "from.*MemberRow" across all src/ files
2. Confirm zero matches
3. Also check: is it referenced in any test file in tests/ or src/**/__tests__/?

If confirmed zero usages → delete the file.

Run: npm run build (must succeed with no import errors)
Run: npm test -- --run (all tests must still pass)

Commit: "chore: remove dead code -- MemberRow.jsx (425 lines, never imported)"
Update PROGRESS.md: mark 3.1 complete.
```

### Task 3.2 — Scan for Other Dead Code

```
Read CLAUDE.md. Read PROGRESS.md.

Search for other potential dead code:

1. Any .jsx files in src/components/ that have zero import matches elsewhere in src/
2. Any utility functions exported from src/utils/ files that are never imported
3. Any constants exported from src/constants/ that are never imported
4. Any CSS classes defined in src/index.css that are never referenced

For each finding:
- Confirm it is truly unused (search thoroughly)
- Remove if confirmed dead
- Note if kept intentionally (e.g., future-use, test-only)

Run: npm run build
Run: npm test -- --run

Commit: "chore: dead code scan -- [N removed, M intentionally kept]"
Update PROGRESS.md: mark 3.2 complete.
```

---

## Phase 4 — UI Component Migration

> **Goal:** Migrate all 7 small UI components from inline styles to Tailwind + CSS vars.
> Strategy: Replace `style={{ color: theme.text }}` with `className="text-th-text"` or
> `style={{ color: 'var(--color-text)' }}`. Keep the `theme` prop in function signature
> for backward compat but stop using it for styling.
> Run `npm test -- --run` after EACH task.

### Task 4.1 — Migrate ProgressRing.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/ui/ProgressRing.jsx (69 lines)
This is the simplest UI component — good pilot migration.

Read the file fully. Then:
1. Replace container div inline styles with Tailwind classes + CSS var refs
2. SVG circle/path: keep stroke={color} as inline (dynamic computed value from prop)
3. Percentage text: use className="text-th-text font-mono tabular-nums"
4. Preserve exact visual appearance

MUST NOT change: component props, SVG logic, color computation
MUST change: layout/container styles to Tailwind + CSS vars

Run: npm test -- --run
Commit: "refactor: ProgressRing -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 4.1 complete.
```

### Task 4.2 — Migrate LiveTimer.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/ui/LiveTimer.jsx (105 lines)

Read the file fully. Migrate inline styles to Tailwind + CSS vars.
Keep: tabularNumberStyle spread (JetBrains Mono config), status-dependent
color logic (timer color changes based on isOverworking/status).
Replace: container styles, font-size, font-weight, margin/padding.

Run: npm test -- --run
Commit: "refactor: LiveTimer -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 4.2 complete.
```

### Task 4.3 — Migrate Avatar.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/ui/Avatar.jsx (115 lines)

Read the file fully. Migrate layout/positioning to Tailwind.
Keep: dynamic size prop computation (border-radius, width, height from size),
status-dependent border color (dynamic inline style is fine for this).
Replace: flex centering, overflow-hidden, position relative, font styles.

Run: npm test -- --run
Commit: "refactor: Avatar -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 4.3 complete.
```

### Task 4.4 — Migrate StatusBadge.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/ui/StatusBadge.jsx (161 lines)

Read the file fully.
Key action: Remove the inline <style> tag for @keyframes statusDotPulse
and add the keyframes to src/index.css instead (or use existing animate-pulse-dot
from tailwind.config.js if it matches).
Replace: flex layout, padding, border-radius, font styles with Tailwind.
Keep: dynamic status-based color (inline or CSS var reference).

Run: npm test -- --run
Commit: "refactor: StatusBadge -- migrate inline styles + move keyframes to index.css"
Update PROGRESS.md: mark 4.4 complete.
```

### Task 4.5 — Migrate PriorityFlag.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/ui/PriorityFlag.jsx (122 lines)

Read the file fully. Migrate container/layout styles to Tailwind.
Keep: ClickUp-specific priority colors (hardcoded hex, intentional).
Replace: positioning, size, overflow styles.

Run: npm test -- --run
Commit: "refactor: PriorityFlag -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 4.5 complete.
```

### Task 4.6 — Migrate Sparkline.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/ui/Sparkline.jsx (183 lines)

Read the file fully. This is SVG-heavy.
Replace: outer container styles (width, height, flex, padding) with Tailwind.
Keep: all SVG attribute values (cx, cy, r, points, stroke, fill) as JSX attrs.
Add: proper empty state using CSS var colors for the "No data" text.

Run: npm test -- --run
Commit: "refactor: Sparkline -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 4.6 complete.
```

### Task 4.7 — Migrate Skeleton.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/ui/Skeleton.jsx (318 lines)

Read the file fully. This exports multiple skeleton sub-components.
Key action: Move @keyframes shimmer and @keyframes pulse from any
inline <style> tag to src/index.css.
Replace: all layout/sizing inline styles with Tailwind.
Keep: gradient background for shimmer effect (inline with CSS var refs).
Convert: SkeletonMemberCard, SkeletonOverviewCard, SkeletonScoreCard,
SkeletonProjectCard, SkeletonRankingRow, SkeletonListRow each get Tailwind layout.

Run: npm test -- --run
Commit: "refactor: Skeleton -- migrate inline styles + move keyframes to index.css"
Update PROGRESS.md: mark 4.7 complete.
```

### Task 4.8 — Verify UI Component Migration

```
Read CLAUDE.md. Read PROGRESS.md.

Verification:
1. Run: npm test -- --run → all tests pass
2. Run: npm run build → succeeds
3. Run: npm run dev → open in browser
4. Switch between True Black and Noir Glass themes
5. Visually verify all 7 UI components (Avatar, StatusBadge, LiveTimer,
   ProgressRing, Sparkline, PriorityFlag, Skeleton loading states)
6. Check mobile viewport (375px) — Avatar in member cards, status badges

If any visual regression found, fix immediately before committing.

Commit: "chore: verify UI component migration -- no visual changes"
Update PROGRESS.md: mark 4.8 complete.
```

---

## Phase 5 — Card Component Migration

> Same strategy as Phase 4. One card per task. Preserve exact appearance.
> CardShell.jsx is the base wrapper for all member cards — do it last (5.7) after
> the content cards (5.5, 5.6) are done, so you can see the full picture.

### Task 5.1 — Migrate OverviewCard.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/OverviewCard.jsx (81 lines)

Read the file fully. Replace ~28 inline style attributes.
Key conversions:
- background: theme.cardBg → style={{ background: 'var(--color-card-bg)' }}
  (stays inline — gradient background can't be a Tailwind class)
- border → className="border border-th-border"
- border-radius → className="rounded-card"
- backdrop-filter → style={{ backdropFilter: 'var(--effect-backdrop-blur)' }}
- color: theme.text → className="text-th-text"
- font-size → className="text-body" or "text-caption" etc.
- padding 24px → className="p-6"
- gap 20px → className="gap-5"
- onMouseEnter/Leave inline style manipulation:
  Replace with Tailwind hover:classes where possible, or keep JS for
  the translateY transform if hover: CSS can't replicate it.

Run: npm test -- --run
Commit: "refactor: OverviewCard -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 5.1 complete.
```

### Task 5.2 — Migrate ScoreBreakdownCard.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/ScoreBreakdownCard.jsx (148 lines)

Read the file fully. Migrate ~35 inline styles.
The grid layout for 4 metrics can use Tailwind grid.
Dynamic score color (getScoreColor/getMetricColor) stays inline.

Run: npm test -- --run
Commit: "refactor: ScoreBreakdownCard -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 5.2 complete.
```

### Task 5.3 — Migrate TeamStatusOverview.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/TeamStatusOverview.jsx (123 lines)

Read the file fully. Migrate ~28 inline styles.
Status group layout (flex row of status pills) → Tailwind flex.
Status-specific colors → CSS var refs or th-* Tailwind classes.

Run: npm test -- --run
Commit: "refactor: TeamStatusOverview -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 5.3 complete.
```

### Task 5.4 — Migrate TeamStatusCard.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/TeamStatusCard.jsx (157 lines)

Read the file fully. Migrate ~24 inline styles.
The CompactMemberRow sub-component inside this file should also be migrated.

Run: npm test -- --run
Commit: "refactor: TeamStatusCard -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 5.4 complete.
```

### Task 5.5 — Migrate NoActivityCard.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/member-states/NoActivityCard.jsx (62 lines)

Simplest member state card. Read fully, migrate ~8 inline styles.
Layout and text color → Tailwind + CSS vars.

Run: npm test -- --run
Commit: "refactor: NoActivityCard -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 5.5 complete.
```

### Task 5.6 — Migrate LeaveCard.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/member-states/LeaveCard.jsx (103 lines)

Read fully. Migrate ~18 inline styles.
Leave/WFH type colors (purple) → className="text-th-leave" or CSS var ref.

Run: npm test -- --run
Commit: "refactor: LeaveCard -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 5.6 complete.
```

### Task 5.7 — Complete CardShell.jsx Migration

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/member-states/CardShell.jsx (224 lines)

CardShell already has 24 Tailwind classes. Migrate the remaining ~45 inline styles.
This is the base wrapper for all 5 member card states.

Key conversions:
- background: theme.cardBg → style={{ background: 'var(--color-card-bg)' }}
- backdropFilter → style={{ backdropFilter: 'var(--effect-backdrop-blur)' }}
- borderColor (dynamic — changes per status: working/break/offline/leave/noActivity)
  Keep as dynamic inline: style={{ borderColor: statusBorderColor }}
- opacity (for offline/noActivity) → keep as dynamic inline: style={{ opacity }}
- onMouseEnter/Leave hover effects → consider Tailwind hover: classes

This is the most important card migration — it affects all 5 member states.
Test thoroughly after.

Run: npm test -- --run
Commit: "refactor: CardShell -- complete Tailwind migration"
Update PROGRESS.md: mark 5.7 complete.
```

### Task 5.8 — Migrate OfflineCard.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/member-states/OfflineCard.jsx (252 lines)

Read fully. Migrate ~50 inline styles.
Offline-specific styling (gray tones, dimmed text) → th-offline Tailwind class + CSS vars.
Last-seen time display → Tailwind text utilities.

Run: npm test -- --run
Commit: "refactor: OfflineCard -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 5.8 complete.
```

### Task 5.9 — Migrate BreakCard.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/member-states/BreakCard.jsx (256 lines)

Read fully. Migrate ~54 inline styles.
Break timer gradient (amber) → keep as inline style (gradient can't be Tailwind).
Break duration text color → className="text-th-break" or style={{ color: 'var(--color-break)' }}.
Task info (dimmed) → className="text-th-text-muted opacity-60" etc.

Run: npm test -- --run
Commit: "refactor: BreakCard -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 5.9 complete.
```

### Task 5.10 — Migrate WorkingCard.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/member-states/WorkingCard.jsx (291 lines)

Read fully. Migrate ~68 inline styles.
This is the most complex member state card.
MUST PRESERVE: RTL direction handling (isRTL checks), gradient text for timer,
glow animation for working state, overwork warning indicator (orange).

Key areas:
- Timer display: gradient stays inline (timerStyle object)
- Task name: keep getTextFontStyle(task) for RTL
- Publisher/genre text: keep RTL handling
- Glow animation keyframes in inline <style> tag → move to index.css
- Container layout → Tailwind

Run: npm test -- --run
Commit: "refactor: WorkingCard -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 5.10 complete.
```

### Task 5.11 — Migrate ProjectBreakdownCard.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/ProjectBreakdownCard.jsx (463 lines)

This is the largest card component. Read fully BEFORE migrating.
Plan your migration before touching code.

Key sub-components inside the file to migrate:
- Project card container
- Status pill (NOTE: tiny padding flagged for Phase 8)
- Progress bar
- Assignee stack
- Summary section

Migrate layout/color inline styles → Tailwind + CSS vars.
Keep: hardcoded ClickUp status colors (intentional), gradient progress bars.

If the file is complex, split the commit into two logical parts:
- Part a: Container + header section
- Part b: Project list + status pills

Run: npm test -- --run after EACH part.
Commit: "refactor: ProjectBreakdownCard -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 5.11 complete.
```

### Task 5.12 — Verify Card Migration

```
Read CLAUDE.md. Read PROGRESS.md.

Verification:
1. Run: npm test -- --run → all tests pass
2. Run: npm run build → succeeds
3. Run: npm run dev → open in browser
4. In True Black theme: verify all 5 member card states visually
   (need to check Dashboard with members in Working/Break/Offline/NoActivity/Leave states)
5. Switch to Noir Glass: verify all cards still look correct
6. Check ProjectBreakdownCard project list display
7. Check TeamStatusOverview status counts display

Commit: "chore: verify card migration -- no visual changes"
Update PROGRESS.md: mark 5.12 complete.
```

---

## Phase 6 — Layout Component Migration

### Task 6.1 — Migrate FilterSortControls.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/layout/FilterSortControls.jsx (320 lines)

Read fully. Migrate ~92 inline styles.
Key elements:
- Filter/sort button row → Tailwind flex
- Dropdown menu container → Tailwind + positioning
- Dropdown items: KEEP a note that these have small padding (flagged for Phase 8)
  Migrate layout but don't change sizes yet (that's Phase 8)
- Active filter pills → th-accent color

Run: npm test -- --run
Commit: "refactor: FilterSortControls -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 6.1 complete.
```

### Task 6.2 — Migrate Header.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/layout/Header.jsx (396 lines)

Read fully. Migrate the main header layout.
Key elements:
- Header container (sticky, backdrop-blur, border-bottom) → Tailwind
- Logo area → already partially Tailwind (Logo.jsx)
- Sync status dot → keep pulse animation, migrate container
- Date display / date picker trigger → Tailwind layout
- Avatar button → Tailwind, dynamic avatar color stays inline
- Dropdown menu → Tailwind

Preserve: theme toggle switch animation (cubic-bezier), sync statusPulse keyframe.

Run: npm test -- --run
Commit: "refactor: Header -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 6.2 complete.
```

### Task 6.3 — Migrate MobileBottomNav.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/layout/MobileBottomNav.jsx (300 lines)

Read fully. Migrate ~64 inline styles.
Key elements:
- Bottom nav bar: fixed bottom, backdrop-blur, border-top → Tailwind
- Tab buttons: flex, active indicator → Tailwind
- Avatar menu dropdown → Tailwind
- Active tab highlight → CSS var ref

SVG icons inline in this file: keep as SVG JSX attributes.

Run: npm test -- --run
Commit: "refactor: MobileBottomNav -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 6.3 complete.
```

### Task 6.4 — Verify Layout Migration

```
Read CLAUDE.md. Read PROGRESS.md.

Verification:
1. Run: npm test -- --run → all tests pass
2. Run: npm run build → succeeds
3. Run: npm run dev at 375px (mobile viewport)
4. Verify MobileBottomNav appears correctly, tabs work
5. Verify Header on desktop (1440px): date display, avatar menu, sync dot
6. Open filter/sort dropdowns — verify layout correct
7. Switch themes — verify all layout components adapt correctly

Commit: "chore: verify layout migration -- no visual changes"
Update PROGRESS.md: mark 6.4 complete.
```

---

## Phase 7 — Large Component Migration

> Large components are split into sub-tasks to stay within context limits.
> ModalShell.jsx MUST be migrated before other modals (7.1 before 7.2–7.4).
> Run `npm test -- --run` after every task.

### Task 7.1 — Migrate ModalShell.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/ModalShell.jsx (317 lines)

This is the base modal wrapper used by all modals. Read fully.

Key sub-components exported from this file:
- ModalShell (backdrop + container + header + close button)
- ModalHero, ModalSection, StatRow, ProgressBar, EmptyState

Key actions:
1. Move @keyframes modalFadeIn and @keyframes modalSlideIn from inline
   <style> tag to src/index.css
2. Migrate backdrop: fixed inset-0, bg-black/50, backdrop-blur → Tailwind
3. Migrate container: max-w-4xl, max-h-[90vh], rounded-card, overflow-hidden → Tailwind
4. CLOSE BUTTON: Current size is 28px. Keep this size for now (Phase 8 will fix it).
   Just migrate the styling.
5. Migrate ModalHero, ModalSection, StatRow, ProgressBar, EmptyState styles

Run: npm test -- --run
Commit: "refactor: ModalShell -- migrate inline styles + move keyframes to index.css"
Update PROGRESS.md: mark 7.1 complete.
```

### Task 7.2 — Migrate DashboardDetailModal.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/DashboardDetailModal.jsx (544 lines)

Read fully. This modal uses ModalShell + ModalShell sub-components extensively.
After Task 7.1, many inner styles should already be cleaner.

Migrate remaining:
- Member list items (avatar, name, value, progress)
- Metric display grids
- Section headers
- Tab switching styles

Run: npm test -- --run
Commit: "refactor: DashboardDetailModal -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 7.2 complete.
```

### Task 7.3 — Migrate TaskListModal.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/TaskListModal.jsx (775 lines)

Read fully. Plan migration before touching code.
Key elements:
- Task list container + scroll area → Tailwind
- Task item row: status indicator, name, time, priority → Tailwind
- Status pills (task statuses) → statusColors.js colors, keep as inline
- Search/filter bar → Tailwind
- Empty state → standardize using ModalShell EmptyState component

Ensure task name text uses getAdaptiveFontFamily for RTL support.

Run: npm test -- --run
Commit: "refactor: TaskListModal -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 7.3 complete.
```

### Task 7.4 — Migrate DatePickerModal.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/DatePickerModal.jsx (608 lines)

Read fully.
Key elements:
- Calendar grid: 7 columns, day cells → Tailwind grid
- Day cell: today highlight, selected highlight, range highlight → dynamic inline/CSS var
- Navigation arrows, month/year display → Tailwind
- Preset buttons dropdown (already migrated to dropdown in recent commit) → verify
- Date range display → Tailwind

Day cell colors (today/selected/in-range) will need to stay inline or use
conditional className since they depend on computed state.

Run: npm test -- --run
Commit: "refactor: DatePickerModal -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 7.4 complete.
```

### Task 7.5 — Migrate MemberDetailModal.jsx: Timeline Tab

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/MemberDetailModal.jsx (1,995 lines)

This is a massive file. Read lines 1–660 and 1139–1350 approximately
(modal shell, tab navigation, and Timeline tab content).
DO NOT MODIFY performance or leaves tab sections yet.

Migrate:
- Modal header (member info: name, initials, status, score)
- Tab navigation bar (3 tabs: Timeline, Performance, Leaves)
- Timeline tab: time entry list, entry cards, time display
- Ensure time entry names use getAdaptiveFontFamily for RTL

Run: npm test -- --run
Commit: "refactor: MemberDetailModal timeline tab -- migrate inline styles"
Update PROGRESS.md: mark 7.5 complete.
```

### Task 7.6 — Migrate MemberDetailModal.jsx: Performance Tab

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/MemberDetailModal.jsx

Read the Performance tab section (approximately lines 1351–1643).
DO NOT MODIFY timeline or leaves tab sections.

Migrate:
- Score breakdown: 4 metric cards (time, workload, completion, compliance)
- Daily/weekly/monthly period selector buttons
- Performance chart bar display
- Historical comparison values
- Trend sparkline containers

Run: npm test -- --run
Commit: "refactor: MemberDetailModal performance tab -- migrate inline styles"
Update PROGRESS.md: mark 7.6 complete.
```

### Task 7.7 — Migrate MemberDetailModal.jsx: Leaves Tab

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/MemberDetailModal.jsx

Read the Leaves tab section (approximately lines 1644–1995).
DO NOT MODIFY timeline or performance tab sections.

Migrate:
- Leave records list
- WFH records
- Leave quota display
- Leave type badge colors (purple for leave, amber for WFH)

Run: npm test -- --run
Commit: "refactor: MemberDetailModal leaves tab -- migrate inline styles"
Update PROGRESS.md: mark 7.7 complete.
```

### Task 7.8 — Migrate SettingsModal.jsx: Shell + ClickUp Tab

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/SettingsModal.jsx (1,167 lines)

Read lines 1–586 (modal shell + first tab).
NOTE: SettingsModal uses its own modal shell (not ModalShell component).

Migrate:
- Modal backdrop and container
- Tab sidebar navigation (desktop) + tab header (mobile)
- SectionHeader sub-component
- ClickUp Integration tab: API key input, workspace/team inputs, save button
- Form inputs: replace inline padding/border/color with Tailwind

DO NOT MODIFY other tabs yet.

Run: npm test -- --run
Commit: "refactor: SettingsModal shell + clickup tab -- migrate inline styles"
Update PROGRESS.md: mark 7.8 complete.
```

### Task 7.9 — Migrate SettingsModal.jsx: Team + Score Tabs

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/SettingsModal.jsx

Read the Team Configuration and Score Configuration tab sections.

Team tab: member list rows, toggle switches, quota inputs (annual leave, WFH days)
Score tab: weight sliders/inputs, formula visualization, weight sum display

Run: npm test -- --run
Commit: "refactor: SettingsModal team + score tabs -- migrate inline styles"
Update PROGRESS.md: mark 7.9 complete.
```

### Task 7.10 — Migrate SettingsModal.jsx: Remaining Tabs

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/SettingsModal.jsx

Read and migrate all remaining tabs:
- Thresholds tab: number inputs, description text
- Sync & Cache tab: interval selector, clear cache button
- Calendar & Schedule tab: work days checkboxes, public holidays list
- Display tab: theme toggle (True Black / Noir Glass selector)
- Audit tab (if exists): admin-only section

Run: npm test -- --run
Commit: "refactor: SettingsModal remaining tabs -- migrate inline styles"
Update PROGRESS.md: mark 7.10 complete.
```

### Task 7.11 — Migrate ListView.jsx: Header + Table Structure

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/views/ListView.jsx (1,381 lines)

Read lines 1–400 (imports, overview cards row, table container, column headers).
DO NOT MODIFY member rows or footer yet.

Migrate:
- Overview cards row layout (uses OverviewCard + ScoreBreakdownCard already migrated)
- Table container: scroll area, borders, background
- Column headers: sort indicators, widths
- FilterSortControls integration area

Run: npm test -- --run
Commit: "refactor: ListView header + table structure -- migrate inline styles"
Update PROGRESS.md: mark 7.11 complete.
```

### Task 7.12 — Migrate ListView.jsx: Member Rows + Expanded Content

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/views/ListView.jsx

Read lines 400–1000 (member row rendering + expanded detail panel).

Migrate:
- Member row: avatar cell, name cell, status badge, metrics cells, score cell
- Expand/collapse animation (keep transition, migrate container)
- Expanded detail panel: sub-metrics, task info, breaks display
- Row hover state → Tailwind hover: classes

Ensure member names use getAdaptiveFontFamily for RTL.

Run: npm test -- --run
Commit: "refactor: ListView member rows -- migrate inline styles"
Update PROGRESS.md: mark 7.12 complete.
```

### Task 7.13 — Migrate ListView.jsx: Footer + Mobile

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/views/ListView.jsx

Read lines 1000–1381 (summary footer + mobile card layout + RankingTable integration).

Migrate:
- Summary footer row (team totals)
- Mobile card layout (compact cards for small viewports)
- RankingTable section headers

Run: npm test -- --run
Commit: "refactor: ListView footer + mobile -- migrate inline styles"
Update PROGRESS.md: mark 7.13 complete.
```

### Task 7.14 — Migrate RankingTable.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/table/RankingTable.jsx (610 lines)

Read fully. Migrate:
- Table container and header row
- Rank badge: medal colors (gold/silver/bronze) using Tailwind rank-* colors from config
- Member name cell: ensure getAdaptiveFontFamily for RTL
- Score cell: getMetricColorClass already used, keep it
- Sort controls

Run: npm test -- --run
Commit: "refactor: RankingTable -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 7.14 complete.
```

### Task 7.15 — Migrate Leaves Sub-Components (5 files)

```
Read CLAUDE.md. Read PROGRESS.md.

Files (migrate all 5 in one task — they're tightly coupled):
1. src/components/views/LeavesTab.jsx (125 lines)
2. src/components/views/leaves/TeamOverviewPanel.jsx (384 lines)
3. src/components/views/leaves/LeaveCalendar.jsx (297 lines)
4. src/components/views/leaves/MemberLeaveDetail.jsx (287 lines)
5. src/components/views/leaves/QuotaBar.jsx (51 lines)

Read all 5 files. Migrate:
- LeavesTab: tab buttons, sub-tab container
- TeamOverviewPanel: member status chips, quota display
- LeaveCalendar: calendar grid, day cells, navigation
- MemberLeaveDetail: leave record cards
- QuotaBar: progress bar + label

Ensure member names in all files use getAdaptiveFontFamily for RTL.

Run: npm test -- --run
Commit: "refactor: leaves components -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 7.15 complete.
```

### Task 7.16 — Migrate ErrorBoundary.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/ErrorBoundary.jsx (259 lines)

This is a class component. Cannot use hooks. Cannot use theme object directly.
Instead: replace all hardcoded hex colors with CSS var() references.
e.g., color: '#ffffff' → color: 'var(--color-text)'
e.g., background: '#0a0a0a' → background: 'var(--color-bg)'
e.g., border: '1px solid #1e1e1e' → border: '1px solid var(--color-border)'

The CSS vars are set on :root by useTheme (Task 1.2), so they'll
be available even for class components.

Keep: the single console.error call (intentional, ErrorBoundary use case).

Run: npm test -- --run
Commit: "refactor: ErrorBoundary -- replace hardcoded colors with CSS vars"
Update PROGRESS.md: mark 7.16 complete.
```

### Task 7.17 — Migrate App.jsx

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/App.jsx (563 lines)

Read fully. App.jsx is the top-level layout orchestrator.
Migrate:
- Root container: background, min-height → style={{ background: 'var(--color-bg)' }} + Tailwind
- Main content area: padding, grid/flex layout → Tailwind
- Skeleton loading section: uses SkeletonMemberCard etc. (already migrated in 4.7)
- Section spacing: cardGap, sectionGap → Tailwind gap classes

After this task, no component should rely on the theme prop for layout/color styling.
The theme prop chain continues to exist for backward compatibility but is no longer
needed by any component for visual styling.

Run: npm test -- --run
Commit: "refactor: App.jsx -- migrate inline styles to Tailwind + CSS vars"
Update PROGRESS.md: mark 7.17 complete.
```

### Task 7.18 — Verify Large Component Migration

```
Read CLAUDE.md. Read PROGRESS.md.

Full visual regression test:
1. Run: npm test -- --run → all 228 tests pass
2. Run: npm run build → no errors, note bundle size
3. Run: npm run dev → full manual walkthrough:

   True Black theme:
   a. Dashboard grid view: all 5 member card states visible
   b. List view: full table, expand a row, check expanded detail
   c. Leaves tab: overview panel + calendar
   d. Open MemberDetailModal: all 3 tabs (Timeline, Performance, Leaves)
   e. Open DashboardDetailModal: all 3 types (time, tasks, score)
   f. Open TaskListModal: verify task list renders
   g. Open DatePickerModal: verify calendar renders, select a range
   h. Open SettingsModal: walk through all 7 tabs
   i. Mobile (375px): verify MobileBottomNav, all cards visible

   Switch to Noir Glass theme:
   Repeat checks a–i

Document any visual discrepancies in PROGRESS.md with file:line references.
Fix any found before committing.

Commit: "chore: verify large component migration -- no visual changes"
Update PROGRESS.md: mark 7.18 complete.
```

---

## Phase 8 — Touch Target Fixes

> **Minimum touch target: 44×44px** (WCAG 2.5.5 guideline).
> Run `npm test -- --run` after each task.

### Task 8.1 — Fix ModalShell Close Button

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/ModalShell.jsx

Current close button size: ~28×28px.
Fix: increase to minimum 44×44px.

Options:
a. className="w-11 h-11 flex items-center justify-center" (44×44px)
   and reduce the X icon font-size slightly if needed for visual balance
b. Add negative margin to keep visual size while expanding tap area:
   className="w-11 h-11 flex items-center justify-center -mr-2 -mt-2"

Choose option that best preserves visual appearance.
Adjust modal header padding/alignment if needed.

Run: npm test -- --run
Commit: "fix: ModalShell close button -- increase touch target to 44×44px"
Update PROGRESS.md: mark 8.1 complete.
```

### Task 8.2 — Fix ProjectBreakdownCard StatusPill

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/ProjectBreakdownCard.jsx

Locate the StatusPill sub-component inside the file.
Check: is StatusPill clickable (has onClick) or display-only?

If CLICKABLE: increase padding so minimum height ≥ 44px.
  e.g., padding: '3px 8px' → padding: '12px 10px'
  Adjust to maintain visual balance.

If DISPLAY-ONLY (no onClick): this is NOT a touch target issue.
  Document as "display-only, no fix needed".

Run: npm test -- --run
Commit: "fix: ProjectBreakdownCard StatusPill -- [increase touch target / confirm display-only]"
Update PROGRESS.md: mark 8.2 complete.
```

### Task 8.3 — Fix FilterSortControls Dropdown Items

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/layout/FilterSortControls.jsx

Dropdown menu items currently have approximately padding: 11px 14px.
Total height ≈ 11+11+line-height(~18px) = ~40px. Below 44px.

Fix: increase to padding: 12px 16px minimum.
Also verify: filter/sort button trigger area ≥ 44px height.

Run: npm test -- --run
Commit: "fix: FilterSortControls -- 44px minimum for dropdown items"
Update PROGRESS.md: mark 8.3 complete.
```

### Task 8.4 — Fix Header + MobileBottomNav Menu Items

```
Read CLAUDE.md. Read PROGRESS.md.

Files:
- src/components/layout/Header.jsx
- src/components/layout/MobileBottomNav.jsx

Check: avatar dropdown menu items in both files.
Check: MobileBottomNav tab buttons (should already be fine — full-width tappable).
Fix any items below 44px.

Run: npm test -- --run
Commit: "fix: Header + MobileBottomNav -- 44px touch targets on menu items"
Update PROGRESS.md: mark 8.4 complete.
```

### Task 8.5 — Fix SettingsModal Form Controls

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/SettingsModal.jsx

Check tab navigation buttons (sidebar on desktop, header row on mobile).
Check toggle switches (theme, boolean settings).
Check checkbox inputs.
Fix any interactive element below 44px.

Run: npm test -- --run
Commit: "fix: SettingsModal -- 44px touch targets on tabs and controls"
Update PROGRESS.md: mark 8.5 complete.
```

### Task 8.6 — Fix LeavesTab Tab Buttons

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/views/LeavesTab.jsx

Tab buttons (Overview / Calendar) likely have padding: 6px 16px.
Total height ≈ 6+6+18 = ~30px. Below 44px.
Fix: padding: 12px 16px minimum.

Run: npm test -- --run
Commit: "fix: LeavesTab -- 44px tab button touch targets"
Update PROGRESS.md: mark 8.6 complete.
```

---

## Phase 9 — Empty States

> Add consistent empty states using the `EmptyState` component from ModalShell.jsx.

### Task 9.1 — Grid View Empty State (App.jsx)

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/App.jsx

When filteredMembers is empty (length === 0), show:
- Icon: 👥 or similar
- Title: "No members to display"
- Subtitle: "Check your member filter in Settings → Team"

Import EmptyState from ModalShell OR create a simple inline version
(since App.jsx is a top-level file that shouldn't depend on a modal component).

Place the empty state where the member cards grid would normally appear.
The overview cards (team stats) should still show above it.

Run: npm test -- --run
Commit: "fix: App.jsx -- add empty state for no members"
Update PROGRESS.md: mark 9.1 complete.
```

### Task 9.2 — List View Empty State

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/views/ListView.jsx

When members prop is empty, show empty state in the table body.
Use the same style as 9.1 (consistent message).

Run: npm test -- --run
Commit: "fix: ListView -- add empty state for no members"
Update PROGRESS.md: mark 9.2 complete.
```

### Task 9.3 — LeavesTab Empty State

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/views/LeavesTab.jsx
Also check: src/components/views/leaves/TeamOverviewPanel.jsx
           src/components/views/leaves/LeaveCalendar.jsx

When db.leaves query returns empty array:
- TeamOverviewPanel: show "No leave records" message
- LeaveCalendar: show "No leave dates to display" instead of empty calendar

Use EmptyState from ModalShell.jsx or consistent inline pattern.

Run: npm test -- --run
Commit: "fix: LeavesTab -- add empty states for no leave data"
Update PROGRESS.md: mark 9.3 complete.
```

### Task 9.4 — ProjectBreakdownCard Empty State

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/ProjectBreakdownCard.jsx

Read line ~203 where current "no data" placeholder is.
If it already uses EmptyState or similar consistent pattern → mark as done.
If it shows blank space or a different style → standardize to match other empty states.

Run: npm test -- --run
Commit: "fix: ProjectBreakdownCard -- standardize empty state"
Update PROGRESS.md: mark 9.4 complete.
```

### Task 9.5 — RankingTable Empty State

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/table/RankingTable.jsx

When members array is empty, show empty state instead of empty table.
Message: "No members to rank"

Run: npm test -- --run
Commit: "fix: RankingTable -- add empty state for no members"
Update PROGRESS.md: mark 9.5 complete.
```

---

## Phase 10 — RTL Polish

> Apply `getAdaptiveFontFamily()` or `getTextFontStyle()` to all user-facing text
> that could contain Arabic characters. Task names, member names, project names.

### Task 10.1 — RTL: SettingsModal

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/SettingsModal.jsx

Find all places where member names or project-related text is displayed.
Apply getAdaptiveFontFamily(text) to fontFamily where text is user-generated.
Specifically: member name display in Team tab, any text input labels that show
stored names back to user.

NOTE: Settings labels like "Break Gap Minutes" are hardcoded English → skip.

Run: npm test -- --run
Commit: "fix: SettingsModal -- RTL font handling for member names"
Update PROGRESS.md: mark 10.1 complete.
```

### Task 10.2 — RTL: TaskListModal

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/modals/TaskListModal.jsx

Find all task name displays. Apply getAdaptiveFontFamily(task.name) to fontFamily.
Task names from ClickUp can be Arabic.
Also check: project name display in task cards.

Run: npm test -- --run
Commit: "fix: TaskListModal -- RTL font handling for task and project names"
Update PROGRESS.md: mark 10.2 complete.
```

### Task 10.3 — RTL: ScoreBreakdownCard Verification

```
Read CLAUDE.md. Read PROGRESS.md.

File: src/components/cards/ScoreBreakdownCard.jsx

Check: does this card display any user-generated text (member names, task names)?
If NO (only hardcoded labels like "Time Tracked", "Workload") → mark as done, no changes.
If YES → apply getAdaptiveFontFamily where needed.

Run: npm test -- --run (no changes expected)
Commit: "chore: ScoreBreakdownCard -- RTL audit, labels are English-only (no changes)"
Update PROGRESS.md: mark 10.3 complete.
```

### Task 10.4 — RTL: Leaves Sub-Components

```
Read CLAUDE.md. Read PROGRESS.md.

Files:
- src/components/views/leaves/TeamOverviewPanel.jsx
- src/components/views/leaves/MemberLeaveDetail.jsx
- src/components/views/leaves/LeaveCalendar.jsx

Member names displayed in leave views should use getTextFontStyle or
getAdaptiveFontFamily for RTL support.
Leave type labels ("Annual Leave", "WFH") are English-only → skip.
Leave reason/notes fields (if any) → apply RTL.

Run: npm test -- --run
Commit: "fix: leaves components -- RTL font handling for member names"
Update PROGRESS.md: mark 10.4 complete.
```

### Task 10.5 — RTL: RankingTable + ListView Complete Coverage

```
Read CLAUDE.md. Read PROGRESS.md.

Files:
- src/components/table/RankingTable.jsx
- src/components/views/ListView.jsx

RankingTable: ensure member name cells use getTextFontStyle(name).
ListView: verify all user text fields (member name, task name, project name)
use getAdaptiveFontFamily. ListView.jsx already uses it in some places —
do a complete audit to ensure coverage.

Run: npm test -- --run
Commit: "fix: RankingTable + ListView -- complete RTL font coverage"
Update PROGRESS.md: mark 10.5 complete.
```

---

## Phase 11 — Final Verification

### Task 11.1 — Full Build + Test Suite

```
Read CLAUDE.md. Read PROGRESS.md.

1. Run: npm test -- --run
   Expected: 228+ tests passing (more if any new tests were added during migration)
   Report exact count.

2. Run: npm run build
   Must succeed with zero errors.
   Note any warnings.
   Report bundle size (check output for chunk sizes).

3. Run: npx playwright test tests/visual/ (if Playwright is running)
   Report: X/177 passing (should remain 177/177).

If anything fails, investigate and fix.

Commit: "chore: final build + test suite -- all pass"
Update PROGRESS.md: mark 11.1 complete.
```

### Task 11.2 — Visual Regression Check (Both Themes)

```
Read CLAUDE.md. Read PROGRESS.md.

Run: npm run dev

Full manual walkthrough — verify BOTH themes look identical to pre-migration:

TRUE BLACK THEME:
1. Dashboard grid: working card (green border), break card (amber), offline (gray), noActivity (compact), leave (purple)
2. OverviewCard: stats display, backdrop blur
3. ScoreBreakdownCard: 4 metric blocks
4. ProjectBreakdownCard: project list
5. FilterSortControls: dropdown opens, items readable
6. Header: sync dot, date display, avatar menu
7. List View: table rows, expand one row
8. Leaves tab: calendar, team overview
9. MemberDetailModal: all 3 tabs
10. DashboardDetailModal: time/tasks/score types
11. SettingsModal: all 7 tabs including display toggle
12. DatePickerModal: calendar, range selection

NOIR GLASS THEME:
Repeat all above.

Document any discrepancy with file:line reference.
Fix immediately if found.

Commit: "chore: visual regression check -- [PASS or list of fixes]"
Update PROGRESS.md: mark 11.2 complete.
```

### Task 11.3 — Spacing Consistency Audit

```
Read CLAUDE.md. Read PROGRESS.md.

After migration, verify spacing is consistent across all card types.
Target standard:
- Card padding: 16px (p-4) for member state cards
- Dashboard card padding: 20-24px (p-5 or p-6) — OverviewCard, ScoreBreakdownCard
- Card gap: 16px (gap-4) in the grid
- Section gap: 24px (gap-6) between major sections

For any remaining inconsistencies, fix to match the majority pattern.
Document the final spacing standard in PROGRESS.md.

Run: npm test -- --run
Commit: "fix: spacing consistency -- standardize card padding and gaps"
Update PROGRESS.md: mark 11.3 complete.
```

### Task 11.4 — Update CLAUDE.md

```
Read CLAUDE.md. Read PROGRESS.md.

Update the Key Design Decisions section in CLAUDE.md.

ADD a new subsection: "CSS Custom Properties (Post-Migration)"

Content to add:
- CSS custom properties defined in src/index.css (:root block)
- Mapped to theme values: --color-text, --color-bg, --color-card-bg, etc.
- Set at runtime by src/hooks/useTheme.js whenever theme changes
- New components SHOULD use: className="text-[var(--color-text)]" or th-* Tailwind classes
- useThemeStyles hook at src/hooks/useThemeStyles.js for common style presets
- The theme prop is kept in function signatures for backward compat but no longer needed
- Inline styles are deprecated for new code — use CSS vars instead

Also update the Tailwind + Inline Styles Coexistence section to reflect that
"legacy" inline styles are now migrated components, not the norm.

Commit: "docs: update CLAUDE.md -- CSS custom properties migration notes"
Update PROGRESS.md: mark 11.4 complete.
```

### Task 11.5 — Final Metrics + Cleanup

```
Read CLAUDE.md. Read PROGRESS.md.

Final cleanup checklist:
1. Re-run inline style inventory (like Task 0.2). Compare before/after:
   Before: 1,211 inline style attributes, 1,073 theme.* refs, ~180 Tailwind classes
   After: Target <100 inline styles (gradients/dynamic only), ~0 theme.* refs, >>500 Tailwind classes

2. Check for any leftover .tmp, .bak, .orig files

3. Verify no stray console.* calls remain (except logger.js + ErrorBoundary.jsx)

4. Update PROGRESS.md with final summary:
   ## UX Plan Final Summary
   - Total inline styles removed: [N]
   - Total Tailwind classes added: [N]
   - Console calls migrated: [N]
   - Dead code removed: MemberRow.jsx (425 lines) + [any others]
   - Touch targets fixed: [N]
   - Empty states added: [N]
   - RTL gaps closed: [N]
   - Themes verified: True Black + Noir Glass ✅

5. Mark ALL UX tasks complete in PROGRESS.md.

Commit: "chore: UX audit complete -- final metrics + cleanup"
```

---

## Quick Reference — Key Files

| File | Lines | Role in UX Plan |
|------|-------|-----------------|
| `src/index.css` | 76 | Phase 1.1: Add CSS custom properties |
| `src/hooks/useTheme.js` | 49 | Phase 1.2: Wire CSS var updates |
| `tailwind.config.js` | 90 | Phase 1.3: Add th-* color tokens |
| `src/hooks/useThemeStyles.js` | new | Phase 1.4: Create helper hook |
| `src/constants/themes.js` | ~150 | Reference: theme property names |
| `src/utils/logger.js` | 39 | Reference: logger.info/warn/error/debug |
| `src/components/cards/member-states/CardShell.jsx` | 224 | Reference: migration pattern (Tailwind + inline mix) |
| `src/components/modals/ModalShell.jsx` | 317 | Phase 7.1: Must do BEFORE other modals |
| `src/components/modals/MemberDetailModal.jsx` | 1,995 | Phase 7.5–7.7: Split across 3 tasks |
| `src/components/modals/SettingsModal.jsx` | 1,167 | Phase 7.8–7.10: Split across 3 tasks |
| `src/components/views/ListView.jsx` | 1,381 | Phase 7.11–7.13: Split across 3 tasks |

## Quick Reference — Commands

```bash
npm run dev          # Dev server (http://localhost:5173)
npm test -- --run    # Run all Vitest tests once (expect 228+)
npm run build        # Production build
npx playwright test tests/visual/  # Run Playwright visual tests
```

## Quick Reference — CSS Variable Names (Phase 1 onward)

```
Backgrounds:   --color-bg, --color-card-bg, --color-inner-bg, --color-subtle-bg
Borders:       --color-border, --color-border-light
Text:          --color-text, --color-text-secondary, --color-text-muted
Status:        --color-working, --color-break, --color-offline, --color-leave, --color-no-activity
Accents:       --color-accent, --color-danger, --color-success, --color-warning
Effects:       --effect-backdrop-blur, --effect-card-shadow
Tailwind th-*: text-th-text, bg-th-card, border-th-border, text-th-text-muted, etc.
```

## Phase Execution Order

```
Phase 0 (Audit)          ← must complete first
Phase 1 (Foundation)     ← must complete before Phases 4–7
Phase 2 (Console)        ← independent, can run after Phase 0
Phase 3 (Dead Code)      ← independent, can run after Phase 0
Phase 4 (UI Components)  ← after Phase 1
Phase 5 (Cards)          ← after Phase 4
Phase 6 (Layout)         ← after Phase 4, parallel with Phase 5
Phase 7 (Large)          ← after Phase 1; 7.1 (ModalShell) before 7.2–7.4
Phase 8 (Touch Targets)  ← after Phase 7
Phase 9 (Empty States)   ← after Phase 7
Phase 10 (RTL)           ← after Phase 7
Phase 11 (Final)         ← must be last
```

---

*Generated: March 2026 | Part B of Lighthouse UI/UX Plan series*
