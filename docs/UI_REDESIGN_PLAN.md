# LoopWave — Premium UI Redesign & Functional Integration Plan

## 1. Executive Summary

This plan outlines the visual redesign and functional integration of **LoopWave** to achieve a premium, high-contrast dark desktop media player interface matching the design specification. The redesign preserves all underlying core subsystems:
- Official YouTube embedded IFrame player with origin/referrer fixes.
- HTML5 / HLS.js direct media player for MP4, WebM, MP3, WAV, and M3U8.
- Cryptographic local playback session management (`crypto.randomUUID()`) and infinite loop controller with configurable delays.
- Local SQLite library, bookmarks, favorites, and analytics.
- Sandboxed IPC boundaries, SSRF protections, and zero external telemetry.

---

## 2. Design Tokens & Color Palette

All colors and surfaces conform to the specified palette:

| Token | Hex Value | Usage |
|---|---|---|
| `--bg-main` | `#080D17` | Root background of the desktop player workspace |
| `--bg-sidebar` | `#101827` | Left navigation sidebar background |
| `--bg-card` | `#111B2B` | Containers, queue panel, and info cards |
| `--bg-elevated` | `#18243A` | Dropdowns, hover states, and active items |
| `--primary-violet` | `#6547FF` | Primary action gradient, active badges |
| `--secondary-blue` | `#3478FF` | Secondary accents, progress fills |
| `--accent-cyan` | `#18D8E8` | Highlight glows, live playback badges, active focus |
| `--text-main` | `#F5F7FF` | Primary headings, titles, active labels |
| `--text-secondary` | `#A5B4CF` | Subtitles, timestamps, metadata, queue details |
| `--border-color` | `#293750` | Panel borders, dividers, subtle outlines |
| `--status-success` | `#12C98A` | Success messages, active playing indicator |
| `--status-error` | `#FF667D` | Error alerts, failed sessions, critical notifications |

---

## 3. Component Architecture & Layout Hierarchy

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar (Custom draggable region, brand, private mode badge, minimize/maximize/close)  │
├──────────────┬─────────────────────────────────────────────────────────────────────────┤
│ AppSidebar   │ Main Content Area                                                       │
│              │ ┌─────────────────────────────────────────────────────────────────────┐ │
│ - Logo       │ │ UrlInputBar (Link icon, clear button, Play button, Queue button)    │ │
│ - Version    │ │ [Chips: YouTube Short | YouTube Watch | Direct MP4 | WebM | MP3...] │ │
│              │ └─────────────────────────────────────────────────────────────────────┘ │
│ - Home       │ ┌───────────────────────────────────────────────┬─────────────────────┐ │
│ - Playlist   │ │ Main Player Panel                             │ Up Next Queue Panel │ │
│ - Library    │ │ - VideoCanvas (YouTube IFrame / HTML5 Video)  │ - Up Next Header    │ │
│ - Analytics  │ │ - Loading / Buffering / Error Overlays        │ - Count / Shuffle   │ │
│ - Settings   │ │ - Empty State ("No Media Loaded")             │ - Queue items list  │ │
│              │ │ ───────────────────────────────────────────── │ - Per-item actions  │ │
│              │ │ PlayerControls (Timeline scrubber, time)      │ - Clear queue       │ │
│              │ └───────────────────────────────────────────────┴─────────────────────┘ │
│              │ ┌─────────────────────────────────────────────────────────────────────┐ │
│ - About      │ │ PlaybackSettings Strip (Loop pills, delay, Prev, Large Play, Next...)│
│   (at bottom)│ └─────────────────────────────────────────────────────────────────────┘ │
│              │ ┌─────────────────────────────────────────────────────────────────────┐ │
│              │ │ CurrentMediaInfo Panel (Title, URL, badges, session UUID, cycle)   │ │
│              │ └─────────────────────────────────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### Component Details
1. **`AppSidebar`**:
   - Fixed width (`220px`), dark sidebar background (`#101827`).
   - LoopWave logo with radiant violet/cyan glow and `v1.0.0` badge.
   - Navigation links: `Home`, `Playlist`, `Library`, `Analytics`, `Settings`, and `About` (pinned to bottom).
   - Active link highlighted with subtle violet/blue gradient (`from-[#6547FF]/20 to-[#3478FF]/20`) with cyan left border indicator.

