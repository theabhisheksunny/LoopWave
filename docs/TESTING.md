# LoopWave — Testing Strategy & Verification Report

## 1. Test Architecture

LoopWave utilizes a dual-layer verification strategy:
1. **Vitest + React Testing Library**: Fast, deterministic unit and integration tests running against JSDOM.
2. **Playwright for Electron**: Real, end-to-end desktop UI tests launching the actual packaged or development Electron application.

```
tests/
  setup.ts                          # JSDOM polyfills & window.loopwaveApi mock
  unit/
    sourceResolver.test.ts          # URL parsing, YouTube variants, Shorts & direct media
    sessionManager.test.ts          # UUID generation, deduplication & lifecycle
    loopController.test.ts          # Loop timing, modes & cancellation
    storageDb.test.ts               # SQLite operations, retention & export/import
    security.test.ts                # SSRF IP checks, URL sanitization & safety
    playerStore.test.ts             # Queue reordering, volume & delay updates
    ipcSchema.test.ts               # Zod IPC payload validation
  integration/
    playbackLifecycle.test.ts       # Full loop lifecycle with mock adapter
    loopTwentyCycles.test.ts        # 20-cycle automated looping stress test
  ui/
    HomeScreen.test.tsx             # Rendering, source badge detection & interactions
  e2e/
    electronE2e.mjs                 # Playwright test script controlling real Electron desktop app
```

---

## 2. Running the Tests

### A. Run Vitest Unit & Integration Suites
To run all 56 unit, integration, and UI component tests:
```bash
npm test
```

### B. Run Playwright Electron End-to-End Suite
To build the application and run the 9 real end-to-end scenarios against the live Electron app:
```bash
# 1. Ensure the app is built
npm run build

# 2. Run the Playwright Electron automation test
node tests/e2e/electronE2e.mjs
```

The script will launch Electron, execute all 9 test scenarios (including YouTube Shorts `n2YGWiRRxEs` and direct media), save screenshots into `docs/screenshots/`, output test statistics, and exit cleanly.

---

## 3. Verified Vitest Results

All 56 tests across 10 test suites pass cleanly:

```
 RUN  v3.2.7 D:/PROJECT-FINAL/LoopWave

 ✓ tests/unit/sessionManager.test.ts (7 tests)
 ✓ tests/unit/loopController.test.ts (4 tests)
 ✓ tests/unit/sourceResolver.test.ts (14 tests)
 ✓ tests/integration/loopTwentyCycles.test.ts (1 test)
 ✓ tests/integration/playbackLifecycle.test.ts (2 tests)
 ✓ tests/unit/security.test.ts (10 tests)
 ✓ tests/unit/ipcSchema.test.ts (5 tests)
 ✓ tests/unit/storageDb.test.ts (6 tests)
 ✓ tests/unit/playerStore.test.ts (4 tests)
 ✓ tests/ui/HomeScreen.test.tsx (3 tests)

 Test Files  10 passed (10)
      Tests  56 passed (56)
   Duration  ~5.4s
```

---

## 4. Verified Playwright Electron E2E Results

All 9 end-to-end tests pass against the actual Electron desktop window:

```
[E2E] Starting LoopWave Playwright Electron E2E Suite...
[PASS] Test 1: Primary Simplified UI Layout
[PASS] Test 2: YouTube Shorts Playback (n2YGWiRRxEs)
[PASS] Test 3: Direct MP4 Video Playback (flower.mp4)
[PASS] Test 4: Direct WebM Video Playback (flower.webm)
[PASS] Test 5: Direct Audio Playback (t-rex-roar.mp3)
[PASS] Test 6: Loop Mode Cycling (Off -> Repeat 1 -> Repeat All)
[PASS] Test 7: Queue Addition & Display
[PASS] Test 8: Secondary Overlays (Library, Analytics, Settings, About)
[PASS] Test 9: Packaged Windows Executable
[E2E] All 9 tests passed successfully!
```

---

## 5. Coverage Matrix

### URL & Adapter Handling
- [x] Standard YouTube watch links (`youtube.com/watch?v=...`)
- [x] Shortened YouTube links (`youtu.be/...`)
- [x] Embedded YouTube links (`youtube.com/embed/...`)
- [x] YouTube Shorts links (`youtube.com/shorts/...`, e.g. `n2YGWiRRxEs`)
- [x] Timestamp extraction (`?t=1m30s`, `?t=90`)
- [x] Rejection of malformed / short YouTube video IDs
- [x] Direct media format detection (`.mp4`, `.webm`, `.m3u8`, `.mp3`, `.wav`, `.flac`)
- [x] Rejection of non-http/https protocols (`file:`, `javascript:`, `data:`)
- [x] Actionable error message on unsupported regular webpages

### Playback Session Lifecycle & 20-Cycle Verification
- [x] Cryptographically secure UUID generated for every playback cycle (`crypto.randomUUID()`)
- [x] Video ID remains stable across consecutive cycles while session UUID changes
- [x] Start event deduplication (multiple `playing` triggers do not spawn multiple sessions)
- [x] Verified completion: `recordCompletion()` called only upon adapter `ended` event
- [x] Watch-time accumulation tracks active playback and pauses during buffering/pause
- [x] Failure states record error code and set `completionStatus = 'failed'`
- [x] Interruption states record `completionStatus = 'interrupted'`
- [x] 20-cycle automated looping stress test completed without memory leaks or race conditions

### Infinite Looping & Delay Timing
- [x] Repeat-one mode: restarts same media after configured delay
- [x] Repeat-all mode: advances queue and wraps to start at queue end
- [x] Safe cancellation of pending timers when stopping during delay
- [x] Live delay countdown ticks delivered to UI

### Storage & Security
- [x] In-memory SQLite mode functional with zero disk persistence
- [x] Settings persistence and default values
- [x] Retention policy removes expired records
- [x] Export to JSON and CSV formats
- [x] Library import restores items accurately
- [x] SSRF guard blocks loopback (`127.0.0.1`), link-local (`169.254.x`), private subnets (`10.x`, `172.16-31.x`, `192.168.x`), and IPv6 (`::1`, `fc00::`)
- [x] URL log sanitization removes sensitive query keys (`token`, `key`, `secret`, `auth`)
- [x] Zod schemas enforce type safety across all IPC boundaries
