import { describe, it, expect, beforeEach } from 'vitest';
import { PlaybackSessionManager } from '../../src/renderer/session/sessionManager';
import { ResolvedSource } from '../../src/shared/types';

describe('PlaybackSessionManager', () => {
  let manager: PlaybackSessionManager;
  const mockSource: ResolvedSource = {
    sourceType: 'youtube',
    originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    title: 'Test Video'
  };

  beforeEach(() => {
    manager = new PlaybackSessionManager();
  });

  it('initializes a track with cycle number 1', () => {
    manager.initTrack(mockSource);
    expect(manager.getCycleNumber()).toBe(1);
    expect(manager.getCurrentSession()).toBeNull();
  });

  it('generates a fresh cryptographically secure UUID for every cycle while videoId remains stable', () => {
    manager.initTrack(mockSource);

    // Cycle 1
    const session1 = manager.startSession();
    expect(session1.sessionId).toBeDefined();
    expect(session1.videoId).toBe('dQw4w9WgXcQ');
    expect(session1.cycleNumber).toBe(1);
    expect(session1.completionStatus).toBe('active');

    // Complete cycle 1
    manager.recordCompletion();

    // Prepare Cycle 2
    manager.prepareNextCycle();
    expect(manager.getCycleNumber()).toBe(2);

    const session2 = manager.startSession();
    expect(session2.sessionId).toBeDefined();
    expect(session2.sessionId).not.toBe(session1.sessionId); // Unique UUID!
    expect(session2.videoId).toBe('dQw4w9WgXcQ'); // Stable video ID!
    expect(session2.cycleNumber).toBe(2);

    // Complete cycle 2
    manager.recordCompletion();

    // Prepare Cycle 3
    manager.prepareNextCycle();
    const session3 = manager.startSession();
    expect(session3.sessionId).not.toBe(session2.sessionId);
    expect(session3.sessionId).not.toBe(session1.sessionId);
    expect(session3.cycleNumber).toBe(3);
  });

  it('deduplicates playback start events within the same cycle', () => {
    manager.initTrack(mockSource);
    const firstStart = manager.startSession();
    const secondStart = manager.startSession(); // Called again (e.g. rapid player events)

    expect(firstStart.sessionId).toBe(secondStart.sessionId);
    expect(secondStart.cycleNumber).toBe(1);
  });

  it('records completion only once and guards against duplicate completion events', () => {
    manager.initTrack(mockSource);
    manager.startSession();

    const completedSession = manager.recordCompletion();
    expect(completedSession?.completionStatus).toBe('completed');
    expect(completedSession?.endedAt).toBeDefined();

    // Second call should return the already completed session without creating new ones
    const duplicate = manager.recordCompletion();
    expect(duplicate?.sessionId).toBe(completedSession?.sessionId);
    expect(duplicate?.completionStatus).toBe('completed');
  });

  it('records failure with error code and marks completionStatus as failed', () => {
    manager.initTrack(mockSource);
    manager.startSession();

    const failed = manager.recordFailure('MEDIA_SRC_NOT_SUPPORTED');
    expect(failed?.completionStatus).toBe('failed');
    expect(failed?.errorCode).toBe('MEDIA_SRC_NOT_SUPPORTED');
    expect(failed?.endedAt).toBeDefined();
  });

  it('marks active session as interrupted when track changes or stops', () => {
    manager.initTrack(mockSource);
    manager.startSession();

    const closed = manager.closeCurrentSession('interrupted');
    expect(closed?.completionStatus).toBe('interrupted');
  });

  it('notifies subscribers on session state changes', () => {
    manager.initTrack(mockSource);
    let notifiedSession: any = null;

    const unsubscribe = manager.onSessionChange((s) => {
      notifiedSession = s;
    });

    const session = manager.startSession();
    expect(notifiedSession).toBeDefined();
    expect(notifiedSession.sessionId).toBe(session.sessionId);

    unsubscribe();
  });
});
