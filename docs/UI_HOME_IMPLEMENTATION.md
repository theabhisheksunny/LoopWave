# LoopWave UI Redesign — Phase 1: Home / Player Screen Implementation Plan

**Date**: 2026-10-20  
**Phase**: Phase 1 — Home / Player Screen Redesign  
**Scope**: Strictly the Home / Player Screen and its subcomponents (`UrlInputBar`, `MediaPlayerPanel`, `VideoCanvas`, `EmptyPlayerState`, `PlayerControlBar`, `QueuePanel`, `QueueItem`, `PlaybackSettingsBar`, `CurrentMediaInfo`, `PlaybackStatusBadge`). All other screens (Playlist, Library, Analytics, Settings, About) and shared business logic remain untouched and functional.

---

## 1. Inspection & Architectural Baseline

### A. Current Components & Structure
- **Root Layout** (`src/renderer/App.tsx`): Renders `TitleBar` at top, `AppSidebar` on left, and `MainPlayerView` in the center workspace.
- **Home View** (`src/renderer/components/player/MainPlayerView.tsx`): Currently coordinates URL input, player viewport, timeline controls, queue panel, master playback strip, and current media metadata card.
- **Player State Store** (`src/renderer/stores/playerStore.ts`): Single source of truth for `adapterState` (`status`, `currentTime`, `duration`, `volume`, `isMuted`, `playbackRate`), `currentSource`, `capabilities`, `queue`, `loopMode`, `interLoopDelaySeconds`, `currentSession`, and `countdownRemaining`.
- **Media Adapters**: `YouTubeAdapter` (Official IFrame API with `Referer` injection and origin fixes) and `DirectMediaAdapter` (HTML5 `<video>` / `<audio>` with HLS.js fallback).

### B. Baseline Test Results
- **Vitest Suite**: 10 passed test files, 56 passed tests (0 failures).
- **Playwright Electron E2E**: 9 passed scenarios (100% pass rate).
- **Packaged Executable**: Standalone Windows executable verified at `release/win-unpacked/LoopWave.exe`.

---

## 2. Design System & Tokens

All surfaces, borders, and text comply with the visual design palette:

| Token | CSS Variable | Hex Value | Usage |
|---|---|---|---|
| Main Background | `--bg-main` | `#080D17` | Window workspace background |
| Sidebar Background | `--bg-sidebar` | `#101827` | Fixed left navigation container |
| Card Background | `--bg-card` | `#111B2B` | Containers, queue panel, player card |
| Elevated Surface | `--bg-elevated` | `#18243A` | Inputs, buttons, hover states, chips |
| Primary Violet | `--primary-violet` | `#6547FF` | Primary button gradient, active badges |
| Secondary Blue | `--secondary-blue` | `#3478FF` | Secondary accents, progress fills |
| Accent Cyan | `--accent-cyan` | `#18D8E8` | Focal highlights, active status, focus rings |
| Primary Text | `--text-main` | `#F5F7FF` | Headings, active labels, track titles |
| Secondary Text | `--text-secondary` | `#A5B4CF` | Subtitles, timestamps, metadata, queue info |
| Border | `--border-color` | `#293750` | Card borders, dividers, subtle outlines |
| Success | `--status-success` | `#12C98A` | Playing status, loop verified, copy feedback |
| Error | `--status-error` | `#FF667D` | Playback errors, invalid URL alerts |

### Spacing & Typography Rules
- **Spacing Scale**: 8px grid (`gap-2` = 8px, `gap-4` = 16px, `p-4` = 16px, `p-6` = 24px).
- **Corner Radii**: 12px (`rounded-xl`) for controls/buttons, 16px (`rounded-2xl`) for panels and cards.
- **Borders**: 1px solid `#293750` for subtle separation without harsh contrast.
- **Hierarchy**: Bold titles in `#F5F7FF`, secondary metadata in `#A5B4CF`, monospace numbers for timers and UUIDs.
- **Restraint**: Eliminate excessive glows or heavy gradients in favor of refined dark surfaces and clear focus states.

