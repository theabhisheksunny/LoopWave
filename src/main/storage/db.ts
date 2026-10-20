import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import type {
  AppSettings,
  LibraryItem,
  Collection,
  PlaybackSession,
  AnalyticsEvent,
  AnalyticsSummary,
  StoragePolicyStatus
} from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/defaults';
import { scheduleRandomDelay, ScheduledDelayTask } from '../../shared/randomDelay';

export class DatabaseManager {
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private dbFilePath: string | null = null;
  private cachedSettings: AppSettings = { ...DEFAULT_SETTINGS };
  private isInitialized = false;
  private pendingMaintenanceTask: ScheduledDelayTask | null = null;

  async init(userDataPath?: string): Promise<void> {
    if (this.isInitialized) return;

    this.SQL = await initSqlJs();

    if (userDataPath) {
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      this.dbFilePath = path.join(userDataPath, 'loopwave.db');
    }

    // Load existing database if available on disk and not in private mode
    if (this.dbFilePath && fs.existsSync(this.dbFilePath)) {
      try {
        const fileBuffer = fs.readFileSync(this.dbFilePath);
        this.db = new this.SQL.Database(fileBuffer);
      } catch (err) {
        console.warn('Failed to load existing database file, creating fresh DB:', err);
        this.db = new this.SQL.Database();
      }
    } else {
      this.db = new this.SQL.Database();
    }

    this.createSchema();
    this.loadSettings();
    this.scheduleRetentionMaintenance();
    this.isInitialized = true;
  }

  private createSchema(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS library_items (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        url TEXT NOT NULL,
        source_type TEXT NOT NULL,
        title TEXT NOT NULL,
        thumbnail_url TEXT,
        collection_id TEXT DEFAULT 'default',
        is_favorite INTEGER DEFAULT 0,
        saved_position_seconds REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_sessions (
        session_id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        cycle_number INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        watched_seconds REAL NOT NULL,
        completion_status TEXT NOT NULL,
        error_code TEXT,
        source_type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        event_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        position_seconds REAL,
        buffer_duration_ms REAL,
        error_code TEXT,
        error_message TEXT,
        metadata_json TEXT
      );

      -- Ensure default collection exists
      INSERT OR IGNORE INTO collections (id, name, description, created_at)
      VALUES ('default', 'My Library', 'Default collection for saved media', datetime('now'));
    `);

    this.saveToDisk();
  }

  private loadSettings(): void {
    if (!this.db) return;
    try {
      const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
      stmt.bind(['app_settings']);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        if (row && typeof row.value === 'string') {
          const parsed = JSON.parse(row.value);
          this.cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
        }
      }
      stmt.free();
    } catch (err) {
      console.warn('Error loading settings from DB:', err);
    }
  }

  public getSettings(): AppSettings {
    return { ...this.cachedSettings };
  }

  public saveSettings(partial: Partial<AppSettings>): AppSettings {
    this.cachedSettings = { ...this.cachedSettings, ...partial };

    if (!this.cachedSettings.privateMode && this.db) {
      try {
        const json = JSON.stringify(this.cachedSettings);
        this.db.run(
          `INSERT INTO settings (key, value) VALUES ('app_settings', ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
          [json]
        );
        this.saveToDisk();
      } catch (err) {
        console.error('Failed to persist settings:', err);
      }
    }

    if (partial.analyticsRetentionDays !== undefined || partial.randomizedDelayEnabled !== undefined) {
      this.scheduleRetentionMaintenance();
    }

