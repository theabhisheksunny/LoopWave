import React, { useState } from 'react';
import { UrlInputBar } from './UrlInputBar';
import { VideoCanvas } from './VideoCanvas';
import { PlayerControls } from './PlayerControls';
import { QueuePanel } from './QueuePanel';
import { CurrentMediaInfo } from './CurrentMediaInfo';
import { usePlayerStore } from '../../stores/playerStore';
import { resolveSource } from '../../adapters/sourceResolver';

export const MainPlayerView: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const { loadUrl, addToQueue } = usePlayerStore();

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
    const resolved = urlInput.trim() ? resolveSource(urlInput.trim()) : null;
    if (!resolved || !resolved.success || !resolved.source) {
      setFeedback({ text: 'Please enter a valid link first', type: 'error' });
      return;
    }
    addToQueue(resolved.source);
    setFeedback({ text: 'Added to queue', type: 'success' });
    setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <div className="h-full w-full flex flex-col justify-between p-3.5 md:p-5 overflow-y-auto space-y-3.5 max-w-[1600px] mx-auto select-none">
      {/* 1. Top Horizontal URL Input Bar */}
      <UrlInputBar
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        onPlay={handlePlay}
        onAddToQueue={handleAddToQueue}
        feedback={feedback}
        setFeedback={setFeedback}
      />

      {/* 2. Main Playback Area & Right-Side Queue Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-[380px] items-stretch">
        {/* Main Player Column (2/3 to 3/4 width on desktop) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between space-y-3">
          <div className="flex-1 flex flex-col justify-center">
            <VideoCanvas />
          </div>
          {/* Unified Two-Row Playback Controls Bar */}
          <PlayerControls />
        </div>

        {/* Up Next Queue Column (1/3 to 1/4 width on desktop, matches player height) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col h-full min-h-[260px]">
          <QueuePanel />
        </div>
      </div>

      {/* 3. Current Media Information Card */}
      <CurrentMediaInfo />
    </div>
  );
};
