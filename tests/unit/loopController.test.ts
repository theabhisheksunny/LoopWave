import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoopController } from '../../src/renderer/session/loopController';
import { PlaybackSessionManager } from '../../src/renderer/session/sessionManager';
import { QueueItem, ResolvedSource } from '../../src/shared/types';

describe('LoopController', () => {
  let sessionManager: PlaybackSessionManager;
  let restartCallback: any;
  let playNextCallback: any;
  let delayTickCallback: any;
  let controller: LoopController;

  const mockSource1: ResolvedSource = {
    sourceType: 'direct-video',
    originalUrl: 'https://example.com/video1.mp4',
    canonicalUrl: 'https://example.com/video1.mp4',
    videoId: 'v1',
    title: 'Video 1'
  };

  const mockSource2: ResolvedSource = {
    sourceType: 'direct-video',
    originalUrl: 'https://example.com/video2.mp4',
    canonicalUrl: 'https://example.com/video2.mp4',
    videoId: 'v2',
    title: 'Video 2'
  };

  beforeEach(() => {
    vi.useFakeTimers();
    sessionManager = new PlaybackSessionManager();
    restartCallback = vi.fn().mockResolvedValue(undefined);
    playNextCallback = vi.fn().mockResolvedValue(undefined);
    delayTickCallback = vi.fn();

    controller = new LoopController(sessionManager, {
      onRestartCurrentSource: restartCallback,
      onPlayNextQueueItem: playNextCallback,
      onDelayTick: delayTickCallback
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    controller.dispose();
  });

  it('defaults to loopMode "off" and 2s delay', () => {
    expect(controller.getLoopMode()).toBe('off');
    expect(controller.getInterLoopDelay()).toBe(2);
  });

  it('on repeat-one: triggers restart of current source after configured delay', () => {
    sessionManager.initTrack(mockSource1);
    sessionManager.startSession();
    controller.setCurrentSource(mockSource1);
    controller.setLoopMode('one');
    controller.setInterLoopDelay(3);

    controller.handlePlaybackEnded();

    expect(controller.isWaiting()).toBe(true);
    expect(restartCallback).not.toHaveBeenCalled();

    // Fast forward delay
    vi.advanceTimersByTime(3000);

    expect(restartCallback).toHaveBeenCalledWith(mockSource1);
    expect(controller.isWaiting()).toBe(false);
    expect(sessionManager.getCycleNumber()).toBe(2);
  });

  it('cancels pending loop timer when cancelPendingLoop() is called or mode changes to off', () => {
    sessionManager.initTrack(mockSource1);
    sessionManager.startSession();
    controller.setCurrentSource(mockSource1);
    controller.setLoopMode('one');
    controller.setInterLoopDelay(5);

    controller.handlePlaybackEnded();
    expect(controller.isWaiting()).toBe(true);

    controller.cancelPendingLoop();
    expect(controller.isWaiting()).toBe(false);

    vi.advanceTimersByTime(5000);
    expect(restartCallback).not.toHaveBeenCalled();
  });

  it('on repeat-all: advances queue items and loops around when queue ends', () => {
    const queue: QueueItem[] = [
      { id: '1', source: mockSource1, addedAt: '2026-01-01' },
      { id: '2', source: mockSource2, addedAt: '2026-01-01' }
    ];

    controller.setQueue(queue, 0); // Playing index 0
    controller.setCurrentSource(mockSource1);
    controller.setLoopMode('all');
    controller.setInterLoopDelay(0); // instant

    // End of item 1 -> should advance to item 2
    controller.handlePlaybackEnded();
    expect(controller.getCurrentQueueIndex()).toBe(1);
    expect(playNextCallback).toHaveBeenCalledWith(queue[1]);

    // End of item 2 -> should loop back to item 1 (index 0)
    controller.handlePlaybackEnded();
    expect(controller.getCurrentQueueIndex()).toBe(0);
    expect(playNextCallback).toHaveBeenCalledWith(queue[0]);
  });
});
