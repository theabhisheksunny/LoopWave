/**
 * LoopWave — Reusable Randomized Delay Scheduling Utility (0–10 Seconds)
 *
 * Generates controlled timing variations for eligible non-critical operations
 * (e.g. background maintenance, jitter, and test latency simulation)
 * without impacting active playback, transport controls, or UI responsiveness.
 */

export const MIN_DELAY_MS = 0;
export const MAX_DELAY_MS = 10_000;

export interface DelayDiagnosticRecord {
  operation: string;
  minMs: number;
  maxMs: number;
  enabled: boolean;
  delayMs: number;
  scheduledAt: number;
  executedAt: number | null;
  cancelled: boolean;
}

const recentDiagnostics: DelayDiagnosticRecord[] = [];
const MAX_DIAGNOSTIC_RECORDS = 50;

/**
 * Returns recent delay diagnostic records for auditing, telemetry verification, and testing.
 */
export function getRecentDelayDiagnostics(): DelayDiagnosticRecord[] {
  return [...recentDiagnostics];
}

/**
 * Clears recorded diagnostic records.
 */
export function clearDelayDiagnostics(): void {
  recentDiagnostics.length = 0;
}

function recordDiagnostic(entry: DelayDiagnosticRecord): void {
  if (recentDiagnostics.length >= MAX_DIAGNOSTIC_RECORDS) {
    recentDiagnostics.shift();
  }
  recentDiagnostics.push(entry);
}

/**
 * Generates a uniform random delay between minMs and maxMs (inclusive min, exclusive max unless min === max).
 * Supports fractional values at millisecond precision or finer.
 *
 * @param minMs Minimum delay in milliseconds (default: 0, must be >= 0 and <= maxMs)
 * @param maxMs Maximum delay in milliseconds (default: 10,000, must be <= 10,000 and >= minMs)
 * @returns Fractional delay in milliseconds
 * @throws RangeError if minMs or maxMs are not finite numbers, out of bounds [0, 10_000], or minMs > maxMs
 */
export function randomDelayMs(
  minMs = MIN_DELAY_MS,
  maxMs = MAX_DELAY_MS
): number {
  if (
    !Number.isFinite(minMs) ||
    !Number.isFinite(maxMs) ||
    minMs < MIN_DELAY_MS ||
    maxMs > MAX_DELAY_MS ||
    minMs > maxMs
  ) {
    throw new RangeError(
      `Invalid delay range: minMs (${minMs}) and maxMs (${maxMs}) must be finite numbers between ${MIN_DELAY_MS} and ${MAX_DELAY_MS} with minMs <= maxMs.`
    );
  }

  if (minMs === maxMs) {
    return minMs;
  }

  return minMs + Math.random() * (maxMs - minMs);
}

/**
 * Generates a uniform random delay in seconds between minSec and maxSec (default: 0 to 10 seconds).
 * Returns fractional seconds (e.g. 1.23, 0.23, 1.999, 6.7893).
 */
export function randomDelaySeconds(
  minSec = 0,
  maxSec = 10
): number {
  return randomDelayMs(minSec * 1000, maxSec * 1000) / 1000;
}

/**
 * Formats a millisecond delay into a human-readable seconds string (e.g., "2.99970s").
 */
export function formatDelaySeconds(delayMs: number, precision = 5): string {
  return `${(delayMs / 1000).toFixed(precision)}s`;
}

/**
 * Formats remaining countdown milliseconds into a seconds string (e.g., "2.154s").
 */
export function formatRemainingSeconds(remainingMs: number, precision = 3): string {
  return `${(remainingMs / 1000).toFixed(precision)}s`;
}

export interface RandomDelayOptions {
  /**
   * Minimum delay in milliseconds (default: 0).
   */
  minMs?: number;

  /**
   * Maximum delay in milliseconds (default: 10,000).
   */
  maxMs?: number;

  /**
   * Whether randomized delay scheduling is enabled.
   * If false (default), tasks run immediately with 0 ms artificial delay.
   */
  enabled?: boolean;

  /**
   * Optional AbortSignal to cancel scheduled work when the owner/session is disposed.
   */
  signal?: AbortSignal;

  /**
   * Optional identifier for logging and diagnostic tracing.
   */
  operationName?: string;
}

export interface ScheduledDelayTask {
  /**
   * Selected delay in milliseconds (0 when disabled or aborted).
   */
  readonly delayMs: number;

  /**
   * Whether the scheduled task has been cancelled.
   */
  readonly isCancelled: boolean;

  /**
   * Cancel the scheduled task and release underlying timers immediately.
   */
  cancel: () => void;

  /**
   * Promise resolving when task execution completes (or immediately on cancellation).
   */
  readonly promise: Promise<void>;
}

