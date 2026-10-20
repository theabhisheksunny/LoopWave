import { create } from 'zustand';
import { AppSettings, StoragePolicyStatus } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/defaults';

interface SettingsState {
  settings: AppSettings;
  storagePolicy: StoragePolicyStatus | null;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  refreshStoragePolicy: () => Promise<void>;
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
    }
  }
}));
