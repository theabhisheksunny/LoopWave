import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import {
  IPC_CHANNELS,
  AppSettingsSchema,
  PlaybackSessionSchema,
  AnalyticsEventSchema,
  LibraryItemInputSchema
} from '../../shared/ipc';
import { DatabaseManager } from '../storage/db';
import { isSafeExternalUrl, safeInspectUrl } from '../security';

export function registerIpcHandlers(dbManager: DatabaseManager): void {
  // --- Settings ---
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return dbManager.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, async (_, rawSettings) => {
    try {
      const parsed = AppSettingsSchema.partial().parse(rawSettings);
      const updated = dbManager.saveSettings(parsed);
      return { success: true, settings: updated };
    } catch (err: any) {
      console.error('IPC settings save validation error:', err);
      return { success: false, error: err.message || 'Invalid settings payload' };
    }
  });

  // --- Library ---
  ipcMain.handle(IPC_CHANNELS.LIBRARY_GET, async () => {
    return dbManager.getLibrary();
  });

  ipcMain.handle(IPC_CHANNELS.LIBRARY_SAVE, async (_, rawItem) => {
    try {
      const validated = LibraryItemInputSchema.parse(rawItem);
      const saved = dbManager.saveLibraryItem(validated);
      return { success: true, item: saved };
    } catch (err: any) {
      console.error('IPC library save validation error:', err);
      return { success: false, error: err.message || 'Invalid library item payload' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LIBRARY_REMOVE, async (_, id) => {
    if (typeof id !== 'string') return { success: false, error: 'Invalid ID' };
    dbManager.removeLibraryItem(id);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.LIBRARY_CLEAR, async () => {
    dbManager.clearLibrary();
    return { success: true };
  });

  // --- Collections ---
  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_GET, async () => {
    return dbManager.getCollections();
  });

  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_SAVE, async (_, col) => {
    if (!col || typeof col.name !== 'string' || !col.name.trim()) {
      return { success: false, error: 'Collection name is required' };
    }
    const saved = dbManager.saveCollection({
      id: typeof col.id === 'string' ? col.id : undefined,
      name: col.name.trim(),
      description: typeof col.description === 'string' ? col.description.trim() : undefined
    });
    return { success: true, collection: saved };
  });

  ipcMain.handle(IPC_CHANNELS.COLLECTIONS_DELETE, async (_, id) => {
    if (typeof id !== 'string') return { success: false, error: 'Invalid ID' };
    dbManager.deleteCollection(id);
    return { success: true };
  });

  // --- Analytics ---
  ipcMain.handle(IPC_CHANNELS.ANALYTICS_GET_SUMMARY, async (_, filter) => {
    return dbManager.getAnalyticsSummary(filter);
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_GET_EVENTS, async (_, filter) => {
    return dbManager.getAnalyticsEvents(filter);
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_RECORD_SESSION, async (_, rawSession) => {
    try {
      const validated = PlaybackSessionSchema.parse(rawSession);
      dbManager.recordAnalyticsSession(validated);
      return { success: true };
    } catch (err: any) {
      console.error('IPC analytics session validation error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_RECORD_EVENT, async (_, rawEvent) => {
    try {
      const validated = AnalyticsEventSchema.parse(rawEvent);
      dbManager.recordAnalyticsEvent(validated);
      return { success: true };
    } catch (err: any) {
      console.error('IPC analytics event validation error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_CLEAR, async () => {
    dbManager.clearAnalytics();
    return { success: true };
  });

  // --- Storage Policy ---
  ipcMain.handle(IPC_CHANNELS.STORAGE_GET_POLICY, async () => {
    return dbManager.getStoragePolicy();
  });

  // --- Export Data ---
  ipcMain.handle(IPC_CHANNELS.DATA_EXPORT, async (event, options) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const { type = 'json', dataType = 'all' } = options || {};

      let exportContent = '';
      let defaultFileName = `loopwave-export-${Date.now()}`;

      if (type === 'json') {
        defaultFileName += '.json';
        const dump = dbManager.exportAll();
        if (dataType === 'library') {
          exportContent = JSON.stringify(dump.library, null, 2);
        } else if (dataType === 'analytics') {
          exportContent = JSON.stringify(
            { sessions: dump.sessions, events: dump.events },
            null,
            2
          );
        } else {
          exportContent = JSON.stringify(dump, null, 2);
        }
      } else {
        // CSV export
        defaultFileName += '.csv';
        const summary = dbManager.getAnalyticsSummary();
        const events = dbManager.getAnalyticsEvents({ limit: 5000 });
        let csv = 'eventId,sessionId,videoId,eventType,timestamp,positionSeconds,bufferDurationMs,errorCode\n';
        for (const ev of events) {
          csv += `"${ev.eventId}","${ev.sessionId}","${ev.videoId}","${ev.eventType}","${ev.timestamp}",${ev.positionSeconds ?? ''},${ev.bufferDurationMs ?? ''},"${ev.errorCode ?? ''}"\n`;
        }
        exportContent = csv;
      }

      if (window) {
        const { canceled, filePath } = await dialog.showSaveDialog(window, {
          title: 'Export LoopWave Data',
          defaultPath: defaultFileName,
          filters:
            type === 'json'
              ? [{ name: 'JSON Document', extensions: ['json'] }]
              : [{ name: 'CSV Spreadsheet', extensions: ['csv'] }]
        });

        if (canceled || !filePath) {
          return { success: false, canceled: true };
        }

        fs.writeFileSync(filePath, exportContent, 'utf-8');
        return { success: true, filePath };
      }

      return { success: true, content: exportContent };
    } catch (err: any) {
      console.error('Export error:', err);
      return { success: false, error: err.message };
    }
  });

  // --- Import Data ---
  ipcMain.handle(IPC_CHANNELS.DATA_IMPORT, async (_, { content, type }) => {
    try {
      if (typeof content !== 'string' || !content.trim()) {
        return { success: false, error: 'Empty content' };
      }

      const parsed = JSON.parse(content);
      const itemsToImport = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.library)
        ? parsed.library
        : [];

      if (!itemsToImport.length) {
        return { success: false, error: 'No valid library items found in JSON' };
      }

      const count = dbManager.importLibrary(itemsToImport);
      return { success: true, importedCount: count };
    } catch (err: any) {
      console.error('Import error:', err);
      return { success: false, error: 'Invalid JSON format' };
    }
  });

  // --- Safe URL Inspection ---
  ipcMain.handle(IPC_CHANNELS.URL_INSPECT, async (_, url) => {
    if (typeof url !== 'string') {
      return { valid: false, error: 'Invalid URL parameter' };
    }
    const result = await safeInspectUrl(url);
    return {
      url,
      ...result
    };
  });

  // --- Safe External Browser Link Opening ---
  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, async (_, url) => {
    if (typeof url !== 'string' || !isSafeExternalUrl(url)) {
      return { success: false, error: 'Blocked: unsafe URL' };
    }
    const { shell } = await import('electron');
    await shell.openExternal(url);
    return { success: true };
  });

  // --- Window Control IPC ---
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });
}