2. **`UrlInputBar`**:
   - Link icon, clean text input (`placeholder="Paste a video or audio link"`), clear input button (`X`), primary gradient `Play` button, secondary `Add to Queue` button.
   - Preset chips for 1-click inspection: YouTube Short (`n2YGWiRRxEs`), YouTube Watch, Direct MP4, Direct WebM, Direct MP3, and Live HLS.
   - Real-time inline validation with source type badge (`YOUTUBE`, `MP4`, `WEBM`, `HLS`, `AUDIO`).

3. **`MediaPlayer` & `VideoCanvas`**:
   - 16:9 responsive viewport framed by `#293750` border and rounded-2xl geometry.
   - All 8 states supported: Idle/Empty (`No Media Loaded`), Loading, Ready, Playing, Paused, Buffering, Ended, and Error.
   - Persistent DOM attachment ensuring seamless background playback when switching views.

4. **`PlayerControls`**:
   - High-precision timeline scrubber with buffered/current fill and time formatting (`00:00 / 00:00`).

5. **`QueuePanel` (`Up Next`)**:
   - Right-side column integrated into the grid.
   - Header with count badge, Shuffle button, and Clear button.
   - Card items with source thumbnail / icon, title, format badge, duration, and hover action controls (Play Now, Move Up/Down, Remove).

6. **`PlaybackSettings`**:
   - Prominent central controls strip with large illuminated Play/Pause button as the focal point (`bg-gradient-to-r from-[#6547FF] to-[#18D8E8]`).
   - Loop mode switcher (`Off`, `Repeat 1`, `Repeat All`) with glowing active indicators.
   - Inter-loop delay configurator (`0s`, `1s`, `2s`, `5s`, `10s`, `Custom`).
   - Previous, Next, Volume slider, Speed selector (0.5x to 2x), Picture-in-Picture, Fullscreen.

7. **`CurrentMediaInfo`**:
   - Footer panel showing media title, canonical URL, source badge, playback state, cryptographic session UUID (`crypto.randomUUID()`) with copy action, and cycle number badge.

8. **Secondary Views (`Playlist`, `Library`, `Analytics`, `Settings`, `About`)**:
   - Navigable via `AppSidebar`.
   - Mounted seamlessly alongside the persistent player so playback continues uninterrupted.

---

## 4. Implementation Steps

1. **Tokens & CSS Theme**: Update `src/renderer/index.css` with CSS variables and utility classes matching the design palette.
2. **Sidebar Component**: Implement `src/renderer/components/layout/AppSidebar.tsx` with high-contrast active states and full navigation routes.
3. **Queue & Controls Components**:
   - Create `src/renderer/components/player/QueuePanel.tsx` for the right-side Up Next section.
   - Create `src/renderer/components/player/PlaybackSettings.tsx` for the central focal playback strip.
   - Create `src/renderer/components/player/CurrentMediaInfo.tsx` for the bottom metadata panel.
4. **Primary View Unification**: Reassemble `MainPlayerView.tsx` with responsive CSS grid (`grid-cols-1 lg:grid-cols-3` or `4`), housing the player, queue, controls, and info strip.
5. **Secondary Screen Routes**:
   - Add dedicated `PlaylistScreen.tsx` route.
   - Ensure `LibraryScreen`, `AnalyticsScreen`, `SettingsScreen`, and `AboutScreen` fit the new theme.
   - Ensure navigating to any secondary route keeps the player engine mounted and audible.
6. **Verification & Testing**:
   - Run Vitest suite (`npm test`).
   - Run Playwright Electron E2E suite (`node tests/e2e/electronE2e.mjs`).
   - Verify YouTube Shorts link `https://www.youtube.com/shorts/n2YGWiRRxEs`.
   - Capture high-resolution screenshots of all views in `docs/screenshots/`.
   - Package standalone Windows executable.
