import React, { useState } from 'react';
import {
  Settings,
  Shield,
  HardDrive,
  Database,
  Trash2,
  Keyboard,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { LoopMode } from '../../shared/types';

export const SettingsScreen: React.FC = () => {
  const { settings, storagePolicy, updateSettings, purgeAllData, refreshStoragePolicy } =
    useSettingsStore();

  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleTogglePrivateMode = async () => {
    const nextVal = !settings.privateMode;
    await updateSettings({ privateMode: nextVal });
    showToast(nextVal ? 'Private Mode enabled (RAM only)' : 'Private Mode disabled');
  };

  const handleTogglePersistAnalytics = async () => {
    const nextVal = !settings.persistAnalytics;
    await updateSettings({ persistAnalytics: nextVal });
    showToast(nextVal ? 'Analytics persistence enabled' : 'Analytics persistence disabled');
  };

  const handleRetentionChange = async (days: number) => {
    await updateSettings({ analyticsRetentionDays: days });
    showToast(`Retention set to ${days === 0 ? 'Forever' : `${days} days`}`);
  };

  const handlePurgeAll = async () => {
    await purgeAllData();
    setIsPurgeModalOpen(false);
    showToast('All local library and analytics data purged.');
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          Settings & Privacy Policy
        </h2>
        <p className="text-xs text-slate-400">
          Control local data storage, privacy mode, playback defaults, and view keyboard shortcuts.
        </p>
      </div>

      {successToast && (
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-cyan-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. Privacy & Storage Mode */}
      <div className="bg-[#121721] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Shield className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Privacy & Storage Policy</h3>
        </div>

        <div className="space-y-4 text-xs">
          {/* Private Mode Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-200">Private Mode (RAM-Only)</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                When active, no playback history or library entries are committed to disk. All transient session data disappears upon closing LoopWave.
              </p>
            </div>
            <button
              onClick={handleTogglePrivateMode}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings.privateMode ? 'bg-violet-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.privateMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Persist Analytics */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
            <div>
              <p className="font-semibold text-slate-200">Persist Analytics</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Save anonymous loop cycle counts and durations to your local SQLite database.
              </p>
            </div>
            <button
              onClick={handleTogglePersistAnalytics}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings.persistAnalytics ? 'bg-cyan-500' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.persistAnalytics ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Retention Period */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
            <div>
              <p className="font-semibold text-slate-200">Analytics Retention</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Automatically purge analytics events older than the specified duration.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {[7, 30, 90, 0].map((d) => (
                <button
                  key={d}
                  onClick={() => handleRetentionChange(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors ${
                    settings.analyticsRetentionDays === d
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {d === 0 ? 'Forever' : `${d}d`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Storage Health & Path Diagnostic */}
      <div className="bg-[#121721] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Local Storage Status</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#181F2E]/60 border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Storage Engine</span>
            <p className="font-semibold text-white">
              {storagePolicy?.activeSessionStorageType || 'SQLite-File'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#181F2E]/60 border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono">SQLite DB Size</span>
            <p className="font-semibold text-white">
              {storagePolicy?.approximateDbSizeBytes
                ? `${Math.round(storagePolicy.approximateDbSizeBytes / 1024)} KB`
                : '0 KB'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#181F2E]/60 border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Telemetry</span>
            <p className="font-semibold text-emerald-400">Zero (Disabled)</p>
          </div>
        </div>

        {storagePolicy?.databasePath && (
          <p className="text-[11px] font-mono text-slate-500 truncate" title={storagePolicy.databasePath}>
            Location: {storagePolicy.databasePath}
          </p>
        )}
      </div>

      {/* 3. Playback Defaults */}
      <div className="bg-[#121721] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Default Playback Behavior</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Default Loop Mode</label>
            <select
              value={settings.defaultLoopMode}
              onChange={(e) =>
                updateSettings({ defaultLoopMode: e.target.value as LoopMode })
              }
              className="w-full bg-[#181F2E] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none"
            >
              <option value="off">Off (Play once)</option>
              <option value="one">Repeat 1 (Infinite single-video loop)</option>
              <option value="all">Repeat All (Playlist loop)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Default Inter-Loop Delay</label>
            <input
              type="number"
              min={0}
              max={300}
              value={settings.defaultDelaySeconds}
              onChange={(e) =>
                updateSettings({ defaultDelaySeconds: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full bg-[#181F2E] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Keyboard Shortcuts Reference */}
      <div className="bg-[#121721] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Keyboard className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#181F2E]/40 border border-white/5">
            <span className="text-slate-400">Play / Pause</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-white">Space</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#181F2E]/40 border border-white/5">
            <span className="text-slate-400">Seek &plusmn;5s</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-white">&larr; / &rarr;</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#181F2E]/40 border border-white/5">
            <span className="text-slate-400">Volume &plusmn;5%</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-white">&uarr; / &darr;</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#181F2E]/40 border border-white/5">
            <span className="text-slate-400">Mute / Unmute</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-white">M</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#181F2E]/40 border border-white/5">
            <span className="text-slate-400">Fullscreen</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-white">F</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#181F2E]/40 border border-white/5">
            <span className="text-slate-400">Cycle Loop</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-white">L</kbd>
          </div>
        </div>
      </div>

      {/* 5. Danger Zone: Purge All Data */}
      <div className="bg-[#121721] border border-red-500/20 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-red-300">Purge All Local Data</p>
          <p className="text-xs text-slate-400">
            Permanently wipe all saved library bookmarks, playlists, and analytics history.
          </p>
        </div>
        <button
          onClick={() => setIsPurgeModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Purge All</span>
        </button>
      </div>

      {/* Purge Modal */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#181F2E] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-semibold text-white">Are you sure?</h3>
            </div>
            <p className="text-xs text-slate-300">
              This action cannot be undone. All saved links and analytics metrics will be cleared from disk.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsPurgeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handlePurgeAll}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-400 text-white"
              >
                Confirm Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
