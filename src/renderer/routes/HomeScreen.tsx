import React, { useState } from 'react';
import {
  Play,
  Plus,
  BookmarkPlus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Video,
  Music,
  Radio,
  Tv
} from 'lucide-react';
import { resolveSource } from '../adapters/sourceResolver';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useNavigationStore } from '../stores/navigationStore';

export const HomeScreen: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const { loadUrl, addToQueue } = usePlayerStore();
  const { saveItem, items } = useLibraryStore();
  const { setRoute } = useNavigationStore();

  const resolved = urlInput.trim() ? resolveSource(urlInput.trim()) : null;

  const handlePlayNow = async () => {
    if (!urlInput.trim()) return;
    const res = await loadUrl(urlInput.trim(), true);
    if (res.success) {
      setRoute('player');
    } else {
      setStatusMessage({ text: res.error || 'Failed to play link', type: 'error' });
    }
  };

  const handleAddToQueue = () => {
    if (!resolved || !resolved.success || !resolved.source) {
      setStatusMessage({ text: 'Please enter a valid supported URL first', type: 'error' });
      return;
    }
    addToQueue(resolved.source);
    setStatusMessage({ text: 'Added to playback queue', type: 'success' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveToLibrary = async () => {
    if (!urlInput.trim()) return;
    const res = await saveItem(urlInput.trim());
    if (res.success) {
      setStatusMessage({ text: 'Saved to personal media library', type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage({ text: res.error || 'Failed to save', type: 'error' });
    }
  };

  // Quick verified test streams for convenient demonstration & QA
  const testLinks = [
    {
      title: 'YouTube Test (Rick Astley)',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      type: 'youtube'
    },
    {
      title: 'Direct MP4 (Big Buck Bunny)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'direct-video'
    },
    {
      title: 'Direct MP4 (Elephants Dream)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      type: 'direct-video'
    },
    {
      title: 'HLS Live Stream (Akamai Test)',
      url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
      type: 'hls'
    }
  ];

  return (
    <div className="h-full overflow-y-auto p-8 max-w-5xl mx-auto space-y-10">
      {/* Hero Header */}
      <div className="space-y-3 text-center pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Infinite Seamless Looping & Privacy-First Playback</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
          Stream Online Media, <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">In Infinite Loops</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Play YouTube videos or direct media links in infinite repetition with custom intervals and local, cryptographic session tracking.
        </p>
      </div>

      {/* Main URL Input Card */}
      <div className="bg-[#121721] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="url-input" className="text-slate-300 font-medium">
              Media Link or Stream URL
            </label>
            {resolved && resolved.success && resolved.source && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                Detected: {resolved.source.sourceType.toUpperCase()}
              </span>
            )}
            {resolved && !resolved.success && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-[11px]">
                <AlertCircle className="w-3 h-3 text-red-400" />
                Invalid Source
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="url-input"
              type="text"
              placeholder="Paste YouTube watch/youtu.be link or direct .mp4, .webm, .m3u8 URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePlayNow()}
              className="flex-1 bg-[#181F2E] border border-white/10 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayNow}
              disabled={!urlInput.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-medium text-sm shadow-lg disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Now</span>
            </button>

            <button
              onClick={handleAddToQueue}
              disabled={!urlInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-sm font-medium disabled:opacity-40 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Queue</span>
            </button>

            <button
              onClick={handleSaveToLibrary}
              disabled={!urlInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-sm font-medium disabled:opacity-40 transition-colors"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>

          {statusMessage && (
            <p
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border animate-fadeIn ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/50 border-red-500/30 text-red-300'
              }`}
            >
              {statusMessage.text}
            </p>
          )}
        </div>
      </div>

      {/* Quick Verified Presets */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Quick Test Streams (Royalty-Free / Public)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {testLinks.map((test) => (
            <div
              key={test.url}
              onClick={() => {
                setUrlInput(test.url);
              }}
              className="p-3.5 rounded-xl bg-[#121721] hover:bg-[#181F2E] border border-white/5 hover:border-cyan-500/30 cursor-pointer transition-all group space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-300">
                  {test.type === 'youtube' && <Tv className="w-3 h-3" />}
                  {test.type === 'direct-video' && <Video className="w-3 h-3" />}
                  {test.type === 'hls' && <Radio className="w-3 h-3" />}
                  {test.type.toUpperCase()}
                </span>
                <Play className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>
              <p className="text-xs font-medium text-white truncate">
                {test.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Library Items */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Saved Media Items ({items.length})
            </h3>
            <button
              onClick={() => setRoute('library')}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View All &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {items.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={async () => {
                  await loadUrl(item.url, true, item.savedPositionSeconds);
                  setRoute('player');
                }}
                className="p-3 rounded-xl bg-[#121721] hover:bg-[#181F2E] border border-white/5 hover:border-cyan-500/30 cursor-pointer transition-all space-y-1 group"
              >
                <p className="text-xs font-medium text-white truncate group-hover:text-cyan-300 transition-colors">
                  {item.title}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{item.sourceType}</span>
                  {item.savedPositionSeconds > 0 && (
                    <span>Resume at {Math.floor(item.savedPositionSeconds)}s</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
