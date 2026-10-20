# LoopWave — Testing Strategy & Verification Report

## 1. Test Architecture

LoopWave utilizes **Vitest** for fast, deterministic unit and integration tests, paired with **React Testing Library** for component verification in a simulated JSDOM environment.

```
tests/
  setup.ts                          # JSDOM polyfills & window.loopwaveApi mock
  unit/
    sourceResolver.test.ts          # URL parsing, YouTube variants & direct media
    sessionManager.test.ts          # UUID generation, deduplication & lifecycle
    loopController.test.ts          # Loop timing, modes & cancellation
    storageDb.test.ts               # SQLite operations, retention & export/import
    security.test.ts                # SSRF IP checks, URL sanitization & safety
    playerStore.test.ts             # Queue reordering, volume & delay updates
    ipcSchema.test.ts               # Zod IPC payload validation
  integration/
    playbackLifecycle.test.ts       # Full loop lifecycle with mock adapter
  ui/
    HomeScreen.test.tsx             # Rendering, source badge detection & interactions
```

---

## 2. Verified Test Execution Results

All 54 tests across 9 test suites were executed and verified:

```
 RUN  v3.2.7 D:/PROJECT-FINAL/LoopWave

 ✓ tests/unit/sourceResolver.test.ts (13 tests) 21ms
 ✓ tests/unit/sessionManager.test.ts (7 tests) 11ms
 ✓ tests/unit/loopController.test.ts (4 tests) 19ms
 ✓ tests/integration/playbackLifecycle.test.ts (2 tests) 19ms
 ✓ tests/unit/ipcSchema.test.ts (5 tests) 17ms
 ✓ tests/unit/security.test.ts (10 tests) 25ms
 ✓ tests/unit/storageDb.test.ts (6 tests) 164ms
 ✓ tests/unit/playerStore.test.ts (4 tests) 7ms
 ✓ tests/ui/HomeScreen.test.tsx (3 tests) 232ms

 Test Files  9 passed (9)
      Tests  54 passed (54)
   Duration  4.11s
```

---

## 3. Test Coverage Matrix

### URL & Adapter Handling
- [x] Standard YouTube watch links (`youtube.com/watch?v=...`)
- [x] Shortened YouTube links (`youtu.be/...`)
- [x] Embedded YouTube links (`youtube.com/embed/...`)
- [x] YouTube Shorts links (`youtube.com/shorts/...`)
- [x] Timestamp extraction (`?t=1m30s`, `?t=90`)
- [x] Rejection of malformed / short YouTube video IDs
- [x] Direct media format detection (`.mp4`, `.webm`, `.m3u8`, `.mp3`, `.wav`, `.flac`)
- [x] Rejection of non-http/https protocols (`file:`, `javascript:`, `data:`)
- [x] Actionable error message on unsupported regular webpages

### Playback Session Lifecycle
- [x] Cryptographically secure UUID generated for every playback cycle (`crypto.randomUUID()`)
- [x] Video ID remains stable across consecutive cycles while session UUID changes
- [x] Start event deduplication (multiple `playing` triggers do not spawn multiple sessions)
- [x] Verified completion: `recordCompletion()` called only upon adapter `ended` event
- [x] Watch-time accumulation tracks active playback and pauses during buffering/pause
- [x] Failure states record error code and set `completionStatus = 'failed'`
- [x] Interruption states record `completionStatus = 'interrupted'`

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
