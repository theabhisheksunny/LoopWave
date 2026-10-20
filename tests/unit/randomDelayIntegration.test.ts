import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoopController } from '../../src/renderer/session/loopController';
import { PlaybackSessionManager } from '../../src/renderer/session/sessionManager';
import { DatabaseManager } from '../../src/main/storage/db';
import { useSettingsStore } from '../../src/renderer/stores/settingsStore';
import { usePlayerStore } from '../../src/renderer/stores/playerStore';
import { DEFAULT_SETTINGS } from '../../src/shared/defaults';
import {
  getRecentDelayDiagnostics,
  clearDelayDiagnostics,
  formatDelaySeconds,
  formatRemainingSeconds,
  scheduleRandomDelay
} from '../../src/shared/randomDelay';
import { ResolvedSource } from '../../src/shared/types';

describe('Randomized Delay Scheduling Integration Tests (Real Consuming Operations)', () => {
  let sessionManager: PlaybackSessionManager;
  const mockSource: ResolvedSource = {
    sourceType: 'direct-video',
    originalUrl: 'http://127.0.0.1:51869/sample.mp4',
    canonicalUrl: 'http://127.0.0.1:51869/sample.mp4',
    videoId: 'sample-video-id'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    clearDelayDiagnostics();
    sessionManager = new PlaybackSessionManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('1. LoopController Playback Cycle Loop Integration', () => {
    it('generates different random delay values across repeated loop executions within bounds [0, 10000] ms', () => {
      let restartCount = 0;
      const controller = new LoopController(sessionManager, {
        onRestartCurrentSource: async () => {
          restartCount++;
        },
        onPlayNextQueueItem: async () => {},
        onDelayTick: () => {}
      });

      controller.setLoopMode('one');
      controller.setCurrentSource(mockSource);
      controller.setRandomizedDelayEnabled(true);

      const capturedDelays: number[] = [];

      for (let i = 0; i < 15; i++) {
        vi.useFakeTimers();
        controller.handlePlaybackEnded();
        const delayMs = controller.getLastScheduledDelayMs();
        expect(delayMs).toBeTypeOf('number');
        expect(delayMs).toBeGreaterThanOrEqual(0);
        expect(delayMs).toBeLessThanOrEqual(10000);
        capturedDelays.push(delayMs!);

        // Advance timers to complete this loop cycle
        vi.advanceTimersByTime(delayMs!);
        controller.cancelPendingLoop();
      }

      // Assert that delay values vary across executions (not a static or reused constant)
      const uniqueDelays = new Set(capturedDelays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    it('executes the loop restart only after the scheduled delay has elapsed', () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.42); // 4200 ms delay

      let actionExecuted = false;
      const controller = new LoopController(sessionManager, {
        onRestartCurrentSource: async () => {
          actionExecuted = true;
        },
        onPlayNextQueueItem: async () => {},
        onDelayTick: () => {}
      });

      controller.setLoopMode('one');
      controller.setCurrentSource(mockSource);
      controller.setRandomizedDelayEnabled(true);

      controller.handlePlaybackEnded();
      expect(controller.getLastScheduledDelayMs()).toBe(4200);
      expect(actionExecuted).toBe(false);

      // Advance to 1ms before completion -> still not executed
      vi.advanceTimersByTime(4199);
      expect(actionExecuted).toBe(false);

      // Advance the final 1ms -> executed
      vi.advanceTimersByTime(1);
      expect(actionExecuted).toBe(true);
    });

    it('executes immediately without delay when randomizedDelayEnabled is false and delay is 0', () => {
      let actionExecuted = false;
      const controller = new LoopController(sessionManager, {
        onRestartCurrentSource: async () => {
          actionExecuted = true;
        },
        onPlayNextQueueItem: async () => {},
        onDelayTick: () => {}
      });

      controller.setLoopMode('one');
      controller.setCurrentSource(mockSource);
      controller.setInterLoopDelay(0);
      controller.setRandomizedDelayEnabled(false);

      controller.handlePlaybackEnded();
      expect(actionExecuted).toBe(true);
      expect(controller.getLastScheduledDelayMs()).toBe(0);
    });

    it('cancels pending loop restart and prevents execution when cancelPendingLoop() is called', () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.7); // 7000 ms

      let actionExecuted = false;
      const controller = new LoopController(sessionManager, {
        onRestartCurrentSource: async () => {
          actionExecuted = true;
        },
        onPlayNextQueueItem: async () => {},
        onDelayTick: () => {}
      });

      controller.setLoopMode('one');
      controller.setCurrentSource(mockSource);
      controller.setRandomizedDelayEnabled(true);

      controller.handlePlaybackEnded();
      expect(controller.isWaiting()).toBe(true);

      // User pauses or stops at 3000ms
      vi.advanceTimersByTime(3000);
      controller.cancelPendingLoop();
      expect(controller.isWaiting()).toBe(false);

      // Advance past remaining time -> action should NEVER fire
      vi.advanceTimersByTime(10000);
      expect(actionExecuted).toBe(false);
    });

    it('preserves full floating-point precision end-to-end for values such as 2.9997s, 9.12353s, 0.23741s, 6.78934s, and 1.00001s without integer truncation', () => {
      vi.useFakeTimers();

      const testCases = [
        { mockRand: 0.29997, expectedSeconds: 2.9997, expectedMs: 2999.7 },
        { mockRand: 0.912353, expectedSeconds: 9.12353, expectedMs: 9123.53 },
        { mockRand: 0.023741, expectedSeconds: 0.23741, expectedMs: 237.41 },
        { mockRand: 0.678934, expectedSeconds: 6.78934, expectedMs: 6789.34 },
        { mockRand: 0.100001, expectedSeconds: 1.00001, expectedMs: 1000.01 }
      ];

      for (const tc of testCases) {
        vi.spyOn(Math, 'random').mockReturnValue(tc.mockRand);

        let capturedRemaining: number | null = null;
        let capturedSelected: number | null = null;

        const controller = new LoopController(sessionManager, {
          onRestartCurrentSource: async () => {},
          onPlayNextQueueItem: async () => {},
          onDelayTick: (rem, sel) => {
            capturedRemaining = rem;
            capturedSelected = sel ?? null;
          }
        });

        controller.setLoopMode('one');
        controller.setCurrentSource(mockSource);
        controller.setRandomizedDelayEnabled(true);

        controller.handlePlaybackEnded();

        const delayMs = controller.getLastScheduledDelayMs();
        expect(delayMs).toBeCloseTo(tc.expectedMs, 5);

        // Verify that initial tick preserves floating-point seconds without rounding
        expect(capturedSelected).toBeCloseTo(tc.expectedSeconds, 5);
        expect(capturedRemaining).toBeCloseTo(tc.expectedSeconds, 5);

        // Verify that display format preserves exact 5 decimal places
        expect(formatDelaySeconds(delayMs!)).toBe(`${tc.expectedSeconds.toFixed(5)}s`);

        controller.cancelPendingLoop();
      }
    });

    it('propagates fractional selectedDelaySeconds and countdownRemaining to playerStore', () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.29997); // 2.9997s

      const player = usePlayerStore.getState();
      player.setLoopMode('one');
      player.setRandomizedDelayEnabled(true);
      player.loopController.setCurrentSource(mockSource);

      player.loopController.handlePlaybackEnded();

      const state = usePlayerStore.getState();
      expect(state.selectedDelaySeconds).toBeCloseTo(2.9997, 4);
      expect(state.countdownRemaining).toBeCloseTo(2.9997, 4);

      player.loopController.cancelPendingLoop();
      expect(usePlayerStore.getState().countdownRemaining).toBe(0);
    });

    it('tolerates normal JavaScript timer event loop scheduling without precision distortion', async () => {
      vi.useRealTimers();

      const start = performance.now();
      let finished = false;

      const task = scheduleRandomDelay(
        () => {
          finished = true;
        },
        {
          minMs: 30.5,
          maxMs: 30.5,
          enabled: true,
          operationName: 'real-timer-tolerance'
        }
      );

      expect(task.delayMs).toBe(30.5);
      await task.promise;
      const elapsed = performance.now() - start;

      expect(finished).toBe(true);
      // Real timer elapsed should be at least ~25ms and within normal scheduling jitter
      expect(elapsed).toBeGreaterThanOrEqual(25);
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe('2. Live Settings Update Synchronization (No Restart Required)', () => {
    it('propagates randomizedDelayEnabled toggle live from settingsStore to playerStore and LoopController', async () => {
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, randomizedDelayEnabled: false }
      });
      usePlayerStore.getState().setRandomizedDelayEnabled(false);

      const playerStore = usePlayerStore.getState();
      expect(playerStore.randomizedDelayEnabled).toBe(false);
      expect(playerStore.loopController.isRandomizedDelayEnabled()).toBe(false);

      // User toggles setting to ON in SettingsScreen
      await useSettingsStore.getState().updateSettings({ randomizedDelayEnabled: true });

      // Verifies live update without restarting
      expect(usePlayerStore.getState().randomizedDelayEnabled).toBe(true);
      expect(usePlayerStore.getState().loopController.isRandomizedDelayEnabled()).toBe(true);

      // User toggles setting to OFF in SettingsScreen
      await useSettingsStore.getState().updateSettings({ randomizedDelayEnabled: false });

      expect(usePlayerStore.getState().randomizedDelayEnabled).toBe(false);
      expect(usePlayerStore.getState().loopController.isRandomizedDelayEnabled()).toBe(false);
    });
  });

  describe('3. StorageDb Retention Maintenance Scheduling', () => {
    it('schedules retention maintenance with random delay when enabled, and cancels on dispose()', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.35); // 3500 ms

      const db = new DatabaseManager();
      await db.init();
      db.saveSettings({ randomizedDelayEnabled: true });

      const task = db.scheduleRetentionMaintenance();
      expect(task.delayMs).toBe(3500);
      expect(task.isCancelled).toBe(false);
      expect(db.getLastScheduledDelayMs()).toBe(3500);

      // Dispose cancels the pending timer
      db.dispose();
      expect(task.isCancelled).toBe(true);
    });

    it('executes retention maintenance immediately when randomized delay is disabled', async () => {
      const db = new DatabaseManager();
      await db.init();
      expect(db.getSettings().randomizedDelayEnabled).toBe(false);

      const task = db.scheduleRetentionMaintenance();
      expect(task.delayMs).toBe(0);
      expect(task.isCancelled).toBe(false);
      expect(db.getLastScheduledDelayMs()).toBe(0);
    });
  });

  describe('4. Diagnostic Records & Audit Trail', () => {
    it('records diagnostic entries for consuming operations without logging private data', () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const controller = new LoopController(sessionManager, {
        onRestartCurrentSource: async () => {},
        onPlayNextQueueItem: async () => {},
        onDelayTick: () => {}
      });

      controller.setLoopMode('one');
      controller.setCurrentSource(mockSource);
      controller.setRandomizedDelayEnabled(true);

      controller.handlePlaybackEnded();

      const diagnostics = getRecentDelayDiagnostics();
      expect(diagnostics.length).toBeGreaterThan(0);

      const latest = diagnostics[diagnostics.length - 1];
      expect(latest.operation).toBe('playback-loop-cycle');
      expect(latest.delayMs).toBe(5000);
      expect(latest.minMs).toBe(0);
      expect(latest.maxMs).toBe(10000);
      expect(latest.enabled).toBe(true);
      expect(latest.cancelled).toBe(false);
      expect(latest.scheduledAt).toBeTypeOf('number');

      // Ensure no URLs or video titles leaked into diagnostic object
      expect((latest as any).url).toBeUndefined();
      expect((latest as any).canonicalUrl).toBeUndefined();
    });
  });
});
