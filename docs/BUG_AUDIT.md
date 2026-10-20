# LoopWave — Bug Audit & Root Cause Analysis

## Defect Summary & Severity Matrix

| Defect ID | Severity | Component | Summary | Root Cause |
|---|---|---|---|---|
| **BUG-001** | **CRITICAL** | `playerStore` / `HomeScreen` | Media never loads into canvas when submitted from Home screen | `loadUrl` calls `adapter.load(source, containerElement)` while `containerElement` is null because `VideoCanvas` is on a separate unmounted route (`PlayerScreen`). When `PlayerScreen` mounts, `setContainerElement` only stores the DOM reference without re-invoking `adapter.load()`. |
| **BUG-002** | **CRITICAL** | `YouTubeAdapter` | YouTube embedded player fails to communicate / postMessage errors in Electron | When Electron loads via `file://`, `window.location.origin` evaluates to `'file://'` or `'null'`. Passing this as the origin to YouTube's IFrame API causes YouTube's cross-origin frame messaging to fail, blocking player initialization and ready events. |
| **BUG-003** | **HIGH** | `main/index.ts` / `window.ts` | Autoplay blocked by Chromium media policy | Without `--autoplay-policy=no-user-gesture-required` command line switch, programmatic playback is prevented by Chromium's strict autoplay restrictions in desktop environments. |
| **BUG-004** | **HIGH** | `main/index.ts` / `index.html` | Content Security Policy blocking YouTube API assets | CSP did not permit necessary Google/YouTube sub-resources (`*.googlevideo.com`, `*.google.com`, `static.doubleclick.net`) required for player telemetry, video chunk delivery, and script execution. |
| **BUG-005** | **MEDIUM** | `sourceResolver.ts` | Potential YouTube Shorts URL query parameter interference | YouTube Shorts URLs with trailing query parameters (e.g. `?feature=share`) or varying pathname formats need robust extraction and normalization to `https://www.youtube.com/watch?v={id}`. |
| **BUG-006** | **HIGH** | UI / Workflow Architecture | Fragmented multi-page workflow creates broken user experience | The user has to jump between "Home" (where input is) and "Player" (where canvas is), causing UI state disconnects, unmounted canvases, and confusion. |
| **BUG-007** | **MEDIUM** | `PlayerControls.tsx` | Buttons lack visual feedback or appear enabled when player is unready | Controls row had overlapping tooltips and lack of immediate disabled/active indicators when no media is loaded. |

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
Configure YouTube IFrame player parameters with a standard web origin (`https://www.youtube.com`) or fallback, configure `host: 'https://www.youtube-nocookie.com'`, and handle postMessage messaging safely.

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
