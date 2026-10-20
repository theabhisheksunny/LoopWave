import React, { useState } from 'react';
import { ListMusic, Bookmark, ArrowLeft } from 'lucide-react';
import { VideoCanvas } from '../components/player/VideoCanvas';
import { PlayerControls } from '../components/player/PlayerControls';
import { QueueDrawer } from '../components/player/QueueDrawer';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useNavigationStore } from '../stores/navigationStore';

export const PlayerScreen: React.FC = () => {
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const { currentSource, queue } = usePlayerStore();
  const { saveItem, items } = useLibraryStore();
  const { setRoute } = useNavigationStore();

  const isSaved = currentSource
    ? items.some((i) => i.url === currentSource.canonicalUrl)
    : false;

  const handleToggleSave = async () => {
    if (!currentSource) return;
    if (!isSaved) {
      await saveItem(currentSource.canonicalUrl, currentSource.title);
    }
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main playback viewport */}
      <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setRoute('home')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white truncate">
                {currentSource ? currentSource.title || currentSource.videoId : 'No Media Selected'}
              </h2>
              {currentSource && (
                <p className="text-xs text-slate-400 font-mono truncate">
                  {currentSource.canonicalUrl}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentSource && (
              <button
                onClick={handleToggleSave}
                disabled={isSaved}
                className={`p-2 rounded-xl border transition-colors ${
                  isSaved
                    ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
                title={isSaved ? 'Saved in library' : 'Save to library'}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}

            <button
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                isQueueOpen
                  ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4" />
              <span>Queue ({queue.length})</span>
            </button>
          </div>
        </div>

        {/* Video Canvas */}
        <div className="flex-1 flex items-center justify-center">
          <VideoCanvas />
        </div>

        {/* Player Controls */}
        <PlayerControls />
      </div>

      {/* Side Queue Drawer */}
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
    </div>
  );
};
