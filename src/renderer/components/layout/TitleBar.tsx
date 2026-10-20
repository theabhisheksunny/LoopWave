import React from 'react';
import { Minus, Square, X, ShieldAlert, Radio } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePlayerStore } from '../../stores/playerStore';

export const TitleBar: React.FC = () => {
  const { settings } = useSettingsStore();
  const { adapterState, countdownRemaining } = usePlayerStore();

  const handleMinimize = () => {
    window.loopwaveApi?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.loopwaveApi?.maximizeWindow();
  };

  const handleClose = () => {
    window.loopwaveApi?.closeWindow();
  };

  return (
    <header className="h-10 w-full bg-[#0B0E14] border-b border-white/5 flex items-center justify-between px-3 select-none drag-region z-50">
      {/* Brand & Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-sm">
          <Radio className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-wide text-white">LoopWave</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
            v1.0
          </span>
        </div>

        {settings.privateMode && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs ml-2 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-violet-400" />
            <span className="text-[11px] font-medium">Private Mode</span>
          </div>
        )}

        {countdownRemaining > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs ml-2 animate-bounce">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] font-mono">Loop in {countdownRemaining}s...</span>
          </div>
        )}
      </div>

      {/* Window Controls */}
      <div className="flex items-center no-drag">
        <button
          onClick={handleMinimize}
          className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Maximize"
          aria-label="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/80 rounded transition-colors"
          title="Close"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
