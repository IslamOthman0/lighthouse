# Rate Limit Fix - Testing Guide

## Current Status

The rate limit optimization has been implemented with the following changes:

### ✅ Implemented Changes

1. **Member Filtering** (`useClickUpSync.js:377-390`)
   - Filters members to only those in `settings.team.membersToMonitor`
   - Falls back to all members if filter is empty (backwards compatible)
   - Console log shows: `👥 Monitoring X/Y members (filter: active/disabled)`

2. **90-Day Time Entries** (`orchestrator.js:356-396`)
   - Changed from single-day to 90-day rolling window
   - Split into 3 batched calls (30-day chunks) due to ClickUp API limitation
   - Parallel fetch using `Promise.all([chunk1, chunk2, chunk3, timers])`

3. **Fresh Task Fetching** (`orchestrator.js:408-455`)
   - Replaced cache-based fetching with direct filtered endpoint
   - Uses `getFilteredTeamTasks()` with `assignees[]` filter
   - 90-day window via `dateUpdatedGt` parameter
   - Pagination support (max 20 pages)

4. **Removed Background Sync** (`useClickUpSync.js:470`)
   - Removed `taskCacheV2.startBackgroundSync()` call
   - Tasks are now fetched fresh on each sync cycle

5. **Simplified Backfill** (`orchestrator.js:520-540`)
   - LastActiveDate now uses already-fetched 90-day time entries
   - Eliminated extra per-member API calls

6. **Weekly Cache Refresh** (`taskCacheV2.js:108-127`)
   - Cache expires after 7 days
   - Full historical re-fetch on first launch or after expiry

## Testing Instructions

### Prerequisites
- ClickUp API rate limit must be reset (wait 60+ seconds after last API activity)
- `.env.local` file must have valid `VITE_CLICKUP_API_KEY` and `VITE_CLICKUP_TEAM_ID`
- Dev server running: `npm run dev`

### Manual Testing Steps

1. **Clear Application State**
   ```javascript
   // In browser console:
   localStorage.clear();
   indexedDB.deleteDatabase('lighthouse');
   location.reload();
   ```

2. **Open Browser Console**
   - Press F12 → Console tab
   - Enable "Preserve log" to keep logs across reloads

3. **Wait for Initial Sync**
   - Watch for: `👥 Monitoring X/Y members` log
   - If filter is disabled (0/0 or 24/24), configure members in Settings

4. **Observe API Request Counts**
   ```
   Expected logs:
   - 👥 Monitoring 8/24 members (filter: active)
   - 📊 Fetching 90-day time entries in 3 chunks...
   - ✅ Fetched X time entries from chunk 1/3
   - ✅ Fetched X time entries from chunk 2/3
   - ✅ Fetched X time entries from chunk 3/3
   - 📋 Fetching fresh tasks (90-day window)...
   - ✅ Fetched X tasks (page 1/5)
   - 🔄 Sync complete: X API requests
   ```

5. **Configure Member Filter (First Time)**
   - Click Settings (⚙️ icon)
   - Go to "Team" tab
   - Select the 8 core team members to monitor
   - Save settings
   - Reload page and observe sync again

### Expected Results

#### API Request Count (Per Sync)
```
With 8 monitored members:
├─ Running timers:    8 requests (1 per member)
├─ Time entries:      3 requests (3 × 30-day chunks)
├─ Tasks:            ~5 requests (90-day window, paginated)
└─ Total:          ~16 requests

At 30s interval: 32 requests/min (68% under 100/min limit)
```

#### Success Criteria
- ✅ No 429 rate limit errors
- ✅ Member count shows "8/24 members (filter: active)"
- ✅ Dashboard shows data for 8 monitored members only
- ✅ Total sync requests ≤20 per cycle
- ✅ Sync completes within 5-10 seconds

### Automated Testing (Puppeteer)

**Note:** Automated testing requires waiting for ClickUp rate limit reset (60+ seconds of no API activity).

```bash
# Stop dev server first to reset rate limit
# Wait 60 seconds
# Restart dev server: npm run dev
# Run test:
node test-rate-limit-fix.js
```

The test will:
1. Load dashboard
2. Wait 70 seconds for rate limit cooldown
3. Monitor API requests for one sync cycle
4. Validate request counts
5. Take screenshot
6. Report results

## Troubleshooting

### Issue: "0/0 members (filter: disabled)"
**Cause:** `settings.team.membersToMonitor` is empty
**Fix:** Configure member filter in Settings → Team tab

### Issue: 429 Rate Limit Errors
**Cause:** Previous API activity within last 60 seconds
**Fix:** Wait 60+ seconds without any API calls, then reload

### Issue: No data showing
**Cause:** API authentication failing
**Fix:** Check `.env.local` has valid credentials:
```
VITE_CLICKUP_API_KEY=pk_...
VITE_CLICKUP_TEAM_ID=...
```

### Issue: Still seeing 100+ requests
**Cause:** Member filter not configured OR cache performing full sync
**Fix:**
1. Configure member filter (Settings → Team)
2. Check console for "filter: active" message
3. Clear IndexedDB and reload to reset cache

## Verification Checklist

- [ ] Member filter working (8/24 shown when configured)
- [ ] Time entries fetched in 3 chunks (console logs)
- [ ] Fresh tasks fetched (not from cache)
- [ ] No 429 errors during sync
- [ ] Total requests per sync ≤20
- [ ] Request rate <100/min
- [ ] Dashboard shows correct data
- [ ] No infinite loops or repeated fetches

## Next Steps

Once testing confirms the fix is working:
1. Configure the 8 core team members in Settings
2. Monitor dashboard for 2-3 sync cycles (60-90 seconds)
3. Verify no rate limit errors
4. Document the member filter configuration in CLAUDE.md
5. Commit changes to git

---

**Last Updated:** 2026-02-15
**Related Files:**
- `src/hooks/useClickUpSync.js` (member filtering)
- `src/services/sync/orchestrator.js` (90-day fetch, fresh tasks)
- `src/services/taskCacheV2.js` (weekly refresh)
- `test-rate-limit-fix.js` (automated test)
