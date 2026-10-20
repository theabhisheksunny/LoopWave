# LoopWave — System Architecture

## 1. Architectural Philosophy

LoopWave is designed as an offline-first, privacy-respecting Windows desktop media player. It strictly separates concerns between:
1. **The Privileged Electron Main Process**: System window lifecycle, secure local SQLite persistence, safe network inspection, and process sandboxing.
2. **The Isolated Preload Script**: A strictly allowlisted, typed RPC bridge exposing `window.loopwaveApi` without leaking Node.js primitives or shell capabilities.
3. **The Unprivileged React Renderer**: UI state management (Zustand), media adapter orchestration, session lifecycle, and local analytics presentation.

```mermaid
flowchart TD
    subgraph ElectronMain [Electron Main Process]
        WindowManager[Window Manager & Frameless Shell]
        SecurityModule[Security & SSRF Guard]
        SqliteManager[SQLite Database Manager (sql.js)]
        IpcHandlers[Validated IPC Dispatcher (Zod)]
    end

    subgraph PreloadBridge [Isolated Preload Bridge]
        ContextBridge[contextBridge.exposeInMainWorld]
        TypedAPI[loopwaveApi Contract]
    end

    subgraph RendererLayer [React Renderer Process]
        ZustandStores[Zustand Stores: Player, Library, Settings]
        SessionManager[PlaybackSessionManager (UUID Generator)]
        LoopCtrl[LoopController (Delay & Queue)]
        Registry[AdapterRegistry]
        
        subgraph Adapters [Media Adapters]
            YTAdapter[YouTubeAdapter (Official IFrame API)]
            DirectAdapter[DirectMediaAdapter (HTML5 / HLS.js)]
        end
        
        UI[Custom Dark UI / 6 Views]
    end

    ElectronMain <-->|Secure IPC Channels| PreloadBridge
    PreloadBridge <-->|window.loopwaveApi| RendererLayer
    Registry --> YTAdapter
    Registry --> DirectAdapter
    SessionManager --> LoopCtrl
    ZustandStores --> UI
```

---

## 2. Core Modules & Responsibilities

### `SourceResolver` (`src/renderer/adapters/sourceResolver.ts`)
- Pure function receiving raw user input strings.
- Validates protocol (only `http:` and `https:`).
- Analyzes domain and path to determine media type:
  - YouTube: parses standard watch, youtu.be, embed, shorts; validates video ID (`^[a-zA-Z0-9_-]{10,12}$`); extracts start timestamps.
  - HLS: matches `.m3u8` extensions or manifest MIME types.
  - Direct Video: `.mp4`, `.webm`, `.ogg`, `.mov`.
  - Direct Audio: `.mp3`, `.wav`, `.flac`, `.aac`.
- Rejects non-media webpages or dangerous protocols with user-actionable error messages.

### `PlaybackAdapter` (`src/renderer/adapters/adapterInterface.ts`)
- Contract defining standard playback capabilities:
  - `load(source, container, options)`
  - `play()`, `pause()`, `stop()`, `seek(time)`, `setVolume(vol)`, `setMuted(bool)`, `setPlaybackRate(rate)`
  - `getState()`, `getCapabilities()`, `dispose()`
  - Reactive state and event listeners.
- **YouTubeAdapter**: Wraps the official YouTube embedded IFrame API. Maps YouTube PlayerStates (-1, 0, 1, 2, 3, 5) and error codes (2, 5, 100, 101, 150) to LoopWave's unified event bus.
- **DirectMediaAdapter**: Manages HTML5 `<video>` and `<audio>` elements. Employs `hls.js` with bounded error recovery for `.m3u8` streams.

### `PlaybackSessionManager` (`src/renderer/session/sessionManager.ts`)
- Explicit lifecycle controller for playback cycles.
- Generates a cryptographically secure UUID (`crypto.randomUUID()`) for each new playback cycle.
- Keeps `videoId` stable while `sessionId` changes.
- Deduplicates playback start triggers.
- Computes non-overlapping watch time via continuous high-resolution timer (`performance.now()`).
- Closes sessions with explicit completion states (`completed`, `interrupted`, `stopped`, `failed`).

### `LoopController` (`src/renderer/session/loopController.ts`)
- Manages repeat modes:
  - `off`: Advances queue or stops naturally.
  - `one`: Re-triggers current track after configured delay.
  - `all`: Advances queue, wrapping around to index 0 at queue end.
- Inter-loop delay timer: provides live seconds countdown ticks to UI.
- Timers are automatically cancelled on pause, stop, track switch, loop mode change, or app shutdown to prevent memory leaks or runaway processes.

### `DatabaseManager` (`src/main/storage/db.ts`)
- Powered by `sql.js` (WebAssembly SQLite) to create 100% compliant SQLite `.db` binary files on disk without native C++ compilation dependencies.
- Tables: `settings`, `library_items`, `collections`, `analytics_sessions`, `analytics_events`.
- In **Private Mode**: maintains an ephemeral in-memory database, discarding all data upon closing.
- Applies automatic retention pruning based on user settings (`analyticsRetentionDays`).

---

## 3. Security Boundary

| Security Requirement | Implementation |
|---|---|
| **Context Isolation** | Enabled (`contextIsolation: true`) in `src/main/window.ts`. |
| **Node.js Integration** | Disabled (`nodeIntegration: false`, `sandbox: true`) in renderer. |
| **Content Security Policy** | Strict CSP enforced via meta tag and `session.defaultSession.webRequest.onHeadersReceived`. |
| **SSRF Prevention** | `isPrivateIp()` blocks private ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `localhost`). |
| **External Link Safety** | `isSafeExternalUrl()` validates protocols before passing to `shell.openExternal`. Denies arbitrary window creation. |
| **IPC Validation** | Every IPC message is validated in main process using `zod` schemas before execution. |
