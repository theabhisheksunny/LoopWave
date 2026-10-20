import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppSettings,
  LibraryItem,
  Collection,
  PlaybackSession,
  AnalyticsEvent,
  AnalyticsSummary,
  UrlInspectionResult,
  StoragePolicyStatus
} from '../shared/types';
import type { LoopWaveApi } from '../shared/ipc';

// Defined directly in preload because Electron's sandboxed preload (sandbox: true) does not allow relative require() calls
const IPC_CHANNELS = {
  SETTINGS_GET: 'loopwave:settings:get',
  SETTINGS_SAVE: 'loopwave:settings:save',
  LIBRARY_GET: 'loopwave:library:get',
  LIBRARY_SAVE: 'loopwave:library:save',
  LIBRARY_REMOVE: 'loopwave:library:remove',
  LIBRARY_CLEAR: 'loopwave:library:clear',
  COLLECTIONS_GET: 'loopwave:collections:get',
  COLLECTIONS_SAVE: 'loopwave:collections:save',
  COLLECTIONS_DELETE: 'loopwave:collections:delete',
  ANALYTICS_GET_SUMMARY: 'loopwave:analytics:getSummary',
  ANALYTICS_GET_EVENTS: 'loopwave:analytics:getEvents',
  ANALYTICS_RECORD_SESSION: 'loopwave:analytics:recordSession',
  ANALYTICS_RECORD_EVENT: 'loopwave:analytics:recordEvent',
  ANALYTICS_CLEAR: 'loopwave:analytics:clear',
  STORAGE_GET_POLICY: 'loopwave:storage:getPolicy',
  DATA_EXPORT: 'loopwave:data:export',
  DATA_IMPORT: 'loopwave:data:import',
  URL_INSPECT: 'loopwave:url:inspect',
  SHELL_OPEN_EXTERNAL: 'loopwave:shell:openExternal',
  DIALOG_OPEN_FILE: 'loopwave:dialog:openFile',
  WINDOW_MINIMIZE: 'loopwave:window:minimize',
  WINDOW_MAXIMIZE: 'loopwave:window:maximize',
  WINDOW_CLOSE: 'loopwave:window:close'
} as const;

const api: LoopWaveApi = {
  getSettings: (): Promise<AppSettings> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET);
  },

  saveSettings: (settings: Partial<AppSettings>): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings);
  },

  getLibrary: (): Promise<LibraryItem[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET);
  },

  saveLibraryItem: (item): Promise<{ success: boolean; item?: LibraryItem; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_SAVE, item);
  },

  removeLibraryItem: (id: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_REMOVE, id);
  },

  clearLibrary: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_CLEAR);
  },

  getCollections: (): Promise<Collection[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_GET);
  },

  saveCollection: (col): Promise<{ success: boolean; collection?: Collection; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_SAVE, col);
  },

  deleteCollection: (id: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_DELETE, id);
  },

  getAnalyticsSummary: (filter): Promise<AnalyticsSummary> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_GET_SUMMARY, filter);
  },

  getAnalyticsEvents: (filter): Promise<AnalyticsEvent[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_GET_EVENTS, filter);
  },

  recordAnalyticsSession: (session: PlaybackSession): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_RECORD_SESSION, session);
  },

  recordAnalyticsEvent: (event: AnalyticsEvent): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_RECORD_EVENT, event);
  },

  clearAnalytics: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_CLEAR);
  },

  exportData: (options): Promise<{ success: boolean; filePath?: string; canceled?: boolean; content?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DATA_EXPORT, options);
  },

  importData: (content: string, type: 'library' | 'json'): Promise<{ success: boolean; importedCount?: number; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DATA_IMPORT, { content, type });
  },

  inspectUrl: (url: string): Promise<UrlInspectionResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.URL_INSPECT, url);
  },

  openExternal: (url: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, url);
  },

  openFileDialog: (): Promise<{ canceled: boolean; filePaths: string[] }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE);
  },

  getStoragePolicy: (): Promise<StoragePolicyStatus> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STORAGE_GET_POLICY);
  },

  minimizeWindow: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE);
  },

  maximizeWindow: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE);
  },

  closeWindow: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE);
  },

  appInfo: {
    version: '1.0.0',
    platform: process.platform,
    arch: process.arch
  }
};

contextBridge.exposeInMainWorld('loopwaveApi', api);
