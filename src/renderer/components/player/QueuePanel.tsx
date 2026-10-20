import React from 'react';
import {
  ListMusic,
  Trash2,
  Shuffle,
  Play,
  ArrowUp,
  ArrowDown,
  Youtube,
  Film,
  Music,
  Radio
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

interface QueuePanelProps {
  onAddClick?: () => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = () => {
  const {
    queue,
    currentQueueIndex,
    playQueueItem,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    setQueue
  } = usePlayerStore();

  const handleShuffle = () => {
    if (queue.length <= 1) return;
    const shuffled = [...queue];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setQueue(shuffled);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return <Youtube className="w-3.5 h-3.5 text-red-400" />;
      case 'mp4':
      case 'webm':
        return <Film className="w-3.5 h-3.5 text-blue-400" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Radio className="w-3.5 h-3.5 text-[#18D8E8]" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#111B2B] border border-[#293750] rounded-2xl p-3 shadow-xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#293750]">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-[#18D8E8]" />
          <span className="font-semibold text-xs tracking-wide text-[#F5F7FF]">Up Next</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#18243A] text-[#A5B4CF] border border-[#293750]">
            {queue.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleShuffle}
            disabled={queue.length <= 1}
            className="p-1.5 rounded-lg text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A] disabled:opacity-30 transition-colors"
            title="Shuffle queue"
            aria-label="Shuffle queue"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          {queue.length > 0 && (
            <button
              type="button"
              onClick={clearQueue}
              className="p-1.5 rounded-lg text-[#A5B4CF] hover:text-[#FF667D] hover:bg-[#18243A] transition-colors"
              title="Clear entire queue"
              aria-label="Clear queue"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Queue items list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 py-2.5 pr-1 min-h-[160px]">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#A5B4CF]">
            <ListMusic className="w-8 h-8 text-[#293750] mb-2" />
            <p className="text-xs font-medium text-[#A5B4CF]">Queue is empty</p>
            <p className="text-[11px] text-[#A5B4CF]/60 max-w-[180px]">
              Use 'Add to Queue' to queue up links for continuous playback.
            </p>
          </div>
        ) : (
          queue.map((item, idx) => {
            const isCurrent = idx === currentQueueIndex;
            return (
              <div
                key={item.id}
                className={`group flex items-center gap-2.5 p-2 rounded-xl border text-xs transition-all shrink-0 ${
                  isCurrent
                    ? 'bg-[#18243A] border-[#18D8E8]/60 text-white shadow-sm glow-cyan'
                    : 'bg-[#18243A]/40 border-[#293750]/60 text-[#A5B4CF] hover:border-[#293750] hover:text-[#F5F7FF]'
                }`}
              >
                {/* Thumbnail / Source Icon */}
                <div className="w-8 h-8 rounded-lg bg-[#101827] border border-[#293750] flex items-center justify-center shrink-0">
                  {getSourceIcon(item.source.sourceType)}
                </div>

                {/* Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => playQueueItem(idx)}
                  title="Click to play now"
                >
                  <p className="font-medium text-xs truncate group-hover:text-[#18D8E8] transition-colors">
                    {item.source.title || item.source.videoId || item.source.canonicalUrl}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#A5B4CF]/70 mt-0.5 font-mono">
                    <span className="uppercase">{item.source.sourceType}</span>
                    {item.source.duration && item.source.duration > 0 && (
                      <span>• {Math.floor(item.source.duration)}s</span>
                    )}
                    {isCurrent && (
                      <span className="text-[#18D8E8] font-bold">• Active</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => playQueueItem(idx)}
                    className="p-1 rounded hover:bg-[#101827] text-[#18D8E8] hover:scale-110 transition-transform"
                    title="Start track"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={() => reorderQueue(idx, Math.max(0, idx - 1))}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-[#101827] text-[#A5B4CF] disabled:opacity-20"
                    title="Move up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => reorderQueue(idx, Math.min(queue.length - 1, idx + 1))}
                    disabled={idx === queue.length - 1}
                    className="p-1 rounded hover:bg-[#101827] text-[#A5B4CF] disabled:opacity-20"
                    title="Move down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(idx)}
                    className="p-1 rounded hover:bg-[#101827] text-[#FF667D]"
                    title="Remove item"
                  >
                    <Trash2 className="w-3 h-3" />
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
