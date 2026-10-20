import React from 'react';
import { ListMusic, Trash2, ArrowUp, ArrowDown, Play, X } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ isOpen, onClose }) => {
  const {
    queue,
    currentQueueIndex,
    playQueueItem,
    removeFromQueue,
    reorderQueue,
    clearQueue
  } = usePlayerStore();

  if (!isOpen) return null;

  return (
    <div className="w-80 h-full bg-[#121721] border-l border-white/5 flex flex-col justify-between p-4 select-none z-30">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-white">Up Next</h3>
          <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
            {queue.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
              title="Clear entire queue"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue items list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1.5">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <ListMusic className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">Queue is currently empty</p>
            <p className="text-[10px] text-slate-600 mt-1">
              Add links from the Home or Library screen.
            </p>
          </div>
        ) : (
          queue.map((item, idx) => {
            const isCurrent = idx === currentQueueIndex;
            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 group transition-all ${
                  isCurrent
                    ? 'bg-cyan-950/30 border-cyan-500/40 text-white'
                    : 'bg-[#181F2E]/60 border-white/5 text-slate-300 hover:border-white/10'
                }`}
              >
                <div
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                  onClick={() => playQueueItem(idx)}
                >
                  <span className="text-[11px] font-mono text-slate-500 w-4 text-center">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">
                      {item.source.title || item.source.videoId}
                    </p>
                    <span className="text-[10px] uppercase font-mono text-slate-500">
                      {item.source.sourceType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => reorderQueue(idx, Math.max(0, idx - 1))}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                    title="Move up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => reorderQueue(idx, Math.min(queue.length - 1, idx + 1))}
                    disabled={idx === queue.length - 1}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                    title="Move down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromQueue(idx)}
                    className="p-1 text-slate-400 hover:text-red-400"
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
