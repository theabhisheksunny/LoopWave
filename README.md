# LoopWave

> **Privacy-Focused Online Media Player for Windows with Infinite Looping and Local Analytics**

LoopWave is a Windows desktop application built with **Electron**, **React**, **TypeScript**, and **SQLite**. It allows users to stream and loop online media (official YouTube embedded streams, direct MP4/WebM/audio files, and live HLS streams) seamlessly with custom inter-loop delays, zero-telemetry local playback analytics, cryptographic session tracking, and a personal media library.

---

## Highlights & Features

- **Multi-Source Streaming Adapters**:
  - **Official YouTube Player**: Official YouTube IFrame Player integration with origin-sandboxed communication, time scrubbing, speed adjustments, and robust error handling.
  - **Direct HTML5 & HLS**: Full hardware-accelerated streaming for `.mp4`, `.webm`, `.ogg`, `.mp3`, `.wav`, `.flac`, and live `.m3u8` streams via `hls.js`.
- **Infinite Looping & Resilient Session Lifecycle**:
  - Independent `PlaybackSessionManager` that issues a fresh cryptographically secure UUID (`crypto.randomUUID()`) for each playback cycle.
  - Stable video ID tracking across cycles.
  - Configurable inter-loop delay (0s, 1s, 2s, 5s, 10s, custom seconds) with live countdown overlay.
  - Loop modes: `Off` (play once), `Repeat 1` (infinite single-track loop), `Repeat All` (queue loop).
  - Deduplicated start recording and verified adapter completion checks.
  - Safe cancellation of timers on stop, pause, track switch, or app close.
- **Privacy-First Local Analytics**:
  - 100% local tracking: starts, completions, pauses, resumes, buffer events, watched durations, failures.
  - Overlap-free watch duration accumulation.
  - Interactive SVG charts, per-video breakdown, date range filters (Today, 7d, 30d, All Time).
  - One-click export to **JSON** and **CSV**.
  - Retention policy (7, 30, 90 days, or Forever) and one-click data clear.
  - Zero external telemetry: metrics never leave your device.
- **Personal Media Library**:
  - Bookmark links, favorites, and custom collections.
  - Duplicate URL detection with friendly warnings.
  - Reorderable playback queue.
  - Export and import playlist collections as JSON.
- **Strict Electron Security**:
  - Context isolation: `true`
  - Node integration: `false`
  - Restrictive Content Security Policy (CSP)
  - Isolated renderer with typed preload bridge (`loopwaveApi`)
  - Server-Side Request Forgery (SSRF) protection blocking private IP subnets and localhost.
  - Input validation on all IPC channels using `zod`.
  - Zero shell execution with user-controlled input.
- **Polished Desktop UI**:
  - Deep charcoal theme (`#0B0E14`), cyan and violet glowing accents.
  - Frameless custom draggable TitleBar with native Windows controls.
  - Responsive layout, accessible tooltips, and global keyboard shortcuts.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause |
| `Left Arrow` / `Right Arrow` | Seek &plusmn;5 seconds |
| `Up Arrow` / `Down Arrow` | Volume &plusmn;5% |
| `M` | Mute / Unmute |
| `F` | Toggle Fullscreen |
| `L` | Cycle Loop Mode (Off &rarr; Repeat 1 &rarr; Repeat All) |

---

## Tech Stack

- **Shell**: Electron 32.3.3 (Chromium 128 / Node 20.18.0)
- **Frontend**: React 18, TypeScript 5.7, Tailwind CSS v4, Lucide Icons
- **Bundler**: Vite 6.1
- **Database**: SQLite (via `sql.js` WebAssembly + file sync; RAM-only in Private Mode)
- **Schema Validation**: Zod
- **Testing**: Vitest 3.0, React Testing Library, JSDOM
- **Packaging**: Electron Builder (Windows x64)

---

## Installation & Development

### Prerequisites
- Node.js &ge; 20.x
- npm &ge; 10.x
- Windows 10/11 x64

### Setup

```bash
# Clone the repository
git clone https://github.com/loopwave/loopwave.git
cd loopwave

# Install dependencies with locked lockfile
npm install
```

### Running Tests

```bash
# Run all Vitest unit and integration tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Development Mode

```bash
# Start Vite development server
npm run dev
```

### Production Build & Packaging

```bash
# Build renderer, main, and preload bundles
npm run build

# Package unpacked Windows desktop application
npm run pack

# The packaged Windows binary will be available at:
# release/win-unpacked/LoopWave.exe
```

---

## License

MIT License. Copyright &copy; 2026 LoopWave Team.
