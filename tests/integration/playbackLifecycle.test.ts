import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BasePlaybackAdapter } from '../../src/renderer/adapters/adapterInterface';
import { AdapterCapabilities, ResolvedSource } from '../../src/shared/types';
import { PlaybackSessionManager } from '../../src/renderer/session/sessionManager';
import { LoopController } from '../../src/renderer/session/loopController';

class MockPlaybackAdapter extends BasePlaybackAdapter {
  readonly id = 'mock-adapter';
  readonly name = 'Mock Test Adapter';

  canHandle(source: ResolvedSource): boolean {
    return true;
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsSpeed: true,
      supportsPiP: true,
      supportsSeeking: true,
      supportsVolume: true,
      supportsQuality: true
    };
  }

  async load(source: ResolvedSource, container: HTMLElement, options?: any): Promise<void> {
    this.updateState({ status: 'ready', duration: 100 });
  }

  async play(): Promise<void> {
    this.updateState({ status: 'playing' });
    this.emitEvent('playing');
  }

  pause(): void {
    this.updateState({ status: 'paused' });
    this.emitEvent('paused');
  }

  stop(): void {
    this.updateState({ status: 'idle', currentTime: 0 });
  }

  seek(positionSeconds: number): void {
    this.updateState({ currentTime: positionSeconds });
  }

  setVolume(volumePercent: number): void {
    this.updateState({ volume: volumePercent });
  }

  setMuted(muted: boolean): void {
    this.updateState({ isMuted: muted });
  }

  setPlaybackRate(rate: number): void {
    this.updateState({ playbackRate: rate });
  }

  simulateEnd(): void {
    this.updateState({ status: 'ended', currentTime: 100 });
    this.emitEvent('ended');
  }

  dispose(): void {
    this.updateState({ status: 'idle' });
  }
}

describe('Playback Lifecycle Integration', () => {
  let adapter: MockPlaybackAdapter;
  let sessionManager: PlaybackSessionManager;
  let loopController: LoopController;
  const recordedSessions: any[] = [];

  const mockSource: ResolvedSource = {
    sourceType: 'direct-video',
    originalUrl: 'https://example.com/loop_test.mp4',
    canonicalUrl: 'https://example.com/loop_test.mp4',
    videoId: 'loop_vid_99',
    title: 'Loop Lifecycle Integration Test'
  };

  beforeEach(() => {
    vi.useFakeTimers();
    recordedSessions.length = 0;

    adapter = new MockPlaybackAdapter();
    sessionManager = new PlaybackSessionManager();

    sessionManager.onSessionChange((s) => {
      if (s.completionStatus === 'completed') {
        recordedSessions.push({ ...s });
      }
    });

    loopController = new LoopController(sessionManager, {
      onRestartCurrentSource: async () => {
        await adapter.play();
        sessionManager.startSession();
      },
      onPlayNextQueueItem: async () => {}
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    adapter.dispose();
    loopController.dispose();
  });

  it('runs multiple consecutive loops in repeat-one mode, issuing fresh UUIDs and tracking cycle count', async () => {
    sessionManager.initTrack(mockSource);
    loopController.setCurrentSource(mockSource);
    loopController.setLoopMode('one');
    loopController.setInterLoopDelay(2); // 2 second delay

    // --- Cycle 1 ---
    await adapter.play();
    const cycle1Session = sessionManager.startSession();
    expect(cycle1Session.cycleNumber).toBe(1);
    expect(cycle1Session.sessionId).toBeDefined();

    // Adapter finishes cycle 1
    adapter.simulateEnd();
    loopController.handlePlaybackEnded();

    expect(loopController.isWaiting()).toBe(true);

    // Advance 2s delay and flush async callback
    await vi.advanceTimersByTimeAsync(2000);
    expect(loopController.isWaiting()).toBe(false);

    // --- Cycle 2 ---
    const cycle2Session = sessionManager.getCurrentSession();
    expect(cycle2Session?.cycleNumber).toBe(2);
    expect(cycle2Session?.sessionId).not.toBe(cycle1Session.sessionId);

    // Adapter finishes cycle 2
    adapter.simulateEnd();
    loopController.handlePlaybackEnded();

    // Advance 2s delay
    await vi.advanceTimersByTimeAsync(2000);

    // --- Cycle 3 ---
    const cycle3Session = sessionManager.getCurrentSession();
    expect(cycle3Session?.cycleNumber).toBe(3);
    expect(cycle3Session?.sessionId).not.toBe(cycle2Session?.sessionId);
    expect(cycle3Session?.sessionId).not.toBe(cycle1Session.sessionId);

    // Verify 2 completed sessions were recorded
    expect(recordedSessions.length).toBe(2);
    expect(recordedSessions[0].cycleNumber).toBe(1);
    expect(recordedSessions[1].cycleNumber).toBe(2);
  });

  it('cancels pending loop restart if stopped during inter-loop delay', async () => {
    sessionManager.initTrack(mockSource);
    loopController.setCurrentSource(mockSource);
    loopController.setLoopMode('one');
    loopController.setInterLoopDelay(5);

    await adapter.play();
    sessionManager.startSession();

    adapter.simulateEnd();
    loopController.handlePlaybackEnded();
    expect(loopController.isWaiting()).toBe(true);

    // User stops playback at second 2 of 5
    vi.advanceTimersByTime(2000);
    loopController.cancelPendingLoop();
    expect(loopController.isWaiting()).toBe(false);

    // Advance past remaining 3 seconds
    vi.advanceTimersByTime(3000);

    // Cycle number should remain 1 and adapter shouldn't restart
    expect(sessionManager.getCycleNumber()).toBe(1);
    expect(adapter.getState().status).not.toBe('playing');
  });
});
