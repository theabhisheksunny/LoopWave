import { describe, it, expect } from 'vitest';
import {
  AppSettingsSchema,
  PlaybackSessionSchema,
  AnalyticsEventSchema,
  LibraryItemInputSchema
} from '../../src/shared/ipc';

describe('IPC Zod Schemas Validation', () => {
  it('validates correct AppSettings payloads', () => {
    const valid = {
      privateMode: true,
      persistAnalytics: false,
      analyticsRetentionDays: 7,
      defaultLoopMode: 'one',
      defaultDelaySeconds: 5,
      defaultVolume: 75,
      autoPlay: true,
      hardwareAcceleration: true
    };
    expect(() => AppSettingsSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid AppSettings payloads', () => {
    const invalid = {
      privateMode: 'not-a-boolean',
      analyticsRetentionDays: -10
    };
    expect(() => AppSettingsSchema.parse(invalid)).toThrow();
  });

  it('validates PlaybackSession schema requiring valid UUID', () => {
    const valid = {
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      videoId: 'vid_123',
      cycleNumber: 1,
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: null,
      watchedSeconds: 10.5,
      completionStatus: 'active',
      errorCode: null,
      sourceType: 'youtube'
    };
    expect(() => PlaybackSessionSchema.parse(valid)).not.toThrow();

    const invalidUuid = { ...valid, sessionId: 'not-a-uuid' };
    expect(() => PlaybackSessionSchema.parse(invalidUuid)).toThrow();
  });

  it('validates AnalyticsEvent schema', () => {
    const valid = {
      eventId: '123e4567-e89b-12d3-a456-426614174001',
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      videoId: 'vid_123',
      eventType: 'playback_started',
      timestamp: '2026-01-01T00:00:00Z',
      positionSeconds: 0
    };
    expect(() => AnalyticsEventSchema.parse(valid)).not.toThrow();

    const invalidEvent = { ...valid, eventType: 'unknown_event_type' };
    expect(() => AnalyticsEventSchema.parse(invalidEvent)).toThrow();
  });

  it('validates LibraryItemInput schema', () => {
    const valid = {
      videoId: 'sample_id',
      url: 'https://example.com/video.mp4',
      sourceType: 'direct-video',
      title: 'Sample Video'
    };
    const parsed = LibraryItemInputSchema.parse(valid);
    expect(parsed.collectionId).toBe('default');
    expect(parsed.isFavorite).toBe(false);
  });
});
