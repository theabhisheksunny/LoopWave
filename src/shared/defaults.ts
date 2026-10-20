import { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  privateMode: false,
  persistAnalytics: true,
  analyticsRetentionDays: 30,
  defaultLoopMode: 'off',
  defaultDelaySeconds: 2,
  defaultVolume: 80,
  autoPlay: true,
  hardwareAcceleration: true
};

/**
 * Formats seconds into standard digital clock time "mm:ss" or "hh:mm:ss".
 */
export function formatTime(seconds?: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds <= 0) return '00:00';
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Formats seconds into human-readable duration "1h 2m 3s" or "0s".
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds <= 0) return '0s';
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  return parts.join(' ');
}
