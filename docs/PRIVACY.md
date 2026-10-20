# LoopWave — Privacy & Storage Policy

## 1. Privacy Principles

LoopWave is engineered from the ground up to respect user privacy:

1. **Zero External Telemetry**: LoopWave sends no analytics, tracking beacons, diagnostic pings, or usage statistics to external servers.
2. **Minimal Storage by Default**:
   - Only media metadata (URLs, user-defined titles, collection tags, favorite states, and local loop counts) is stored.
   - LoopWave **never downloads or persists complete media files** during normal playback.
3. **Cryptographic Local Separation**:
   - Every loop cycle receives a cryptographically generated UUID (`crypto.randomUUID()`).
   - These internal session UUIDs are local identifiers used solely to calculate loop statistics; they are never equated with third-party viewers or external view metrics.
4. **Honest Platform Disclosures**:
   - Chromium, media decoders, and third-party player iframes (such as the official YouTube embedded player) manage their own internal cache and cookie jars as part of standard browser engine architecture.
   - LoopWave distinguishes between its own application-level storage and Chromium's low-level caching.

---

## 2. Storage Modes

### Persistent Mode (Default)
- Metadata is stored in a local SQLite database at:
  `%APPDATA%/LoopWave/loopwave.db`
- Retention policies automatically purge old events after 7, 30, or 90 days (or Forever, depending on user selection).
- Users can clear analytics or library bookmarks at any time with one click.

### Private Mode (RAM-Only)
- When Private Mode is enabled in Settings or via TitleBar badge:
  - SQLite database is loaded purely in memory (`:memory:`).
  - No new library items or playback sessions are written to disk.
  - All transient state is discarded upon quitting the application.

---

## 3. Data Stored in Local SQLite

| Table | Content Stored | Content NOT Stored |
|---|---|---|
| `settings` | User UI preferences, default delay, retention period | Passwords, credentials, system telemetry |
| `library_items` | Video ID, Canonical URL, Title, Thumbnail URL, Favorite flag | Downloaded audio/video stream data |
| `collections` | Collection name, Description, Created timestamp | Private metadata |
| `analytics_sessions` | Session UUID, Video ID, Cycle number, Started/Ended timestamps, Watched seconds, Status | IP addresses, MAC addresses, device serials |
| `analytics_events` | Event UUID, Session UUID, Event type (`playback_started`, etc.), Timestamp | Raw stream payloads, authentication headers |

---

## 4. Network Security & SSRF Protection

- URLs entered by the user are validated before playback or inspection.
- The inspection module blocks requests to private IPv4/IPv6 address ranges (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `localhost`) to prevent Server-Side Request Forgery attacks.
- Sensitive query parameters (such as `token`, `key`, `auth`, `signature`, `api_key`) are automatically redacted from application log files.
