import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, Clock, CheckCircle, RotateCcw, ExternalLink, Copy, Check } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { EmptyPlayerState } from './EmptyPlayerState';

export const VideoCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const {
    currentSource,
    adapterState,
    countdownRemaining,
    setContainerElement,
    loadUrl
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
    if (currentSource?.canonicalUrl) {
      loadUrl(currentSource.canonicalUrl, true);
    }
  };

  const handleCopyLink = () => {
    if (currentSource?.canonicalUrl) {
      navigator.clipboard.writeText(currentSource.canonicalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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
          <span className="text-4xl font-extrabold font-mono text-[#18D8E8]">
            {countdownRemaining}s
          </span>
          <p className="text-xs text-[#A5B4CF]">
            LoopWave infinite loop scheduler active
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

      {/* Error state overlay with Retry & Copy Link */}
      {isError && (
        <div className="absolute inset-0 bg-[#080D17]/95 flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
          <div className="w-12 h-12 rounded-2xl bg-[#FF667D]/15 border border-[#FF667D]/40 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-[#FF667D]" />
          </div>
          <h3 className="text-base font-semibold text-[#F5F7FF]">Playback Error</h3>
          <p className="text-xs text-[#A5B4CF] max-w-md">
            {adapterState.error?.message || 'An error prevented this media from playing.'}
          </p>
          <span className="text-[11px] font-mono text-[#FF667D]/90 bg-[#18243A] px-2.5 py-1 rounded-md border border-[#293750]">
            Code: {adapterState.error?.code || 'UNKNOWN'}
          </span>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6547FF] hover:bg-[#7b61ff] text-white text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] border border-[#293750] text-xs font-medium transition-colors"
              title="Copy original media link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#12C98A]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Idle / Empty state */}
      {isIdle && <EmptyPlayerState />}
    </div>
  );
};
