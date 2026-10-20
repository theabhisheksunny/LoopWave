import { z } from 'zod';
import { IPC_CHANNELS } from './channels';
import type {
  AppSettings,
  LibraryItem,
  Collection,
  PlaybackSession,
  AnalyticsEvent,
  AnalyticsSummary,
  UrlInspectionResult,
  StoragePolicyStatus
} from './types';

export { IPC_CHANNELS };

// Zod schemas for runtime IPC validation in Main process
export const AppSettingsSchema = z.object({
  privateMode: z.boolean(),
  persistAnalytics: z.boolean(),
  analyticsRetentionDays: z.number().min(0).max(3650),
  defaultLoopMode: z.enum(['off', 'one', 'all']),
  defaultDelaySeconds: z.number().min(0).max(3600),
  defaultVolume: z.number().min(0).max(100),
  autoPlay: z.boolean(),
  hardwareAcceleration: z.boolean()
});

export const PlaybackSessionSchema = z.object({
  sessionId: z.string().uuid(),
  videoId: z.string().min(1),
  cycleNumber: z.number().int().min(1),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  watchedSeconds: z.number().min(0),
  completionStatus: z.enum(['active', 'completed', 'interrupted', 'stopped', 'failed']),
  errorCode: z.string().nullable(),
  sourceType: z.enum(['youtube', 'direct-video', 'direct-audio', 'hls', 'unsupported'])
});

export const AnalyticsEventSchema = z.object({
  eventId: z.string().uuid(),
  sessionId: z.string().uuid(),
  videoId: z.string().min(1),
  eventType: z.enum([
    'playback_started',
    'playback_paused',
    'playback_resumed',
    'buffering_started',
    'buffering_ended',
    'playback_completed',
    'playback_interrupted',
    'playback_failed'
  ]),
  timestamp: z.string(),
  positionSeconds: z.number().optional(),
  bufferDurationMs: z.number().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const LibraryItemInputSchema = z.object({
  id: z.string().optional(),
  videoId: z.string().min(1),
  url: z.string().url(),
  sourceType: z.enum(['youtube', 'direct-video', 'direct-audio', 'hls', 'unsupported']),
  title: z.string().min(1).max(300),
  thumbnailUrl: z.string().optional(),
  collectionId: z.string().default('default'),
  isFavorite: z.boolean().default(false),
  savedPositionSeconds: z.number().min(0).default(0)
});

export interface LoopWaveApi {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<{ success: boolean; error?: string }>;
  getLibrary: () => Promise<LibraryItem[]>;
  saveLibraryItem: (item: z.infer<typeof LibraryItemInputSchema>) => Promise<{ success: boolean; item?: LibraryItem; error?: string }>;
  removeLibraryItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearLibrary: () => Promise<{ success: boolean; error?: string }>;
  getCollections: () => Promise<Collection[]>;
  saveCollection: (collection: { id?: string; name: string; description?: string }) => Promise<{ success: boolean; collection?: Collection; error?: string }>;
  deleteCollection: (id: string) => Promise<{ success: boolean; error?: string }>;
  getAnalyticsSummary: (filter?: { startDate?: string; endDate?: string; videoId?: string }) => Promise<AnalyticsSummary>;
  getAnalyticsEvents: (filter?: {
    sessionId?: string;
    videoId?: string;
    startDate?: string;
    endDate?: string;
    eventType?: string;
    limit?: number;
  }) => Promise<AnalyticsEvent[]>;
  recordAnalyticsSession: (session: PlaybackSession) => Promise<{ success: boolean }>;
  recordAnalyticsEvent: (event: AnalyticsEvent) => Promise<{ success: boolean }>;
  clearAnalytics: () => Promise<{ success: boolean }>;
  exportData: (options: {
    type: 'json' | 'csv';
    dataType: 'analytics' | 'library' | 'all';
    startDate?: string;
    endDate?: string;
  }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; content?: string }>;
  importData: (content: string, type: 'library' | 'json') => Promise<{ success: boolean; importedCount?: number; error?: string }>;
  inspectUrl: (url: string) => Promise<UrlInspectionResult>;
  openExternal: (url: string) => Promise<{ success: boolean }>;
  getStoragePolicy: () => Promise<StoragePolicyStatus>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  appInfo: {
    version: string;
    platform: string;
    arch: string;
  };
}

declare global {
  interface Window {
    loopwaveApi: LoopWaveApi;
  }
}
