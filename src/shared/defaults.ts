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
