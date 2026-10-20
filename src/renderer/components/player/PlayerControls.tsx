import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  PictureInPicture,
  Repeat,
  Repeat1,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { LoopMode } from '../../../shared/types';

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
    currentSession,
    loopMode,
    interLoopDelaySeconds,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setMuted,
    setPlaybackRate,
    setLoopMode,
    setInterLoopDelay,
    nextTrack,
    previousTrack,
    toggleFullscreen,
    togglePiP
  } = usePlayerStore();

  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isDelayOpen, setIsDelayOpen] = useState(false);

  const isPlaying = adapterState.status === 'playing';
  const duration = adapterState.duration || 0;
  const currentTime = adapterState.currentTime || 0;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
  };

  const cycleLoopMode = () => {
    const next: Record<LoopMode, LoopMode> = {
      off: 'one',
      one: 'all',
      all: 'off'
    };
    setLoopMode(next[loopMode]);
  };

  const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const delayPresets = [0, 1, 2, 3, 5, 10, 15];

  return (
    <div className="w-full bg-[#121721] rounded-2xl border border-white/5 p-4 space-y-3 select-none">
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
            className="w-full h-1.5 rounded-full bg-white/10 appearance-none cursor-pointer focus:outline-none accent-cyan-400 group-hover:h-2 transition-all"
            aria-label="Seek timeline"
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-slate-400 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>

      {/* 2. Primary Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Playback controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={previousTrack}
            disabled={!currentSource}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 transition-colors"
            title="Previous track / Restart (Left Arrow)"
            aria-label="Previous track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={isPlaying ? pause : play}
            disabled={!currentSource}
            className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white shadow-md disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            onClick={stop}
            disabled={!currentSource}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 transition-colors"
            title="Stop playback"
            aria-label="Stop playback"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={nextTrack}
            disabled={!currentSource}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 transition-colors"
            title="Next track"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Volume control */}
          <div className="flex items-center gap-2 ml-3 group">
            <button
              onClick={() => setMuted(!adapterState.isMuted)}
              disabled={!capabilities.supportsVolume}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title={adapterState.isMuted ? 'Unmute (M)' : 'Mute (M)'}
              aria-label="Toggle mute"
            >
              {adapterState.isMuted || adapterState.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={adapterState.isMuted ? 0 : adapterState.volume}
              onChange={handleVolumeChange}
              disabled={!capabilities.supportsVolume}
              className="w-20 h-1 bg-white/10 rounded-full appearance-none accent-cyan-400 cursor-pointer"
              aria-label="Volume level"
            />
          </div>
        </div>

        {/* Center: Infinite Loop & Delay Controls */}
        <div className="flex items-center gap-2">
          {/* Loop mode button */}
          <button
            onClick={cycleLoopMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              loopMode === 'one'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 glow-cyan'
                : loopMode === 'all'
                ? 'bg-violet-500/20 border-violet-400 text-violet-300 glow-violet'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title={`Loop mode: ${loopMode.toUpperCase()} (Click to cycle)`}
          >
            {loopMode === 'one' ? (
              <>
                <Repeat1 className="w-3.5 h-3.5" />
                <span>Repeat 1</span>
              </>
            ) : loopMode === 'all' ? (
              <>
                <Repeat className="w-3.5 h-3.5" />
                <span>Repeat All</span>
              </>
            ) : (
              <>
                <Repeat className="w-3.5 h-3.5 opacity-40" />
                <span>Loop Off</span>
              </>
            )}
          </button>

          {/* Inter-loop delay configurator */}
          <div className="relative">
            <button
              onClick={() => setIsDelayOpen(!isDelayOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
              title="Configurable delay between loop cycles"
            >
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{interLoopDelaySeconds}s delay</span>
            </button>

            {isDelayOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-44 p-2 bg-[#181F2E] border border-white/10 rounded-xl shadow-xl space-y-2 z-40">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block px-1">
                  Delay Between Loops
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {delayPresets.map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setInterLoopDelay(d);
                        setIsDelayOpen(false);
                      }}
                      className={`text-xs py-1 rounded-md font-mono ${
                        interLoopDelaySeconds === d
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Extra controls (Speed, PiP, Fullscreen) */}
        <div className="flex items-center gap-1.5">
          {/* Speed Selector */}
          <div className="relative">
            <button
              onClick={() => setIsSpeedOpen(!isSpeedOpen)}
              disabled={!capabilities.supportsSpeed}
              className="px-2 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 disabled:opacity-40 transition-colors"
              title="Playback speed"
            >
              {adapterState.playbackRate}x
            </button>

            {isSpeedOpen && (
              <div className="absolute bottom-full mb-2 right-0 w-24 p-1.5 bg-[#181F2E] border border-white/10 rounded-xl shadow-xl space-y-1 z-40">
                {speeds.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setPlaybackRate(s);
                      setIsSpeedOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-mono ${
                      adapterState.playbackRate === s
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Picture-in-Picture */}
          <button
            onClick={togglePiP}
            disabled={!capabilities.supportsPiP}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"
            title={capabilities.supportsPiP ? 'Picture in Picture' : 'PiP not supported for this source'}
            aria-label="Picture in Picture"
          >
            <PictureInPicture className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Fullscreen (F)"
            aria-label="Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Session Lifecycle Status Pill */}
      {currentSession && (
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Cycle #{currentSession.cycleNumber}
            </span>
            <span title={`Cryptographically unique internal cycle UUID: ${currentSession.sessionId}`}>
              Session: {currentSession.sessionId.slice(0, 8)}...
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span>Watched: {currentSession.watchedSeconds}s</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                currentSession.completionStatus === 'active'
                  ? 'bg-blue-950/50 text-blue-300 border border-blue-500/30'
                  : currentSession.completionStatus === 'completed'
                  ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-950/50 text-amber-300 border border-amber-500/30'
              }`}
            >
              {currentSession.completionStatus}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
