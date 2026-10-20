import React from 'react';
import {
  Link,
  Play,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { resolveSource } from '../../adapters/sourceResolver';

interface UrlInputBarProps {
  urlInput: string;
  setUrlInput: (val: string) => void;
  onPlay: () => Promise<void>;
  onAddToQueue: () => void;
  feedback: { text: string; type: 'success' | 'error' } | null;
  setFeedback: (fb: { text: string; type: 'success' | 'error' } | null) => void;
}

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  urlInput,
  setUrlInput,
  onPlay,
  onAddToQueue,
  feedback,
  setFeedback
}) => {
  const { adapterState } = usePlayerStore();
  const isLoading = adapterState.status === 'loading';

  const resolved = urlInput.trim() ? resolveSource(urlInput.trim()) : null;

  const sampleLinks = [
    { label: 'YouTube Short', url: 'https://www.youtube.com/shorts/n2YGWiRRxEs' },
    { label: 'YouTube Watch', url: 'https://www.youtube.com/watch?v=n2YGWiRRxEs' },
    { label: 'Direct MP4', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
    { label: 'Direct WebM', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm' },
    { label: 'Direct MP3', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },
    { label: 'Live HLS', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      onPlay();
    }
  };

  const handleClear = () => {
    setUrlInput('');
    setFeedback(null);
  };

  const handleBrowseLocalFile = async () => {
    if (window.loopwaveApi?.openFileDialog) {
      try {
        const result = await window.loopwaveApi.openFileDialog();
        if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          setUrlInput(selectedPath);
          if (feedback) setFeedback(null);
        }
      } catch (err) {
        console.warn('Failed to open file dialog:', err);
      }
    }
  };

  return (
    <div className="bg-[#111B2B] border border-[#293750] rounded-2xl p-3 shadow-xl space-y-2 select-none">
      {/* Primary Input Row: Flex layout with robust min-width: 0 */}
      <div className="flex items-center gap-2.5 w-full">
        {/* Text Entry Field: Outer flex container with min-w-0 */}
        <div className="flex-1 min-w-0 flex items-center bg-[#18243A] border border-[#293750] focus-within:border-[#18D8E8] rounded-xl px-3 py-1 transition-all h-11">
          {/* 1. Fixed-width Link Icon Container */}
          <div className="w-7 h-7 flex items-center justify-center shrink-0 text-[#A5B4CF] mr-1">
            <Link className="w-4 h-4" />
          </div>

          {/* 2. Text Input expanding to use available space with min-w-0 */}
          <input
            id="main-url-input"
            type="text"
            placeholder="Paste a video or audio link"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              if (feedback) setFeedback(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 min-w-0 bg-transparent border-0 text-xs text-[#F5F7FF] placeholder-[#A5B4CF]/60 focus:outline-none py-1.5"
            aria-label="Media URL input"
          />

          {/* 3. Reserved Space for Clear Button & Source Format Badge (inside input container) */}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {urlInput && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-md text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-white/10 transition-colors"
                title="Clear input"
                aria-label="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {resolved?.success && resolved.source && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#101827] border border-[#18D8E8]/40 text-[#18D8E8] pointer-events-none shrink-0">
                {resolved.source.sourceType}
              </span>
            )}
          </div>
        </div>

        {/* Outside the text-entry area: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleBrowseLocalFile}
            disabled={isLoading}
            className="h-11 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#18D8E8] border border-[#293750] text-xs font-medium transition-colors"
            title="Browse and play local video or audio file directly"
            aria-label="Open local file"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Open File</span>
          </button>

          <button
            id="main-play-button"
            type="button"
            onClick={onPlay}
            disabled={!urlInput.trim() || isLoading}
            className="h-11 flex items-center justify-center gap-2 px-5 rounded-xl bg-gradient-to-r from-[#6547FF] to-[#3478FF] hover:from-[#7b61ff] hover:to-[#4e8cff] text-[#F5F7FF] font-semibold text-xs shadow-md shadow-[#6547FF]/25 disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Stream entered URL"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Play</span>
          </button>

          <button
            type="button"
            onClick={onAddToQueue}
            disabled={!urlInput.trim() || isLoading}
            className="h-11 flex items-center justify-center gap-1.5 px-4 rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] border border-[#293750] text-xs font-medium disabled:opacity-40 transition-colors"
            title="Add current URL to queue"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add to Queue</span>
          </button>
        </div>
      </div>

      {/* Preset Chips & Real-time Feedback Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-[#A5B4CF] mr-1">Examples:</span>
          {sampleLinks.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setUrlInput(s.url);
                if (feedback) setFeedback(null);
              }}
              className="px-2 py-0.5 rounded-lg bg-[#18243A] hover:bg-[#293750] border border-[#293750] text-[11px] text-[#A5B4CF] hover:text-[#18D8E8] transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Feedback / Validation Message */}
        <div className="flex items-center gap-2">
          {feedback && (
            <span
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border animate-fadeIn ${
                feedback.type === 'success'
                  ? 'bg-[#12C98A]/15 border-[#12C98A]/40 text-[#12C98A]'
                  : 'bg-[#FF667D]/15 border-[#FF667D]/40 text-[#FF667D]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {feedback.text}
            </span>
          )}

          {resolved && !resolved.success && urlInput.trim().length > 8 && (
            <span className="flex items-center gap-1 text-[11px] text-[#FF667D]">
              <AlertCircle className="w-3 h-3" />
              {resolved.error || 'Unsupported URL'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
