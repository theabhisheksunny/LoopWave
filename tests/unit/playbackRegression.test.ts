import { describe, it, expect, beforeEach } from 'vitest';
import { YouTubeAdapter } from '../../src/renderer/adapters/youtubeAdapter';
import { DirectMediaAdapter } from '../../src/renderer/adapters/directMediaAdapter';
import { resolveSource } from '../../src/renderer/adapters/sourceResolver';
import { AnalyticsService } from '../../src/renderer/analytics/analyticsService';
import { PlaybackSessionManager } from '../../src/renderer/session/sessionManager';
import { usePlayerStore } from '../../src/renderer/stores/playerStore';
import { PlaybackSession, ResolvedSource } from '../../src/shared/types';

describe('Playback Pipeline & Regression Tests', () => {
  let sessionManager: PlaybackSessionManager;
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    sessionManager = new PlaybackSessionManager();
    analyticsService = AnalyticsService.getInstance();
  });

  it('translates YouTube error 150 into clear owner embed restriction error', () => {
    const ytAdapter = new YouTubeAdapter();
    let emittedError: any = null;
    ytAdapter.onEvent((event, payload) => {
      if (event === 'error') {
        emittedError = payload;
      }
    });

    // Simulate internal YouTube player error 150
    (ytAdapter as any).handlePlayerError(150);

    expect(emittedError).not.toBeNull();
    expect(emittedError.code).toBe('YT_ERROR_150');
    expect(emittedError.message).toContain('owner does not allow embedded playback');
  });

  it('translates YouTube error 152 into embedder restriction error', () => {
    const ytAdapter = new YouTubeAdapter();
    let emittedError: any = null;
    ytAdapter.onEvent((event, payload) => {
      if (event === 'error') {
        emittedError = payload;
      }
    });

    (ytAdapter as any).handlePlayerError(152);

    expect(emittedError).not.toBeNull();
    expect(emittedError.code).toBe('YT_ERROR_152');
    expect(emittedError.message).toContain('Playback restricted or embedder identity verification failed');
  });

  it('clears listeners on adapter dispose preventing duplicate event leak', () => {
    const adapter = new DirectMediaAdapter();
    let callCount = 0;
    adapter.onStateChange(() => {
      callCount++;
    });

    // Initial state call was 1
    expect(callCount).toBe(1);

    // Call clearListeners
    adapter.clearListeners();

    // Trigger state update
    (adapter as any).updateState({ status: 'playing' });

    // Should still be 1 (listener was cleared)
    expect(callCount).toBe(1);
  });

  it('records attempt failure idempotently in session manager even if playback never started', () => {
    const source: ResolvedSource = {
      sourceType: 'youtube',
      originalUrl: 'https://www.youtube.com/shorts/n2YGWiRRxEs',
      canonicalUrl: 'https://www.youtube.com/watch?v=n2YGWiRRxEs',
      videoId: 'n2YGWiRRxEs',
      title: 'YouTube Short',
      mediaType: 'video'
    };

    sessionManager.initTrack(source);

    // Attempt fails during initialization
    const failSession1 = sessionManager.recordFailure('YT_ERROR_150');
    expect(failSession1).not.toBeNull();
    expect(failSession1?.completionStatus).toBe('failed');
    expect(failSession1?.errorCode).toBe('YT_ERROR_150');
    expect(failSession1?.videoId).toBe('n2YGWiRRxEs');

    // Repeated error callback for the same failure should return the same failed session without creating a new one
    const failSession2 = sessionManager.recordFailure('YT_ERROR_150');
    expect(failSession2?.sessionId).toBe(failSession1?.sessionId);
  });

  it('deduplicates consecutive failure events in AnalyticsService', async () => {
    const session: PlaybackSession = {
      sessionId: 'test-session-123',
      videoId: 'test-video',
      cycleNumber: 1,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      watchedSeconds: 0,
      completionStatus: 'failed',
      errorCode: 'YT_ERROR_150',
      sourceType: 'youtube'
    };

    const ev1 = await analyticsService.recordEvent('playback_failed', session, {
      errorCode: 'YT_ERROR_150',
      errorMessage: 'Embedding disabled'
    });
    expect(ev1).not.toBeNull();
    expect(ev1?.eventType).toBe('playback_failed');

    // Second immediate call with identical session and errorCode should be deduplicated
    const ev2 = await analyticsService.recordEvent('playback_failed', session, {
      errorCode: 'YT_ERROR_150',
      errorMessage: 'Embedding disabled'
    });
    expect(ev2).toBeNull();
  });

  it('resets player state to idle and clears error on stop()', () => {
    // Set error state manually
    usePlayerStore.setState({
      adapterState: {
        status: 'error',
        currentTime: 10,
        duration: 100,
        volume: 80,
        isMuted: false,
        playbackRate: 1.0,
        bufferedTime: 0,
        error: { code: 'YT_ERROR_150', message: 'Embed restricted', fatal: true }
      }
    });

    expect(usePlayerStore.getState().adapterState.status).toBe('error');

    // Call stop()
    usePlayerStore.getState().stop();

    const afterStop = usePlayerStore.getState().adapterState;
    expect(afterStop.status).toBe('idle');
    expect(afterStop.currentTime).toBe(0);
    expect(afterStop.error).toBeNull();
  });

  it('clears active source and resets to idle on clearSource()', () => {
    usePlayerStore.setState({
      currentSource: {
        sourceType: 'youtube',
        originalUrl: 'https://youtube.com',
        canonicalUrl: 'https://youtube.com',
        videoId: 'abc',
        mediaType: 'video'
      },
      adapterState: {
        status: 'playing',
        currentTime: 25,
        duration: 120,
        volume: 70,
        isMuted: false,
        playbackRate: 1.0,
        bufferedTime: 30,
        error: null
      }
    });

    usePlayerStore.getState().clearSource();

    expect(usePlayerStore.getState().currentSource).toBeNull();
    expect(usePlayerStore.getState().adapterState.status).toBe('idle');
    expect(usePlayerStore.getState().adapterState.currentTime).toBe(0);
    expect(usePlayerStore.getState().adapterState.duration).toBe(0);
  });

  it('correctly normalizes YouTube Shorts URL kwXZjR5phcc', () => {
    const res = resolveSource('https://www.youtube.com/shorts/kwXZjR5phcc');
    expect(res.success).toBe(true);
    expect(res.source?.sourceType).toBe('youtube');
    expect(res.source?.videoId).toBe('kwXZjR5phcc');
    expect(res.source?.canonicalUrl).toBe('https://www.youtube.com/watch?v=kwXZjR5phcc');
  });

  it('preserves queue integrity when playback encounters error and is dismissed', () => {
    const mockQueue = [
      {
        id: 'q1',
        source: {
          sourceType: 'youtube' as const,
          originalUrl: 'https://www.youtube.com/shorts/kwXZjR5phcc',
          canonicalUrl: 'https://www.youtube.com/watch?v=kwXZjR5phcc',
          videoId: 'kwXZjR5phcc'
        },
        addedAt: new Date().toISOString()
      },
      {
        id: 'q2',
        source: {
          sourceType: 'direct-video' as const,
          originalUrl: 'https://example.com/video.mp4',
          canonicalUrl: 'https://example.com/video.mp4',
          videoId: 'video2'
        },
        addedAt: new Date().toISOString()
      }
    ];

    usePlayerStore.setState({
      queue: mockQueue,
      currentQueueIndex: 0,
      currentSource: mockQueue[0].source,
      adapterState: {
        status: 'error',
        currentTime: 0,
        duration: 0,
        volume: 80,
        isMuted: false,
        playbackRate: 1.0,
        bufferedTime: 0,
        error: { code: 'YT_ERROR_150', message: 'Owner disabled embedding', fatal: true }
      }
    });

    expect(usePlayerStore.getState().queue.length).toBe(2);
    expect(usePlayerStore.getState().adapterState.status).toBe('error');

    // Dismiss the error via clearSource
    usePlayerStore.getState().clearSource();

    // Queue must remain completely intact
    const finalState = usePlayerStore.getState();
    expect(finalState.queue.length).toBe(2);
    expect(finalState.queue[0].source.videoId).toBe('kwXZjR5phcc');
    expect(finalState.queue[1].source.videoId).toBe('video2');
    expect(finalState.adapterState.status).toBe('idle');
    expect(finalState.adapterState.error).toBeNull();
  });
});
