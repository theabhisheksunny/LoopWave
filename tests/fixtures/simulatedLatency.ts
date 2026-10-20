import {
  randomDelayMs,
  waitForRandomDelay,
  RandomDelayOptions
} from '../../src/shared/randomDelay';

/**
 * Test fixture helper to simulate network or I/O latency with configurable jitter.
 */
export async function simulateNetworkLatency(
  minMs = 0,
  maxMs = 10_000,
  options: Omit<RandomDelayOptions, 'minMs' | 'maxMs'> = { enabled: true }
): Promise<number> {
  return waitForRandomDelay({
    minMs,
    maxMs,
    ...options
  });
}

export { randomDelayMs };
