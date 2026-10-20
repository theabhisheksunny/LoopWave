import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  PictureInPicture
} from 'lucide-react';
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
  const {
    currentSource,
    adapterState,
    capabilities,
    seek,
    play,
    pause,
    toggleFullscreen,
    togglePiP
  } = usePlayerStore();

  const isPlaying = adapterState.status === 'playing';
  const duration = adapterState.duration || 0;
  const currentTime = adapterState.currentTime || 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek(val);
  };

  const handleSkipBackward = () => {
    seek(Math.max(0, currentTime - 5));
  };

  const handleSkipForward = () => {
    seek(Math.min(duration, currentTime + 5));
  };

  return (
    <div className="w-full bg-[#111B2B] rounded-xl border border-[#293750] px-4 py-2.5 select-none space-y-2 shadow-md">
      {/* 1. Timeline Scrubber */}
      <div className="space-y-1">
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
          <span className="text-[#F5F7FF] font-semibold">{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>

      {/* 2. Compact Quick Controls Row immediately beneath timeline */}
      <div className="flex items-center justify-between pt-0.5 text-xs text-[#A5B4CF]">
        {/* Left: Quick Seek & Play/Pause */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={isPlaying ? pause : play}
            disabled={!currentSource}
            className="p-1.5 rounded-lg bg-[#18243A] hover:bg-[#293750] text-[#F5F7FF] disabled:opacity-30 transition-colors"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleSkipBackward}
            disabled={!capabilities.supportsSeeking || duration === 0}
            className="flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-[#18243A] hover:text-[#F5F7FF] disabled:opacity-20 transition-colors text-[11px] font-mono"
            title="Rewind 5s (Left Arrow)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>-5s</span>
          </button>

          <button
            type="button"
            onClick={handleSkipForward}
            disabled={!capabilities.supportsSeeking || duration === 0}
            className="flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-[#18243A] hover:text-[#F5F7FF] disabled:opacity-20 transition-colors text-[11px] font-mono"
            title="Forward 5s (Right Arrow)"
          >
            <RotateCw className="w-3 h-3" />
            <span>+5s</span>
          </button>
        </div>

        {/* Right: PiP & Fullscreen shortcuts */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={togglePiP}
            disabled={!capabilities.supportsPiP}
            className="p-1.5 rounded-lg hover:bg-[#18243A] hover:text-[#F5F7FF] disabled:opacity-20 transition-colors"
            title={capabilities.supportsPiP ? 'Picture in Picture' : 'PiP not supported for this source'}
            aria-label="Picture in Picture"
          >
            <PictureInPicture className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-[#18243A] hover:text-[#F5F7FF] transition-colors"
            title="Fullscreen (F)"
            aria-label="Fullscreen"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
