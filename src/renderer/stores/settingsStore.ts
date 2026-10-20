import { create } from 'zustand';
import { AppSettings, StoragePolicyStatus } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/defaults';
import { usePlayerStore } from './playerStore';

interface SettingsState {
  settings: AppSettings;
  storagePolicy: StoragePolicyStatus | null;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  refreshStoragePolicy: () => Promise<void>;
  clearAnalytics: () => Promise<void>;
  clearLibrary: () => Promise<void>;
  purgeAllData: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  storagePolicy: null,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        const [settings, policy] = await Promise.all([
          window.loopwaveApi.getSettings(),
          window.loopwaveApi.getStoragePolicy()
        ]);
        set({ settings, storagePolicy: policy, isLoading: false });

        // Synchronize idle player defaults
        const player = usePlayerStore.getState();
        if (!player.currentSource) {
          if (settings.defaultLoopMode) player.setLoopMode(settings.defaultLoopMode);
          if (settings.defaultDelaySeconds !== undefined) player.setInterLoopDelay(settings.defaultDelaySeconds);
          if (settings.defaultVolume !== undefined) player.setVolume(settings.defaultVolume);
        }
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      set({ isLoading: false });
    }
  },

  updateSettings: async (partial: Partial<AppSettings>) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    set({ settings: updated });

    // Sync to player defaults if player is currently idle (does not disturb active playback)
    const player = usePlayerStore.getState();
    if (!player.currentSource) {
      if (partial.defaultLoopMode) player.setLoopMode(partial.defaultLoopMode);
      if (partial.defaultDelaySeconds !== undefined) player.setInterLoopDelay(partial.defaultDelaySeconds);
      if (partial.defaultVolume !== undefined) player.setVolume(partial.defaultVolume);
    }

    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        await window.loopwaveApi.saveSettings(partial);
        const policy = await window.loopwaveApi.getStoragePolicy();
        set({ storagePolicy: policy });
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  },

  refreshStoragePolicy: async () => {
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        const policy = await window.loopwaveApi.getStoragePolicy();
        set({ storagePolicy: policy });
      }
    } catch (err) {
      console.error('Failed to refresh storage policy:', err);
    }
  },

  clearAnalytics: async () => {
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        await window.loopwaveApi.clearAnalytics();
        await get().refreshStoragePolicy();
      }
    } catch (err) {
      console.error('Failed to clear analytics:', err);
      throw err;
    }
  },

  clearLibrary: async () => {
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        await window.loopwaveApi.clearLibrary();
        await get().refreshStoragePolicy();
      }
    } catch (err) {
      console.error('Failed to clear library:', err);
      throw err;
    }
  },

  purgeAllData: async () => {
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        await Promise.all([
          window.loopwaveApi.clearLibrary(),
          window.loopwaveApi.clearAnalytics()
        ]);
        await get().refreshStoragePolicy();
      }
    } catch (err) {
      console.error('Failed to purge data:', err);
      throw err;
    }
  }
}));
