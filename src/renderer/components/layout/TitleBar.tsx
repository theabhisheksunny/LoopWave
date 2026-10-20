import React from 'react';
import {
  Minus,
  Square,
  X,
  ShieldAlert,
  Radio,
  Lock
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNavigationStore } from '../../stores/navigationStore';

export const TitleBar: React.FC = () => {
  const { settings } = useSettingsStore();
  const { currentRoute, setRoute } = useNavigationStore();

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
    <header className="h-9 w-full bg-[#101827] border-b border-[#293750] flex items-center justify-between px-3 select-none drag-region z-50">
      {/* Brand & Mode info */}
      <div className="flex items-center gap-3">
        <div
          onClick={() => setRoute('home')}
          className="flex items-center gap-2 cursor-pointer no-drag hover:opacity-80 transition-opacity"
        >
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#6547FF] to-[#18D8E8] flex items-center justify-center shadow-sm">
            <Radio className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold text-xs tracking-wider text-[#F5F7FF]">LOOPWAVE</span>
        </div>

        {settings.privateMode && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#18243A] border border-[#6547FF]/40 text-[#18D8E8] text-[11px] no-drag">
            <Lock className="w-2.5 h-2.5 text-[#18D8E8]" />
            <span className="font-medium">Private (RAM-Only)</span>
          </div>
        )}
      </div>

      {/* Center status or title text */}
      <div className="text-[11px] font-medium text-[#A5B4CF] hidden sm:block pointer-events-none">
        Privacy-Focused Desktop Looper
      </div>

      {/* Window Controls */}
      <div className="flex items-center no-drag">
        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center text-[#A5B4CF] hover:text-white hover:bg-[#18243A] rounded transition-colors"
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-7 flex items-center justify-center text-[#A5B4CF] hover:text-white hover:bg-[#18243A] rounded transition-colors"
          title="Maximize"
          aria-label="Maximize"
        >
          <Square className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center text-[#A5B4CF] hover:text-white hover:bg-[#FF667D] rounded transition-colors"
          title="Close"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
