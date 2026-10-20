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
  Clock
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { LoopMode } from '../../../shared/types';

export const PlaybackSettings: React.FC = () => {
  const {
    currentSource,
    adapterState,
    capabilities,
    loopMode,
    interLoopDelaySeconds,
    play,
    pause,
    stop,
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
  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const delayPresets = [0, 1, 2, 3, 5, 10];

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

  return (
    <div className="w-full bg-[#111B2B] rounded-2xl border border-[#293750] px-4 py-3 shadow-xl select-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Loop Mode Cycling & Delay Configurator */}
        <div className="flex items-center gap-2">
          {/* Loop Mode Button with cycle handler and exact accessible title */}
          <button
            type="button"
            onClick={cycleLoopMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              loopMode === 'one'
                ? 'bg-gradient-to-r from-[#6547FF] to-[#3478FF] border-[#6547FF] text-white shadow-sm glow-violet'
                : loopMode === 'all'
                ? 'bg-gradient-to-r from-[#3478FF] to-[#18D8E8] border-[#18D8E8] text-white shadow-sm glow-cyan'
                : 'bg-[#18243A] border-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF]'
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

          {/* Inter-loop Delay Configurator */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDelayOpen(!isDelayOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-[#18243A] hover:bg-[#18243A]/80 border border-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] transition-colors"
              title="Configurable delay between playback cycles"
            >
              <Clock className="w-3 h-3 text-[#18D8E8]" />
              <span>{interLoopDelaySeconds}s delay</span>
            </button>

            {isDelayOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-44 p-2 bg-[#18243A] border border-[#293750] rounded-xl shadow-2xl space-y-2 z-40">
                <span className="text-[10px] uppercase font-semibold text-[#A5B4CF] block px-1">
                  Delay Between Loops
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {delayPresets.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setInterLoopDelay(d);
                        setIsDelayOpen(false);
                      }}
                      className={`text-xs py-1 rounded-md font-mono ${
                        interLoopDelaySeconds === d
                          ? 'bg-[#18D8E8]/20 text-[#18D8E8] border border-[#18D8E8]/40'
                          : 'bg-[#101827] text-[#A5B4CF] hover:text-white'
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

        {/* Center: Large Focal Play/Pause Button flanked by Prev / Next / Stop */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={previousTrack}
            disabled={!currentSource}
            className="p-2 rounded-xl text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] disabled:opacity-30 transition-colors"
            title="Previous track"
            aria-label="Previous track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* LARGE CENTRAL PLAY/PAUSE BUTTON (VISUAL FOCAL POINT) */}
          <button
            type="button"
            onClick={isPlaying ? pause : play}
            disabled={!currentSource}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#6547FF] via-[#3478FF] to-[#18D8E8] hover:scale-105 active:scale-95 text-white flex items-center justify-center disabled:opacity-30 transition-all glow-focal-play shadow-lg"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={stop}
            disabled={!currentSource}
            className="p-2 rounded-xl text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] disabled:opacity-30 transition-colors"
            title="Stop playback"
            aria-label="Stop playback"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={nextTrack}
            disabled={!currentSource}
            className="p-2 rounded-xl text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] disabled:opacity-30 transition-colors"
            title="Next track"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Volume, Speed, PiP, Fullscreen */}
        <div className="flex items-center gap-3">
          {/* Volume control */}
          <div className="flex items-center gap-2 group">
            <button
              type="button"
              onClick={() => setMuted(!adapterState.isMuted)}
              disabled={!capabilities.supportsVolume}
              className="p-1.5 rounded-lg text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] transition-colors"
              title={adapterState.isMuted ? 'Unmute (M)' : 'Mute (M)'}
              aria-label="Toggle mute"
            >
              {adapterState.isMuted || adapterState.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-[#FF667D]" />
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
              className="w-20 h-1 bg-[#293750] rounded-full appearance-none accent-[#18D8E8] cursor-pointer"
              aria-label="Volume level"
            />
          </div>

          <div className="h-4 w-px bg-[#293750]" />

          {/* Speed Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSpeedOpen(!isSpeedOpen)}
              disabled={!capabilities.supportsSpeed}
              className="px-2 py-1 rounded-lg text-xs font-mono text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] border border-[#293750] disabled:opacity-30 transition-colors"
              title="Playback speed"
            >
              {adapterState.playbackRate}x
            </button>

            {isSpeedOpen && (
              <div className="absolute bottom-full mb-2 right-0 w-24 p-1.5 bg-[#18243A] border border-[#293750] rounded-xl shadow-2xl space-y-1 z-40">
                {speeds.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setPlaybackRate(s);
                      setIsSpeedOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-mono ${
                      adapterState.playbackRate === s
                        ? 'bg-[#18D8E8]/20 text-[#18D8E8]'
                        : 'text-[#A5B4CF] hover:bg-white/5 hover:text-white'
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
            type="button"
            onClick={togglePiP}
            disabled={!capabilities.supportsPiP}
            className="p-1.5 rounded-lg text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] disabled:opacity-30 transition-colors"
            title={capabilities.supportsPiP ? 'Picture in Picture' : 'PiP not supported for this source'}
            aria-label="Picture in Picture"
          >
            <PictureInPicture className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] transition-colors"
            title="Fullscreen (F)"
            aria-label="Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
