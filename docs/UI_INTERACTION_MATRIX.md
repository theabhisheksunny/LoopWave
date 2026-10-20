# LoopWave — UI Interaction Matrix & Control Audit

This document records the verification status of every interactive control, button, input, toggle, and keyboard shortcut across the LoopWave desktop application.

| Control / Interaction | Component | Expected Behavior | Observed Result | Status |
|---|---|---|---|---|
| **App Logo / Brand Click** | `AppSidebar` | Navigates directly to Home player workspace. | Sets currentRoute to `'home'` cleanly. | **PASS** |
| **Home Nav Button** | `AppSidebar` | Displays Home player view with violet gradient indicator. | Highlights active state; renders main player view. | **PASS** |
| **Playlist Nav Button** | `AppSidebar` | Opens full dedicated Playlist management view. | Opens Playlist screen with queue reordering, shuffle, and clear. | **PASS** |
| **Library Nav Button** | `AppSidebar` | Opens Personal Media Library overlay. | Displays bookmarks, favorites, search, and collections. | **PASS** |
| **Analytics Nav Button** | `AppSidebar` | Opens Local Analytics Dashboard overlay. | Displays sessions, cycles, watch-time charts, and JSON/CSV export. | **PASS** |
| **Settings Nav Button** | `AppSidebar` | Opens Settings & Privacy configuration panel. | Displays looping preferences, private mode, retention, and diagnostics. | **PASS** |
| **About Nav Button** | `AppSidebar` | Opens About & Diagnostics view pinned at sidebar bottom. | Displays version, architecture notes, and keyboard shortcuts table. | **PASS** |
| **Mini Player Card** | `AppSidebar` | Shows current playing track, status, and loop badge; navigates to Home. | Returns user to player view; displays live playing badge. | **PASS** |
| **URL Input Field** | `UrlInputBar` | Accepts text via typing/paste; validates link dynamically. | Updates state, detects source, and renders source badge (`YOUTUBE`, `MP4`, `WEBM`, `HLS`, `AUDIO`). | **PASS** |
| **Clear Input (`X`)** | `UrlInputBar` | Clears URL input text and error feedback. | Empties input field immediately. | **PASS** |
| **Primary Play Button** | `UrlInputBar` | Submits URL, initializes adapter, and mounts media in canvas. | Starts playback immediately without unmounting player canvas. | **PASS** |
| **Queue Add Button** | `UrlInputBar` | Adds validated URL to playback queue. | Appends item to queue and displays temporary success message. | **PASS** |
| **Quick Preset Chips** | `UrlInputBar` | Populates input with verified test links (Shorts, Watch, MP4, WebM, MP3, HLS). | Populates input field for inspection; validates format. | **PASS** |
| **Player Viewport Canvas** | `VideoCanvas` | Mounts YouTube IFrame or HTML5 `<video>` / `<audio>` element. | Renders 16:9 media with dark background and zero stretching. | **PASS** |
| **Loop Countdown Overlay** | `VideoCanvas` | Displays countdown during inter-loop delay period. | Shows animated countdown clock with live seconds. | **PASS** |
| **Seek Timeline Scrubber** | `PlayerControls` | Draggable range input seeking within duration. | Updates playback position smoothly; shows `00:00 / 00:00`. | **PASS** |
| **Up Next Queue Count** | `QueuePanel` | Shows count of queued tracks. | Badge updates in real time as items are added/removed. | **PASS** |
| **Queue Shuffle Button** | `QueuePanel` | Shuffles order of queued tracks randomly. | Reorders queue items immediately using Fisher-Yates algorithm. | **PASS** |
| **Queue Clear Button** | `QueuePanel` | Removes all tracks from queue. | Empties queue; displays clean empty state without stopping active playback. | **PASS** |
| **Queue Item Play Now** | `QueuePanel` | Immediately loads and plays selected queue item. | Dispatches track to playback engine and marks item active. | **PASS** |
| **Queue Item Reorder (Up/Down)** | `QueuePanel` | Moves track position up or down. | Swaps position in state and re-renders list. | **PASS** |
| **Queue Item Remove (`Trash`)** | `QueuePanel` | Removes individual item from queue. | Removes item from array and recalculates active index. | **PASS** |
| **Loop Mode Cycling Button** | `PlaybackSettings` | Cycles `Off` &rarr; `Repeat 1` (glow-violet) &rarr; `Repeat All` (glow-cyan). | Cycles sequentially; updates loop controller immediately. | **PASS** |
| **Loop Delay Dropdown** | `PlaybackSettings` | Sets delay between loops (0s, 1s, 2s, 3s, 5s, 10s). | Updates inter-loop delay timer in session manager. | **PASS** |
| **Previous Track** | `PlaybackSettings` | Restarts current media or moves to previous queue item. | Seeks to 0 or advances queue backwards. | **PASS** |
| **Large Focal Play/Pause Button** | `PlaybackSettings` | Central glowing button toggling play and pause. | Toggles active media state; provides prominent visual feedback. | **PASS** |
| **Stop Button** | `PlaybackSettings` | Stops playback, resets position to 0, cancels loop timers. | Halts media, cancels pending timers, marks session stopped. | **PASS** |
| **Next Track** | `PlaybackSettings` | Advances to next queued track. | Loads next item in queue or loops to start if Repeat All. | **PASS** |
| **Volume Slider & Mute Toggle** | `PlaybackSettings` | Adjusts volume from 0 to 100%; mute toggles audio off/on. | Updates volume level; mute button displays `VolumeX`. | **PASS** |
| **Playback Speed Selector** | `PlaybackSettings` | Changes playback rate (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x). | Changes adapter playback rate when supported by source. | **PASS** |
| **Picture-in-Picture** | `PlaybackSettings` | Enters PiP mode on supported video elements. | Invokes native PiP API on HTML5 video elements. | **PASS** |
| **Fullscreen Button** | `PlaybackSettings` | Toggles window/element fullscreen mode. | Expands player to fullscreen; exits on toggle or Escape. | **PASS** |
| **Copy Canonical URL** | `CurrentMediaInfo` | Copies active media URL to clipboard. | Copies link and flashes checkmark indicator. | **PASS** |
| **Copy Session UUID** | `CurrentMediaInfo` | Copies cryptographically unique internal cycle UUID. | Writes UUID to clipboard and provides visual confirmation. | **PASS** |
| **Modal Close (`X` / `Escape`)** | App Overlay | Closes secondary modal and returns to Home player view. | Closes overlay instantly; active playback continues uninterrupted. | **PASS** |
| **Window Minimize / Maximize / Close** | `TitleBar` | Native Electron desktop window manipulation. | Dispatches IPC to Electron main window process. | **PASS** |
| **Keyboard: Space** | Global | Toggles play/pause (when input is not focused). | Pauses when playing; resumes when paused. | **PASS** |
| **Keyboard: Left/Right Arrow** | Global | Seeks &plusmn;5 seconds. | Jumps 5 seconds backward/forward. | **PASS** |
| **Keyboard: Up/Down Arrow** | Global | Adjusts volume &plusmn;5%. | Increases/decreases volume by 5%. | **PASS** |
| **Keyboard: M** | Global | Toggles mute on/off. | Mutes and restores previous volume. | **PASS** |
| **Keyboard: F** | Global | Toggles fullscreen. | Expands canvas to fullscreen. | **PASS** |
| **Keyboard: L** | Global | Cycles loop mode (`off` &rarr; `one` &rarr; `all`). | Changes loop mode instantly. | **PASS** |
