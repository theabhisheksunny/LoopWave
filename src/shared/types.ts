export type SourceType =
  | 'youtube'
  | 'direct-video'
  | 'direct-audio'
  | 'hls'
  | 'unsupported';

export interface ResolvedSource {
  sourceType: SourceType;
  originalUrl: string;
  canonicalUrl: string;
  videoId: string;
  title?: string;
  thumbnailUrl?: string;
  duration?: number;
  isLive?: boolean;
  mediaType?: 'video' | 'audio';
  metadata?: Record<string, unknown>;
}

export type LoopMode = 'off' | 'one' | 'all';

export type SessionStatus = 'active' | 'completed' | 'interrupted' | 'stopped' | 'failed';

export interface PlaybackSession {
  sessionId: string;
  videoId: string;
  cycleNumber: number;
  startedAt: string;
  endedAt: string | null;
  watchedSeconds: number;
  completionStatus: SessionStatus;
  errorCode: string | null;
  sourceType: SourceType;
}

export type AnalyticsEventType =
  | 'playback_started'
  | 'playback_paused'
  | 'playback_resumed'
  | 'buffering_started'
  | 'buffering_ended'
  | 'playback_completed'
  | 'playback_interrupted'
  | 'playback_failed';

export interface AnalyticsEvent {
  eventId: string;
  sessionId: string;
  videoId: string;
  eventType: AnalyticsEventType;
  timestamp: string;
  positionSeconds?: number;
  bufferDurationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsSummary {
  totalSessions: number;
  completedCycles: number;
  totalWatchSeconds: number;
  avgSessionDurationSeconds: number;
  failedSessions: number;
  interruptedSessions: number;
  bufferingCount: number;
  perVideoStats?: Array<{
    videoId: string;
    sessions: number;
    completed: number;
    watchSeconds: number;
  }>;
}

export interface LibraryItem {
  id: string;
  videoId: string;
  url: string;
  sourceType: SourceType;
  title: string;
  thumbnailUrl?: string;
  collectionId: string;
  isFavorite: boolean;
  savedPositionSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface AppSettings {
  privateMode: boolean;
  persistAnalytics: boolean;
  analyticsRetentionDays: number;
  defaultLoopMode: LoopMode;
  defaultDelaySeconds: number;
  defaultVolume: number;
  autoPlay: boolean;
  hardwareAcceleration: boolean;
}

export interface AdapterCapabilities {
  supportsSpeed: boolean;
  supportsPiP: boolean;
  supportsSeeking: boolean;
  supportsVolume: boolean;
  supportsQuality: boolean;
}

export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export interface PlayerError {
  code: string;
  message: string;
  fatal: boolean;
  underlyingError?: unknown;
}

export interface AdapterState {
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  bufferedTime: number;
  error: PlayerError | null;
}

export interface QueueItem {
  id: string;
  source: ResolvedSource;
  addedAt: string;
}

export interface UrlInspectionResult {
  valid: boolean;
  url: string;
  sourceType: SourceType;
  mimeType?: string;
  contentLength?: number;
  isStream?: boolean;
  error?: string;
}

export interface StoragePolicyStatus {
  privateMode: boolean;
  analyticsPersistenceEnabled: boolean;
  retentionDays: number;
  databasePath: string | null;
  approximateDbSizeBytes: number;
  activeSessionStorageType: 'RAM-Only' | 'SQLite-File';
}
