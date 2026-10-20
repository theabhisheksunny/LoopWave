# LoopWave — Bug Audit & Root Cause Analysis

## Defect Summary & Severity Matrix

| Defect ID | Severity | Component | Summary | Root Cause & Resolution |
|---|---|---|---|---|
| **BUG-001** | **CRITICAL** | `playerStore` / `HomeScreen` | Media never loads into canvas when submitted from Home screen | `loadUrl` called `adapter.load()` while `containerElement` was null because `VideoCanvas` was on a separate unmounted route. Fixed by keeping `VideoCanvas` permanently mounted and adding automatic load triggers upon container attachment. |
| **BUG-002** | **CRITICAL** | `YouTubeAdapter` | YouTube embedded player fails to communicate / postMessage errors in Electron | Passing `origin: "file://"` caused YouTube cross-origin frame rejection. Fixed by omitting `origin` under `file://` protocol and injecting `Referer: https://www.youtube.com/` via Electron's `onBeforeSendHeaders`. |
| **BUG-003** | **HIGH** | `main/index.ts` | Autoplay blocked by Chromium media policy | Without `--autoplay-policy=no-user-gesture-required` command line switch, programmatic playback is prevented by Chromium's desktop policy. Added switch in `src/main/index.ts`. |
| **BUG-004** | **HIGH** | `main/index.ts` / `index.html` | Content Security Policy blocking YouTube streaming assets | CSP did not permit necessary Google/YouTube sub-resources (`*.googlevideo.com`, `*.google.com`, `static.doubleclick.net`). Updated CSP headers in `index.html` and Electron session headers. |
| **BUG-005** | **CRITICAL** | `preload/index.ts` | Sandboxed preload module resolution failure | In Electron sandboxed mode, `require('../shared/ipc')` fails inside `sandbox_bundle`. Extracted pure channel strings to `src/shared/channels.ts` and inlined them in `src/preload/index.ts` with zero external dependencies. |
| **BUG-006** | **MEDIUM** | `sourceResolver.ts` | YouTube Shorts URL trailing parameter interference | YouTube Shorts URLs with trailing parameters (`?feature=share`) need robust normalization to `https://www.youtube.com/watch?v={id}`. Added dedicated regex extraction in `sourceResolver.ts`. |
| **BUG-007** | **MEDIUM** | `PlayerControls.tsx` | Buttons lack visual feedback or appear enabled when unready | Controls row had overlapping tooltips and lack of immediate disabled/active indicators. Rebuilt with clear focus states and explicit capability flags. |
| **BUG-008** | **MEDIUM** | `AppSidebar.tsx` / `PlaybackSettings.tsx` | Automated test selector substring collision on `title*="Play"` | In automated testing, the selector `button[title*="Play"]` inadvertently matched the sidebar button with `title="Playlist"`, opening the Playlist overlay instead of resuming playback. Resolved by setting distinct, descriptive tooltips across sidebar navigation and reserving `Play (Space)` exclusively for the focal playback button. |

---

## Detailed Root Cause Analysis

### 1. BUG-001: Container Lifecycle Race
When the application started on `HomeScreen`, the `<VideoCanvas />` was unmounted because it lived strictly in `PlayerScreen`. Calling `loadUrl(url)` from `HomeScreen` invoked:
```ts
if (containerElement) {
  await adapter.load(source, containerElement, options);
}
```
Because `containerElement` was `null`, the adapter never loaded the video into any DOM container. Then `setRoute('player')` rendered `VideoCanvas`, but `VideoCanvas` only called `setContainerElement(containerRef.current)`. The player remained permanently uninitialized, showing "No media loaded".

**Fix**:
Redesign the primary screen so that the URL input, Play button, player canvas, compact controls, and queue reside on the **same primary unified interface**. Ensure `setContainerElement` automatically mounts and triggers `adapter.load` if a `currentSource` is already pending.

### 2. BUG-002: YouTube IFrame Origin Rejection
Under Electron's `file://` protocol, `window.location.origin` is `"file://"`.
The YouTube IFrame Player API strictly validates `origin` against valid HTTP/HTTPS web origins. Passing `"file://"` triggers:
`Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('file://') does not match the recipient window's origin.`
The player fails to transition from unstarted to cued or ready.

**Fix**:
Configure YouTube IFrame player parameters without `origin` under `file://`, configure `host: 'https://www.youtube-nocookie.com'`, and inject `Referer: https://www.youtube.com/` in Electron main process headers.

### 3. BUG-003: Autoplay Policy Restriction
Electron inherits Chromium's autoplay policy requiring user interaction on the document before media elements or embedded iframes can play with audio.

**Fix**:
Add `app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')` in `src/main/index.ts` so desktop media playback initiates smoothly when the user clicks "Play".

### 4. BUG-004: CSP Restrictions
YouTube player dynamically loads assets from:
- Scripts: `https://www.youtube.com`, `https://s.ytimg.com`, `https://www.google.com`
- Frames: `https://www.youtube.com`, `https://www.youtube-nocookie.com`
- Media & Chunks: `https://*.googlevideo.com`, `blob:`, `data:`
- Connect: `https://*.youtube.com`, `https://*.googlevideo.com`, `https://*.google.com`

**Fix**:
Update CSP headers in `index.html` and `src/main/index.ts` to accommodate these legitimate streaming domains while retaining strict application isolation.
