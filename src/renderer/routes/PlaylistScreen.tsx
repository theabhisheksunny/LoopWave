import React, { useState, useMemo, useRef } from 'react';
import {
  ListMusic,
  Plus,
  Link2,
  X,
  Search,
  Shuffle,
  Repeat,
  Repeat1,
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  Clock,
  CornerDownRight,
  AlertCircle,
  Sparkles,
  SlidersHorizontal,
  Layers,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { resolveSource } from '../adapters/sourceResolver';
import { PlaybackStatusBadge } from '../components/player/PlaybackStatusBadge';
import { getSourceIcon } from '../components/player/QueueItem';
import { formatTime, formatDuration as formatTotalDurationString } from '../../shared/defaults';

export const PlaylistScreen: React.FC = () => {
  const [newUrl, setNewUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'duration'>('default');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    queue,
    currentQueueIndex,
    adapterState,
    loopMode,
    playQueueItem,
    playNext,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    addToQueue,
    cycleLoopMode,
    shuffleQueue
  } = usePlayerStore();

  // Add Link Handler
  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    const res = resolveSource(newUrl.trim());
    if (!res.success || !res.source) {
      setErrorMsg(res.error || 'Invalid or unsupported media link');
      return;
    }

    addToQueue(res.source);
    setNewUrl('');
    setErrorMsg(null);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2500);
  };

  // Total Duration Calculation
  const { totalDuration, knownCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    queue.forEach((item, idx) => {
      const dur =
        item.source.duration ||
        (idx === currentQueueIndex && adapterState.duration > 0 ? adapterState.duration : 0);
      if (dur && dur > 0) {
        total += dur;
        count++;
      }
    });
    return { totalDuration: total, knownCount: count };
  }, [queue, currentQueueIndex, adapterState.duration]);

  // Filtered and Sorted queue with original index preservation
  const processedItems = useMemo(() => {
    const mapped = queue.map((item, originalIndex) => ({
      ...item,
      originalIndex,
      effectiveDuration:
        item.source.duration ||
        (originalIndex === currentQueueIndex && adapterState.duration > 0
          ? adapterState.duration
          : 0)
    }));

    // Filter
    const filtered = mapped.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const title = (item.source.title || item.source.videoId || '').toLowerCase();
      const url = item.source.canonicalUrl.toLowerCase();
      return title.includes(q) || url.includes(q);
    });

    // Sort
    if (sortBy === 'title') {
      filtered.sort((a, b) => {
        const titleA = a.source.title || a.source.canonicalUrl;
        const titleB = b.source.title || b.source.canonicalUrl;
        return titleA.localeCompare(titleB);
      });
    } else if (sortBy === 'duration') {
      filtered.sort((a, b) => (b.effectiveDuration || 0) - (a.effectiveDuration || 0));
    }

    return filtered;
  }, [queue, searchQuery, sortBy, currentQueueIndex, adapterState.duration]);

  return (
    <div className="h-full flex flex-col p-6 space-y-6 max-w-6xl mx-auto select-none overflow-y-auto">
      {/* 1. Page Header: Title, item count, Add Link button, and reserved space for modal close button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#293750]/80">
        {/* Left: Icon, Title & Dynamic Count Badge, Subtitle */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6547FF] to-[#3478FF] flex items-center justify-center shadow-lg shadow-[#6547FF]/20 shrink-0">
            <ListMusic className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-[#F5F7FF]">
                Playlist & Queue
              </h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#18243A] text-[#18D8E8] border border-[#293750] font-semibold">
                {queue.length} {queue.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-[#A5B4CF] mt-0.5 truncate">
              Organize your media and control what plays next.
            </p>
          </div>
        </div>

        {/* Right: Add Link Action + Dedicated Space for Modal Close Button */}
        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsAddFormOpen((prev) => !prev);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className={`h-10 flex items-center gap-2 px-4 rounded-xl text-xs font-semibold border transition-all ${
              isAddFormOpen
                ? 'bg-[#18243A] border-[#18D8E8] text-[#18D8E8] shadow-sm'
                : 'bg-gradient-to-r from-[#6547FF] to-[#3478FF] hover:from-[#573cf0] hover:to-[#2c69e6] border-transparent text-white shadow-md'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Link</span>
          </button>

          {/* Reserved layout slot specifically for modal close button from App.tsx */}
          <div className="w-10 h-10 shrink-0 hidden sm:block" aria-hidden="true" />
        </div>
      </div>

      {/* 2. Summary Cards: Equal Height, Consistent Alignment, No Label Clipping */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Total Items */}
        <div className="bg-[#111B2B] border border-[#293750] rounded-2xl p-4 min-h-[104px] flex flex-col justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#18243A] border border-[#293750] flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-[#3478FF]" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A5B4CF] font-medium truncate">
              Total Items
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-[#F5F7FF] tracking-tight">
              {queue.length}
            </div>
            <p className="text-[11px] text-[#A5B4CF] mt-0.5 truncate">
              {currentQueueIndex >= 0
                ? `Track #${currentQueueIndex + 1} playing • ${queue.length - 1} queued`
                : 'Playback idle • Queue ready'}
            </p>
          </div>
        </div>

        {/* Card 2: Total Duration */}
        <div className="bg-[#111B2B] border border-[#293750] rounded-2xl p-4 min-h-[104px] flex flex-col justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#18243A] border border-[#293750] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[#18D8E8]" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A5B4CF] font-medium truncate">
              Total Duration
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-[#F5F7FF] tracking-tight">
              {knownCount === 0 && queue.length > 0
                ? 'Unknown'
                : formatTotalDurationString(totalDuration)}
            </div>
            <p className="text-[11px] text-[#A5B4CF] mt-0.5 truncate">
              {queue.length === 0
                ? 'Queue empty'
                : knownCount === queue.length
                ? 'All track durations calculated'
                : knownCount === 0
                ? 'Durations load upon playback'
                : `(partial, ${knownCount} of ${queue.length} known)`}
            </p>
          </div>
        </div>

        {/* Card 3: Loop Mode with Cycle Trigger */}
        <div
          onClick={cycleLoopMode}
          className="bg-[#111B2B] hover:bg-[#18243A]/60 border border-[#293750] hover:border-[#6547FF]/50 rounded-2xl p-4 min-h-[104px] flex flex-col justify-between cursor-pointer transition-all group"
          title="Click card or button to cycle loop mode"
        >
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  loopMode === 'one'
                    ? 'bg-[#6547FF]/20 text-[#6547FF] border border-[#6547FF]/40'
                    : loopMode === 'all'
                    ? 'bg-[#18D8E8]/20 text-[#18D8E8] border border-[#18D8E8]/40'
                    : 'bg-[#18243A] text-[#A5B4CF] border border-[#293750]'
                }`}
              >
                {loopMode === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A5B4CF] font-medium truncate">
                Queue Loop Mode
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cycleLoopMode();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#18243A] group-hover:bg-[#6547FF]/20 text-[#A5B4CF] group-hover:text-[#F5F7FF] border border-[#293750] text-[10px] font-mono uppercase transition-colors shrink-0"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Cycle</span>
            </button>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-[#F5F7FF] capitalize tracking-tight">
              {loopMode === 'off' ? 'Off' : loopMode === 'one' ? 'Repeat One' : 'Repeat All'}
            </div>
            <p className="text-[11px] text-[#A5B4CF] mt-0.5 truncate">
              {loopMode === 'off'
                ? 'Playback stops when queue finishes'
                : loopMode === 'one'
                ? 'Repeats active track indefinitely'
                : 'Plays entire playlist in continuous loop'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Add-Link Form: Heading row, Input row with consistent height, and Secondary badges row */}
      {isAddFormOpen && (
        <div className="bg-[#111B2B] border border-[#293750] rounded-2xl p-4 shadow-lg space-y-3.5 animate-fadeIn">
          {/* Row 1: Section Heading on its own row */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#18D8E8]" />
            <h2 className="text-xs font-semibold text-[#F5F7FF] uppercase tracking-wider">
              Add Media Link to Queue
            </h2>
          </div>

          {/* Row 2: Input and Submit Action on their own row */}
          <form onSubmit={handleAddUrl} className="flex items-center gap-2.5">
            <div className="relative flex-1 flex items-center min-w-0">
              <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#A5B4CF]">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Paste video or audio stream URL (YouTube, MP4, HLS, MP3)..."
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full h-11 bg-[#080D17] border border-[#293750] focus:border-[#18D8E8] rounded-xl pl-10 pr-10 text-xs text-[#F5F7FF] placeholder-[#A5B4CF]/60 focus:outline-none transition-all"
              />
              {newUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setNewUrl('');
                    setErrorMsg(null);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 p-1.5 rounded-lg hover:bg-[#18243A] text-[#A5B4CF] hover:text-[#F5F7FF] transition-colors"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!newUrl.trim()}
              className="h-11 flex items-center gap-2 px-5 rounded-xl bg-gradient-to-r from-[#6547FF] to-[#3478FF] hover:from-[#573cf0] hover:to-[#2c69e6] text-white text-xs font-semibold shadow-md disabled:opacity-40 transition-transform active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Queue</span>
            </button>
          </form>

          {/* Row 3: Supported Formats on subtle secondary line */}
          <div className="flex items-center gap-2 pt-0.5 text-[11px] text-[#A5B4CF]">
            <span className="text-[#A5B4CF]/70 font-medium">Supported sources:</span>
            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded-md bg-[#18243A] border border-[#293750] text-[#F5F7FF]/90">
                YouTube
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#18243A] border border-[#293750] text-[#F5F7FF]/90">
                Direct MP4 / WebM
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#18243A] border border-[#293750] text-[#F5F7FF]/90">
                HLS (.m3u8)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#18243A] border border-[#293750] text-[#F5F7FF]/90">
                Audio (MP3 / AAC / OGG)
              </span>
            </div>
          </div>

          {/* Inline Validation Alerts */}
          {errorMsg && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FF667D]/10 border border-[#FF667D]/30 text-[#FF667D] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {addedSuccess && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#12C98A]/10 border border-[#12C98A]/30 text-[#12C98A] text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Media item added to queue successfully!</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Playlist Toolbar: Consistent 40px Control Heights, Responsive Layout */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#101827] border border-[#293750] rounded-2xl p-3">
        {/* Search & Filter */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A5B4CF] pointer-events-none" />
          <input
            type="text"
            placeholder="Search queue by title or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-[#18243A] border border-[#293750] focus:border-[#18D8E8] rounded-xl pl-9 pr-8 text-xs text-[#F5F7FF] placeholder-[#A5B4CF]/60 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A5B4CF] hover:text-[#F5F7FF]"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Toolbar Controls: Sort, Shuffle, Loop, Clear */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Sort Selector */}
          <div className="h-10 flex items-center gap-1.5 bg-[#18243A] border border-[#293750] rounded-xl px-3">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#A5B4CF]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-[#F5F7FF] focus:outline-none cursor-pointer"
            >
              <option value="default" className="bg-[#18243A] text-white">
                Queue Order
              </option>
              <option value="title" className="bg-[#18243A] text-white">
                Title (A-Z)
              </option>
              <option value="duration" className="bg-[#18243A] text-white">
                Duration (Longest)
              </option>
            </select>
          </div>

          {/* Shuffle Button */}
          <button
            type="button"
            onClick={shuffleQueue}
            disabled={queue.length <= 1}
            className="h-10 flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold bg-[#18243A] hover:bg-[#293750] border border-[#293750] text-[#A5B4CF] hover:text-white disabled:opacity-30 transition-colors"
            title="Randomize queue order"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>

          {/* Loop Mode Pill */}
          <button
            type="button"
            onClick={cycleLoopMode}
            className={`h-10 flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold border transition-all ${
              loopMode === 'one'
                ? 'bg-[#6547FF]/20 border-[#6547FF] text-[#6547FF]'
                : loopMode === 'all'
                ? 'bg-[#18D8E8]/20 border-[#18D8E8] text-[#18D8E8]'
                : 'bg-[#18243A] border-[#293750] text-[#A5B4CF] hover:text-white'
            }`}
            title="Toggle Repeat One / Repeat All / Off"
          >
            {loopMode === 'one' ? (
              <Repeat1 className="w-3.5 h-3.5" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
            <span className="capitalize">{loopMode}</span>
          </button>

          {/* Clear Queue with Distinct Destructive Styling */}
          {queue.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="h-10 flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold bg-[#FF667D]/10 hover:bg-[#FF667D]/20 border border-[#FF667D]/40 text-[#FF667D] transition-colors"
              title="Clear all tracks from queue"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Clear Confirmation Modal / Banner */}
      {showClearConfirm && (
        <div className="bg-[#FF667D]/10 border border-[#FF667D]/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#FF667D] shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#F5F7FF]">
                Clear entire queue of {queue.length} items?
              </p>
              <p className="text-[11px] text-[#A5B4CF]">
                Active playback will not be interrupted, but your queued list will be emptied.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                clearQueue();
                setShowClearConfirm(false);
              }}
              className="h-9 px-4 rounded-xl bg-[#FF667D] hover:bg-[#e65066] text-white text-xs font-bold transition-colors"
            >
              Confirm Clear
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="h-9 px-4 rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-white text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 5. Structured Queue Table / Card List */}
      <div className="flex-1 space-y-2">
        {/* Table Column Labels */}
        {processedItems.length > 0 && (
          <div className="hidden md:flex items-center justify-between px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-[#A5B4CF] border-b border-[#293750]/60">
            <div className="flex items-center gap-4 flex-1">
              <span className="w-8 text-center">#</span>
              <span className="w-8 text-center">Type</span>
              <span>Title & Source URL</span>
            </div>
            <div className="flex items-center gap-6 justify-end w-72">
              <span className="w-16 text-right">Duration</span>
              <span className="w-24 text-center">Status</span>
              <span className="w-28 text-right">Actions</span>
            </div>
          </div>
        )}

        {/* Empty State: Centered icon, heading, description, and prominent 44px primary action */}
        {processedItems.length === 0 ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-[#111B2B] border border-[#293750] rounded-3xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#18243A] border border-[#293750] flex items-center justify-center shadow-inner">
              <ListMusic className="w-8 h-8 text-[#6547FF]" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-bold text-[#F5F7FF]">
                {searchQuery ? 'No Matching Queue Items' : 'Your Queue is Empty'}
              </h3>
              <p className="text-xs text-[#A5B4CF] leading-relaxed">
                {searchQuery
                  ? `No queued items match "${searchQuery}". Clear your search query to view all items.`
                  : 'Add YouTube videos, direct MP4/WebM files, HLS live streams, or audio tracks to build your continuous playlist.'}
              </p>
            </div>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="h-10 px-4 rounded-xl bg-[#18243A] hover:bg-[#293750] border border-[#293750] text-[#18D8E8] text-xs font-semibold transition-colors"
              >
                Clear Search Query
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsAddFormOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="h-11 flex items-center gap-2 px-5 rounded-xl bg-gradient-to-r from-[#6547FF] to-[#3478FF] hover:from-[#573cf0] hover:to-[#2c69e6] text-white text-xs font-semibold shadow-lg shadow-[#6547FF]/20 transition-transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Link</span>
              </button>
            )}
          </div>
        ) : (
          processedItems.map((item) => {
            const isCurrent = item.originalIndex === currentQueueIndex;
            const isPlayed = currentQueueIndex >= 0 && item.originalIndex < currentQueueIndex;

            return (
              <div
                key={item.id}
                className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-[#18243A] border-[#18D8E8] shadow-[0_0_20px_rgba(24,216,232,0.12)]'
                    : 'bg-[#111B2B] hover:bg-[#18243A]/70 border-[#293750]'
                }`}
              >
                {/* Left: Index + Type Icon + Title / Canonical URL */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1 w-full md:w-auto">
                  {/* Position number */}
                  <span className="font-mono text-xs font-bold text-[#A5B4CF] w-8 text-center shrink-0">
                    #{item.originalIndex + 1}
                  </span>

                  {/* Format icon */}
                  <div className="w-9 h-9 rounded-xl bg-[#101827] border border-[#293750] flex items-center justify-center shrink-0">
                    {getSourceIcon(item.source.sourceType)}
                  </div>

                  {/* Title and URL details with proper overflow handling */}
                  <div className="min-w-0 flex-1 pr-2">
                    <p
                      className={`font-semibold text-xs truncate block ${
                        isCurrent ? 'text-[#F5F7FF]' : 'text-[#F5F7FF]/90'
                      }`}
                      title={item.source.title || item.source.canonicalUrl}
                    >
                      {item.source.title || item.source.videoId || item.source.canonicalUrl}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#A5B4CF] font-mono min-w-0">
                      <span className="uppercase font-bold tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-[#101827] border border-[#293750] text-[#18D8E8] shrink-0">
                        {item.source.sourceType}
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-md text-[#A5B4CF]/80" title={item.source.canonicalUrl}>
                        {item.source.canonicalUrl}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Duration + Status Badge + Action Buttons */}
                <div className="flex items-center justify-between md:justify-end gap-3.5 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#293750]/50">
                  {/* Duration */}
                  <div className="w-16 text-left md:text-right font-mono text-xs text-[#A5B4CF] shrink-0">
                    {formatTime(item.effectiveDuration)}
                  </div>

                  {/* Status Badge */}
                  <div className="w-24 flex justify-center shrink-0">
                    {isCurrent ? (
                      <PlaybackStatusBadge status={adapterState.status} />
                    ) : isPlayed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium bg-[#18243A] border-[#293750] text-[#A5B4CF]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A5B4CF]" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">
                          Played
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium bg-[#18243A] border-[#293750] text-[#3478FF]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3478FF]" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">
                          Queued
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Row Actions: Standard 36px Action Height */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Play Now */}
                    <button
                      type="button"
                      onClick={() => playQueueItem(item.originalIndex)}
                      className={`h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        isCurrent
                          ? 'bg-[#18D8E8]/20 border-[#18D8E8]/60 text-[#18D8E8]'
                          : 'bg-[#18243A] hover:bg-[#18D8E8]/20 border-[#293750] hover:border-[#18D8E8]/40 text-[#F5F7FF] hover:text-[#18D8E8]'
                      }`}
                      title={isCurrent ? 'Currently playing' : 'Play this item now'}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isCurrent ? 'Active' : 'Play'}</span>
                    </button>

                    {/* Play Next (omitted if current or next item) */}
                    {!isCurrent && item.originalIndex !== currentQueueIndex + 1 && (
                      <button
                        type="button"
                        onClick={() => playNext(item.originalIndex)}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#18D8E8] border border-[#293750] transition-colors"
                        title="Play Next (place directly after current item)"
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Move Up */}
                    <button
                      type="button"
                      onClick={() =>
                        reorderQueue(item.originalIndex, Math.max(0, item.originalIndex - 1))
                      }
                      disabled={item.originalIndex === 0}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] border border-[#293750] disabled:opacity-20 transition-colors"
                      title="Move up in queue"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      onClick={() =>
                        reorderQueue(
                          item.originalIndex,
                          Math.min(queue.length - 1, item.originalIndex + 1)
                        )
                      }
                      disabled={item.originalIndex === queue.length - 1}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] border border-[#293750] disabled:opacity-20 transition-colors"
                      title="Move down in queue"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeFromQueue(item.originalIndex)}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-[#FF667D]/10 hover:bg-[#FF667D]/20 text-[#FF667D] border border-[#FF667D]/30 transition-colors"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
