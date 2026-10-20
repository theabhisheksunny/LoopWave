import React, { useEffect, useRef } from 'react';
import { Loader2, AlertCircle, PlayCircle, Clock } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

export const VideoCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    currentSource,
    adapterState,
    countdownRemaining,
    setContainerElement,
    play
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
  const isIdle = !currentSource;

  return (
    <div className="relative w-full aspect-video max-h-[70vh] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
      {/* Media mount container */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
      />

      {/* Inter-loop delay countdown overlay */}
      {countdownRemaining > 0 && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30 transition-all animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center animate-pulse">
            <Clock className="w-8 h-8 text-cyan-300" />
          </div>
          <p className="text-xl font-bold text-white tracking-wide">
            Next Loop Starting In
          </p>
          <span className="text-4xl font-extrabold font-mono text-cyan-400">
            {countdownRemaining}s
          </span>
          <p className="text-xs text-slate-400">
            Infinite loop cycle in progress
          </p>
        </div>
      )}

      {/* Buffering or loading overlay */}
      {(isLoading || isBuffering) && countdownRemaining === 0 && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20 pointer-events-none">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          <span className="text-xs uppercase tracking-widest text-slate-300 font-mono">
            {isLoading ? 'Loading Stream...' : 'Buffering...'}
          </span>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
          <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Playback Error</h3>
          <p className="text-sm text-slate-300 max-w-md">
            {adapterState.error?.message || 'An error prevented media from playing.'}
          </p>
          <span className="text-xs font-mono text-slate-500">
            Code: {adapterState.error?.code || 'UNKNOWN'}
          </span>
        </div>
      )}

      {/* Idle / Empty state */}
      {isIdle && (
        <div className="absolute inset-0 bg-[#0F141F] flex flex-col items-center justify-center gap-4 text-center p-8 z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
            <PlayCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-medium text-slate-200">No Media Loaded</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Paste a YouTube link or direct media URL on the Home screen to start streaming and looping.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
