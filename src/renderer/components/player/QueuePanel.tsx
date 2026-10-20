import React from 'react';
import { ListMusic, Trash2, Shuffle } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { QueueItem } from './QueueItem';

export const QueuePanel: React.FC = () => {
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

  return (
    <div className="h-full flex flex-col bg-[#111B2B] border border-[#293750] rounded-2xl p-3.5 shadow-xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#293750]">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-[#18D8E8]" />
          <span className="font-semibold text-xs tracking-wide text-[#F5F7FF]">Up Next</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#18243A] text-[#A5B4CF] border border-[#293750]">
            {queue.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
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
      <div className="flex-1 overflow-y-auto space-y-1.5 py-3 pr-1 min-h-[160px]">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#A5B4CF]">
            <div className="w-12 h-12 rounded-2xl bg-[#18243A] border border-[#293750] flex items-center justify-center mb-3">
              <ListMusic className="w-6 h-6 text-[#A5B4CF]/60" />
            </div>
            <p className="text-xs font-semibold text-[#F5F7FF]">Queue is empty</p>
            <p className="text-[11px] text-[#A5B4CF] mt-1 max-w-[200px] leading-relaxed">
              Use 'Add to Queue' to queue up links for continuous playback.
            </p>
          </div>
        ) : (
          queue.map((item, idx) => (
            <QueueItem
              key={item.id}
              item={item}
              index={idx}
              isCurrent={idx === currentQueueIndex}
              isFirst={idx === 0}
              isLast={idx === queue.length - 1}
              onPlay={playQueueItem}
              onReorder={reorderQueue}
              onRemove={removeFromQueue}
            />
          ))
        )}
      </div>
    </div>
  );
};
