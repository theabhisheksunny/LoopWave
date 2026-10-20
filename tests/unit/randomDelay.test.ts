import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  randomDelayMs,
  randomDelaySeconds,
  formatDelaySeconds,
  scheduleRandomDelay,
  waitForRandomDelay,
  MIN_DELAY_MS,
  MAX_DELAY_MS
} from '../../src/shared/randomDelay';
import { simulateNetworkLatency } from '../fixtures/simulatedLatency';
import { DatabaseManager } from '../../src/main/storage/db';

describe('Randomized Delay Utility (0–10 Seconds)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('1. Range Validation and Output Boundaries', () => {
    it('returns values strictly within the default [0, 10000] ms range', () => {
      for (let i = 0; i < 50; i++) {
        const delay = randomDelayMs();
        expect(delay).toBeGreaterThanOrEqual(MIN_DELAY_MS);
        expect(delay).toBeLessThanOrEqual(MAX_DELAY_MS);
      }
    });

    it('returns values within caller-supplied custom bounds', () => {
      for (let i = 0; i < 50; i++) {
        const delay = randomDelayMs(250, 1750);
        expect(delay).toBeGreaterThanOrEqual(250);
        expect(delay).toBeLessThanOrEqual(1750);
      }
    });

    it('returns exact value when minimum equals maximum', () => {
      expect(randomDelayMs(0, 0)).toBe(0);
      expect(randomDelayMs(5000, 5000)).toBe(5000);
      expect(randomDelayMs(10000, 10000)).toBe(10000);
      expect(randomDelayMs(1234.5678, 1234.5678)).toBe(1234.5678);
    });

    it('rejects invalid, out-of-bounds, or non-finite ranges with RangeError', () => {
      // min < 0
      expect(() => randomDelayMs(-1, 5000)).toThrow(RangeError);
      // max > 10,000
      expect(() => randomDelayMs(0, 10001)).toThrow(RangeError);
      // min > max
      expect(() => randomDelayMs(5000, 2000)).toThrow(RangeError);
      // NaN
      expect(() => randomDelayMs(NaN, 5000)).toThrow(RangeError);
      expect(() => randomDelayMs(0, NaN)).toThrow(RangeError);
      // Infinity
      expect(() => randomDelayMs(0, Infinity)).toThrow(RangeError);
      expect(() => randomDelayMs(-Infinity, 5000)).toThrow(RangeError);
    });
  });

  describe('2. Fractional Precision and Seconds Conversion', () => {
    it('supports fractional values at millisecond precision and finer', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
      const delay = randomDelayMs(0, 10000);
      expect(delay).toBeCloseTo(1234.56789, 5);
      expect(delay % 1).not.toBe(0);
    });

    it('supports fractional inputs and produces fractional outputs', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const delay = randomDelayMs(100.25, 200.75);
      expect(delay).toBeCloseTo(150.5, 4);
    });

    it('randomDelaySeconds correctly converts millisecond range to seconds', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.67893);
      const seconds = randomDelaySeconds(0, 10);
      expect(seconds).toBeCloseTo(6.7893, 4);
    });

    it('formats millisecond delay to readable seconds string', () => {
      expect(formatDelaySeconds(1230, 2)).toBe('1.23s');
      expect(formatDelaySeconds(230, 2)).toBe('0.23s');
      expect(formatDelaySeconds(1999, 3)).toBe('1.999s');
      expect(formatDelaySeconds(6789.3, 4)).toBe('6.7893s');
    });
  });

  describe('3. Deterministic Mocking in Tests', () => {
    it('produces exact expected delays when Math.random is mocked', () => {
      const mockRandom = vi.spyOn(Math, 'random');

      mockRandom.mockReturnValue(0.0);
      expect(randomDelayMs(0, 10000)).toBe(0);

      mockRandom.mockReturnValue(0.5);
      expect(randomDelayMs(0, 10000)).toBe(5000);

      mockRandom.mockReturnValue(1.0);
      expect(randomDelayMs(0, 10000)).toBe(10000);

      mockRandom.mockReturnValue(0.1999);
      expect(randomDelayMs(0, 10000)).toBeCloseTo(1999, 2);
    });
  });

  describe('4. Non-Blocking Scheduling & Cancellation (scheduleRandomDelay)', () => {
    it('executes immediately with 0 ms artificial delay when disabled (default)', async () => {
      vi.useFakeTimers();
      let executed = false;
      const task = () => {
        executed = true;
      };

      const scheduled = scheduleRandomDelay(task, { enabled: false });

      expect(scheduled.delayMs).toBe(0);
      expect(scheduled.isCancelled).toBe(false);
      expect(executed).toBe(true);
    });

    it('schedules task with randomized delay when enabled and executes after timeout', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.3); // 3000 ms

      let executed = false;
      const scheduled = scheduleRandomDelay(() => {
        executed = true;
      }, {
        minMs: 0,
        maxMs: 10000,
        enabled: true
      });

      expect(scheduled.delayMs).toBe(3000);
      expect(executed).toBe(false);

      vi.advanceTimersByTime(2999);
      expect(executed).toBe(false);

      vi.advanceTimersByTime(1);
      expect(executed).toBe(true);
    });

    it('cancels scheduled task cleanly on manual cancel() call', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // 5000 ms

      let executed = false;
      const scheduled = scheduleRandomDelay(() => {
        executed = true;
      }, {
        enabled: true,
        minMs: 1000,
        maxMs: 10000
      });

      expect(scheduled.delayMs).toBe(5500);
      scheduled.cancel();
      expect(scheduled.isCancelled).toBe(true);

      vi.advanceTimersByTime(10000);
      expect(executed).toBe(false);
    });

    it('cancels scheduled task when AbortSignal fires', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const controller = new AbortController();
      let executed = false;

      const scheduled = scheduleRandomDelay(() => {
        executed = true;
      }, {
        enabled: true,
        signal: controller.signal
      });

      expect(scheduled.delayMs).toBe(5000);
      controller.abort();
      expect(scheduled.isCancelled).toBe(true);

      vi.advanceTimersByTime(10000);
      expect(executed).toBe(false);
    });

    it('does not execute if AbortSignal is already aborted at scheduling time', () => {
      const controller = new AbortController();
      controller.abort();

      let executed = false;
      const scheduled = scheduleRandomDelay(() => {
        executed = true;
      }, {
        enabled: true,
        signal: controller.signal
      });

      expect(scheduled.isCancelled).toBe(true);
      expect(scheduled.delayMs).toBe(0);
      expect(executed).toBe(false);
    });
  });

  describe('5. Asynchronous Latency Simulation (waitForRandomDelay & Fixtures)', () => {
    it('waitForRandomDelay resolves immediately with 0 when disabled', async () => {
      const delay = await waitForRandomDelay({ enabled: false });
      expect(delay).toBe(0);
    });

    it('simulateNetworkLatency test fixture accurately simulates jitter', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.25); // 2500 ms
      vi.useFakeTimers();

      const promise = simulateNetworkLatency(1000, 5000, { enabled: true });
      vi.advanceTimersByTime(2000); // 1000 + 0.25 * 4000 = 2000 ms

      const result = await promise;
      expect(result).toBe(2000);
    });

    it('rejects with AbortError if signal is aborted during wait', async () => {
      vi.useFakeTimers();
      const controller = new AbortController();

      const waitPromise = waitForRandomDelay({
        minMs: 2000,
        maxMs: 5000,
        enabled: true,
        signal: controller.signal
      });

      controller.abort();
      await expect(waitPromise).rejects.toThrow();
    });
  });

  describe('6. StorageDb Background Maintenance Integration', () => {
    it('schedules retention maintenance with randomized delay when enabled and cancels on dispose()', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.4); // 4000 ms

      const db = new DatabaseManager();
      await db.init();
      db.saveSettings({ randomizedDelayEnabled: true });

      const task = db.scheduleRetentionMaintenance();
      expect(task.delayMs).toBe(4000);
      expect(task.isCancelled).toBe(false);

      // Disposal should immediately cancel pending maintenance
      db.dispose();
      expect(task.isCancelled).toBe(true);
    });

    it('runs retention maintenance immediately with 0 ms delay when disabled (default)', async () => {
      const db = new DatabaseManager();
      await db.init();
      expect(db.getSettings().randomizedDelayEnabled).toBe(false);

      const task = db.scheduleRetentionMaintenance();
      expect(task.delayMs).toBe(0);
      expect(task.isCancelled).toBe(false);
    });
  });
});
