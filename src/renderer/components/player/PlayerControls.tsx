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
import { formatTime } from '../../../shared/defaults';

export const PlayerControls: React.FC = () => {
  const {
    currentSource,
    adapterState,
    capabilities,
    loopMode,
    interLoopDelaySeconds,
    queue,
    currentQueueIndex,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setMuted,
    setPlaybackRate,
    cycleLoopMode,
    setInterLoopDelay,
    nextTrack,
    previousTrack,
    toggleFullscreen,
    togglePiP
  } = usePlayerStore();

  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isDelayOpen, setIsDelayOpen] = useState(false);

  const isPlaying = adapterState.status === 'playing';
  const isError = adapterState.status === 'error';
  const isLoading = adapterState.status === 'loading';
  const duration = adapterState.duration || 0;
  const currentTime = adapterState.currentTime || 0;
  const hasMedia = Boolean(currentSource);

  const canGoPrevious = hasMedia && (currentQueueIndex > 0 || (currentQueueIndex === 0 && currentTime > 3));
  const canGoNext = hasMedia && queue.length > 0 && (currentQueueIndex < queue.length - 1 || loopMode === 'all');

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const delayPresets = [0, 1, 2, 3, 5, 10];

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
  };

  return (
    <div className="w-full bg-[#111B2B] rounded-2xl border border-[#293750] p-3 md:p-3.5 shadow-xl select-none space-y-3">
      {/* =========================================================================
          ROW 1: Seek Timeline, Current Elapsed Time, and Total Duration
         ========================================================================= */}
      <div className="space-y-1">
        <div className="relative flex items-center group cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            disabled={!capabilities.supportsSeeking || duration === 0 || adapterState.status === 'error' || adapterState.status === 'loading'}
            className="w-full h-1.5 rounded-full bg-[#18243A] appearance-none cursor-pointer focus:outline-none accent-[#18D8E8] group-hover:h-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Seek timeline"
          />
        </div>

        {/* Timestamps */}
        <div className="flex justify-between items-center text-[11px] font-mono text-[#A5B4CF] px-0.5">
          <span className="text-[#F5F7FF] font-semibold">{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: Loop Mode & Delay, Transport Controls (Prev, Focal Play/Pause, Next, Stop),
                 Volume, Speed Selector, PiP, Fullscreen
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-0.5">
        {/* Left: Loop Mode & Inter-loop Delay */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start order-2 sm:order-1 shrink-0">
          {/* Loop Mode Cycle Button */}
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
            aria-label={`Loop mode: ${loopMode}`}
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

        {/* Center: Transport Controls with Prominent Primary Play/Pause Button */}
        <div className="flex items-center justify-center gap-2 order-1 sm:order-2 shrink-0">
          {/* Previous Track */}
          <button
            type="button"
            onClick={previousTrack}
            disabled={!canGoPrevious}
            className="p-2 rounded-xl text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title={
              !hasMedia
                ? 'No media loaded'
                : canGoPrevious
                ? 'Previous track'
                : 'No previous track'
            }
            aria-label="Previous track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* PROMINENT PRIMARY PLAY/PAUSE BUTTON */}
          <button
            type="button"
            onClick={isPlaying ? pause : play}
            disabled={!hasMedia || adapterState.status === 'error' || adapterState.status === 'loading'}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#6547FF] via-[#3478FF] to-[#18D8E8] hover:scale-105 active:scale-95 text-white flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-all glow-focal-play shadow-lg"
            title={
              !hasMedia
                ? 'No media loaded'
                : adapterState.status === 'error'
                ? 'Playback failed (Retry or Open Externally)'
                : adapterState.status === 'loading'
                ? 'Loading media...'
                : isPlaying
                ? 'Pause (Space)'
                : 'Play (Space)'
            }
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Stop Button */}
          <button
            type="button"
            onClick={stop}
            disabled={!hasMedia}
            className="p-2 rounded-xl text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title={
              !hasMedia
                ? 'No media loaded'
                : isError
                ? 'Dismiss error and reset'
                : 'Stop playback'
            }
            aria-label="Stop playback"
          >
            <Square className="w-4 h-4" />
          </button>

          {/* Next Track */}
          <button
            type="button"
            onClick={nextTrack}
            disabled={!canGoNext}
            className="p-2 rounded-xl text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title={
              !hasMedia
                ? 'No media loaded'
                : canGoNext
                ? 'Next track'
                : 'No next track in queue'
            }
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Volume, Playback Speed, PiP, Fullscreen */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-center sm:justify-end order-3 shrink-0">
          {/* Volume Control */}
          <div className="flex items-center gap-1.5 group">
            <button
              type="button"
              onClick={() => setMuted(!adapterState.isMuted)}
              disabled={!capabilities.supportsVolume || !hasMedia}
              className="p-1.5 rounded-lg text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] disabled:opacity-30 transition-colors"
              title={
                !capabilities.supportsVolume || !hasMedia
                  ? 'Volume control not available'
                  : adapterState.isMuted
                  ? 'Unmute (M)'
                  : 'Mute (M)'
              }
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
              disabled={!capabilities.supportsVolume || !hasMedia}
              className="w-16 lg:w-20 h-1 bg-[#293750] rounded-full appearance-none accent-[#18D8E8] cursor-pointer disabled:opacity-30"
              aria-label="Volume level"
            />
          </div>

          <div className="h-4 w-px bg-[#293750] hidden sm:block" />

          {/* Playback Speed Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSpeedOpen(!isSpeedOpen)}
              disabled={!capabilities.supportsSpeed || !hasMedia || isError || isLoading}
              className="px-2 py-1 rounded-lg text-xs font-mono text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] border border-[#293750] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title={
                isError
                  ? 'Speed adjustment unavailable during error'
                  : capabilities.supportsSpeed && hasMedia
                  ? `Playback speed: ${adapterState.playbackRate}x`
                  : 'Speed adjustment not supported'
              }
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
            disabled={!capabilities.supportsPiP || !hasMedia || isError || isLoading}
            className="p-1.5 rounded-lg text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title={
              isError
                ? 'PiP unavailable during error'
                : capabilities.supportsPiP && hasMedia
                ? 'Picture in Picture'
                : 'PiP not supported for this source'
            }
            aria-label="Picture in Picture"
          >
            <PictureInPicture className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            disabled={!hasMedia || isError}
            className="p-1.5 rounded-lg text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title={
              !hasMedia
                ? 'No media loaded'
                : isError
                ? 'Fullscreen unavailable during error'
                : 'Fullscreen (F)'
            }
            aria-label="Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