    return { ...this.cachedSettings };
  }

  public getLibrary(): LibraryItem[] {
    if (!this.db) return [];
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM library_items ORDER BY created_at DESC'
      );
      const items: LibraryItem[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        items.push({
          id: String(row.id),
          videoId: String(row.video_id),
          url: String(row.url),
          sourceType: row.source_type as any,
          title: String(row.title),
          thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : undefined,
          collectionId: String(row.collection_id || 'default'),
          isFavorite: Number(row.is_favorite) === 1,
          savedPositionSeconds: Number(row.saved_position_seconds || 0),
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at)
        });
      }
      stmt.free();
      return items;
    } catch (err) {
      console.error('Failed to get library items:', err);
      return [];
    }
  }

  public saveLibraryItem(
    itemInput: {
      videoId: string;
      url: string;
      sourceType: any;
      title: string;
      thumbnailUrl?: string;
      collectionId?: string;
      isFavorite?: boolean;
      savedPositionSeconds?: number;
      id?: string;
    }
  ): LibraryItem {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const id = itemInput.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const item: LibraryItem = {
      id,
      videoId: itemInput.videoId,
      url: itemInput.url,
      sourceType: itemInput.sourceType,
      title: itemInput.title,
      thumbnailUrl: itemInput.thumbnailUrl,
      collectionId: itemInput.collectionId || 'default',
      isFavorite: Boolean(itemInput.isFavorite),
      savedPositionSeconds: itemInput.savedPositionSeconds || 0,
      createdAt: now,
      updatedAt: now
    };

    // In private mode, we allow transient in-memory library additions during current session
    // but we do not write to disk.
    this.db.run(
      `INSERT INTO library_items (
        id, video_id, url, source_type, title, thumbnail_url,
        collection_id, is_favorite, saved_position_seconds, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        video_id = excluded.video_id,
        url = excluded.url,
        source_type = excluded.source_type,
        title = excluded.title,
        thumbnail_url = excluded.thumbnail_url,
        collection_id = excluded.collection_id,
        is_favorite = excluded.is_favorite,
        saved_position_seconds = excluded.saved_position_seconds,
        updated_at = excluded.updated_at;`,
      [
        item.id,
        item.videoId,
        item.url,
        item.sourceType,
        item.title,
        item.thumbnailUrl || null,
        item.collectionId,
        item.isFavorite ? 1 : 0,
        item.savedPositionSeconds,
        item.createdAt,
        item.updatedAt
      ]
    );

    if (!this.cachedSettings.privateMode) {
      this.saveToDisk();
    }

    return item;
  }

  public removeLibraryItem(id: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM library_items WHERE id = ?', [id]);
    if (!this.cachedSettings.privateMode) {
      this.saveToDisk();
    }
  }

  public clearLibrary(): void {
    if (!this.db) return;
    this.db.run('DELETE FROM library_items;');
    if (!this.cachedSettings.privateMode) {
      this.saveToDisk();
    }
  }

  public getCollections(): Collection[] {
    if (!this.db) return [];
    try {
      const stmt = this.db.prepare('SELECT * FROM collections ORDER BY created_at ASC');
      const collections: Collection[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        collections.push({
          id: String(row.id),
          name: String(row.name),
          description: row.description ? String(row.description) : undefined,
          createdAt: String(row.created_at)
        });
      }
      stmt.free();
      return collections;
    } catch (err) {
      console.error('Failed to get collections:', err);
      return [];
    }
  }

  public saveCollection(col: { id?: string; name: string; description?: string }): Collection {
    if (!this.db) throw new Error('Database not initialized');
    const id = col.id || `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO collections (id, name, description, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description;`,
      [id, col.name, col.description || null, now]
    );

    if (!this.cachedSettings.privateMode) {
      this.saveToDisk();
    }

    return {
      id,
      name: col.name,
      description: col.description,
      createdAt: now
    };
  }

  public deleteCollection(id: string): void {
    if (!this.db || id === 'default') return; // Cannot delete default collection
    this.db.run('DELETE FROM collections WHERE id = ?', [id]);
    // Move any items in that collection back to default
    this.db.run("UPDATE library_items SET collection_id = 'default' WHERE collection_id = ?", [id]);
    if (!this.cachedSettings.privateMode) {
      this.saveToDisk();
    }
  }

  public recordAnalyticsSession(session: PlaybackSession): void {
    if (!this.db) return;
    // RAM-first policy: If analytics persistence is disabled (default), do not store session records
    if (!this.cachedSettings.persistAnalytics) {
      return;
    }

    this.db.run(
      `INSERT INTO analytics_sessions (
        session_id, video_id, cycle_number, started_at, ended_at,
        watched_seconds, completion_status, error_code, source_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        ended_at = excluded.ended_at,
        watched_seconds = excluded.watched_seconds,
        completion_status = excluded.completion_status,
        error_code = excluded.error_code;`,
      [
        session.sessionId,
        session.videoId,
        session.cycleNumber,
        session.startedAt,
        session.endedAt,
        session.watchedSeconds,
        session.completionStatus,
        session.errorCode,
        session.sourceType
      ]
    );

    if (!this.cachedSettings.privateMode && this.cachedSettings.persistAnalytics) {
      this.saveToDisk();
    }
  }

  public recordAnalyticsEvent(event: AnalyticsEvent): void {
    if (!this.db) return;
    // RAM-first policy: If analytics persistence is disabled (default), do not store event records
    if (!this.cachedSettings.persistAnalytics) {
      return;
    }

    this.db.run(
      `INSERT OR IGNORE INTO analytics_events (
        event_id, session_id, video_id, event_type, timestamp,
        position_seconds, buffer_duration_ms, error_code, error_message, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        event.eventId,
        event.sessionId,
        event.videoId,
        event.eventType,
        event.timestamp,
        event.positionSeconds ?? null,
        event.bufferDurationMs ?? null,
        event.errorCode ?? null,
        event.errorMessage ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null
      ]
    );

    if (!this.cachedSettings.privateMode && this.cachedSettings.persistAnalytics) {
      this.saveToDisk();
    }
  }

  public getAnalyticsSummary(filter?: {
    startDate?: string;
    endDate?: string;
    videoId?: string;
  }): AnalyticsSummary {
    if (!this.db) {
      return {
        totalSessions: 0,
        completedCycles: 0,
        totalWatchSeconds: 0,
        avgSessionDurationSeconds: 0,
        failedSessions: 0,
        interruptedSessions: 0,
        bufferingCount: 0
      };
    }

    try {
      let query = 'SELECT * FROM analytics_sessions WHERE 1=1';
      const params: any[] = [];

      if (filter?.startDate) {
        query += ' AND started_at >= ?';
        params.push(filter.startDate);
      }
      if (filter?.endDate) {
        query += ' AND started_at <= ?';
        params.push(filter.endDate);
      }
      if (filter?.videoId) {
        query += ' AND video_id = ?';
        params.push(filter.videoId);
      }

      const stmt = this.db.prepare(query);
      stmt.bind(params);

      let totalSessions = 0;
      let completedCycles = 0;
      let totalWatchSeconds = 0;
      let failedSessions = 0;
      let interruptedSessions = 0;
      const perVideoMap = new Map<
        string,
        { sessions: number; completed: number; watchSeconds: number }
      >();

      while (stmt.step()) {
        const row = stmt.getAsObject();
        totalSessions++;
        const status = String(row.completion_status);
        const watch = Number(row.watched_seconds) || 0;
        const videoId = String(row.video_id);

        if (status === 'completed') completedCycles++;
        if (status === 'failed') failedSessions++;
        if (status === 'interrupted') interruptedSessions++;
        totalWatchSeconds += watch;

        const current = perVideoMap.get(videoId) || {
          sessions: 0,
          completed: 0,
          watchSeconds: 0
        };
        current.sessions++;
        if (status === 'completed') current.completed++;
        current.watchSeconds += watch;
        perVideoMap.set(videoId, current);
      }
      stmt.free();

      // Count buffering events
      let bufferingCount = 0;
      let bufQuery = "SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'buffering_started'";
      const bufParams: any[] = [];
      if (filter?.startDate) {
        bufQuery += ' AND timestamp >= ?';
        bufParams.push(filter.startDate);
      }
      if (filter?.endDate) {
        bufQuery += ' AND timestamp <= ?';
        bufParams.push(filter.endDate);
      }
      if (filter?.videoId) {
        bufQuery += ' AND video_id = ?';
        bufParams.push(filter.videoId);
      }

      const bufStmt = this.db.prepare(bufQuery);
      bufStmt.bind(bufParams);
      if (bufStmt.step()) {
        const r = bufStmt.getAsObject();
        bufferingCount = Number(r.count) || 0;
      }
      bufStmt.free();

      const avgSessionDurationSeconds =
        completedCycles > 0 ? Math.round(totalWatchSeconds / completedCycles) : 0;

      const perVideoStats = Array.from(perVideoMap.entries()).map(([videoId, stats]) => ({
        videoId,
        sessions: stats.sessions,
        completed: stats.completed,
        watchSeconds: Math.round(stats.watchSeconds)
      }));

      return {
        totalSessions,
        completedCycles,
        totalWatchSeconds: Math.round(totalWatchSeconds),
        avgSessionDurationSeconds,
        failedSessions,
        interruptedSessions,
        bufferingCount,
        perVideoStats
      };
    } catch (err) {
      console.error('Failed to calculate analytics summary:', err);
      return {
        totalSessions: 0,
        completedCycles: 0,
        totalWatchSeconds: 0,
        avgSessionDurationSeconds: 0,
        failedSessions: 0,
        interruptedSessions: 0,
        bufferingCount: 0
      };
    }
  }

  public getAnalyticsEvents(filter?: {
    sessionId?: string;
    videoId?: string;
    startDate?: string;
    endDate?: string;
    eventType?: string;
    limit?: number;
  }): AnalyticsEvent[] {
    if (!this.db) return [];
    try {
      let query = 'SELECT * FROM analytics_events WHERE 1=1';
      const params: any[] = [];

      if (filter?.sessionId) {
        query += ' AND session_id = ?';
        params.push(filter.sessionId);
      }
      if (filter?.videoId) {
        query += ' AND video_id = ?';
        params.push(filter.videoId);
      }
      if (filter?.startDate) {
        query += ' AND timestamp >= ?';
        params.push(filter.startDate);
      }
      if (filter?.endDate) {
        query += ' AND timestamp <= ?';
        params.push(filter.endDate);
      }
      if (filter?.eventType && filter.eventType !== 'all') {
        query += ' AND event_type = ?';
        params.push(filter.eventType);
      }

      query += ' ORDER BY timestamp DESC';
      query += ` LIMIT ${filter?.limit || 500}`;

      const stmt = this.db.prepare(query);
      stmt.bind(params);
      const events: AnalyticsEvent[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        let metadata: Record<string, unknown> | undefined;
        if (row.metadata_json && typeof row.metadata_json === 'string') {
          try {
            metadata = JSON.parse(row.metadata_json);
          } catch {
            // ignore
          }
        }

        events.push({
          eventId: String(row.event_id),
          sessionId: String(row.session_id),
          videoId: String(row.video_id),
          eventType: row.event_type as any,
          timestamp: String(row.timestamp),
          positionSeconds:
            row.position_seconds !== null ? Number(row.position_seconds) : undefined,
          bufferDurationMs:
            row.buffer_duration_ms !== null ? Number(row.buffer_duration_ms) : undefined,
          errorCode: row.error_code ? String(row.error_code) : undefined,
          errorMessage: row.error_message ? String(row.error_message) : undefined,
          metadata
        });
      }
      stmt.free();
      return events;
    } catch (err) {
      console.error('Failed to get analytics events:', err);
      return [];
    }
  }

  public clearAnalytics(): void {
    if (!this.db) return;
    this.db.run('DELETE FROM analytics_sessions;');
    this.db.run('DELETE FROM analytics_events;');
    if (!this.cachedSettings.privateMode) {
      this.saveToDisk();
    }
  }

  public applyRetention(): void {
    if (!this.db) return;
    const days = this.cachedSettings.analyticsRetentionDays;
    if (days <= 0) return; // 0 means keep forever

    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      this.db.run('DELETE FROM analytics_sessions WHERE started_at < ?', [cutoff]);
      this.db.run('DELETE FROM analytics_events WHERE timestamp < ?', [cutoff]);
      if (!this.cachedSettings.privateMode) {
        this.saveToDisk();
      }
    } catch (err) {
      console.warn('Failed to apply analytics retention:', err);
    }
  }

  public scheduleRetentionMaintenance(signal?: AbortSignal): ScheduledDelayTask {
    if (this.pendingMaintenanceTask && !this.pendingMaintenanceTask.isCancelled) {
      this.pendingMaintenanceTask.cancel();
      this.pendingMaintenanceTask = null;
    }

    const enabled = Boolean(this.cachedSettings.randomizedDelayEnabled);
    const task = scheduleRandomDelay(
      () => {
        this.applyRetention();
        this.pendingMaintenanceTask = null;
      },
      {
        minMs: 0,
        maxMs: 10_000,
        enabled,
        signal,
        operationName: 'storage-retention-maintenance'
      }
    );

    this.pendingMaintenanceTask = task;
    return task;
  }

  public getLastScheduledDelayMs(): number | null {
    return this.pendingMaintenanceTask ? this.pendingMaintenanceTask.delayMs : null;
  }

  public dispose(): void {
    if (this.pendingMaintenanceTask) {
      this.pendingMaintenanceTask.cancel();
      this.pendingMaintenanceTask = null;
    }
  }

  public getStoragePolicy(): StoragePolicyStatus {
    let size = 0;
    if (this.dbFilePath && fs.existsSync(this.dbFilePath)) {
      try {
        size = fs.statSync(this.dbFilePath).size;
      } catch {
        // ignore
      }
    }

    return {
      privateMode: this.cachedSettings.privateMode,
      analyticsPersistenceEnabled: this.cachedSettings.persistAnalytics,
      retentionDays: this.cachedSettings.analyticsRetentionDays,
      databasePath: this.cachedSettings.privateMode ? null : this.dbFilePath,
      approximateDbSizeBytes: size,
      activeSessionStorageType: this.cachedSettings.privateMode ? 'RAM-Only' : 'SQLite-File'
    };
  }

  private saveToDisk(): void {
    if (this.cachedSettings.privateMode || !this.db || !this.dbFilePath) {
      return;
    }
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbFilePath, buffer);
    } catch (err) {
      console.error('Failed to write SQLite DB to disk:', err);
    }
  }

  public exportAll(filter?: { startDate?: string; endDate?: string }): {
    settings: AppSettings;
    library: LibraryItem[];
    collections: Collection[];
    sessions: PlaybackSession[];
    events: AnalyticsEvent[];
    exportedAt: string;
  } {
    return {
      settings: this.getSettings(),
      library: this.getLibrary(),
      collections: this.getCollections(),
      sessions: this.getAllSessions(filter),
      events: this.getAnalyticsEvents({
        startDate: filter?.startDate,
        endDate: filter?.endDate,
        limit: 5000
      }),
      exportedAt: new Date().toISOString()
    };
  }

  public getAllSessions(filter?: { startDate?: string; endDate?: string }): PlaybackSession[] {
    if (!this.db) return [];
    try {
      let query = 'SELECT * FROM analytics_sessions WHERE 1=1';
      const params: any[] = [];

      if (filter?.startDate) {
        query += ' AND started_at >= ?';
        params.push(filter.startDate);
      }
      if (filter?.endDate) {
        query += ' AND started_at <= ?';
        params.push(filter.endDate);
      }

      query += ' ORDER BY started_at DESC LIMIT 5000';
      const stmt = this.db.prepare(query);
      stmt.bind(params);
      const list: PlaybackSession[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        list.push({
          sessionId: String(row.session_id),
          videoId: String(row.video_id),
          cycleNumber: Number(row.cycle_number),
          startedAt: String(row.started_at),
          endedAt: row.ended_at ? String(row.ended_at) : null,
          watchedSeconds: Number(row.watched_seconds || 0),
          completionStatus: row.completion_status as any,
          errorCode: row.error_code ? String(row.error_code) : null,
          sourceType: row.source_type as any
        });
      }
      stmt.free();
      return list;
    } catch {
      return [];
    }
  }

  public importLibrary(items: LibraryItem[]): number {
    let count = 0;
    for (const item of items) {
      try {
        this.saveLibraryItem(item);
        count++;
      } catch {
        // continue
      }
    }
    return count;
  }
}
