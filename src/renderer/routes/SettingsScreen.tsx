import React, { useState } from 'react';
import {
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Database,
  Trash2,
  Keyboard,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Volume2,
  Play,
  Copy,
  Info,
  Radio,
  Layers
} from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { LoopMode } from '../../shared/types';
import { AdapterRegistry } from '../adapters/adapterRegistry';

type DestructiveActionType = 'analytics' | 'library' | 'all';

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    storagePolicy,
    updateSettings,
    clearAnalytics,
    clearLibrary,
    purgeAllData
  } = useSettingsStore();

  const [activeModal, setActiveModal] = useState<DestructiveActionType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  const adapters = AdapterRegistry.getInstance().getAvailableAdapters();
  const appInfo = window.loopwaveApi?.appInfo || {
    version: '1.0.0',
    platform: 'win32',
    arch: 'x64'
  };

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(null), 3500);
    } else {
      setSuccessToast(msg);
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const handleTogglePrivateMode = async () => {
    const nextVal = !settings.privateMode;
    try {
      await updateSettings({ privateMode: nextVal });
      showToast(
        nextVal
          ? 'Private Mode enabled — transient RAM only, no disk writes.'
          : 'Private Mode disabled — standard SQLite disk persistence active.'
      );
    } catch {
      showToast('Failed to update Private Mode setting', true);
    }
  };

  const handleTogglePersistAnalytics = async () => {
    const nextVal = !settings.persistAnalytics;
    try {
      await updateSettings({ persistAnalytics: nextVal });
      showToast(
        nextVal
          ? 'Analytics persistence enabled (saved to local SQLite)'
          : 'Analytics persistence disabled (no metrics logged)'
      );
    } catch {
      showToast('Failed to update Analytics setting', true);
    }
  };

  const handleRetentionChange = async (days: number) => {
    try {
      await updateSettings({ analyticsRetentionDays: days });
      showToast(
        days === 0
          ? 'Retention policy set to Keep Forever'
          : `Retention policy set to ${days} days`
      );
    } catch {
      showToast('Failed to update retention policy', true);
    }
  };

  const handleLoopModeChange = async (mode: LoopMode) => {
    try {
      await updateSettings({ defaultLoopMode: mode });
      showToast(`Default loop mode set to: ${mode === 'off' ? 'Off' : mode === 'one' ? 'Repeat 1' : 'Repeat All'}`);
    } catch {
      showToast('Failed to update default loop mode', true);
    }
  };

  const handleDelayChange = async (val: number) => {
    const clamped = Math.max(0, Math.min(300, isNaN(val) ? 0 : val));
    try {
      await updateSettings({ defaultDelaySeconds: clamped });
      showToast(`Default inter-loop delay set to ${clamped}s`);
    } catch {
      showToast('Failed to update delay setting', true);
    }
  };

  const handleVolumeChange = async (val: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(val) ? 80 : val));
    try {
      await updateSettings({ defaultVolume: clamped });
    } catch {
      showToast('Failed to update default volume', true);
    }
  };

  const handleToggleAutoPlay = async () => {
    const nextVal = !settings.autoPlay;
    try {
      await updateSettings({ autoPlay: nextVal });
      showToast(nextVal ? 'Auto-play enabled' : 'Auto-play disabled');
    } catch {
      showToast('Failed to update auto-play setting', true);
    }
  };

  const handleCopyPath = () => {
    const rawPath = storagePolicy?.databasePath || '';
    if (rawPath && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(rawPath);
      setCopiedPath(true);
      showToast('Database path copied to clipboard');
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  const maskSensitivePath = (fullPath: string | null | undefined): string => {
    if (!fullPath || settings.privateMode) return 'In-Memory (Volatile RAM)';
    return fullPath.replace(/([\\/]Users[\\/])([^\\/]+)([\\/])/i, '$1***$3');
  };

  const handleExecuteDestructiveAction = async () => {
    if (!activeModal) return;
    setIsProcessing(true);
    try {
      if (activeModal === 'analytics') {
        await clearAnalytics();
        showToast('Playback analytics history cleared. Library bookmarks preserved.');
      } else if (activeModal === 'library') {
        await clearLibrary();
        showToast('Media library and collections cleared. Analytics history preserved.');
      } else if (activeModal === 'all') {
        await purgeAllData();
        showToast('All local library bookmarks and analytics history purged.');
      }
      setActiveModal(null);
    } catch (err) {
      showToast('Error executing storage purge action', true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-6 space-y-6 max-w-5xl mx-auto select-none">
      {/* 1. Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#293750]/50">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-violet-600/30 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-950/40">
            <Settings className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F7FF] flex items-center gap-2">
              Settings &amp; Privacy
            </h1>
            <p className="text-xs text-[#A5B4CF] mt-0.5">
              Manage playback, local storage, and privacy preferences.
            </p>
          </div>
        </div>

        {/* Modal close clearance buffer */}
        <div className="w-10 h-10 shrink-0 hidden sm:block" aria-hidden="true" />
      </header>

      {/* Notifications Toast */}
      {successToast && (
        <div
          role="status"
          className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-medium flex items-center gap-2 animate-fadeIn shadow-lg shadow-cyan-950/50"
        >
          <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-medium flex items-center gap-2 animate-fadeIn shadow-lg shadow-red-950/50"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* SECTION A: Privacy and Storage */}
      <section className="bg-[#111B2B] border border-[#293750] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#293750]/60 pb-3">
          <Shield className="w-4 h-4 text-violet-400 shrink-0" />
          <h2 className="text-sm font-semibold text-[#F5F7FF] tracking-wide uppercase font-mono">
            Privacy &amp; Local Storage Policy
          </h2>
        </div>

        <div className="space-y-4 text-xs">
          {/* Private Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-[#18243A]/40 border border-[#293750]/50 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F5F7FF] text-sm">Private Mode (RAM-Only)</span>
                {settings.privateMode ? (
                  <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/40 text-[10px] font-mono text-violet-300">
                    RAM-Only Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-[#293750] text-[10px] font-mono text-[#A5B4CF]">
                    Standard Disk Storage
                  </span>
                )}
              </div>
              <p className="text-[#A5B4CF] text-[11px] leading-relaxed max-w-2xl">
                When active, no playback history or library entries are committed to disk. All transient session data disappears upon closing LoopWave.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.privateMode}
              aria-label="Toggle Private Mode"
              onClick={handleTogglePrivateMode}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-violet-400 shrink-0 ${
                settings.privateMode ? 'bg-violet-600' : 'bg-slate-700/80 hover:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 shadow-md transition-transform ${
                  settings.privateMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Private Mode Callout Banner */}
          {settings.privateMode && (
            <div className="p-3.5 rounded-xl bg-violet-950/40 border border-violet-500/30 flex items-start gap-2.5 text-[11px] text-violet-200">
              <ShieldAlert className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>RAM-Only Session Active:</strong> Disk synchronization is bypassed. Any bookmarks saved or loop cycles counted during this session will not be written to <code className="text-violet-300 font-mono">loopwave.db</code> and will vanish upon exiting the application.
              </p>
            </div>
          )}

          {/* Persist Analytics Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-[#18243A]/40 border border-[#293750]/50 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F5F7FF] text-sm">Persist Playback Analytics</span>
                {settings.persistAnalytics ? (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-mono text-cyan-300">
                    Recording Enabled
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-[#293750] text-[10px] font-mono text-slate-400">
                    Recording Disabled
                  </span>
                )}
              </div>
              <p className="text-[#A5B4CF] text-[11px] leading-relaxed max-w-2xl">
                Save anonymous loop cycle counts, watch durations, and lifecycle events to your local SQLite database for personal insights.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.persistAnalytics}
              aria-label="Toggle Persist Analytics"
              onClick={handleTogglePersistAnalytics}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-cyan-400 shrink-0 ${
                settings.persistAnalytics ? 'bg-cyan-500' : 'bg-slate-700/80 hover:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 shadow-md transition-transform ${
                  settings.persistAnalytics ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Retention Period Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-[#18243A]/40 border border-[#293750]/50">
            <div className="space-y-1">
              <span className="font-semibold text-[#F5F7FF] text-sm">Analytics Retention Period</span>
              <p className="text-[#A5B4CF] text-[11px] leading-relaxed max-w-xl">
                Automatically purge analytics records older than the selected retention window on startup.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label="Analytics Retention Options">
              {[
                { days: 7, label: '7 Days' },
                { days: 30, label: '30 Days' },
                { days: 90, label: '90 Days' },
                { days: 0, label: 'Keep Forever' }
              ].map(({ days, label }) => {
                const isSelected = settings.analyticsRetentionDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleRetentionChange(days)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950/40'
                        : 'bg-[#101827] border-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] hover:border-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Telemetry Status */}
          <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#18243A]/30 border border-[#293750]/40">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-[#F5F7FF]">Network Telemetry &amp; External Reporting</span>
                <p className="text-[#A5B4CF] text-[11px] mt-0.5">
                  LoopWave strictly operates without diagnostic beacons, crash telemetry, or third-party phone-home requests.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] shrink-0">
              Zero (Disabled)
            </span>
          </div>
        </div>
      </section>

      {/* SECTION B: Playback Defaults */}
      <section className="bg-[#111B2B] border border-[#293750] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#293750]/60 pb-3">
          <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
          <h2 className="text-sm font-semibold text-[#F5F7FF] tracking-wide uppercase font-mono">
            Default Playback Behavior
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Default Loop Mode */}
          <div className="p-4 rounded-xl bg-[#18243A]/40 border border-[#293750]/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="default-loop-mode" className="font-semibold text-[#F5F7FF] text-sm">
                Default Loop Mode
              </label>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                {settings.defaultLoopMode === 'off'
                  ? 'Off'
                  : settings.defaultLoopMode === 'one'
                  ? 'Repeat 1'
                  : 'Repeat All'}
              </span>
            </div>
            <p className="text-[#A5B4CF] text-[11px] leading-relaxed">
              Applied automatically when resolving new URLs or initializing a fresh queue.
            </p>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { mode: 'off' as LoopMode, label: 'Off', desc: 'Play once' },
                { mode: 'one' as LoopMode, label: 'Repeat 1', desc: 'Loop current' },
                { mode: 'all' as LoopMode, label: 'Repeat All', desc: 'Loop queue' }
              ].map(({ mode, label, desc }) => {
                const isSelected = settings.defaultLoopMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleLoopModeChange(mode)}
                    className={`p-2 rounded-xl text-center border transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                        : 'bg-[#101827] border-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] hover:border-slate-500'
                    }`}
                  >
                    <div className="font-semibold text-xs">{label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Inter-Loop Delay */}
          <div className="p-4 rounded-xl bg-[#18243A]/40 border border-[#293750]/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="default-delay-input" className="font-semibold text-[#F5F7FF] text-sm">
                Default Inter-Loop Delay
              </label>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                {settings.defaultDelaySeconds}s delay
              </span>
            </div>
            <p className="text-[#A5B4CF] text-[11px] leading-relaxed">
              Countdown interval elapsed between playback cycles during continuous repeat.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  id="default-delay-input"
                  type="number"
                  min={0}
                  max={300}
                  value={settings.defaultDelaySeconds}
                  onChange={(e) => handleDelayChange(parseInt(e.target.value, 10))}
                  className="w-full bg-[#101827] border border-[#293750] rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-400 focus:outline-none"
                  aria-label="Default delay in seconds"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">sec</span>
              </div>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 5, 10].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleDelayChange(s)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-mono border transition-colors ${
                      settings.defaultDelaySeconds === s
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-[#101827] border-[#293750] text-[#A5B4CF] hover:text-white'
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Default Volume */}
          <div className="p-4 rounded-xl bg-[#18243A]/40 border border-[#293750]/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="default-volume-slider" className="font-semibold text-[#F5F7FF] text-sm flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                Default Startup Volume
              </label>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                {settings.defaultVolume}%
              </span>
            </div>
            <p className="text-[#A5B4CF] text-[11px] leading-relaxed">
              Initial audio level assigned to newly loaded media sessions.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <input
                id="default-volume-slider"
                type="range"
                min={0}
                max={100}
                value={settings.defaultVolume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                aria-label="Default volume percentage"
              />
              <div className="flex items-center gap-1 shrink-0">
                {[25, 50, 80, 100].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleVolumeChange(v)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                      settings.defaultVolume === v
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-[#101827] border-[#293750] text-[#A5B4CF] hover:text-white'
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Auto-Play Toggle */}
          <div className="p-4 rounded-xl bg-[#18243A]/40 border border-[#293750]/50 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F5F7FF] text-sm flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  Auto-Play on Load
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                  {settings.autoPlay ? 'On' : 'Off'}
                </span>
              </div>
              <p className="text-[#A5B4CF] text-[11px] leading-relaxed">
                Immediately start playback upon loading a new URL or choosing a queue track.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoPlay}
              aria-label="Toggle Auto-Play"
              onClick={handleToggleAutoPlay}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-cyan-400 shrink-0 ${
                settings.autoPlay ? 'bg-cyan-500' : 'bg-slate-700/80 hover:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 shadow-md transition-transform ${
                  settings.autoPlay ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION C: Keyboard Shortcuts */}
      <section className="bg-[#111B2B] border border-[#293750] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#293750]/60 pb-3">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-4 h-4 text-cyan-400 shrink-0" />
            <h2 className="text-sm font-semibold text-[#F5F7FF] tracking-wide uppercase font-mono">
              Keyboard Shortcuts Reference
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Suppressed while typing in text inputs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
          {[
            {
              action: 'Play / Pause',
              keys: ['Space'],
              desc: 'Toggle playback of active media'
            },
            {
              action: 'Seek \u00B15s',
              keys: ['\u2190', '\u2192'],
              desc: 'Jump backward or forward 5 seconds'
            },
            {
              action: 'Volume \u00B15%',
              keys: ['\u2191', '\u2193'],
              desc: 'Increase or decrease volume level'
            },
            {
              action: 'Mute / Unmute',
              keys: ['M'],
              desc: 'Toggle audio output mute state'
            },
            {
              action: 'Fullscreen',
              keys: ['F'],
              desc: 'Toggle player fullscreen mode'
            },
            {
              action: 'Cycle Loop Mode',
              keys: ['L'],
              desc: 'Cycle: Off \u2192 Repeat 1 \u2192 Repeat All'
            },
            {
              action: 'Dismiss Overlay',
              keys: ['Esc'],
              desc: 'Close active modal and return to player'
            }
          ].map((sc) => (
            <div
              key={sc.action}
              className="p-3 rounded-xl bg-[#18243A]/40 border border-[#293750]/50 flex items-center justify-between gap-3"
            >
              <div className="space-y-0.5">
                <span className="font-semibold text-[#F5F7FF] block text-xs">{sc.action}</span>
                <span className="text-[10px] text-[#A5B4CF] block leading-tight">{sc.desc}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {sc.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-1 rounded-md bg-[#101827] border border-[#293750] text-[#F5F7FF] font-mono text-[11px] shadow-sm font-bold"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION D: Storage Management */}
      <section className="bg-[#111B2B] border border-[#293750] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#293750]/60 pb-3">
          <Database className="w-4 h-4 text-cyan-400 shrink-0" />
          <h2 className="text-sm font-semibold text-[#F5F7FF] tracking-wide uppercase font-mono">
            Local Storage Diagnostics &amp; Management
          </h2>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          <div className="p-4 rounded-xl bg-[#18243A]/50 border border-[#293750]/50 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              Storage Engine
            </span>
            <p className="font-bold text-white text-sm">
              {settings.privateMode
                ? 'Volatile RAM'
                : storagePolicy?.activeSessionStorageType || 'SQLite-File'}
            </p>
            <span className="text-[10px] text-cyan-300 block">
              {settings.privateMode ? 'Zero disk writes' : 'sql.js (WebAssembly)'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#18243A]/50 border border-[#293750]/50 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              Database File Size
            </span>
            <p className="font-bold text-white text-sm">
              {settings.privateMode
                ? '0 KB (In RAM)'
                : storagePolicy?.approximateDbSizeBytes
                ? `${Math.round(storagePolicy.approximateDbSizeBytes / 1024)} KB`
                : '0 KB'}
            </p>
            <span className="text-[10px] text-slate-400 block">
              {settings.privateMode ? 'Cleared on app exit' : 'Embedded SQLite single-file'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#18243A]/50 border border-[#293750]/50 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              Analytics Storage Status
            </span>
            <p className="font-bold text-emerald-400 text-sm">
              {settings.persistAnalytics ? 'Persisting Locally' : 'Logging Disabled'}
            </p>
            <span className="text-[10px] text-slate-400 block">
              Retention: {settings.analyticsRetentionDays === 0 ? 'Forever' : `${settings.analyticsRetentionDays} days`}
            </span>
          </div>
        </div>

        {/* Privacy-Conscious Path Location */}
        <div className="p-3.5 rounded-xl bg-[#18243A]/30 border border-[#293750]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Database Path (Privacy Masked)
            </span>
            <p className="text-[11px] font-mono text-cyan-200 truncate" title="Location of loopwave.db">
              {maskSensitivePath(storagePolicy?.databasePath)}
            </p>
          </div>
          {storagePolicy?.databasePath && !settings.privateMode && (
            <button
              type="button"
              onClick={handleCopyPath}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101827] border border-[#293750] text-[#A5B4CF] hover:text-white text-xs font-medium transition-colors shrink-0"
              title="Copy path to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedPath ? 'Copied' : 'Copy Path'}</span>
            </button>
          )}
        </div>

        {/* Danger Zone: Granular Destructive Actions */}
        <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <Trash2 className="w-4 h-4 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
              Danger Zone &bull; Storage Deletion
            </h3>
          </div>
          <p className="text-xs text-[#A5B4CF] leading-relaxed">
            Destructive actions cannot be undone. Select specific datasets to erase or wipe all local application state.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* 1. Clear Analytics */}
            <div className="p-3.5 rounded-xl bg-[#101827]/80 border border-red-500/20 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <span className="font-semibold text-white text-xs block">Clear Analytics</span>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Wipes session durations, loop counts, and event streams. Preserves saved Library items.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('analytics')}
                className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Analytics</span>
              </button>
            </div>

            {/* 2. Clear Library */}
            <div className="p-3.5 rounded-xl bg-[#101827]/80 border border-red-500/20 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <span className="font-semibold text-white text-xs block">Clear Library</span>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Wipes bookmarks and custom collections. Preserves playback analytics history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('library')}
                className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Library</span>
              </button>
            </div>

            {/* 3. Purge All */}
            <div className="p-3.5 rounded-xl bg-[#101827]/80 border border-red-500/30 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <span className="font-semibold text-red-300 text-xs block">Purge All Data</span>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Permanently wipe both library items and all playback analytics from disk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('all')}
                className="w-full py-2 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/50 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge All</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION E: About & Transparency */}
      <section className="bg-[#111B2B] border border-[#293750] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#293750]/60 pb-3">
          <Info className="w-4 h-4 text-violet-400 shrink-0" />
          <h2 className="text-sm font-semibold text-[#F5F7FF] tracking-wide uppercase font-mono">
            About LoopWave &amp; System Transparency
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#18243A]/40 border border-[#293750]/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shrink-0">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">LoopWave</h3>
                <span className="px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  v{appInfo.version}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#101827] border border-[#293750] text-[10px] font-mono text-slate-400">
                  {appInfo.platform} ({appInfo.arch})
                </span>
              </div>
              <p className="text-xs text-[#A5B4CF] mt-0.5">
                Privacy-focused continuous media player with local-only SQLite analytics.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#101827] border border-[#293750] text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Zero Telemetry
            </span>
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#101827] border border-[#293750] text-cyan-300">
              Offline SQLite
            </span>
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#101827] border border-[#293750] text-violet-300">
              Strict CSP
            </span>
          </div>
        </div>

        {/* Playback Engines Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          {adapters.map((a) => (
            <div
              key={a.id}
              className="p-3.5 rounded-xl bg-[#18243A]/30 border border-[#293750]/40 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  {a.name}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  {a.id}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {a.id === 'youtube'
                  ? 'Official YouTube IFrame Player with sandboxed postMessage origin isolation.'
                  : 'HTML5 Video/Audio pipeline with Hls.js hardware-accelerated streaming.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Confirmation Modal for Destructive Actions */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div className="bg-[#101827] border border-[#293750] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {activeModal === 'analytics'
                    ? 'Clear Playback Analytics?'
                    : activeModal === 'library'
                    ? 'Clear Media Library?'
                    : 'Purge All Local Data?'}
                </h3>
                <span className="text-[11px] text-red-300 font-mono">
                  This action cannot be undone.
                </span>
              </div>
            </div>

            <div className="text-xs text-[#A5B4CF] space-y-2 leading-relaxed bg-[#18243A]/50 p-3.5 rounded-xl border border-[#293750]/50">
              {activeModal === 'analytics' && (
                <>
                  <p className="font-medium text-white">The following records will be permanently erased:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
                    <li>All playback sessions, completed cycles, and watch times.</li>
                    <li>Lifecycle events, buffering logs, and error records.</li>
                  </ul>
                  <p className="text-emerald-300 text-[11px] pt-1">
                    &bull; Your saved Media Library bookmarks and collections will be preserved.
                  </p>
                </>
              )}

              {activeModal === 'library' && (
                <>
                  <p className="font-medium text-white">The following records will be permanently erased:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
                    <li>All saved video and audio bookmarks in your library.</li>
                    <li>All custom user collections.</li>
                  </ul>
                  <p className="text-cyan-300 text-[11px] pt-1">
                    &bull; Your playback analytics and cycle metrics will be preserved.
                  </p>
                </>
              )}

              {activeModal === 'all' && (
                <>
                  <p className="font-medium text-red-300">Complete application data wipe:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
                    <li>All saved bookmarks, favorites, and custom collections.</li>
                    <li>All recorded playback sessions, loop counts, and event streams.</li>
                  </ul>
                  <p className="text-slate-400 text-[11px] pt-1">
                    Application preferences (e.g. theme, default volume) will remain intact.
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#A5B4CF] hover:text-white bg-[#18243A] hover:bg-[#293750] border border-[#293750] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteDestructiveAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 transition-colors flex items-center gap-1.5"
              >
                {isProcessing && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>
                  {activeModal === 'analytics'
                    ? 'Confirm Clear Analytics'
                    : activeModal === 'library'
                    ? 'Confirm Clear Library'
                    : 'Confirm Purge All'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