/**
 * Schedules a task with an optional randomized delay.
 * If options.enabled is false (default), the task runs immediately with 0 ms delay.
 * Avoids creating unnecessary timers when disabled or when delayMs is 0.
 * Automatically cleans up timers when cancelled or when the AbortSignal fires.
 */
export function scheduleRandomDelay(
  task: () => void | Promise<void>,
  options: RandomDelayOptions = {}
): ScheduledDelayTask {
  const {
    minMs = MIN_DELAY_MS,
    maxMs = MAX_DELAY_MS,
    enabled = false,
    signal,
    operationName = 'anonymous-task'
  } = options;

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let isCancelled = false;
  let abortHandler: (() => void) | null = null;

  const diagEntry: DelayDiagnosticRecord = {
    operation: operationName,
    minMs,
    maxMs,
    enabled,
    delayMs: 0,
    scheduledAt: Date.now(),
    executedAt: null,
    cancelled: false
  };

  const cancel = () => {
    if (isCancelled) return;
    isCancelled = true;
    diagEntry.cancelled = true;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (signal && abortHandler) {
      signal.removeEventListener('abort', abortHandler);
      abortHandler = null;
    }
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.debug(`[RandomDelay] Cancelled "${operationName}"`);
    }
  };

  if (signal?.aborted) {
    cancel();
    recordDiagnostic(diagEntry);
    return {
      delayMs: 0,
      isCancelled: true,
      cancel,
      promise: Promise.resolve()
    };
  }

  // When disabled, no artificial delay is introduced: execute task immediately
  if (!enabled) {
    diagEntry.delayMs = 0;
    diagEntry.executedAt = Date.now();
    recordDiagnostic(diagEntry);
    try {
      const res = task();
      return {
        delayMs: 0,
        isCancelled: false,
        cancel,
        promise: Promise.resolve(res)
      };
    } catch (err) {
      return {
        delayMs: 0,
        isCancelled: false,
        cancel,
        promise: Promise.reject(err)
      };
    }
  }

  const delayMs = randomDelayMs(minMs, maxMs);
  diagEntry.delayMs = delayMs;
  recordDiagnostic(diagEntry);

  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.debug(`[RandomDelay] Scheduled "${operationName}": ${delayMs.toFixed(2)}ms (min: ${minMs}, max: ${maxMs}, enabled: true)`);
  }

  // If randomized delay evaluated to 0 ms, execute immediately without creating a timer
  if (delayMs === 0) {
    diagEntry.executedAt = Date.now();
    try {
      const res = task();
      return {
        delayMs: 0,
        isCancelled: false,
        cancel,
        promise: Promise.resolve(res)
      };
    } catch (err) {
      return {
        delayMs: 0,
        isCancelled: false,
        cancel,
        promise: Promise.reject(err)
      };
    }
  }

  const promise = new Promise<void>((resolve, reject) => {
    if (signal) {
      abortHandler = () => {
        cancel();
        resolve();
      };
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    timerId = setTimeout(async () => {
      timerId = null;
      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler);
        abortHandler = null;
      }
      if (isCancelled) {
        resolve();
        return;
      }
      diagEntry.executedAt = Date.now();
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.debug(`[RandomDelay] Executed "${operationName}" after ${Date.now() - diagEntry.scheduledAt}ms`);
      }
      try {
        await task();
        resolve();
      } catch (err) {
        reject(err);
      }
    }, delayMs);
  });

  return {
    delayMs,
    get isCancelled() {
      return isCancelled;
    },
    cancel,
    promise
  };
}

/**
 * Asynchronously waits for a randomized delay. Useful in test fixtures or simulated latency workflows.
 * If options.enabled is false (default), resolves immediately with 0.
 */
export function waitForRandomDelay(options: RandomDelayOptions = {}): Promise<number> {
  const {
    minMs = MIN_DELAY_MS,
    maxMs = MAX_DELAY_MS,
    enabled = false,
    signal,
    operationName = 'async-wait'
  } = options;

  if (!enabled) {
    return Promise.resolve(0);
  }

  if (signal?.aborted) {
    return Promise.reject(new DOMException('Delay aborted', 'AbortError'));
  }

  const delayMs = randomDelayMs(minMs, maxMs);
  if (delayMs === 0) {
    return Promise.resolve(0);
  }

  return new Promise<number>((resolve, reject) => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    const scheduledAt = Date.now();

    const onAbort = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      reject(new DOMException('Delay aborted', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    timerId = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.debug(`[RandomDelay] Wait completed for "${operationName}" after ${Date.now() - scheduledAt}ms`);
      }
      resolve(delayMs);
    }, delayMs);
  });
}
