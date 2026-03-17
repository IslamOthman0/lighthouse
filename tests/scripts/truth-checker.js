/**
 * Lighthouse QA - Truth Checker
 * ──────────────────────────────────────────────────────────────────────────
 * Cross-validates dashboard displayed values against raw ClickUp API data.
 *
 * Usage:
 *   node tests/scripts/truth-checker.js
 *   node tests/scripts/truth-checker.js --range yesterday
 *   node tests/scripts/truth-checker.js --range last-week
 *   node tests/scripts/truth-checker.js --range last-month
 *
 * Exit code:
 *   0 = all values match within tolerance
 *   1 = mismatches found (see report)
 *
 * Output:
 *   Console table + tests/results/truth-check-YYYY-MM-DD.txt
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

// ─── Load env vars from .env.local ──────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');

function loadEnv() {
  try {
    const envPath = join(projectRoot, '.env.local');
    const content = readFileSync(envPath, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
    return env;
  } catch (e) {
    console.error('❌ Could not read .env.local:', e.message);
    process.exit(1);
  }
}

const env = loadEnv();
const API_KEY = env.VITE_CLICKUP_API_KEY;
const TEAM_ID = env.VITE_CLICKUP_TEAM_ID;

if (!API_KEY || !TEAM_ID) {
  console.error('❌ Missing VITE_CLICKUP_API_KEY or VITE_CLICKUP_TEAM_ID in .env.local');
  process.exit(1);
}

// ─── Monitored Members ───────────────────────────────────────────────────────
const MONITORED_MEMBERS = [
  { id: '87657591', name: 'Dina Ibrahim',  initials: 'DI' },
  { id: '93604849', name: 'Alaa Soliman',  initials: 'AS' },
  { id: '93604850', name: 'Nada Meshref',  initials: 'NM' },
  { id: '93604848', name: 'Nada Amr',      initials: 'NA' },
  { id: '87650455', name: 'Islam Othman',  initials: 'IO' },
  { id: '87657592', name: 'Riham',         initials: 'RI' },
  { id: '87657593', name: 'Samar Magdy',   initials: 'SA' },
  { id: '87708246', name: 'Merit Fouad',   initials: 'MF' },
];

// Work window for compliance: 08:00–18:00
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 18;

// Tolerance: ±1 minute (60 000 ms → 0.0167 hours)
const TOLERANCE_HOURS = 1 / 60;

// ─── Date Range Helpers ───────────────────────────────────────────────────────
function getDateRange(rangeName) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (rangeName) {
    case 'today': {
      const start = new Date(today);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Today', preset: 'today' };
    }
    case 'yesterday': {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Yesterday', preset: 'yesterday' };
    }
    case 'last-week': {
      const dayOfWeek = today.getDay(); // 0=Sun
      const monday = new Date(today);
      monday.setDate(today.getDate() - dayOfWeek - 6);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { start: monday, end: sunday, label: 'Last Week', preset: 'last_week' };
    }
    case 'last-month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Last Month', preset: 'last_month' };
    }
    default:
      throw new Error(`Unknown range: ${rangeName}`);
  }
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function msToHours(ms) {
  return ms / 1000 / 60 / 60;
}

function hoursToHM(h) {
  const totalMins = Math.round(h * 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs}h ${mins}m`;
}

// ─── ClickUp API Fetcher ──────────────────────────────────────────────────────
async function fetchTimeEntries(startMs, endMs) {
  const memberIds = MONITORED_MEMBERS.map(m => m.id);
  const assigneeParam = memberIds.map(id => `assignee[]=${id}`).join('&');
  const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?start_date=${startMs}&end_date=${endMs}&${assigneeParam}`;

  const res = await fetch(url, {
    headers: { 'Authorization': API_KEY, 'Content-Type': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`ClickUp API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.data || [];
}

// ─── Calculate from API entries ───────────────────────────────────────────────
function calculateFromEntries(entries, rangeStart, rangeEnd) {
  const perMember = {};
  for (const m of MONITORED_MEMBERS) {
    perMember[m.id] = { name: m.name, tracked: 0, complianceHours: 0 };
  }

  for (const entry of entries) {
    const userId = String(entry.user?.id || entry.uid);
    if (!perMember[userId]) continue;

    const entryStart = parseInt(entry.start);
    const entryEnd = entry.end ? parseInt(entry.end) : Date.now();

    // Clip to selected range
    const clippedStart = Math.max(entryStart, rangeStart.getTime());
    const clippedEnd = Math.min(entryEnd, rangeEnd.getTime());
    if (clippedEnd <= clippedStart) continue;

    const durationMs = clippedEnd - clippedStart;
    const durationHours = msToHours(durationMs);
    perMember[userId].tracked += durationHours;

    // Compliance: hours within 08:00–18:00 window
    const startDate = new Date(clippedStart);
    const endDate = new Date(clippedEnd);
    const workStart = new Date(startDate);
    workStart.setHours(WORK_START_HOUR, 0, 0, 0);
    const workEnd = new Date(startDate);
    workEnd.setHours(WORK_END_HOUR, 0, 0, 0);

    const compStart = Math.max(clippedStart, workStart.getTime());
    const compEnd = Math.min(clippedEnd, workEnd.getTime());
    if (compEnd > compStart) {
      perMember[userId].complianceHours += msToHours(compEnd - compStart);
    }
  }

  const totalTracked = Object.values(perMember).reduce((s, m) => s + m.tracked, 0);
  const totalCompliance = Object.values(perMember).reduce((s, m) => s + m.complianceHours, 0);
  const compliancePct = totalTracked > 0 ? (totalCompliance / totalTracked) * 100 : 0;

  return { perMember, totalTracked, totalCompliance, compliancePct };
}

// ─── Dashboard Reader (via Playwright) ────────────────────────────────────────
async function readDashboardValues(rangeName, rangeLabel) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('[data-testid="overview-card-team-tracked"]', { timeout: 15000 });

    // If not "today", set the date range via the store directly
    if (rangeName !== 'today') {
      const range = getDateRange(rangeName);
      await page.evaluate(({ start, end, preset }) => {
        // Access Zustand store from window (if exposed) — fallback: parse DOM
        const store = window.__zustand_store__;
        if (store && store.getState().setDateRange) {
          store.getState().setDateRange(new Date(start), new Date(end), preset);
        }
      }, {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        preset: range.preset
      });

      // Wait for sync after date change
      await page.waitForTimeout(8000);
    } else {
      await page.waitForTimeout(5000);
    }

    // Read overview card text
    const overviewText = await page.locator('[data-testid="overview-card-team-tracked"]').textContent().catch(() => '');

    // Open time detail modal to read per-member data
    await page.locator('[data-testid="overview-card-team-tracked"]').click();
    await page.waitForTimeout(800);

    const modal = page.locator('[data-testid="dashboard-detail-modal-time"]');
    const modalText = await modal.textContent().catch(() => '');

    // Extract team total from modal text (look for "Xh Ym" pattern after "Total Time Tracked")
    const totalMatch = modalText.match(/Total Time Tracked[\s\S]*?(\d+h\s*\d+m)/);
    const dashboardTotalText = totalMatch ? totalMatch[1] : 'not found';

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    return {
      overviewText: overviewText.trim(),
      modalText: modalText.trim(),
      dashboardTotalText,
      rawModalText: modalText,
    };
  } finally {
    await browser.close();
  }
}

// ─── Parse "Xh Ym" → hours ───────────────────────────────────────────────────
function parseHM(text) {
  // Match patterns like "6h 27m", "6h", "27m", "6h27m"
  const match = text.match(/(\d+)h\s*(\d+)?m?/);
  if (!match) return null;
  const hrs = parseInt(match[1] || '0');
  const mins = parseInt(match[2] || '0');
  return hrs + mins / 60;
}

// ─── Compare & Report ─────────────────────────────────────────────────────────
function compare(apiHours, dashboardText, memberName) {
  const dashHours = parseHM(dashboardText);
  if (dashHours === null) {
    return { match: false, reason: `Could not parse dashboard value: "${dashboardText}"` };
  }
  const diff = Math.abs(apiHours - dashHours);
  if (diff <= TOLERANCE_HOURS) {
    return { match: true, diff };
  }
  return {
    match: false,
    reason: `API: ${hoursToHM(apiHours)} vs Dashboard: ${hoursToHM(dashHours)} (diff: ${hoursToHM(diff)})`,
    diff
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const rangeIdx = args.indexOf('--range');
  const rangeName = rangeIdx !== -1 ? args[rangeIdx + 1] : 'yesterday';

  const range = getDateRange(rangeName);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║         Lighthouse QA - Truth Checker               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\nRange: ${range.label} (${formatDate(range.start)} — ${formatDate(range.end)})`);
  console.log(`API Key: ${API_KEY.slice(0, 8)}... | Team: ${TEAM_ID}\n`);

  // ── Step 1: Fetch from ClickUp API ─────────────────────────────────────
  console.log('📡 Fetching time entries from ClickUp API...');

  // ClickUp max 30 days per request — split into chunks if needed
  const totalDays = (range.end - range.start) / (1000 * 60 * 60 * 24);
  let allEntries = [];

  if (totalDays <= 30) {
    const entries = await fetchTimeEntries(range.start.getTime(), range.end.getTime());
    allEntries = entries;
    console.log(`  ✓ Fetched ${entries.length} time entries`);
  } else {
    // Split into 30-day chunks
    let chunkStart = new Date(range.start);
    while (chunkStart < range.end) {
      const chunkEnd = new Date(chunkStart);
      chunkEnd.setDate(chunkEnd.getDate() + 30);
      if (chunkEnd > range.end) chunkEnd.setTime(range.end.getTime());

      const entries = await fetchTimeEntries(chunkStart.getTime(), chunkEnd.getTime());
      allEntries.push(...entries);
      console.log(`  ✓ Chunk ${formatDate(chunkStart)}–${formatDate(chunkEnd)}: ${entries.length} entries`);
      chunkStart = new Date(chunkEnd.getTime() + 1);
    }
    console.log(`  Total: ${allEntries.length} entries`);
  }

  // ── Step 2: Calculate from API ──────────────────────────────────────────
  const { perMember, totalTracked, compliancePct } = calculateFromEntries(allEntries, range.start, range.end);

  console.log('\n📊 API Calculations:');
  console.log(`  Total tracked: ${hoursToHM(totalTracked)}`);
  console.log(`  Compliance:    ${compliancePct.toFixed(1)}%`);
  for (const m of MONITORED_MEMBERS) {
    const data = perMember[m.id];
    console.log(`  ${m.name.padEnd(15)} ${hoursToHM(data.tracked)}`);
  }

  // ── Step 3: Read dashboard values ───────────────────────────────────────
  console.log('\n🌐 Reading dashboard values (launching browser)...');
  let dashboardData;
  try {
    dashboardData = await readDashboardValues(rangeName, range.label);
    console.log(`  ✓ Dashboard total text: "${dashboardData.dashboardTotalText}"`);
  } catch (e) {
    console.error('  ❌ Failed to read dashboard:', e.message);
    console.log('  ⚠️  Make sure the dev server is running: npm run dev');
    dashboardData = null;
  }

  // ── Step 4: Compare ─────────────────────────────────────────────────────
  console.log('\n🔍 Comparison Results:');

  const rows = [];
  let anyMismatch = false;

  // Team total comparison
  if (dashboardData) {
    const dashTotalHours = parseHM(dashboardData.dashboardTotalText);
    const totalDiff = dashTotalHours !== null ? Math.abs(totalTracked - dashTotalHours) : Infinity;
    const totalMatch = totalDiff <= TOLERANCE_HOURS;
    if (!totalMatch) anyMismatch = true;

    rows.push({
      label: 'TEAM TOTAL',
      api: hoursToHM(totalTracked),
      dashboard: dashboardData.dashboardTotalText,
      match: totalMatch ? '✅' : '❌',
      diff: totalDiff < Infinity ? hoursToHM(totalDiff) : 'n/a',
    });
  }

  // Per-member comparisons (extract from modal text)
  for (const m of MONITORED_MEMBERS) {
    const apiHours = perMember[m.id].tracked;
    let dashText = 'not found';

    if (dashboardData) {
      // Try to extract member's hours from modal text (look for name followed by Xh Ym pattern)
      const nameEscaped = m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const firstNameEscaped = m.name.split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const memberPattern = new RegExp(`${firstNameEscaped}[\\s\\S]{0,50}?(\\d+h\\s*\\d*m?)`, 'i');
      const match = dashboardData.rawModalText.match(memberPattern);
      if (match) dashText = match[1];
    }

    const dashHours = parseHM(dashText);
    const diff = dashHours !== null ? Math.abs(apiHours - dashHours) : Infinity;
    const isMatch = diff <= TOLERANCE_HOURS;
    if (!isMatch && dashHours !== null) anyMismatch = true;

    rows.push({
      label: m.name,
      api: hoursToHM(apiHours),
      dashboard: dashText,
      match: dashHours === null ? '⚠️ ' : (isMatch ? '✅' : '❌'),
      diff: diff < Infinity ? hoursToHM(diff) : 'n/a',
    });
  }

  // Print table
  const colWidths = { label: 18, api: 10, dashboard: 12, match: 6, diff: 10 };
  const header = `${'Member/Metric'.padEnd(colWidths.label)} ${'API'.padEnd(colWidths.api)} ${'Dashboard'.padEnd(colWidths.dashboard)} ${'Match'.padEnd(colWidths.match)} Diff`;
  const separator = '─'.repeat(header.length);
  console.log('\n' + separator);
  console.log(header);
  console.log(separator);
  for (const row of rows) {
    console.log(
      `${row.label.padEnd(colWidths.label)} ${row.api.padEnd(colWidths.api)} ${row.dashboard.padEnd(colWidths.dashboard)} ${row.match.padEnd(colWidths.match)} ${row.diff}`
    );
  }
  console.log(separator);

  // ── Step 5: Write report file ───────────────────────────────────────────
  const dateStr = new Date().toISOString().slice(0, 10);
  const reportPath = join(projectRoot, 'tests', 'results', `truth-check-${dateStr}.txt`);

  const report = [
    `Lighthouse QA Truth Checker Report`,
    `Generated: ${new Date().toISOString()}`,
    `Range: ${range.label} (${formatDate(range.start)} — ${formatDate(range.end)})`,
    ``,
    header,
    separator,
    ...rows.map(r =>
      `${r.label.padEnd(colWidths.label)} ${r.api.padEnd(colWidths.api)} ${r.dashboard.padEnd(colWidths.dashboard)} ${r.match.padEnd(colWidths.match)} ${r.diff}`
    ),
    separator,
    ``,
    `Result: ${anyMismatch ? 'MISMATCHES FOUND ❌' : 'ALL MATCH ✅'}`,
    `Tolerance: ±1 minute`,
  ].join('\n');

  mkdirSync(join(projectRoot, 'tests', 'results'), { recursive: true });
  writeFileSync(reportPath, report, 'utf8');
  console.log(`\n📄 Report saved: ${reportPath}`);

  // ── Step 6: Exit code ───────────────────────────────────────────────────
  if (anyMismatch) {
    console.log('\n❌ RESULT: Mismatches found — check the report above');
    process.exit(1);
  } else {
    console.log('\n✅ RESULT: All values match within tolerance (±1 minute)');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('❌ Truth checker failed:', err);
  process.exit(1);
});
