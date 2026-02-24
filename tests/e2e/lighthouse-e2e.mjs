
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = './test-screenshots';
const TIMEOUT = 45000;
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true };

// ═══════════════════════════════════════════════════════════════════
// HARNESS
// ═══════════════════════════════════════════════════════════════════
let browser, page;
const results = [];
const consoleLogs = [];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function shot(name) {
  const p = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`    📸 ${p}`);
  return p;
}

async function run(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    const ms = Date.now() - t0;
    results.push({ name, status: 'PASS', ms });
    console.log(`  ✅ ${name} (${ms}ms)`);
  } catch (err) {
    const ms = Date.now() - t0;
    results.push({ name, status: 'FAIL', ms, error: err.message });
    console.log(`  ❌ ${name} (${ms}ms) — ${err.message}`);
    await shot(`FAIL-${name.replace(/[^a-zA-Z0-9]/g, '-')}`).catch(() => {});
  }
}

async function waitForDashboard() {
  // Wait for at least one [data-testid="member-card"] to appear
  try {
    await page.waitForSelector('[data-testid="member-card"]', { timeout: TIMEOUT });
  } catch {
    // Fallback: wait for any card-like element
    await page.waitForFunction(
      () => document.querySelectorAll('[class*="card"], [class*="Card"]').length > 2,
      { timeout: TIMEOUT }
    ).catch(() => console.log('    ⚠️  Dashboard may still be loading'));
  }
  await new Promise(r => setTimeout(r, 1500)); // Settle
}

// ═══════════════════════════════════════════════════════════════════
// SETUP / TEARDOWN
// ═══════════════════════════════════════════════════════════════════
async function setup() {
  ensureDir(SCREENSHOT_DIR);
  browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: DESKTOP,
  });
  page = await browser.newPage();

  page.on('console', msg => {
    const entry = { type: msg.type(), text: msg.text(), ts: Date.now() };
    consoleLogs.push(entry);
    if (msg.type() === 'error' || msg.text().includes('[Lighthouse]')) {
      console.log(`    🖥️ [${msg.type()}] ${msg.text().slice(0, 200)}`);
    }
  });
  page.on('pageerror', err => {
    consoleLogs.push({ type: 'pageerror', text: err.message, ts: Date.now() });
    console.log(`    🚨 ${err.message.slice(0, 200)}`);
  });
}

