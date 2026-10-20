# LoopWave — Implementation Plan

## Overview
LoopWave is a privacy-focused Windows desktop media player built with Electron, React, TypeScript, and SQLite. It provides URL-based streaming for supported sources (YouTube official embedded player and direct HTML5/HLS media), resilient session and infinite loop lifecycle management, zero-telemetry local analytics with cryptographic session separation, a personal media library, and strict Electron security boundaries.

---

## Phase Breakdown

### Phase 1: Workspace, Build Tooling & Foundation
- [x] Initialize `package.json` with pinned dependencies (Electron, React, Vite, TypeScript, Vitest, Zustand, Zod, etc.).
- [x] Configure TypeScript configs (`tsconfig.json`, `tsconfig.main.json`, `tsconfig.preload.json`).
- [x] Configure Vite build setup for Electron (`vite.config.ts`, `@tailwindcss/vite`).
- [x] Implement secure Electron main process (`src/main/index.ts`, `src/main/window.ts`, `src/main/security.ts`):
  - Context isolation: `true`
  - Node integration: `false`
  - Restrictive Content Security Policy (CSP)
  - Safe navigation blocker, external URL opener restriction
  - SSRF-safe URL inspector for media headers
- [x] Implement secure typed Preload script (`src/preload/index.ts`) with `contextBridge`.
- [x] Implement basic React application shell (`src/renderer/App.tsx`) with dark charcoal / cyan / violet theme and 6 main navigation views:
  1. Home (Quick URL play, quick links, recent history)
  2. Player (Player canvas, custom controls, loop configuration, queue)
  3. Library (Collections, playlists, favorites, search, import/export)
  4. Analytics (Sessions, completed cycles, watch time, charts, CSV/JSON export)
  5. Settings (Privacy mode, retention, storage policy, keyboard shortcuts)
  6. About & Diagnostics (Version, adapter status, runtime health, storage policy details)
- [x] Verify build and test scripts.

### Phase 2: Media Adapter Contract & Playback Engine
- [x] Define `PlaybackAdapter` interface and lifecycle events (`canHandle`, `load`, `play`, `pause`, `seek`, `getState`, `dispose`, capability reporting).
- [x] Implement `SourceResolver`:
  - YouTube URL parser (standard watch, youtu.be, embed, shorts, timestamp support, ID validation).
  - Direct media URL parser (.mp4, .webm, .m3u8, .ogg, .mp3, .wav, .aac, .flac).
  - Unsafe / unsupported URL rejection with actionable error messages.
- [x] Implement `YouTubeAdapter`:
  - Official YouTube IFrame API loader.
  - Standard player state mapping (unstarted, playing, paused, buffering, cued, ended).
  - Safe error handling (embed disabled, restricted, video not found).
  - Transparent overlay / controls bridge.
- [x] Implement `DirectMediaAdapter`:
  - HTML5 video element integration.
  - HLS.js streaming support for `.m3u8` playlists.
  - Buffering detection, error handling, stalled playback recovery.
- [x] Build `AdapterRegistry` to dynamically select and mount the appropriate adapter.
- [x] Build custom media control interface (Timeline scrubbing, volume/mute, speed 0.25x-2x, PiP, Fullscreen).

### Phase 3: Session Lifecycle & Looping Controller
- [x] Implement `PlaybackSessionManager`:
  - Fresh cryptographically secure UUID (`crypto.randomUUID()`) for every cycle.
  - Stable video ID tracking across cycles.
  - Typed session model (`sessionId`, `videoId`, `cycleNumber`, `startedAt`, `endedAt`, `watchedSeconds`, `completionStatus`, `errorCode`).
  - Strict deduplication of playback start events.
  - Strict completion verification before cycle increment.
- [x] Implement `LoopController`:
  - Modes: `off`, `one` (repeat current), `all` (repeat queue/playlist).
  - Configurable inter-loop delay (0s, 1s, 2s, 5s, 10s, custom seconds) with visual countdown.
  - Safe cancellation of pending timers on stop, pause, track change, loop mode change, or app close.
  - Bounded retry logic for transient network failures.
  - Teardown and cleanup of stale player resources and listeners.
- [x] Unit & integration tests for lifecycle, loop timing, and cancellation.

### Phase 4: Local Analytics Service & Dashboard
- [x] Define typed event schema (`playback_started`, `playback_paused`, `playback_resumed`, `buffering_started`, `buffering_ended`, `playback_completed`, `playback_interrupted`, `playback_failed`).
- [x] Implement `AnalyticsService`:
  - In-memory event stream + SQLite persistence.
  - Exact watch-time accumulation without double-counting overlaps.
  - Idempotent event recording.
  - Clear distinction: local playback cycles != YouTube external views.
- [x] Build Analytics Dashboard:
  - Metric summary cards (Total Sessions, Completed Cycles, Total Watch Time, Avg Cycle Duration, Failure/Interruption Rate).
  - Interactive SVG charts (Playback timeline, loop cycles per video, completion rate breakdown).
  - Per-video playback history table.
  - Date range filtering (Today, 7 days, 30 days, All time).
  - Export to CSV and JSON.
  - Clear analytics button with confirmation.
- [x] Unit tests for analytics calculations and export formats.

### Phase 5: Personal Media Library & Settings
- [x] Implement SQLite metadata storage in Electron main process with safe IPC handlers:
  - Tables: `library_items`, `collections`, `analytics_sessions`, `analytics_events`, `settings`.
  - In-memory fallback if persistence is disabled or private mode is active.
- [x] Implement `LibraryService`:
  - Saved links with custom titles and collection tags.
  - Favorites toggle.
  - Duplicate URL detection with warning/resolution.
  - Queue management (reorder, add, remove, shuffle, clear).
  - Import / export playlist as JSON file.
- [x] Implement Privacy & Storage Settings:
  - Toggle `Private Mode` (zero persistence to disk).
  - Toggle `Persist Analytics` (enabled / disabled).
  - Retention setting (7 days, 30 days, 90 days, Forever).
  - One-click "Purge All Data" (clears SQLite database and transient cache).
  - Default playback settings (auto-loop, default delay, default volume).

### Phase 6: Security Hardening & Edge-Case Testing
- [x] Security audit: CSP validation, external URL blocking, IPC argument validation using Zod.
- [x] Long-run loop stability test: ensure no memory leaks or runaway timers across simulated loops.
- [x] URL edge case testing: malformed URLs, SSRF localhost URLs, non-media HTML pages.
- [x] Run comprehensive test suite (Vitest + RTL): 54/54 tests passing.

### Phase 7: Windows Release & Documentation
- [x] Configure `electron-builder` for Windows packaging.
- [x] Build production application bundle.
- [x] Create documentation:
  - `README.md`
  - `docs/STATUS.md`
  - `docs/ARCHITECTURE.md`
  - `docs/PRIVACY.md`
  - `docs/TESTING.md`
  - `docs/RELEASE.md`
- [x] Final verification and artifact summary.