---

## 3. Component Architecture & Implementation Details

### A. `UrlInputBar.tsx`
- Full-width horizontal bar at top of main view.
- Left link icon (`w-4 h-4 text-[#A5B4CF]`).
- Expandable input field with placeholder `"Paste a video or audio link"`.
- Clear button (`X`) when input has text, plus live source format badge (`YOUTUBE`, `MP4`, `WEBM`, `HLS`, `AUDIO`).
- Primary **Play** button (`#main-play-button`) with readable text and loading spinner.
- Secondary **Add to Queue** button (`title="Add current URL to queue"`).
- Enter key and Play click share identical submission handler.
- Compact sample format chips (`YouTube Short`, `YouTube Watch`, `Direct MP4`, `Direct WebM`, `Direct MP3`, `Live HLS`) that populate input without auto-starting remote requests.
- Inline validation error banner.

### B. `VideoCanvas.tsx` / `EmptyPlayerState.tsx`
- Large 16:9 bordered container framed by `#293750` and `rounded-2xl`.
- **Empty State**: Simple centered play icon, `No Media Loaded` heading, and clear instructions.
- **Loading State**: Subtle dark backdrop, spinner, and `Loading media stream...`.
- **Buffering State**: Pulsing indicator with `Buffering...`.
- **Playing State**: Real active player element (YouTube IFrame or HTML5 Video/Audio) maintaining true aspect ratio and black letterboxing for vertical video.
- **Completed State**: Indicator suggesting loop activation.
- **Error State**: Plain language explanation with `Retry` and `Open Link` buttons.

### C. `PlayerControls.tsx` (Player Control Bar)
- Sits directly below the media viewport.
- Timeline scrubber with elapsed and total duration (`00:00 / 00:00`).
- Play/Pause toggle, Stop, Seek backward/forward 5s.
- Volume icon and slider with mute toggle.
- Playback rate dropdown (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x).
- Picture-in-Picture and Fullscreen buttons with tooltips.

### D. `QueuePanel.tsx` & `QueueItem.tsx` (Up Next)
- Right-side panel titled `Up Next` with real-time count badge.
- Header controls: Shuffle queue, Clear queue.
- Individual track items showing source icon, truncated title with tooltip, duration, and actions (Play Now, Move Up, Move Down, Remove).
- Empty state with guidance when queue has 0 items.
- Responsive layout: side-by-side with player on wider windows, stacked beneath on narrow windows.

### E. `PlaybackSettings.tsx` (Playback Settings Strip)
- Prominent panel below the player and queue.
- Loop Mode switcher: interactive pills for `Off`, `Repeat 1`, and `Repeat All`, plus cycle button with exact title for automation compatibility.
- Inter-loop delay dropdown (0s, 1s, 2s, 3s, 5s, 10s).
- Previous track, **large central focal Play/Pause button**, Next track, Stop.
- Volume, speed selector, and fullscreen shortcuts.

### F. `CurrentMediaInfo.tsx` & `PlaybackStatusBadge.tsx`
- Footer card showing thumbnail/source icon, track title, source URL with copy link action.
- Status badge with color-coded dot (Playing, Paused, Buffering, Idle, Error).
- Cryptographic session UUID (`crypto.randomUUID()`) with copy action and cycle counter (`Cycle #1`).

---

## 4. Verification & Testing Strategy

1. **Vitest Unit/Integration Tests**: Run `npm test` to ensure all 56 tests pass without regression.
2. **Playwright Electron E2E Tests**: Run `node tests/e2e/electronE2e.mjs` verifying layout, YouTube Shorts (`n2YGWiRRxEs`), direct MP4/WebM/MP3, queue mutations, loop mode cycling, and overlays.
3. **Screenshot Generation**: Capture fresh screenshots of the redesigned Home screen in `docs/screenshots/`.
4. **Production Build & Packaging**: Execute `npm run pack` to compile and package `release/win-unpacked/LoopWave.exe`.