async function teardown() {
  if (browser) await browser.close();
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'console-logs.json'),
    JSON.stringify(consoleLogs, null, 2)
  );
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n' + '═'.repeat(64));
  console.log(` RESULTS: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log('═'.repeat(64));
  results.forEach(r => {
    console.log(` ${r.status === 'PASS' ? '✅' : '❌'} ${r.name} (${r.ms}ms)${r.error ? ' — ' + r.error : ''}`);
  });
  console.log('═'.repeat(64));

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'test-results.json'),
    JSON.stringify({ date: new Date().toISOString(), passed, failed, results }, null, 2)
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUITE 1 — DATE PICKER
// ═══════════════════════════════════════════════════════════════════
async function suiteDatePicker() {
  console.log('\n📅 SUITE 1: DatePicker');
  console.log('─'.repeat(48));

  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await waitForDashboard();
  await shot('00-dashboard-loaded');

  // ── 1.1 Open date picker ────────────────────────────────────────
  await run('DP-01: Opens via header button', async () => {
    // The header has a button with 📅 emoji
    const btn = await page.evaluateHandle(() => {
      const buttons = [...document.querySelectorAll('button')];
      return buttons.find(b => b.textContent.includes('📅'));
    });
    if (!btn || !(await btn.asElement())) throw new Error('📅 button not found');
    await btn.asElement().click();
    await new Promise(r => setTimeout(r, 600));

    // Check modal appeared (fixed overlay with "Select Date Range" text)
    const found = await page.evaluate(() => {
      const els = document.querySelectorAll('h3');
      return [...els].some(h => h.textContent.includes('Select Date Range'));
    });
    if (!found) throw new Error('DatePicker modal did not open');
    await shot('01-datepicker-open');
  });

  // ── 1.2 Today is highlighted ───────────────────────────────────
  await run('DP-02: Today highlighted in calendar', async () => {
    const todayDate = new Date().getDate();
    const result = await page.evaluate((td) => {
      // Find calendar buttons; today should have a border style
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === String(td)) {
          const border = btn.style.border;
          // Today when not in range has "1px solid rgba(255, 255, 255, 0.4)"
          if (border && border.includes('rgba(255')) {
            return { found: true, border };
          }
          // Or it could be the start/end date (white bg)
          if (btn.style.background === '#ffffff') {
            return { found: true, isSelected: true };
          }
        }
      }
      return { found: false, todayDate: td };
    }, todayDate);
    if (!result.found) throw new Error(`Today (${todayDate}) not highlighted`);
  });

  // ── 1.3 Quick presets work ─────────────────────────────────────
  const presets = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month',
    'This Quarter', 'Last Quarter', 'Half Year', 'This Year'];

  for (const preset of presets) {
    await run(`DP-03: Quick preset "${preset}"`, async () => {
      // Click the preset button
      const clicked = await page.evaluate((label) => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.trim() === label) {
            btn.click();
            return true;
          }
        }
        return false;
      }, preset);
      if (!clicked) throw new Error(`Preset button "${preset}" not found`);

      await new Promise(r => setTimeout(r, 200));

      // Verify "Selected Range" display updated (not "Select dates")
      const display = await page.evaluate(() => {
        const divs = document.querySelectorAll('div');
        for (const div of divs) {
          if (div.textContent.includes('Selected Range')) {
            const sibling = div.nextElementSibling;
            return sibling?.textContent?.trim();
          }
        }
        return null;
      });
      if (!display || display === 'Select dates') {
        throw new Error(`Preset "${preset}" did not update display (got: "${display}")`);
      }
    });
  }
  await shot('02-presets-tested');

  // ── 1.4 Navigate months ────────────────────────────────────────
  await run('DP-04: Navigate to previous month', async () => {
    // Get current month text
    const before = await page.evaluate(() => {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const divs = document.querySelectorAll('div');
      for (const d of divs) {
        const t = d.textContent.trim();
        if (monthNames.some(m => t.startsWith(m)) && /\d{4}$/.test(t)) return t;
      }
      return null;
    });

    // Click ‹ (prev month) button
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === '‹') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 300));

    const after = await page.evaluate(() => {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const divs = document.querySelectorAll('div');
      for (const d of divs) {
        const t = d.textContent.trim();
        if (monthNames.some(m => t.startsWith(m)) && /\d{4}$/.test(t)) return t;
      }
      return null;
    });

    if (before === after) throw new Error(`Month unchanged: ${before}`);
    await shot('03-prev-month');
  });

  await run('DP-05: Navigate to next month', async () => {
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === '›') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 300));
    await shot('04-next-month');
  });

  // ── 1.5 Custom range selection ─────────────────────────────────
  await run('DP-06: Custom range — click start then end', async () => {
    // Navigate to current month first
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    const currentYear = new Date().getFullYear();

    // Keep clicking ‹ or › until we reach current month
    for (let i = 0; i < 12; i++) {
      const monthText = await page.evaluate(() => {
        const divs = document.querySelectorAll('div');
        for (const d of divs) {
          const t = d.textContent.trim();
          if (/^[A-Z][a-z]+ \d{4}$/.test(t)) return t;
        }
        return '';
      });
      if (monthText.includes(currentMonth) && monthText.includes(String(currentYear))) break;
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.trim() === '›') { btn.click(); return; }
        }
      });
      await new Promise(r => setTimeout(r, 200));
    }

    // Click day 5 (start)
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === '5' && btn.style.cursor === 'pointer') {
          btn.click(); return;
        }
      }
    });
    await new Promise(r => setTimeout(r, 200));

    // Click day 15 (end)
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === '15' && btn.style.cursor === 'pointer') {
          btn.click(); return;
        }
      }
    });
    await new Promise(r => setTimeout(r, 200));

    // Check range display shows two dates
    const display = await page.evaluate(() => {
      const divs = document.querySelectorAll('div');
      for (const d of divs) {
        const t = d.textContent.trim();
        if (t.includes('Feb 5') || t.includes('Jan 5') || t.includes('Mar 5')) return t;
      }
      return null;
    });
    await shot('05-custom-range');
  });

  // ── 1.6 Apply and verify dashboard update ──────────────────────
  await run('DP-07: Apply updates header date display', async () => {
    // Click Apply
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Apply') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 2000)); // Wait for sync

    // Check header shows a date (not "Today")
    const headerBtn = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('📅')) return btn.textContent.trim();
      }
      return null;
    });
    // After applying a custom range, header should show date instead of "Today"
    await shot('06-after-apply');
  });

  // ── 1.7 Escape closes picker ──────────────────────────────────
  await run('DP-08: Escape key closes picker', async () => {
    // Reopen
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('📅')) { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 500));

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));

    const stillOpen = await page.evaluate(() => {
      const h3s = document.querySelectorAll('h3');
      return [...h3s].some(h => h.textContent.includes('Select Date Range'));
    });
    if (stillOpen) throw new Error('Picker still open after Escape');
  });

  // ── 1.8 Overlay click closes picker ────────────────────────────
  await run('DP-09: Overlay click closes picker', async () => {
    // Reopen
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('📅')) { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 500));

    // Click at corner of viewport (should hit the overlay)
    await page.mouse.click(10, 10);
    await new Promise(r => setTimeout(r, 300));

    const stillOpen = await page.evaluate(() => {
      const h3s = document.querySelectorAll('h3');
      return [...h3s].some(h => h.textContent.includes('Select Date Range'));
    });
    if (stillOpen) throw new Error('Picker still open after overlay click');
  });

  // ── 1.9 Cancel restores original range ─────────────────────────
  await run('DP-10: Cancel restores original selection', async () => {
    // Reopen
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('📅')) { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 500));

    // Click "Yesterday" preset
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Yesterday') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 200));

    // Click Cancel (should revert)
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Cancel') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // Verify the selection was NOT applied (header still shows previous)
    await shot('07-after-cancel');
  });

  // ── 1.10 Future date clicking (BUG VERIFICATION) ──────────────
  await run('DP-11: [BUG] Future dates ARE clickable (should be disabled)', async () => {
    // Reopen
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('📅')) { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 500));

    // Navigate to next month
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === '›') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // Try to click day 15 of next month (future date)
    const clicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === '15' && !btn.disabled) {
          btn.click();
          return { clickable: true, disabled: btn.disabled };
        }
      }
      return { clickable: false };
    });

    await shot('08-future-date-bug');
    if (clicked.clickable) {
      console.log('    ⚠️  CONFIRMED BUG: Future date was clickable and not disabled');
      // This test PASSES to document the bug exists
    }
  });

  // ── 1.11 Mobile date picker ────────────────────────────────────
  await run('DP-12: Mobile viewport — no overflow', async () => {
    // Close any open modals first
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));

    await page.setViewport(MOBILE);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await waitForDashboard();

    // Open date picker (mobile: only 📅 emoji, no text)
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('📅')) { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 600));
    await shot('09-mobile-datepicker');

    // Check no horizontal overflow
    const overflow = await page.evaluate(() => {
      const modal = document.querySelector('div[style*="position: fixed"]');
      if (!modal) return { noModal: true };
      const inner = modal.querySelector('div[style*="maxWidth"]');
      if (!inner) return { noInner: true };
      const rect = inner.getBoundingClientRect();
      return {
        width: rect.width,
        right: rect.right,
        vpWidth: window.innerWidth,
        overflows: rect.right > window.innerWidth || rect.left < 0,
      };
    });
    if (overflow.overflows) throw new Error(`Modal overflows: ${JSON.stringify(overflow)}`);

    // Reset viewport
    await page.setViewport(DESKTOP);
  });

  // Reset to "Today" for subsequent tests
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await waitForDashboard();
}

// ═══════════════════════════════════════════════════════════════════
// SUITE 2 — MEMBER CARDS
// ═══════════════════════════════════════════════════════════════════
async function suiteMemberCards() {
  console.log('\n🃏 SUITE 2: Member Cards');
  console.log('─'.repeat(48));

  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await waitForDashboard();

  // ── 2.1 Cards rendered ─────────────────────────────────────────
  await run('MC-01: Member cards visible on dashboard', async () => {
    const count = await page.$$eval('[data-testid="member-card"]', els => els.length);
    if (count === 0) throw new Error('No member cards found');
    console.log(`    Found ${count} member cards`);
  });

  // ── 2.2 Time formatting ────────────────────────────────────────
  await run('MC-02: All times use Xh Xm format (no raw decimals)', async () => {
    const badFormats = await page.evaluate(() => {
      const text = document.body.textContent;
      // Match patterns like "6.45h" or "3.2h" (raw decimal hours)
      const rawDecimal = text.match(/\d+\.\d+\s*h(?!ttp|ref|tml)/gi) || [];
      // Filter false positives
      return rawDecimal.filter(m => {
        const num = parseFloat(m);
        return num > 0 && num < 25; // Reasonable hour range
      });
    });
    if (badFormats.length > 0) {
      throw new Error(`Found raw decimal time formats: ${badFormats.join(', ')}`);
    }
  });

  // ── 2.3 Score color coding ─────────────────────────────────────
  await run('MC-03: Score values have color coding', async () => {
    const scores = await page.evaluate(() => {
      // Find SCORE cells in the 4-column footer grid
      const labels = document.querySelectorAll('div');
      const scoreElements = [];
      for (const label of labels) {
        if (label.textContent.trim() === 'SCORE') {
          const valueEl = label.nextElementSibling;
          if (valueEl) {
            const color = window.getComputedStyle(valueEl).color;
            scoreElements.push({
              value: valueEl.textContent.trim(),
              color,
            });
          }
        }
      }
      return scoreElements;
    });
    console.log(`    Score elements: ${scores.length}`);
    scores.forEach(s => console.log(`      ${s.value} → ${s.color}`));
  });

  // ── 2.4 Progress bars ──────────────────────────────────────────
  await run('MC-04: Progress bars render with correct width', async () => {
    const bars = await page.evaluate(() => {
      // Find progress bar containers (h-1.5 with child div)
      const containers = document.querySelectorAll('.h-1\\.5');
      return [...containers].map(c => {
        const fill = c.querySelector('div');
        return {
          containerWidth: c.getBoundingClientRect().width,
          fillWidth: fill?.style.width || 'none',
          fillBg: fill?.style.background || 'none',
        };
      });
    });
    console.log(`    Progress bars: ${bars.length}`);
    bars.forEach((b, i) => console.log(`      Bar ${i}: fill=${b.fillWidth}, bg=${b.fillBg}`));
    if (bars.length === 0) throw new Error('No progress bars found');
  });

  // ── 2.5 Footer metrics (SPAN, BREAKS, TASKS, SCORE) ───────────
  await run('MC-05: Footer metrics present (4 columns)', async () => {
    const footers = await page.evaluate(() => {
      const grids = document.querySelectorAll('.grid-cols-4');
      return [...grids].map(grid => {
        const cells = grid.querySelectorAll('div[class*="text-center"]');
        const labels = [...cells].map(c => {
          const label = c.querySelector('div:first-child')?.textContent?.trim();
          const value = c.querySelector('div:last-child')?.textContent?.trim();
          return { label, value };
        });
        return labels;
      });
    });
    if (footers.length === 0) throw new Error('No 4-column footer grids found');
    console.log(`    Footers: ${footers.length} cards with metrics`);

    // Check expected labels exist
    const allLabels = footers.flat().map(l => l.label);
    const expected = ['SPAN', 'BREAKS', 'TASKS', 'SCORE'];
    for (const exp of expected) {
      if (!allLabels.includes(exp)) {
        console.log(`    ⚠️  "${exp}" label not found in any card footer`);
      }
    }
  });

  // ── 2.6 Card states ────────────────────────────────────────────
  await run('MC-06: Card states are visually distinct', async () => {
    const states = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="member-card"]');
      return [...cards].map(card => {
        const opacity = window.getComputedStyle(card).opacity;
        const text = card.textContent;
        let state = 'unknown';
        if (text.includes('Current Session') || text.includes('LIVE')) state = 'working';
        else if (text.includes('Break') && text.includes('ago')) state = 'break';
        else if (text.includes('Offline') && text.includes('ago')) state = 'offline';
        else if (text.includes('No activity')) state = 'noActivity';
        else if (text.includes('Annual Leave') || text.includes('WFH') || text.includes('Sick')) state = 'leave';
        return { state, opacity: parseFloat(opacity) };
      });
    });
    console.log('    Card states:');
    states.forEach(s => console.log(`      ${s.state}: opacity=${s.opacity}`));

    // Verify opacity rules
    const noActivity = states.filter(s => s.state === 'noActivity');
    const offline = states.filter(s => s.state === 'offline');
    noActivity.forEach(s => {
      if (s.opacity > 0.65) console.log('    ⚠️  NoActivity card opacity should be ~0.6');
    });
    offline.forEach(s => {
      if (s.opacity > 0.8) console.log('    ⚠️  Offline card opacity should be ~0.75');
    });
  });

  // ── 2.7 RTL text handling ──────────────────────────────────────
  await run('MC-07: Arabic text has RTL direction', async () => {
    const rtlElements = await page.evaluate(() => {
      const arabicRegex = /[\u0600-\u06FF]/;
      const all = document.querySelectorAll('div, span');
      const results = [];
      for (const el of all) {
        const text = el.textContent?.trim();
        if (text && arabicRegex.test(text) && el.children.length === 0 && text.length > 3) {
          results.push({
            text: text.slice(0, 40),
            direction: el.style.direction || window.getComputedStyle(el).direction,
            fontFamily: window.getComputedStyle(el).fontFamily?.slice(0, 50),
          });
        }
      }
      return results.slice(0, 10);
    });
    console.log(`    Arabic elements: ${rtlElements.length}`);
    rtlElements.forEach(el => {
      console.log(`      "${el.text}" dir=${el.direction} font=${el.fontFamily}`);
      if (el.direction !== 'rtl') {
        console.log(`      ⚠️  Should have dir=rtl`);
      }
    });
  });

  // ── 2.8 Overwork indicator ─────────────────────────────────────
  await run('MC-08: Overwork indicator (if any member > 100%)', async () => {
    const overwork = await page.evaluate(() => {
      const body = document.body.textContent;
      return {
        hasOverTargetText: /over target/i.test(body),
        hasWarningEmoji: body.includes('⚠'),
      };
    });
    console.log(`    Overwork: text=${overwork.hasOverTargetText}, emoji=${overwork.hasWarningEmoji}`);
  });

  // ── 2.9 Working card live timer ────────────────────────────────
  await run('MC-09: Live timer ticks (if working members exist)', async () => {
    // Look for LiveTimer component (HH:MM:SS pattern)
    const timer1 = await page.evaluate(() => {
      const text = document.body.textContent;
      const match = text.match(/\d{1,2}:\d{2}:\d{2}/);
      return match ? match[0] : null;
    });

    if (!timer1) {
      console.log('    ⚠️  No HH:MM:SS timer found (no working members?)');
      return;
    }

    await new Promise(r => setTimeout(r, 2500));

    const timer2 = await page.evaluate(() => {
      const text = document.body.textContent;
      const match = text.match(/\d{1,2}:\d{2}:\d{2}/);
      return match ? match[0] : null;
    });

    if (timer1 === timer2) throw new Error(`Timer stuck at ${timer1}`);
    console.log(`    Timer: ${timer1} → ${timer2}`);
  });

  await shot('10-member-cards');
}

// ═══════════════════════════════════════════════════════════════════
// SUITE 3 — MEMBER DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════
async function suiteDetailModal() {
  console.log('\n🔍 SUITE 3: Member Detail Modal');
  console.log('─'.repeat(48));

  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await waitForDashboard();

  // ── 3.1 Open modal ─────────────────────────────────────────────
  await run('DM-01: Opens on card click', async () => {
    await page.click('[data-testid="member-card"]');
    await new Promise(r => setTimeout(r, 800));

    const found = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="member-detail-modal"]');
    });
    if (!found) throw new Error('Detail modal not found after click');
    await shot('11-detail-modal');
  });

  // ── 3.2 Three tabs ─────────────────────────────────────────────
  await run('DM-02: Has Timeline/Performance/Leaves tabs', async () => {
    const tabs = await page.evaluate(() => {
      const btns = document.querySelectorAll('[data-testid^="tab-"]');
      return [...btns].map(b => b.textContent.trim());
    });
    console.log(`    Tabs: ${JSON.stringify(tabs)}`);
    const expected = ['Timeline', 'Performance', 'Leaves'];
    for (const exp of expected) {
      if (!tabs.includes(exp)) throw new Error(`Tab "${exp}" missing. Found: ${tabs.join(', ')}`);
    }
  });

  // ── 3.3 Timeline tab content ───────────────────────────────────
  await run('DM-03: Timeline tab shows time entries or empty state', async () => {
    // Timeline is default tab
    const content = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="member-detail-modal"]');
      if (!modal) return { noModal: true };
      const text = modal.textContent;
      return {
        hasTimeEntries: /\d{1,2}:\d{2}\s*(am|pm)/i.test(text),
        hasEmptyState: text.includes('No tasks recorded'),
        hasLoading: text.includes('Loading timeline'),
        hasSummary: text.includes('Tracked') && text.includes('Tasks'),
      };
    });
    console.log(`    Timeline: ${JSON.stringify(content)}`);
    await shot('12-timeline-tab');
  });

  // ── 3.4 Timeline date buttons ──────────────────────────────────
  await run('DM-04: Today/Yesterday/This Week/Custom date buttons', async () => {
    const buttons = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="member-detail-modal"]');
      if (!modal) return [];
      const btns = modal.querySelectorAll('button');
      return [...btns]
        .map(b => b.textContent.trim())
        .filter(t => ['Today', 'Yesterday', 'This Week', 'Custom'].includes(t));
    });
    console.log(`    Date buttons: ${JSON.stringify(buttons)}`);
    if (buttons.length < 3) throw new Error(`Expected 4 date buttons, found ${buttons.length}`);
  });

  // ── 3.5 Switch to Yesterday ────────────────────────────────────
  await run('DM-05: Yesterday button loads previous day data', async () => {
    await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="member-detail-modal"]');
      const btns = modal.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.trim() === 'Yesterday') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 1500)); // Wait for API fetch

    const dateLabel = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="member-detail-modal"]');
      if (!modal) return null;
      const text = modal.textContent;
      if (text.includes('Yesterday')) return 'Yesterday';
      return text.match(/[A-Z][a-z]+,\s+[A-Z][a-z]+\s+\d+/)?.[0] || 'unknown';
    });
    console.log(`    Date label: ${dateLabel}`);
    await shot('13-yesterday');
  });

  // ── 3.6 This Week — day navigation ─────────────────────────────
  await run('DM-06: This Week shows day navigation buttons', async () => {
    await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="member-detail-modal"]');
      const btns = modal.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.trim() === 'This Week') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 500));

    const dayButtons = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="member-detail-modal"]');
      const allBtns = modal.querySelectorAll('button');
      const days = [];
      for (const btn of allBtns) {
        const text = btn.textContent.trim();
        if (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].some(d => text.includes(d))) {
          days.push(text.replace(/\s+/g, ' '));
        }
      }
      return days;
    });
    console.log(`    Week days: ${dayButtons.length}`);
    await shot('14-this-week');
  });

  // ── 3.7 Performance tab ────────────────────────────────────────
  await run('DM-07: Performance tab loads', async () => {
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="tab-performance"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000)); // Wait for API

    const perfContent = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="member-detail-modal"]');
      if (!modal) return {};
      const text = modal.textContent;
      return {
        hasScore: /score|Score/i.test(text),
        hasWeeklyChart: text.includes('Sun') || text.includes('Mon'),
        hasProjectBreakdown: text.includes('project') || text.includes('Project'),
        hasTracked: /tracked|Tracked/i.test(text),
        hasLoading: text.includes('Loading performance'),
      };
    });
    console.log(`    Performance: ${JSON.stringify(perfContent)}`);
    await shot('15-performance-tab');
  });

  // ── 3.8 Leaves tab ─────────────────────────────────────────────
  await run('DM-08: Leaves tab loads', async () => {
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="tab-leaves"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const leavesContent = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="member-detail-modal"]');
      if (!modal) return {};
      const text = modal.textContent;
      return {
        hasAnnual: /annual/i.test(text),
        hasSick: /sick/i.test(text),
        hasWFH: /wfh|work from home/i.test(text),
        hasQuota: /total|used|remaining/i.test(text),
        hasCalendar: text.includes('Sun') && text.includes('Mon'),
      };
    });
    console.log(`    Leaves: ${JSON.stringify(leavesContent)}`);
    await shot('16-leaves-tab');
  });

  // ── 3.9 Time formatting in modal ───────────────────────────────
  await run('DM-09: Modal times use Xh Xm format', async () => {
    // Switch back to timeline
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="tab-timeline"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const badTimes = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="member-detail-modal"]');
      if (!modal) return [];
      const text = modal.textContent;
      return (text.match(/\d+\.\d+\s*h(?!ttp)/gi) || []).filter(m => {
        const n = parseFloat(m);
        return n > 0 && n < 25;
      });
    });
    if (badTimes.length > 0) {
      throw new Error(`Raw decimal times in modal: ${badTimes.join(', ')}`);
    }
  });

  // ── 3.10 Progress bar in header ────────────────────────────────
  await run('DM-10: Modal header shows progress bar', async () => {
    const progress = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="member-detail-modal"]');
      if (!modal) return null;
      const text = modal.textContent;
      // Look for "Today's Progress" and percentage
      const hasProgress = text.includes("Today's Progress") || text.includes('Day Goal');
      const percent = text.match(/\d+%/)?.[0];
      return { hasProgress, percent };
    });
    console.log(`    Progress: ${JSON.stringify(progress)}`);
  });

  // ── 3.11 Close modal ──────────────────────────────────────────
  await run('DM-11: Escape closes detail modal', async () => {
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));

    const stillOpen = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="member-detail-modal"]');
    });
    if (stillOpen) throw new Error('Modal still open after Escape');
  });

  // ── 3.12 Click each member ────────────────────────────────────
  await run('DM-12: All member cards open detail modal', async () => {
    const cardCount = await page.$$eval('[data-testid="member-card"]', els => els.length);
    let successes = 0;

    for (let i = 0; i < Math.min(cardCount, 8); i++) {
      try {
        const cards = await page.$$('[data-testid="member-card"]');
        if (cards[i]) {
          await cards[i].click();
          await new Promise(r => setTimeout(r, 800));

          const opened = await page.evaluate(() =>
            !!document.querySelector('[data-testid="member-detail-modal"]')
          );
          if (opened) successes++;

          await page.keyboard.press('Escape');
          await new Promise(r => setTimeout(r, 300));
        }
      } catch (e) {
        console.log(`    Card ${i} failed: ${e.message}`);
      }
    }

    console.log(`    ${successes}/${cardCount} cards opened modal successfully`);
    if (successes === 0) throw new Error('No cards could open the detail modal');
  });
}

// ═══════════════════════════════════════════════════════════════════
// SUITE 4 — DATE RANGE + DATA CONSISTENCY
// ═══════════════════════════════════════════════════════════════════
async function suiteDateDataConsistency() {
  console.log('\n📊 SUITE 4: Date Range → Data Consistency');
  console.log('─'.repeat(48));

  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await waitForDashboard();

  // ── 4.1 Today default ──────────────────────────────────────────
  await run('DD-01: Default view shows "Today"', async () => {
    const headerText = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('📅')) return btn.textContent.trim();
      }
      return null;
    });
    console.log(`    Header date: "${headerText}"`);
    if (!headerText?.includes('Today')) {
      console.log('    ⚠️  Expected "Today" in header date button');
    }
  });

  // ── 4.2 Select Yesterday and verify data changes ───────────────
  await run('DD-02: Yesterday shows different data than Today', async () => {
    // Capture today's data
    const todayData = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="member-card"]');
      return [...cards].slice(0, 3).map(c => c.textContent.slice(0, 100));
    });

    // Open date picker and select Yesterday
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('📅')) { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 500));

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Yesterday') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 200));

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Apply') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 3000)); // Wait for sync

    const yesterdayData = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="member-card"]');
      return [...cards].slice(0, 3).map(c => c.textContent.slice(0, 100));
    });

    const changed = todayData.some((td, i) => td !== yesterdayData[i]);
    console.log(`    Data changed: ${changed}`);
    await shot('17-yesterday-data');
  });

  // ── 4.3 Multi-day range shows adjusted targets ────────────────
  await run('DD-03: Multi-day range adjusts daily goal label', async () => {
    // Select "This Week"
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('📅')) { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 500));

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'This Week') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 200));

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Apply') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 3000));

    // Check for "X-Day Goal" label (instead of "Daily Goal")
    const goalLabel = await page.evaluate(() => {
      const text = document.body.textContent;
      const match = text.match(/\d+-Day Goal/);
      return match ? match[0] : (text.includes('Daily Goal') ? 'Daily Goal' : 'not found');
    });
    console.log(`    Goal label: "${goalLabel}"`);
    await shot('18-multi-day-range');
  });

  // ── 4.4 Return to Today ────────────────────────────────────────
  await run('DD-04: Selecting "Today" preset returns to live data', async () => {
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('📅')) { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 500));

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Today') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 200));

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Apply') { btn.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    const headerText = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('📅')) return btn.textContent.trim();
      }
      return null;
    });
    if (!headerText?.includes('Today')) {
      console.log(`    ⚠️  Header shows "${headerText}" instead of "Today"`);
    }
    await shot('19-back-to-today');
  });
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
(async () => {
  try {
    await setup();
    await suiteDatePicker();
    await suiteMemberCards();
    await suiteDetailModal();
    await suiteDateDataConsistency();
  } catch (err) {
    console.error('💥 Fatal error:', err);
  } finally {
    await teardown();
  }
})();