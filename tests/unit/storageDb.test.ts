import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseManager } from '../../src/main/storage/db';
import { PlaybackSession, AnalyticsEvent } from '../../src/shared/types';

describe('DatabaseManager (SQLite & In-Memory Storage)', () => {
  let db: DatabaseManager;

  beforeEach(async () => {
    db = new DatabaseManager();
    // Initialize without path => in-memory database
    await db.init();
  });

  it('initializes with default settings (RAM-first with persistAnalytics disabled)', () => {
    const settings = db.getSettings();
    expect(settings.privateMode).toBe(false);
    expect(settings.persistAnalytics).toBe(false);
    expect(settings.defaultLoopMode).toBe('off');
    expect(settings.defaultDelaySeconds).toBe(2);
  });

  it('updates and persists settings', () => {
    db.saveSettings({ defaultLoopMode: 'one', defaultDelaySeconds: 5 });
    const updated = db.getSettings();
    expect(updated.defaultLoopMode).toBe('one');
    expect(updated.defaultDelaySeconds).toBe(5);
  });

  it('saves, retrieves, and removes library items', () => {
    const item = db.saveLibraryItem({
      videoId: 'test_vid_1',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sourceType: 'youtube',
      title: 'Rick Roll'
    });

    expect(item.id).toBeDefined();
    expect(item.title).toBe('Rick Roll');

    let library = db.getLibrary();
    expect(library.length).toBe(1);
    expect(library[0].videoId).toBe('test_vid_1');

    db.removeLibraryItem(item.id);
    library = db.getLibrary();
    expect(library.length).toBe(0);
  });

  it('does not store session records when persistAnalytics is disabled', () => {
    const session1: PlaybackSession = {
      sessionId: 'a0000000-0000-0000-0000-000000000001',
      videoId: 'vid_123',
      cycleNumber: 1,
      startedAt: '2026-01-01T10:00:00Z',
      endedAt: '2026-01-01T10:02:00Z',
      watchedSeconds: 120,
      completionStatus: 'completed',
      errorCode: null,
      sourceType: 'youtube'
    };

    db.recordAnalyticsSession(session1);
    const summary = db.getAnalyticsSummary();
    expect(summary.totalSessions).toBe(0);
  });

  it('records playback sessions and computes analytics summary accurately when persistAnalytics is enabled', () => {
    db.saveSettings({ persistAnalytics: true });

    const session1: PlaybackSession = {
      sessionId: 'a0000000-0000-0000-0000-000000000001',
      videoId: 'vid_123',
      cycleNumber: 1,
      startedAt: '2026-01-01T10:00:00Z',
      endedAt: '2026-01-01T10:02:00Z',
      watchedSeconds: 120,
      completionStatus: 'completed',
      errorCode: null,
      sourceType: 'youtube'
    };

    const session2: PlaybackSession = {
      sessionId: 'a0000000-0000-0000-0000-000000000002',
      videoId: 'vid_123',
      cycleNumber: 2,
      startedAt: '2026-01-01T10:02:05Z',
      endedAt: '2026-01-01T10:04:05Z',
      watchedSeconds: 120,
      completionStatus: 'completed',
      errorCode: null,
      sourceType: 'youtube'
    };

    const session3: PlaybackSession = {
      sessionId: 'a0000000-0000-0000-0000-000000000003',
      videoId: 'vid_456',
      cycleNumber: 1,
      startedAt: '2026-01-01T10:05:00Z',
      endedAt: '2026-01-01T10:06:00Z',
      watchedSeconds: 30,
      completionStatus: 'interrupted',
      errorCode: null,
      sourceType: 'direct-video'
    };

    db.recordAnalyticsSession(session1);
    db.recordAnalyticsSession(session2);
    db.recordAnalyticsSession(session3);

    const summary = db.getAnalyticsSummary();
    expect(summary.totalSessions).toBe(3);
    expect(summary.completedCycles).toBe(2);
    expect(summary.interruptedSessions).toBe(1);
    expect(summary.totalWatchSeconds).toBe(270); // 120 + 120 + 30
    expect(summary.avgSessionDurationSeconds).toBe(135); // 270 / 2
  });

  it('records analytics events and fetches them in reverse chronological order when persistAnalytics is enabled', () => {
    db.saveSettings({ persistAnalytics: true });

    const event1: AnalyticsEvent = {
      eventId: 'e0000000-0000-0000-0000-000000000001',
      sessionId: 'a0000000-0000-0000-0000-000000000001',
      videoId: 'vid_123',
      eventType: 'playback_started',
      timestamp: '2026-01-01T10:00:00Z'
    };

    const event2: AnalyticsEvent = {
      eventId: 'e0000000-0000-0000-0000-000000000002',
      sessionId: 'a0000000-0000-0000-0000-000000000001',
      videoId: 'vid_123',
      eventType: 'playback_completed',
      timestamp: '2026-01-01T10:02:00Z'
    };

    db.recordAnalyticsEvent(event1);
    db.recordAnalyticsEvent(event2);

    const events = db.getAnalyticsEvents();
    expect(events.length).toBe(2);
    expect(events[0].eventType).toBe('playback_completed'); // latest first
    expect(events[1].eventType).toBe('playback_started');
  });

  it('exports and imports library data cleanly', () => {
    db.saveLibraryItem({
      videoId: 'imp_1',
      url: 'https://example.com/one.mp4',
      sourceType: 'direct-video',
      title: 'Import Test 1'
    });

    const dump = db.exportAll();
    expect(dump.library.length).toBe(1);

    db.clearLibrary();
    expect(db.getLibrary().length).toBe(0);

    const count = db.importLibrary(dump.library);
    expect(count).toBe(1);
    expect(db.getLibrary().length).toBe(1);
  });
});
