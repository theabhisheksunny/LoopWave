import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfill window.crypto.randomUUID for test environment if needed
if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = {};
}
if (!globalThis.crypto.randomUUID) {
  let counter = 0;
  globalThis.crypto.randomUUID = () => {
    counter++;
    return `test-uuid-${counter}-${Math.random().toString(36).substring(2, 9)}`;
  };
}

// Mock window.loopwaveApi
Object.defineProperty(window, 'loopwaveApi', {
  value: {
    getSettings: vi.fn().mockResolvedValue({
      privateMode: false,
      persistAnalytics: true,
      analyticsRetentionDays: 30,
      defaultLoopMode: 'off',
      defaultDelaySeconds: 2,
      defaultVolume: 80,
      autoPlay: true
    }),
    saveSettings: vi.fn().mockResolvedValue({ success: true }),
    getLibrary: vi.fn().mockResolvedValue([]),
    saveLibraryItem: vi.fn().mockResolvedValue({ success: true }),
    removeLibraryItem: vi.fn().mockResolvedValue({ success: true }),
    clearLibrary: vi.fn().mockResolvedValue({ success: true }),
    getAnalyticsSummary: vi.fn().mockResolvedValue({
      totalSessions: 0,
      completedCycles: 0,
      totalWatchSeconds: 0,
      avgSessionDurationSeconds: 0,
      failedSessions: 0,
      interruptedSessions: 0,
      bufferingCount: 0
    }),
    getAnalyticsEvents: vi.fn().mockResolvedValue([]),
    recordAnalyticsSession: vi.fn().mockResolvedValue({ success: true }),
    recordAnalyticsEvent: vi.fn().mockResolvedValue({ success: true }),
    clearAnalytics: vi.fn().mockResolvedValue({ success: true }),
    exportData: vi.fn().mockResolvedValue({ success: true }),
    importData: vi.fn().mockResolvedValue({ success: true }),
    inspectUrl: vi.fn().mockResolvedValue({ valid: true, mimeType: 'video/mp4' }),
    openExternal: vi.fn().mockResolvedValue({ success: true }),
    appInfo: {
      version: '1.0.0',
      platform: 'win32',
      arch: 'x64'
    }
  },
  writable: true
});
