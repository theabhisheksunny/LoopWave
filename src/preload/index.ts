import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, LoopWaveApi } from '../shared/ipc';
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
