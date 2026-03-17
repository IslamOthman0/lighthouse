/**
 * Puppeteer Test: Rate Limit Fix Validation
 * Tests the full user journey and monitors API request counts
 */

import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Starting Rate Limit Fix Test...\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for visual validation
    args: ['--start-maximized'],
    defaultViewport: null
  });

  const page = await browser.newPage();

  // Track API requests
  const apiRequests = {
    runningTimers: 0,
    timeEntries: 0,
    tasks: 0,
    total: 0,
    timestamps: []
  };

  // Monitor all network requests
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();

    if (url.includes('api.clickup.com')) {
      apiRequests.total++;
      apiRequests.timestamps.push(Date.now());

      if (url.includes('/time_entries/current')) {
        apiRequests.runningTimers++;
        console.log(`  📡 Running timer request (#${apiRequests.runningTimers})`);
      } else if (url.includes('/time_entries?')) {
        apiRequests.timeEntries++;
        console.log(`  📡 Time entries request (#${apiRequests.timeEntries})`);
      } else if (url.includes('/task?')) {
        apiRequests.tasks++;
        console.log(`  📡 Tasks request (page ${apiRequests.tasks})`);
      }
    }

    request.continue();
  });

  // Capture console logs from the page
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);

    // Log important messages
    if (text.includes('👥 Monitoring') ||
        text.includes('📊 Fetching') ||
        text.includes('✅ Fetched') ||
        text.includes('⚠️ Approaching rate limit') ||
        text.includes('🔄 Syncing') ||
        text.includes('Phase 1') ||
        text.includes('Phase 2') ||
        text.includes('90-day') ||
        text.includes('chunks') ||
        text.includes('❌')) {
      console.log(`  📋 ${text}`);
    }
  });

  try {
    console.log('📂 Step 1: Loading Lighthouse Dashboard...');
    await page.goto('http://localhost:5174', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('✅ Dashboard loaded\n');

    // Wait for rate limit to reset (ClickUp resets every minute)
    console.log('⏳ Step 2: Waiting for rate limit cooldown (70 seconds)...');
    console.log('   (ClickUp API rate limit resets every 60 seconds)');
    await new Promise(resolve => setTimeout(resolve, 70000));

    console.log('✅ Cooldown complete, monitoring sync cycle...\n');

    console.log('\n📊 Step 3: Analyzing API Request Counts...\n');

    // Calculate requests per minute
    if (apiRequests.timestamps.length > 1) {
      const firstRequest = apiRequests.timestamps[0];
      const lastRequest = apiRequests.timestamps[apiRequests.timestamps.length - 1];
      const durationMs = lastRequest - firstRequest;
      const durationMin = durationMs / 60000;
      const reqPerMin = apiRequests.total / durationMin;

      console.log('📈 API Request Summary:');
      console.log(`  ├─ Running Timers: ${apiRequests.runningTimers} requests`);
      console.log(`  ├─ Time Entries:   ${apiRequests.timeEntries} requests`);
      console.log(`  ├─ Tasks:          ${apiRequests.tasks} requests`);
      console.log(`  ├─ Total:          ${apiRequests.total} requests`);
      console.log(`  ├─ Duration:       ${(durationMs / 1000).toFixed(1)}s`);
      console.log(`  └─ Rate:           ${reqPerMin.toFixed(1)} req/min\n`);

      // Validation
      console.log('✅ Validation Results:');

      if (apiRequests.runningTimers <= 10) {
        console.log(`  ✅ Running timers: ${apiRequests.runningTimers} (expected ≤10 for monitored members)`);
      } else {
        console.log(`  ❌ Running timers: ${apiRequests.runningTimers} (expected ≤10, got more than expected)`);
      }

      if (apiRequests.timeEntries === 3) {
        console.log(`  ✅ Time entries: ${apiRequests.timeEntries} (expected 3 chunks for 90-day window)`);
      } else if (apiRequests.timeEntries > 0 && apiRequests.timeEntries < 5) {
        console.log(`  ⚠️  Time entries: ${apiRequests.timeEntries} (expected 3, acceptable range)`);
      } else {
        console.log(`  ❌ Time entries: ${apiRequests.timeEntries} (expected 3)`);
      }

      if (apiRequests.tasks > 0 && apiRequests.tasks <= 10) {
        console.log(`  ✅ Task requests: ${apiRequests.tasks} (expected ~5 pages for 90-day window)`);
      } else if (apiRequests.tasks > 10) {
        console.log(`  ⚠️  Task requests: ${apiRequests.tasks} (more pages than expected, might be historical fetch)`);
      }

      if (apiRequests.total <= 25) {
        console.log(`  ✅ Total requests: ${apiRequests.total} (expected ~16, well under 25)`);
      } else if (apiRequests.total <= 50) {
        console.log(`  ⚠️  Total requests: ${apiRequests.total} (higher than expected, check if historical fetch running)`);
      } else {
        console.log(`  ❌ Total requests: ${apiRequests.total} (too many requests!)`);
      }

      if (reqPerMin < 100) {
        console.log(`  ✅ Request rate: ${reqPerMin.toFixed(1)} req/min (under 100/min limit)\n`);
      } else {
        console.log(`  ❌ Request rate: ${reqPerMin.toFixed(1)} req/min (EXCEEDS 100/min limit!)\n`);
      }
    }

    // Check for rate limit errors in console
    console.log('🔍 Step 4: Checking for rate limit errors...');
    const rateLimitErrors = consoleLogs.filter(log =>
      log.includes('429') || log.includes('Rate limit')
    );

    if (rateLimitErrors.length === 0) {
      console.log('  ✅ No rate limit errors found\n');
    } else {
      console.log(`  ❌ Found ${rateLimitErrors.length} rate limit errors:\n`);
      rateLimitErrors.slice(0, 5).forEach(err => console.log(`     ${err}`));
    }

    // Check member filtering
    console.log('🔍 Step 5: Validating member filtering...');
    const memberFilterLogs = consoleLogs.filter(log => log.includes('👥 Monitoring'));
    if (memberFilterLogs.length > 0) {
      console.log(`  ${memberFilterLogs[0]}\n`);
    }

    // Take screenshot
    console.log('📸 Step 6: Taking screenshot...');
    await page.screenshot({
      path: 'd:/Work/Samawy/ToolAndApp/ProjectMangement/Lighthouse/test-screenshot.png',
      fullPage: true
    });
    console.log('  ✅ Screenshot saved to test-screenshot.png\n');

    console.log('✅ Test Complete!\n');
    console.log('Summary:');
    console.log(`  - Dashboard loaded successfully`);
    console.log(`  - API requests monitored for 70 seconds (after cooldown)`);
    console.log(`  - Total requests: ${apiRequests.total}`);
    console.log(`  - Rate limit errors: ${rateLimitErrors.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n🛑 Closing browser in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
})();
