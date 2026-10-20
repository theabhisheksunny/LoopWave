import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BasePlaybackAdapter } from '../../src/renderer/adapters/adapterInterface';
import { AdapterCapabilities, ResolvedSource } from '../../src/shared/types';
import { PlaybackSessionManager } from '../../src/renderer/session/sessionManager';
import { LoopController } from '../../src/renderer/session/loopController';

class ShortFixtureAdapter extends BasePlaybackAdapter {
  readonly id = 'short-fixture';
  readonly name = 'Short 2-Second Test Fixture';

  canHandle(source: ResolvedSource): boolean {
    return true;
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsSpeed: true,
      supportsPiP: false,
      supportsSeeking: true,
      supportsVolume: true,
      supportsQuality: false
    };
  }

  async load(source: ResolvedSource, container: HTMLElement): Promise<void> {
    this.updateState({ status: 'ready', duration: 2 });
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

  seek(pos: number): void {
    this.updateState({ currentTime: pos });
  }

  setVolume(vol: number): void {
    this.updateState({ volume: vol });
  }

  setMuted(m: boolean): void {
    this.updateState({ isMuted: m });
  }

  setPlaybackRate(r: number): void {
    this.updateState({ playbackRate: r });
  }

  finishPlayback(): void {
    this.updateState({ status: 'ended', currentTime: 2 });
    this.emitEvent('ended');
  }

  dispose(): void {
    this.updateState({ status: 'idle' });
  }
}

describe('20-Cycle Loop Stability and Session Verification', () => {
  let adapter: ShortFixtureAdapter;
  let sessionManager: PlaybackSessionManager;
  let loopController: LoopController;
  const completedSessions: any[] = [];

  const shortMedia: ResolvedSource = {
    sourceType: 'direct-video',
    originalUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    canonicalUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    videoId: 'mdn_flower_cc0',
    title: 'MDN Flower Test Video'
  };

  beforeEach(() => {
    vi.useFakeTimers();
    completedSessions.length = 0;
    adapter = new ShortFixtureAdapter();
    sessionManager = new PlaybackSessionManager();

    sessionManager.onSessionChange((s) => {
      if (s.completionStatus === 'completed') {
        completedSessions.push({ ...s });
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

  it('successfully executes 20 consecutive loop cycles with unique UUIDs and verified stability', async () => {
    sessionManager.initTrack(shortMedia);
    loopController.setCurrentSource(shortMedia);
    loopController.setLoopMode('one');
    loopController.setInterLoopDelay(1); // 1s inter-loop delay

    // Initial cycle
    await adapter.play();
    sessionManager.startSession();

    const observedUuids = new Set<string>();

    // Run 20 cycles
    for (let cycle = 1; cycle <= 20; cycle++) {
      const current = sessionManager.getCurrentSession();
      expect(current?.cycleNumber).toBe(cycle);
      expect(current?.videoId).toBe('mdn_flower_cc0'); // Video ID remains completely stable
      expect(observedUuids.has(current!.sessionId)).toBe(false); // Never duplicate a UUID!
      observedUuids.add(current!.sessionId);

      // Finish this cycle
      adapter.finishPlayback();
      loopController.handlePlaybackEnded();

      if (cycle < 20) {
        expect(loopController.isWaiting()).toBe(true);
        // Advance inter-loop delay
        await vi.advanceTimersByTimeAsync(1000);
        expect(loopController.isWaiting()).toBe(false);
      }
    }

    // Verify exactly 20 cycles completed and 20 unique cryptographic UUIDs were issued
    expect(observedUuids.size).toBe(20);
    expect(completedSessions.length).toBe(20);

    // Verify sequence of cycle numbers
    for (let i = 0; i < 20; i++) {
      expect(completedSessions[i].cycleNumber).toBe(i + 1);
      expect(completedSessions[i].videoId).toBe('mdn_flower_cc0');
      expect(completedSessions[i].completionStatus).toBe('completed');
    }
  });
});
