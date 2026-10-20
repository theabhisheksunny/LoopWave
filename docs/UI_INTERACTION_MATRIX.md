# LoopWave — UI Interaction Matrix & Control Audit

This document records the verification status of every interactive control, button, input, toggle, and keyboard shortcut across the LoopWave desktop application.

| Control / Interaction | Location | Expected Behavior | Observed Result | Status |
|---|---|---|---|---|
| **URL Input Field** | Main Screen | Accepts text via typing or clipboard paste; validates URL dynamically. | Input receives focus, parses YouTube/Direct links, and displays detected source pill. | **PASS** |
| **Primary Play Button** | Main Screen | Submits URL, initializes adapter, and mounts player canvas immediately. | Starts playback immediately without route switching or losing container element. | **PASS** |
| **Queue Add Button (`+ Queue`)** | Main Screen | Adds parsed source to playback queue without interrupting current stream. | Adds item to queue list with title, video ID, and type. | **PASS** |
| **Quick Preset Chips** | Main Screen | Fills URL input with verified test links (Shorts, Watch, MP4, WebM, MP3, HLS). | Updates input field instantly; triggers detection badge. | **PASS** |
| **Play/Pause Toggle** | Control Bar | Toggles playback between `playing` and `paused` states. | Immediate icon switch (`Play` &harr; `Pause`), pauses/resumes audio/video. | **PASS** |
| **Stop Button** | Control Bar | Stops playback, resets position to `00:00`, closes active session as `stopped`. | Cleans up playback, cancels pending timers, resets scrubber. | **PASS** |
| **Seek Timeline Scrubber** | Control Bar | Drag or click to scrub through timeline. | Seeks immediately to target timestamp for both direct media and YouTube. | **PASS** |
| **Volume Slider & Mute Toggle** | Control Bar | Adjusts audio level from 0% to 100%; mute toggles audio off/on. | Updates volume level; mute button toggles state and displays `VolumeX`. | **PASS** |
| **Loop Mode Button** | Control Bar | Cycles between `Loop Off`, `Repeat 1` (cyan glow), and `Repeat All` (violet glow). | Cycles sequentially; updates session loop controller immediately. | **PASS** |
| **Inter-Loop Delay Dropdown** | Control Bar | Configures delay between cycles (0s, 1s, 2s, 3s, 5s, 10s, 15s). | Updates delay state; displays countdown overlay when waiting for next cycle. | **PASS** |
| **Playback Speed Selector** | Control Bar | Selects rate (0.25x, 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x). | Changes adapter playback rate when supported by source. | **PASS** |
| **Fullscreen Button** | Control Bar | Toggles HTML5 / window fullscreen mode. | Expands canvas to fullscreen; exits on toggle or Escape. | **PASS** |
| **Queue Item Reorder (Up/Down)** | Queue Bar | Moves track up or down in playlist order. | Reorders queue in state and updates visual sequence. | **PASS** |
| **Queue Item Remove (`Trash`)** | Queue Bar | Removes individual track from queue. | Item is removed immediately; adjusts current index if needed. | **PASS** |
| **Clear Queue Button** | Queue Bar | Empties playback queue. | Clears all queue items instantly. | **PASS** |
| **Library Modal Trigger** | Header | Opens Personal Media Library as non-destructive overlay. | Opens overlay with saved bookmarks and collections without unmounting player. | **PASS** |
| **Analytics Modal Trigger** | Header | Opens Local Analytics Dashboard as non-destructive overlay. | Opens overlay showing sessions, watch time, completion rates, and charts. | **PASS** |
| **Settings Modal Trigger** | Header | Opens Settings & Privacy Policy panel. | Opens overlay with Private Mode toggle, retention setting, and purge tool. | **PASS** |
| **About Modal Trigger** | Header | Opens System Architecture & Diagnostics panel. | Opens overlay with version, adapter status, and engine information. | **PASS** |
| **Modal Close (`X` / `Escape`)** | Modals | Closes active overlay modal and returns to main player view. | Closes overlay instantly; active playback continues without interruption. | **PASS** |
| **Window Minimize** | Header | Minimizes Electron desktop window to taskbar. | Minimizes window via `loopwaveApi.minimizeWindow()`. | **PASS** |
| **Window Maximize** | Header | Toggles window maximization. | Maximizes or restores window via `loopwaveApi.maximizeWindow()`. | **PASS** |
| **Window Close** | Header | Closes window and terminates process. | Cleanly closes Electron window and exits app. | **PASS** |
| **Keyboard: Space** | Global | Toggles play/pause (when not focused on input). | Pauses when playing; resumes when paused. | **PASS** |
| **Keyboard: Left/Right Arrow** | Global | Seeks &plusmn;5 seconds. | Jumps 5 seconds backward/forward. | **PASS** |
| **Keyboard: Up/Down Arrow** | Global | Adjusts volume &plusmn;5%. | Increases/decreases volume by 5%. | **PASS** |
| **Keyboard: M** | Global | Toggles mute on/off. | Mutes and restores previous volume. | **PASS** |
| **Keyboard: F** | Global | Toggles fullscreen. | Expands canvas to fullscreen. | **PASS** |
| **Keyboard: L** | Global | Cycles loop mode (`off` &rarr; `one` &rarr; `all`). | Changes loop mode instantly. | **PASS** |
