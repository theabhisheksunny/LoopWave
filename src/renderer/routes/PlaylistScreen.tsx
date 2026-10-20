import React, { useState } from 'react';
import {
  ListMusic,
  Shuffle,
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  Plus,
  Repeat,
  Repeat1,
  Youtube,
  Film,
  Music,
  Radio,
  Clock
} from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { resolveSource } from '../adapters/sourceResolver';

export const PlaylistScreen: React.FC = () => {
  const [newUrl, setNewUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    queue,
    currentQueueIndex,
    loopMode,
    playQueueItem,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    addToQueue,
    setQueue,
    setLoopMode
  } = usePlayerStore();

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    const res = resolveSource(newUrl.trim());
    if (!res.success || !res.source) {
      setErrorMsg(res.error || 'Invalid or unsupported link');
      return;
    }
    addToQueue(res.source);
    setNewUrl('');
    setErrorMsg(null);
  };

  const handleShuffle = () => {
    if (queue.length <= 1) return;
    const shuffled = [...queue];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setQueue(shuffled);
  };

  const cycleLoopMode = () => {
    const next = loopMode === 'off' ? 'one' : loopMode === 'one' ? 'all' : 'off';
    setLoopMode(next);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-400" />;
      case 'mp4':
      case 'webm':
        return <Film className="w-4 h-4 text-blue-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-emerald-400" />;
      default:
        return <Radio className="w-4 h-4 text-[#18D8E8]" />;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-4 max-w-5xl mx-auto select-none overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#293750]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6547FF] to-[#3478FF] flex items-center justify-center">
              <ListMusic className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[#F5F7FF]">Playback Playlist & Queue</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#18243A] text-[#18D8E8] border border-[#293750]">
              {queue.length} items
            </span>
          </div>
          <p className="text-xs text-[#A5B4CF] mt-1">
            Organize, shuffle, and reorder queued media links for continuous and infinite loop playback.
          </p>
        </div>

        {/* Global Queue Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cycleLoopMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              loopMode === 'one'
                ? 'bg-[#6547FF]/20 border-[#6547FF] text-[#6547FF]'
                : loopMode === 'all'
                ? 'bg-[#18D8E8]/20 border-[#18D8E8] text-[#18D8E8]'
                : 'bg-[#18243A] border-[#293750] text-[#A5B4CF] hover:text-white'
            }`}
          >
            {loopMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
            <span>Loop: {loopMode.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={handleShuffle}
            disabled={queue.length <= 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#18243A] hover:bg-[#293750] border border-[#293750] text-[#A5B4CF] hover:text-white disabled:opacity-30 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>

          {queue.length > 0 && (
            <button
              type="button"
              onClick={clearQueue}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FF667D]/10 hover:bg-[#FF667D]/20 border border-[#FF667D]/30 text-[#FF667D] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* Add to Queue Input */}
      <form onSubmit={handleAddUrl} className="flex gap-2">
        <input
          type="text"
          placeholder="Paste a video or audio link to add to playlist..."
          value={newUrl}
          onChange={(e) => {
            setNewUrl(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          className="flex-1 bg-[#111B2B] border border-[#293750] focus:border-[#18D8E8] rounded-xl px-4 py-2.5 text-xs text-[#F5F7FF] placeholder-[#A5B4CF]/60 focus:outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!newUrl.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6547FF] to-[#3478FF] text-white text-xs font-semibold shadow-md disabled:opacity-40 transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add to Queue</span>
        </button>
      </form>

      {errorMsg && (
        <p className="text-xs text-[#FF667D] px-1 font-medium">{errorMsg}</p>
      )}

      {/* Queue items list */}
      <div className="flex-1 space-y-2 pt-2">
        {queue.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-[#111B2B] border border-[#293750] rounded-2xl">
            <ListMusic className="w-12 h-12 text-[#293750] mb-3" />
            <h3 className="text-sm font-semibold text-[#F5F7FF]">No Items in Queue</h3>
            <p className="text-xs text-[#A5B4CF] max-w-sm mt-1">
              Add links above or use the URL input on the Home screen to build your continuous looping playlist.
            </p>
          </div>
        ) : (
          queue.map((item, idx) => {
            const isCurrent = idx === currentQueueIndex;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-4 p-3 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-[#18243A] border-[#18D8E8] text-white shadow-lg glow-cyan'
                    : 'bg-[#111B2B] border-[#293750] text-[#A5B4CF] hover:border-[#18D8E8]/40'
                }`}
              >
                {/* Left: Index + Icon + Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-mono text-xs text-[#A5B4CF] w-6 text-center">
                    {idx + 1}
                  </span>

                  <div className="w-9 h-9 rounded-xl bg-[#101827] border border-[#293750] flex items-center justify-center shrink-0">
                    {getSourceIcon(item.source.sourceType)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs text-[#F5F7FF] truncate">
                      {item.source.title || item.source.videoId || item.source.canonicalUrl}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#A5B4CF] font-mono">
                      <span className="uppercase">{item.source.sourceType}</span>
                      <span>•</span>
                      <span className="truncate max-w-md">{item.source.canonicalUrl}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => playQueueItem(idx)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#18D8E8]/20 hover:bg-[#18D8E8]/30 border border-[#18D8E8]/40 text-[#18D8E8] text-xs font-semibold transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isCurrent ? 'Playing' : 'Play'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => reorderQueue(idx, Math.max(0, idx - 1))}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] disabled:opacity-20 transition-colors"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => reorderQueue(idx, Math.min(queue.length - 1, idx + 1))}
                    disabled={idx === queue.length - 1}
                    className="p-1.5 rounded-lg bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] disabled:opacity-20 transition-colors"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeFromQueue(idx)}
                    className="p-1.5 rounded-lg bg-[#FF667D]/10 hover:bg-[#FF667D]/20 text-[#FF667D] transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
