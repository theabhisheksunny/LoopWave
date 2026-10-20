# LoopWave — Windows Release Documentation

## Release Metadata

- **Application Name**: LoopWave
- **Version**: 1.0.0
- **Platform**: Windows x64 (Windows 10 / 11)
- **Architecture**: Electron 32.3.3 + Chromium 128 + Node 20.18.0
- **Build Date**: 2026-10-20

---

## Packaged Artifacts

The application was packaged using `electron-builder` with ASAR integrity:

| Artifact | Location | Architecture | Checksum (SHA-256) |
|---|---|---|---|
| **LoopWave Windows Executable** | `release/win-unpacked/LoopWave.exe` | x64 | `C5418210809141F9257666FD6F4ECD3E8FB06680E0CE8724508A320C530EA59D` |
| **Bundled Renderer Distribution** | `dist/renderer/` | Web / HTML5 | — |
| **Compiled Main Process** | `dist/main/` | CommonJS | — |
| **Compiled Preload Script** | `dist/preload/` | CommonJS | — |

---

## Verification & Execution Instructions

To launch the packaged executable directly:
```powershell
.\release\win-unpacked\LoopWave.exe
```

Or run via npm:
```powershell
npm start
```

---

## Known Environment Limitations & Notes

1. **Third-Party Code Signing in Non-Elevated Windows Environments**:
   - Creating standard NSIS compressed installers without elevated administrator privileges on certain Windows setups may fail to extract Unix symbolic links in `winCodeSign`.
   - The standalone portable unpacked executable (`release/win-unpacked/LoopWave.exe`) packages all resources, native Chromium dependencies, and ASAR bundles without requiring administrator elevation.
2. **YouTube Embed Restrictions**:
   - Certain YouTube creators disable third-party embedded playback for their videos (`YT_ERROR_101` / `YT_ERROR_150`). LoopWave detects this condition and gracefully displays an explanatory error message to the user rather than failing silently.
3. **Picture-in-Picture on YouTube IFrame**:
   - Because YouTube serves its iframe from a cross-origin sandbox (`youtube.com`), the HTML5 Picture-in-Picture API is restricted for YouTube iframes per Chromium security policies. PiP is fully functional for direct media and HLS streams.
