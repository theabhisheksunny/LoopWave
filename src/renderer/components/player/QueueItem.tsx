import React from 'react';
import {
  Play,
  ArrowUp,
  ArrowDown,
  Trash2,
  Youtube,
  Film,
  Music,
  Radio
} from 'lucide-react';
import { QueueItem as QueueItemType } from '../../../shared/types';

interface QueueItemProps {
  item: QueueItemType;
  index: number;
  isCurrent: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPlay: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

export const getSourceIcon = (type: string, className = 'w-3.5 h-3.5') => {
  switch (type) {
    case 'youtube':
      return <Youtube className={`${className} text-[#FF334B]`} />;
    case 'direct-video':
    case 'mp4':
    case 'webm':
      return <Film className={`${className} text-[#3478FF]`} />;
    case 'direct-audio':
    case 'audio':
      return <Music className={`${className} text-[#12C98A]`} />;
    case 'hls':
    default:
      return <Radio className={`${className} text-[#18D8E8]`} />;
  }
};

export const QueueItem: React.FC<QueueItemProps> = ({
  item,
  index,
  isCurrent,
  isFirst,
  isLast,
  onPlay,
  onReorder,
  onRemove
}) => {

  const title = item.source.title || item.source.videoId || item.source.canonicalUrl;

  return (
    <div
      className={`group flex items-center gap-2.5 p-2 rounded-xl border text-xs transition-all shrink-0 select-none ${
        isCurrent
          ? 'bg-[#18243A] border-[#18D8E8]/70 text-[#F5F7FF] shadow-sm'
          : 'bg-[#18243A]/40 border-[#293750]/60 text-[#A5B4CF] hover:border-[#293750] hover:text-[#F5F7FF]'
      }`}
    >
      {/* Thumbnail or Source Icon */}
      <div className="w-8 h-8 rounded-lg bg-[#101827] border border-[#293750] flex items-center justify-center shrink-0">
        {getSourceIcon(item.source.sourceType)}
      </div>

      {/* Track Information */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onPlay(index)}
        title={`Click to play: ${title}`}
      >
        <p className="font-medium text-xs truncate group-hover:text-[#18D8E8] transition-colors">
          {title}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-[#A5B4CF]/80 mt-0.5 font-mono">
          <span className="uppercase">{item.source.sourceType}</span>
          {item.source.duration && item.source.duration > 0 && (
            <span>• {Math.floor(item.source.duration)}s</span>
          )}
          {isCurrent && (
            <span className="text-[#18D8E8] font-bold">• Active</span>
          )}
        </div>
      </div>

      {/* Interactive Actions */}
      <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onPlay(index)}
          className="p-1 rounded hover:bg-[#101827] text-[#18D8E8] hover:scale-110 transition-transform"
          title="Start track"
          aria-label="Play this item"
        >
          <Play className="w-3 h-3 fill-current" />
        </button>
        <button
          type="button"
          onClick={() => onReorder(index, index - 1)}
          disabled={isFirst}
          className="p-1 rounded hover:bg-[#101827] text-[#A5B4CF] hover:text-white disabled:opacity-20 transition-colors"
          title="Move up"
          aria-label="Move item up"
        >
          <ArrowUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onReorder(index, index + 1)}
          disabled={isLast}
          className="p-1 rounded hover:bg-[#101827] text-[#A5B4CF] hover:text-white disabled:opacity-20 transition-colors"
          title="Move down"
          aria-label="Move item down"
        >
          <ArrowDown className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 rounded hover:bg-[#101827] text-[#FF667D] hover:scale-110 transition-transform"
          title="Remove item"
          aria-label="Remove item"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
