import React, { useState } from 'react';
import {
  Play,
  Pause,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  ListMusic,
  Trash2,
  Clock,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { VideoCanvas } from './VideoCanvas';
import { PlayerControls } from './PlayerControls';
import { usePlayerStore } from '../../stores/playerStore';
import { resolveSource } from '../../adapters/sourceResolver';

export const MainPlayerView: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const {
    currentSource,
    adapterState,
    countdownRemaining,
    queue,
    currentQueueIndex,
    loadUrl,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    playQueueItem,
    clearQueue
  } = usePlayerStore();

  const resolved = urlInput.trim() ? resolveSource(urlInput.trim()) : null;

  const handlePlay = async () => {
    if (!urlInput.trim()) return;
    setFeedback(null);
    const res = await loadUrl(urlInput.trim(), true);
    if (!res.success) {
      setFeedback({ text: res.error || 'Failed to play link', type: 'error' });
    } else {
      setFeedback({ text: 'Starting playback...', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleAddToQueue = () => {
    if (!resolved || !resolved.success || !resolved.source) {
      setFeedback({ text: 'Please enter a valid link first', type: 'error' });
      return;
    }
    addToQueue(resolved.source);
    setFeedback({ text: 'Added to queue', type: 'success' });
    setTimeout(() => setFeedback(null), 2500);
  };

  // Preset links including the exact user-specified verification links
  const sampleLinks = [
    { label: 'YouTube Short', url: 'https://www.youtube.com/shorts/n2YGWiRRxEs' },
    { label: 'YouTube Watch', url: 'https://www.youtube.com/watch?v=n2YGWiRRxEs' },
    { label: 'Direct MP4', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
    { label: 'Direct WebM', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm' },
    { label: 'Direct MP3', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },
    { label: 'Live HLS', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
  ];

  return (
    <div className="h-full flex flex-col justify-between p-4 md:p-6 overflow-y-auto space-y-4 max-w-6xl mx-auto select-none">
      {/* 1. Primary URL Input Bar */}
      <div className="bg-[#121721] border border-white/10 rounded-2xl p-3 shadow-xl space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <input
              id="main-url-input"
              type="text"
              placeholder="Paste a video or audio link (YouTube or direct media URL)..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
              className="w-full bg-[#181F2E] border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
            />
            {resolved?.success && resolved.source && (
              <span className="absolute right-3 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 pointer-events-none">
                {resolved.source.sourceType}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="main-play-button"
              onClick={handlePlay}
              disabled={!urlInput.trim()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-sm shadow-lg disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play</span>
            </button>

            <button
              onClick={handleAddToQueue}
              disabled={!urlInput.trim()}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium disabled:opacity-40 transition-colors"
              title="Add current URL to queue"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Queue</span>
            </button>
          </div>
        </div>

        {/* Status / Quick Links Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">Try:</span>
            {sampleLinks.map((s) => (
              <button
                key={s.label}
                onClick={() => setUrlInput(s.url)}
                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Real-time Status Indicator */}
          <div className="flex items-center gap-2">
            {feedback && (
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded border animate-fadeIn ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/60 border-red-500/40 text-red-300'
                }`}
              >
                {feedback.text}
              </span>
            )}

            {adapterState.status === 'loading' && (
              <span className="flex items-center gap-1 text-[11px] text-cyan-300">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </span>
            )}

            {adapterState.status === 'buffering' && (
              <span className="flex items-center gap-1 text-[11px] text-amber-300">
                <Loader2 className="w-3 h-3 animate-spin" />
                Buffering...
              </span>
            )}

            {adapterState.status === 'playing' && (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Playing
              </span>
            )}

            {adapterState.status === 'paused' && (
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Paused
              </span>
            )}

            {countdownRemaining > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                <Clock className="w-3 h-3 text-cyan-400" />
                Looping in {countdownRemaining}s
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Central Player Canvas */}
      <div className="flex-1 flex flex-col justify-center min-h-[300px]">
        {currentSource && (
          <div className="pb-1.5 px-1 flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-white truncate max-w-xl">
              {currentSource.title || currentSource.videoId}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {currentSource.sourceType.toUpperCase()}
            </span>
          </div>
        )}
        <VideoCanvas />
      </div>

      {/* 3. Compact Primary Controls */}
      <PlayerControls />

      {/* 4. Queue / Playlist Bar (Clean & Compact) */}
      {queue.length > 0 && (
        <div className="bg-[#121721] border border-white/5 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-white/5">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <ListMusic className="w-3.5 h-3.5 text-cyan-400" />
              Playback Queue ({queue.length})
            </span>
            <button
              onClick={clearQueue}
              className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
            >
              Clear Queue
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {queue.map((item, idx) => {
              const isCurrent = idx === currentQueueIndex;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shrink-0 max-w-[240px] group transition-all ${
                    isCurrent
                      ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                      : 'bg-[#181F2E]/60 border-white/5 text-slate-300 hover:border-white/10'
                  }`}
                >
                  <span
                    onClick={() => playQueueItem(idx)}
                    className="truncate cursor-pointer hover:underline"
                    title={item.source.title || item.source.videoId}
                  >
                    {idx + 1}. {item.source.title || item.source.videoId}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                    <button
                      onClick={() => reorderQueue(idx, Math.max(0, idx - 1))}
                      disabled={idx === 0}
                      className="p-0.5 hover:text-white disabled:opacity-20"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => reorderQueue(idx, Math.min(queue.length - 1, idx + 1))}
                      disabled={idx === queue.length - 1}
                      className="p-0.5 hover:text-white disabled:opacity-20"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromQueue(idx)}
                      className="p-0.5 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
