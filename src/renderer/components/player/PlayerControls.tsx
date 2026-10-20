import React from 'react';
import { usePlayerStore } from '../../stores/playerStore';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '00:00';
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

export const PlayerControls: React.FC = () => {
  const { adapterState, capabilities, seek } = usePlayerStore();

  const duration = adapterState.duration || 0;
  const currentTime = adapterState.currentTime || 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek(val);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-[#111B2B] rounded-xl border border-[#293750] px-3.5 py-2 select-none space-y-1 shadow-md">
      {/* Timeline Scrubber */}
      <div className="relative flex items-center group cursor-pointer">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeekChange}
          disabled={!capabilities.supportsSeeking || duration === 0}
          className="w-full h-1.5 rounded-full bg-[#18243A] appearance-none cursor-pointer focus:outline-none accent-[#18D8E8] group-hover:h-2 transition-all"
          aria-label="Seek timeline"
        />
      </div>

      {/* Timestamp labels */}
      <div className="flex justify-between items-center text-[11px] font-mono text-[#A5B4CF] px-0.5">
        <span className="text-[#F5F7FF]">{formatTime(currentTime)}</span>
        <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
      </div>
    </div>
  );
};
