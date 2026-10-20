import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, Clock, CheckCircle, RotateCcw, ExternalLink, Copy, Check, SkipForward, X } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { EmptyPlayerState } from './EmptyPlayerState';

export const VideoCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const {
    currentSource,
    adapterState,
    countdownRemaining,
    selectedDelaySeconds,
    randomizedDelayEnabled,
    queue,
    currentQueueIndex,
    setContainerElement,
    loadUrl,
    nextTrack,
    clearSource
  } = usePlayerStore();

  useEffect(() => {
    if (containerRef.current) {
      setContainerElement(containerRef.current);
    }
    return () => {
      setContainerElement(null);
    };
  }, [setContainerElement]);

  const isLoading = adapterState.status === 'loading';
  const isBuffering = adapterState.status === 'buffering';
  const isError = adapterState.status === 'error';
  const isEnded = adapterState.status === 'ended';
  const isIdle = !currentSource;

  const handleRetry = () => {
    const retryUrl = currentSource?.originalUrl || currentSource?.canonicalUrl;
    if (retryUrl) {
      loadUrl(retryUrl, true);
    }
  };

  const handleCopyLink = () => {
    if (currentSource?.canonicalUrl) {
      navigator.clipboard.writeText(currentSource.canonicalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleOpenExternal = () => {
    const targetUrl = currentSource?.originalUrl || currentSource?.canonicalUrl;
    if (targetUrl && window.loopwaveApi?.openExternal) {
      window.loopwaveApi.openExternal(targetUrl);
    }
  };

  return (
    <div className="relative w-full aspect-video max-h-[58vh] bg-black rounded-2xl overflow-hidden border border-[#293750] shadow-2xl flex items-center justify-center select-none">
      {/* Media mount container */}
      <div
        ref={containerRef}
        id="player-viewport"
        className="w-full h-full flex items-center justify-center bg-black"
      />

      {/* Inter-loop delay countdown overlay */}
      {countdownRemaining > 0 && (
        <div className="absolute inset-0 bg-[#080D17]/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30 transition-all animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-[#18243A] border border-[#18D8E8]/50 flex items-center justify-center animate-pulse glow-cyan">
            <Clock className="w-8 h-8 text-[#18D8E8]" />
          </div>
          <p className="text-lg font-bold text-[#F5F7FF] tracking-wide">
            Next Loop Cycle Starting In
          </p>
          <span className="text-4xl font-extrabold font-mono text-[#18D8E8] tabular-nums">
            {randomizedDelayEnabled
              ? `${countdownRemaining.toFixed(3)}s`
              : `${Math.ceil(countdownRemaining)}s`}
          </span>
          {randomizedDelayEnabled && selectedDelaySeconds !== null && (
            <div className="px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-xs font-mono text-cyan-300">
              Selected Delay: {selectedDelaySeconds.toFixed(5)}s
            </div>
          )}
          <p className="text-xs text-[#A5B4CF]">
            {randomizedDelayEnabled
              ? 'LoopWave floating-point randomized delay active'
              : 'LoopWave infinite loop scheduler active'}
          </p>
        </div>
      )}

      {/* Buffering or loading overlay */}
      {(isLoading || isBuffering) && countdownRemaining === 0 && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20 pointer-events-none">
          <Loader2 className="w-10 h-10 text-[#18D8E8] animate-spin" />
          <span className="text-xs uppercase tracking-widest text-[#F5F7FF] font-mono">
            {isLoading ? 'Loading Media Stream...' : 'Buffering...'}
          </span>
        </div>
      )}

      {/* Playback completed overlay (when loop is off) */}
      {isEnded && countdownRemaining === 0 && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
          <div className="w-12 h-12 rounded-full bg-[#12C98A]/20 border border-[#12C98A]/40 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-[#12C98A]" />
          </div>
          <h3 className="text-base font-semibold text-[#F5F7FF]">Playback Completed</h3>
          <p className="text-xs text-[#A5B4CF]">Enable Loop Mode (Repeat 1 or All) for infinite looping</p>
        </div>
      )}

      {/* Error state overlay with Retry, Copy Link, Open Externally, Next in Queue & Dismiss */}
      {isError && (
        <div className="absolute inset-0 bg-[#080D17]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 sm:gap-3 p-4 sm:p-6 text-center z-20 overflow-y-auto max-h-full select-none animate-fadeIn">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#FF667D]/15 border border-[#FF667D]/40 flex items-center justify-center shrink-0 shadow-lg shadow-[#FF667D]/10">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF667D]" />
          </div>

          <h3 className="text-sm sm:text-base font-bold text-[#F5F7FF] tracking-tight">
            Playback Error
          </h3>

          <p className="text-xs text-[#A5B4CF] max-w-md leading-relaxed px-2">
            {adapterState.error?.message || 'An error prevented this media from playing.'}
          </p>

          <span className="text-[11px] font-mono font-medium text-[#FF667D] bg-[#18243A] px-3 py-1 rounded-lg border border-[#FF667D]/30 shrink-0">
            Code: {adapterState.error?.code || 'UNKNOWN'}
          </span>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5 max-w-full">
            <button
              type="button"
              onClick={handleRetry}
              className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-gradient-to-r from-[#6547FF] to-[#3478FF] hover:from-[#7559ff] hover:to-[#4e8cff] text-white text-xs font-semibold shadow-md transition-all active:scale-95 shrink-0"
              title="Retry playback"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] border border-[#293750] text-xs font-medium transition-colors shrink-0"
              title="Copy original media link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#12C98A]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>

            {currentSource && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#18D8E8] hover:text-[#52e8f5] border border-[#18D8E8]/40 text-xs font-semibold transition-colors shrink-0"
                title="Open original video externally"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{currentSource.sourceType === 'youtube' ? 'Open on YouTube' : 'Open in Browser'}</span>
              </button>
            )}

            {currentQueueIndex >= 0 && currentQueueIndex < queue.length - 1 && (
              <button
                type="button"
                onClick={nextTrack}
                className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#3478FF] hover:text-[#6494ff] border border-[#3478FF]/40 text-xs font-semibold transition-colors shrink-0"
                title="Skip to next item in queue"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Next in Queue</span>
              </button>
            )}

            <button
              type="button"
              onClick={clearSource}
              className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] border border-[#293750] text-xs font-medium transition-colors shrink-0"
              title="Dismiss error and return to idle"
            >
              <X className="w-3.5 h-3.5" />
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      )}

      {/* Idle / Empty state */}
      {isIdle && <EmptyPlayerState />}
    </div>
  );
};
