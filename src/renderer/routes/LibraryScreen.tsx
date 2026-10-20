import React, { useState, useMemo, useRef } from 'react';
import {
  FolderHeart,
  Search,
  Star,
  Play,
  Plus,
  Trash2,
  Upload,
  Download,
  FolderPlus,
  Clock,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Filter,
  X,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Folder,
  Layers,
  Sparkles,
  Link2,
  RefreshCw
} from 'lucide-react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { useNavigationStore } from '../stores/navigationStore';
import { resolveSource } from '../adapters/sourceResolver';
import { LibraryItem, SourceType } from '../../shared/types';
import { getSourceIcon } from '../components/player/QueueItem';

export const LibraryScreen: React.FC = () => {
  const {
    items,
    collections,
    selectedCollectionId,
    searchQuery,
    onlyFavorites,
    isLoading,
    error,
    setSelectedCollectionId,
    setSearchQuery,
    setOnlyFavorites,
    saveItem,
    removeItem,
    toggleFavorite,
    saveCollection,
    deleteCollection,
    loadAll,
    exportLibrary,
    importLibrary
  } = useLibraryStore();

  const { loadUrl, addToQueue } = usePlayerStore();
  const { closeModal } = useNavigationStore();

  // Local UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sourceFilter, setSourceFilter] = useState<'all' | SourceType>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title-asc' | 'title-desc' | 'position'>('recent');

  // Dialogs & Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTargetCollection, setNewTargetCollection] = useState('default');
  const [addError, setAddError] = useState<string | null>(null);

  // Collection Management Modals
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);
  const [collectionNameInput, setCollectionNameInput] = useState('');
  const [collectionDescInput, setCollectionDescInput] = useState('');
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [deletingCollectionId, setDeletingCollectionId] = useState<string | null>(null);

  // Feedback Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success', duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), duration);
  };

  // Helper for source badge labels
  const getSourceBadge = (type: string) => {
    switch (type) {
      case 'youtube':
        return (
          <span className="px-1.5 py-0.5 rounded bg-[#FF334B]/15 text-[#FF334B] border border-[#FF334B]/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            YouTube
          </span>
        );
      case 'direct-video':
        return (
          <span className="px-1.5 py-0.5 rounded bg-[#3478FF]/15 text-[#3478FF] border border-[#3478FF]/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            Video
          </span>
        );
      case 'direct-audio':
        return (
          <span className="px-1.5 py-0.5 rounded bg-[#12C98A]/15 text-[#12C98A] border border-[#12C98A]/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            Audio
          </span>
        );
      case 'hls':
        return (
          <span className="px-1.5 py-0.5 rounded bg-[#18D8E8]/15 text-[#18D8E8] border border-[#18D8E8]/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            HLS
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded bg-[#18243A] text-[#A5B4CF] border border-[#293750] text-[10px] font-mono font-bold uppercase tracking-wider">
            {type}
          </span>
        );
    }
  };

  // Filtered & Sorted items
  const processedItems = useMemo(() => {
    const result = items.filter((item) => {
      // Collection filter
      if (selectedCollectionId !== 'all' && item.collectionId !== selectedCollectionId) {
        return false;
      }
      // Favorites filter
      if (onlyFavorites && !item.isFavorite) {
        return false;
      }
      // Source filter
      if (sourceFilter !== 'all' && item.sourceType !== sourceFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchUrl = item.url.toLowerCase().includes(q);
        const matchId = item.videoId.toLowerCase().includes(q);
        return matchTitle || matchUrl || matchId;
      }
      return true;
    });

    // Sort items
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'position':
          return (b.savedPositionSeconds || 0) - (a.savedPositionSeconds || 0);
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [items, selectedCollectionId, onlyFavorites, sourceFilter, searchQuery, sortBy]);

  // Handle Play item
  const handlePlayItem = async (item: LibraryItem) => {
    await loadUrl(item.url, true, item.savedPositionSeconds);
    closeModal();
  };

  // Handle Add to Queue
  const handleAddToQueue = (item: LibraryItem) => {
    const res = resolveSource(item.url);
    if (res.success && res.source) {
      addToQueue(res.source);
      showNotification(`"${item.title}" added to queue!`, 'success');
    } else {
      showNotification('Could not resolve link for queue', 'error');
    }
  };

  // Handle Save New Item
  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    const res = await saveItem(
      newUrl.trim(),
      newTitle.trim() || undefined,
      newTargetCollection
    );

    if (res.success) {
      setNewUrl('');
      setNewTitle('');
      setIsAddModalOpen(false);
      setAddError(null);
      showNotification('Link saved to media library!', 'success');
    } else {
      setAddError(res.error || 'Failed to save link');
    }
  };

  // Handle Save Collection (Create or Rename)
  const handleSaveCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionNameInput.trim()) return;

    await saveCollection(
      collectionNameInput.trim(),
      collectionDescInput.trim() || undefined,
      editingCollectionId || undefined
    );

    setCollectionNameInput('');
    setCollectionDescInput('');
    setEditingCollectionId(null);
    setIsAddCollectionOpen(false);
    showNotification(editingCollectionId ? 'Collection renamed!' : 'Collection created!', 'success');
  };

  // Handle Delete Collection
  const handleConfirmDeleteCollection = async () => {
    if (!deletingCollectionId) return;
    await deleteCollection(deletingCollectionId);
    if (selectedCollectionId === deletingCollectionId) {
      setSelectedCollectionId('all');
    }
    setDeletingCollectionId(null);
    showNotification('Collection removed. Items moved to My Library.', 'success');
  };

  // Handle JSON Import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = await importLibrary(content);
        if (res.success) {
          showNotification(`Successfully imported ${res.count ?? 0} library items!`, 'success');
        } else {
          showNotification(res.error || 'Import failed. Invalid file format.', 'error');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Find collection name helper
  const getCollectionName = (id: string) => {
    if (id === 'default') return 'My Library';
    const found = collections.find((c) => c.id === id);
    return found ? found.name : 'My Library';
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-5 max-w-7xl mx-auto select-none overflow-y-auto">
      {/* 1. Page Header: Title, item count, secondary Import/Export group, primary Add Link, and reserved clearance */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#293750]/80">
        {/* Left: Icon, Title & Dynamic Count Badge, Subtitle */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6547FF] to-[#3478FF] flex items-center justify-center shadow-lg shadow-[#6547FF]/20 shrink-0">
            <FolderHeart className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-[#F5F7FF] whitespace-nowrap">
                Media Library
              </h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#18243A] text-[#18D8E8] border border-[#293750] font-semibold shrink-0">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-[#A5B4CF] mt-0.5 truncate">
              Your saved video and audio links, organized your way.
            </p>
          </div>
        </div>

        {/* Right: Actions Group (Secondary Import/Export, Primary Add Link) + Reserved Clearance Slot */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 flex-wrap sm:flex-nowrap">
          {/* Grouped Secondary Actions: Import & Export */}
          <div className="flex items-center bg-[#18243A] border border-[#293750] rounded-xl p-1 gap-1 shadow-sm">
            {/* Import JSON */}
            <label
              className="h-8 flex items-center gap-1.5 px-3 rounded-lg hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] text-xs font-medium cursor-pointer transition-colors"
              title="Import library from JSON file"
            >
              <Upload className="w-3.5 h-3.5 text-[#18D8E8]" />
              <span>Import</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            <div className="w-[1px] h-4 bg-[#293750]" aria-hidden="true" />

            {/* Export JSON */}
            <button
              type="button"
              onClick={exportLibrary}
              disabled={items.length === 0}
              className="h-8 flex items-center gap-1.5 px-3 rounded-lg hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] text-xs font-medium disabled:opacity-40 transition-colors"
              title="Export library as JSON file"
            >
              <Download className="w-3.5 h-3.5 text-[#3478FF]" />
              <span>Export</span>
            </button>
          </div>

          {/* Primary Action: Add Link */}
          <button
            type="button"
            onClick={() => {
              setNewTargetCollection(selectedCollectionId !== 'all' ? selectedCollectionId : 'default');
              setIsAddModalOpen(true);
            }}
            className="h-10 flex items-center gap-2 px-4 rounded-xl bg-gradient-to-r from-[#6547FF] to-[#3478FF] hover:from-[#573cf0] hover:to-[#2c69e6] text-white text-xs font-semibold shadow-md shadow-[#6547FF]/25 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="whitespace-nowrap">Add Link</span>
          </button>

          {/* Reserved clearance slot for App.tsx top-right modal close button */}
          <div className="w-10 h-10 shrink-0 hidden sm:block" aria-hidden="true" />
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-medium animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-[#12C98A]/10 border-[#12C98A]/30 text-[#12C98A]'
              : 'bg-[#FF667D]/10 border-[#FF667D]/30 text-[#FF667D]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 2. Collection Navigation Bar */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 no-scrollbar">
        {/* Navigation Tabs Row */}
        <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
          {/* All Media Tab */}
          <button
            type="button"
            onClick={() => {
              setSelectedCollectionId('all');
              setOnlyFavorites(false);
            }}
            className={`h-9 flex items-center gap-2 px-3.5 rounded-xl text-xs font-medium border transition-all shrink-0 ${
              selectedCollectionId === 'all' && !onlyFavorites
                ? 'bg-[#18D8E8]/15 border-[#18D8E8]/60 text-[#18D8E8] shadow-sm font-semibold'
                : 'bg-[#18243A]/40 hover:bg-[#18243A] border-transparent hover:border-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Media</span>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-[#080D17]/50 text-inherit font-semibold">
              {items.length}
            </span>
          </button>

          {/* Favorites Tab */}
          <button
            type="button"
            onClick={() => {
              setOnlyFavorites(!onlyFavorites);
              if (!onlyFavorites) setSelectedCollectionId('all');
            }}
            className={`h-9 flex items-center gap-2 px-3.5 rounded-xl text-xs font-medium border transition-all shrink-0 ${
              onlyFavorites
                ? 'bg-amber-500/15 border-amber-400/60 text-amber-300 shadow-sm font-semibold'
                : 'bg-[#18243A]/40 hover:bg-[#18243A] border-transparent hover:border-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF]'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current text-amber-400' : ''}`} />
            <span>Favorites</span>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-[#080D17]/50 text-inherit font-semibold">
              {items.filter((i) => i.isFavorite).length}
            </span>
          </button>

          {/* Custom Collection Tabs */}
          {collections.map((c) => {
            const count = items.filter((i) => i.collectionId === c.id).length;
            const isSelected = selectedCollectionId === c.id && !onlyFavorites;

            return (
              <div key={c.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCollectionId(c.id);
                    setOnlyFavorites(false);
                  }}
                  className={`h-9 flex items-center gap-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-[#6547FF]/25 border-[#6547FF]/70 text-[#F5F7FF] shadow-sm font-semibold'
                      : 'bg-[#18243A]/40 hover:bg-[#18243A] border-transparent hover:border-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF]'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-[#3478FF]" />
                  <span>{c.name}</span>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-[#080D17]/50 text-inherit font-semibold">
                    {count}
                  </span>
                </button>

                {/* Edit / Delete Contextual Actions for Selected Custom Collection */}
                {c.id !== 'default' && isSelected && (
                  <div className="flex items-center ml-1.5 gap-0.5 bg-[#18243A] border border-[#293750] rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCollectionId(c.id);
                        setCollectionNameInput(c.name);
                        setCollectionDescInput(c.description || '');
                        setIsAddCollectionOpen(true);
                      }}
                      className="p-1 rounded text-[#A5B4CF] hover:text-[#18D8E8] hover:bg-[#293750] transition-colors"
                      title={`Rename "${c.name}"`}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCollectionId(c.id)}
                      className="p-1 rounded text-[#A5B4CF] hover:text-[#FF667D] hover:bg-[#293750] transition-colors"
                      title={`Delete "${c.name}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* New Collection Action Button */}
        <button
          type="button"
          onClick={() => {
            setEditingCollectionId(null);
            setCollectionNameInput('');
            setCollectionDescInput('');
            setIsAddCollectionOpen(true);
          }}
          className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-[#18243A] hover:bg-[#293750] border border-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] text-xs font-semibold transition-colors shrink-0 ml-auto sm:ml-0"
          title="Create a new collection"
        >
          <FolderPlus className="w-3.5 h-3.5 text-[#18D8E8]" />
          <span className="whitespace-nowrap">New Collection</span>
        </button>
      </div>

      {/* 3. Search and Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#101827] border border-[#293750] rounded-2xl p-3 shadow-sm">
        {/* Search Input with Guaranteed Icon Spacing */}
        <div className="relative flex-1 min-w-[220px]">
          <div className="w-10 h-10 absolute left-0 top-0 flex items-center justify-center pointer-events-none">
            <Search className="w-4 h-4 text-[#A5B4CF]" />
          </div>
          <input
            type="text"
            placeholder="Search by title, URL, or video ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-[#18243A] border border-[#293750] focus:border-[#18D8E8] rounded-xl pl-10 pr-9 text-xs text-[#F5F7FF] placeholder-[#A5B4CF]/60 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-8 h-8 absolute right-1 top-1 flex items-center justify-center rounded-lg text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#293750] transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls: Source, Sort, and Grid/List View Toggles */}
        <div className="flex items-center gap-2.5 flex-wrap justify-start lg:justify-end shrink-0">
          {/* Source Filter Dropdown */}
          <div className="h-10 flex items-center gap-2 bg-[#18243A] border border-[#293750] rounded-xl px-3" title="Filter by source format">
            <Filter className="w-3.5 h-3.5 text-[#A5B4CF] shrink-0" />
            <span className="text-xs font-medium text-[#A5B4CF]">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="bg-transparent text-xs text-[#F5F7FF] focus:outline-none cursor-pointer font-medium"
              aria-label="Filter by source format"
            >
              <option value="all" className="bg-[#18243A] text-white">All Sources</option>
              <option value="youtube" className="bg-[#18243A] text-white">YouTube</option>
              <option value="direct-video" className="bg-[#18243A] text-white">Direct Video</option>
              <option value="direct-audio" className="bg-[#18243A] text-white">Direct Audio</option>
              <option value="hls" className="bg-[#18243A] text-white">Live Stream (HLS)</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="h-10 flex items-center gap-2 bg-[#18243A] border border-[#293750] rounded-xl px-3" title="Sort library items">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#A5B4CF] shrink-0" />
            <span className="text-xs font-medium text-[#A5B4CF]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-[#F5F7FF] focus:outline-none cursor-pointer font-medium"
              aria-label="Sort library items"
            >
              <option value="recent" className="bg-[#18243A] text-white">Recently Added</option>
              <option value="title-asc" className="bg-[#18243A] text-white">Title (A-Z)</option>
              <option value="title-desc" className="bg-[#18243A] text-white">Title (Z-A)</option>
              <option value="position" className="bg-[#18243A] text-white">Saved Position</option>
            </select>
          </div>

          {/* View Mode Switcher: Grid vs List */}
          <div className="h-10 flex items-center bg-[#18243A] border border-[#293750] rounded-xl p-1 gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#111B2B] text-[#18D8E8] shadow-sm'
                  : 'text-[#A5B4CF] hover:text-[#F5F7FF]'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#111B2B] text-[#18D8E8] shadow-sm'
                  : 'text-[#A5B4CF] hover:text-[#F5F7FF]'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Media Content Area: Loading, Error, Empty, Grid, or List */}
      {isLoading ? (
        <div className="min-h-[260px] flex flex-col items-center justify-center text-center p-8 bg-[#111B2B] border border-[#293750] rounded-3xl space-y-3">
          <RefreshCw className="w-7 h-7 text-[#18D8E8] animate-spin" />
          <p className="text-xs text-[#A5B4CF]">Loading your media library...</p>
        </div>
      ) : error ? (
        <div className="min-h-[260px] flex flex-col items-center justify-center text-center p-8 bg-[#FF667D]/10 border border-[#FF667D]/30 rounded-3xl space-y-3">
          <AlertCircle className="w-8 h-8 text-[#FF667D]" />
          <h3 className="text-sm font-bold text-[#F5F7FF]">Failed to load library</h3>
          <p className="text-xs text-[#A5B4CF] max-w-md">{error}</p>
          <button
            type="button"
            onClick={loadAll}
            className="h-9 px-4 rounded-xl bg-[#18243A] hover:bg-[#293750] border border-[#293750] text-[#18D8E8] text-xs font-semibold transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : processedItems.length === 0 ? (
        /* Empty State */
        <div className="min-h-[260px] py-10 px-6 flex flex-col items-center justify-center text-center bg-[#111B2B] border border-[#293750] rounded-3xl space-y-3.5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#18243A] border border-[#293750] flex items-center justify-center shadow-inner">
            <FolderHeart className="w-7 h-7 text-[#6547FF]" />
          </div>

          <div className="max-w-md space-y-1">
            <h3 className="text-base font-bold text-[#F5F7FF]">
              {items.length === 0
                ? 'Your Library is Empty'
                : 'No Matching Media Found'}
            </h3>
            <p className="text-xs text-[#A5B4CF] leading-relaxed max-w-sm mx-auto">
              {items.length === 0
                ? 'Save your favorite YouTube videos, MP4 links, live HLS streams, and audio tracks to build your personal looping library.'
                : 'No saved links match your active search and filter criteria. Clear or reset your filters to see all items.'}
            </p>
          </div>

          {items.length === 0 ? (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 flex items-center gap-2 px-5 rounded-xl bg-gradient-to-r from-[#6547FF] to-[#3478FF] hover:from-[#573cf0] hover:to-[#2c69e6] text-white text-xs font-semibold shadow-md shadow-[#6547FF]/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Link</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSourceFilter('all');
                setOnlyFavorites(false);
                setSelectedCollectionId('all');
              }}
              className="h-9 px-4 rounded-xl bg-[#18243A] hover:bg-[#293750] border border-[#293750] text-[#18D8E8] text-xs font-semibold transition-colors"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {processedItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#111B2B] hover:bg-[#18243A]/60 border border-[#293750] hover:border-[#18D8E8]/40 rounded-2xl overflow-hidden transition-all flex flex-col justify-between group shadow-sm hover:shadow-lg"
            >
              {/* 16:9 Thumbnail Header */}
              <div className="aspect-video w-full bg-[#101827] relative overflow-hidden flex items-center justify-center shrink-0">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#18243A] border border-[#293750] flex items-center justify-center">
                    {getSourceIcon(item.sourceType, 'w-6 h-6')}
                  </div>
                )}

                {/* Source Badge (Top-Left) */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  {getSourceBadge(item.sourceType)}
                </div>

                {/* Favorite Star Button (Top-Right) */}
                <button
                  type="button"
                  onClick={() => toggleFavorite(item.id)}
                  className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg bg-[#080D17]/70 hover:bg-[#080D17] backdrop-blur-sm border border-[#293750] text-slate-400 hover:text-amber-400 transition-colors"
                  title={item.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      item.isFavorite ? 'text-amber-400 fill-current' : ''
                    }`}
                  />
                </button>

                {/* Saved Position Overlay (Bottom-Right) */}
                {item.savedPositionSeconds > 0 && (
                  <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#080D17]/85 backdrop-blur-sm text-[10px] text-[#18D8E8] font-mono border border-[#293750]/60">
                    <Clock className="w-3 h-3" />
                    <span>{Math.floor(item.savedPositionSeconds)}s</span>
                  </div>
                )}
              </div>

              {/* Information Region */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h4
                    className="text-xs font-semibold text-[#F5F7FF] line-clamp-2 leading-snug min-h-[32px] block"
                    title={item.title}
                  >
                    {item.title}
                  </h4>

                  <p
                    className="text-[11px] font-mono text-[#A5B4CF] truncate mt-1 block"
                    title={item.url}
                  >
                    {item.url}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 text-[10px] text-[#A5B4CF] font-mono border-t border-[#293750]/40">
                  <span className="truncate max-w-[130px] text-[#3478FF] font-medium">
                    {getCollectionName(item.collectionId)}
                  </span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Card Actions Row */}
              <div className="px-3.5 pb-3.5 pt-2 flex items-center justify-between gap-2 border-t border-[#293750]/30">
                <div className="flex items-center gap-1.5">
                  {/* Play Button */}
                  <button
                    type="button"
                    onClick={() => handlePlayItem(item)}
                    className="h-8 flex items-center gap-1 px-2.5 rounded-lg bg-[#18D8E8]/20 hover:bg-[#18D8E8]/30 border border-[#18D8E8]/40 text-[#18D8E8] text-xs font-semibold transition-colors"
                    title="Play now in Main Player"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play</span>
                  </button>

                  {/* Add to Queue Button */}
                  <button
                    type="button"
                    onClick={() => handleAddToQueue(item)}
                    className="h-8 flex items-center gap-1 px-2.5 rounded-lg bg-[#18243A] hover:bg-[#293750] border border-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] text-xs font-semibold transition-colors"
                    title="Add to Playback Queue"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Queue</span>
                  </button>
                </div>

                {/* Remove from Library */}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#FF667D]/10 hover:bg-[#FF667D]/20 border border-[#FF667D]/30 text-[#FF667D] transition-colors"
                  title="Remove from library"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2">
          {processedItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-[#111B2B] hover:bg-[#18243A]/60 border border-[#293750] rounded-2xl transition-all"
            >
              {/* Left: Thumbnail Preview, Title, and Canonical URL */}
              <div className="flex items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
                <div className="w-16 aspect-video rounded-xl bg-[#101827] border border-[#293750] overflow-hidden flex items-center justify-center shrink-0 relative">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    getSourceIcon(item.sourceType, 'w-4 h-4')
                  )}
                </div>

                <div className="min-w-0 flex-1 pr-2">
                  <h4
                    className="text-xs font-semibold text-[#F5F7FF] truncate block"
                    title={item.title}
                  >
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#A5B4CF] font-mono min-w-0 flex-wrap">
                    {getSourceBadge(item.sourceType)}
                    <span>•</span>
                    <span className="truncate max-w-xs sm:max-w-md text-[#A5B4CF]/80" title={item.url}>
                      {item.url}
                    </span>
                    {item.savedPositionSeconds > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-[#18D8E8]">{Math.floor(item.savedPositionSeconds)}s saved</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Collection Pill and Action Buttons */}
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#293750]/50">
                {/* Collection Tag */}
                <span className="text-[10px] font-mono text-[#3478FF] px-2 py-0.5 rounded bg-[#18243A] border border-[#293750] shrink-0 font-medium">
                  {getCollectionName(item.collectionId)}
                </span>

                {/* Row Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePlayItem(item)}
                    className="h-8 flex items-center gap-1 px-2.5 rounded-lg bg-[#18D8E8]/20 hover:bg-[#18D8E8]/30 border border-[#18D8E8]/40 text-[#18D8E8] text-xs font-semibold transition-colors"
                    title="Play now in Main Player"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddToQueue(item)}
                    className="h-8 flex items-center gap-1 px-2.5 rounded-lg bg-[#18243A] hover:bg-[#293750] border border-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] text-xs font-semibold transition-colors"
                    title="Add to Playback Queue"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Queue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-amber-400 border border-[#293750] transition-colors"
                    title={item.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        item.isFavorite ? 'text-amber-400 fill-current' : ''
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#FF667D]/10 hover:bg-[#FF667D]/20 text-[#FF667D] border border-[#FF667D]/30 transition-colors"
                    title="Remove from library"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Add Link Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-[#080D17]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#111B2B] border border-[#293750] rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#293750]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6547FF] to-[#3478FF] flex items-center justify-center shadow-md">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-[#F5F7FF]">Add Link to Media Library</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddError(null);
                }}
                className="p-1.5 rounded-xl hover:bg-[#18243A] text-[#A5B4CF] hover:text-[#F5F7FF] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} className="space-y-4">
              {/* URL Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A5B4CF] block">Media URL *</label>
                <div className="relative flex items-center">
                  <Link2 className="w-4 h-4 absolute left-3.5 text-[#A5B4CF] pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="https://www.youtube.com/watch?v=... or .mp4 link"
                    value={newUrl}
                    onChange={(e) => {
                      setNewUrl(e.target.value);
                      if (addError) setAddError(null);
                    }}
                    className="w-full h-11 bg-[#080D17] border border-[#293750] focus:border-[#18D8E8] rounded-xl pl-10 pr-4 text-xs text-[#F5F7FF] placeholder-[#A5B4CF]/60 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A5B4CF] block">Custom Title (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty to use automatic title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-11 bg-[#080D17] border border-[#293750] focus:border-[#18D8E8] rounded-xl px-4 text-xs text-[#F5F7FF] placeholder-[#A5B4CF]/60 focus:outline-none transition-all"
                />
              </div>

              {/* Collection Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A5B4CF] block">Target Collection</label>
                <select
                  value={newTargetCollection}
                  onChange={(e) => setNewTargetCollection(e.target.value)}
                  className="w-full h-11 bg-[#080D17] border border-[#293750] focus:border-[#18D8E8] rounded-xl px-4 text-xs text-[#F5F7FF] focus:outline-none cursor-pointer"
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#18243A] text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error Feedback */}
              {addError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FF667D]/10 border border-[#FF667D]/30 text-[#FF667D] text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Dialog Footer Actions */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setAddError(null);
                  }}
                  className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newUrl.trim()}
                  className="h-10 px-5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#6547FF] to-[#3478FF] hover:from-[#573cf0] hover:to-[#2c69e6] text-white shadow-md disabled:opacity-40 transition-transform active:scale-95"
                >
                  Save to Library
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Collection Modal (Create or Rename) */}
      {isAddCollectionOpen && (
        <div className="fixed inset-0 bg-[#080D17]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#111B2B] border border-[#293750] rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#293750]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6547FF] to-[#3478FF] flex items-center justify-center shadow-md">
                  <FolderPlus className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-[#F5F7FF]">
                  {editingCollectionId ? 'Rename Collection' : 'Create New Collection'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCollectionOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#18243A] text-[#A5B4CF] hover:text-[#F5F7FF] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCollectionSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A5B4CF] block">Collection Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ambient Chill, Lo-Fi, Deep Work"
                  value={collectionNameInput}
                  onChange={(e) => setCollectionNameInput(e.target.value)}
                  className="w-full h-11 bg-[#080D17] border border-[#293750] focus:border-[#18D8E8] rounded-xl px-4 text-xs text-[#F5F7FF] placeholder-[#A5B4CF]/60 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A5B4CF] block">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Short description of this collection"
                  value={collectionDescInput}
                  onChange={(e) => setCollectionDescInput(e.target.value)}
                  className="w-full h-11 bg-[#080D17] border border-[#293750] focus:border-[#18D8E8] rounded-xl px-4 text-xs text-[#F5F7FF] placeholder-[#A5B4CF]/60 focus:outline-none transition-all"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCollectionOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!collectionNameInput.trim()}
                  className="h-10 px-5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#6547FF] to-[#3478FF] hover:from-[#573cf0] hover:to-[#2c69e6] text-white shadow-md disabled:opacity-40 transition-transform active:scale-95"
                >
                  {editingCollectionId ? 'Save Changes' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Collection Delete Confirmation Modal */}
      {deletingCollectionId && (
        <div className="fixed inset-0 bg-[#080D17]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#111B2B] border border-[#FF667D]/40 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FF667D]/10 border border-[#FF667D]/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-[#FF667D]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F7FF]">Delete Collection?</h3>
                <p className="text-xs text-[#A5B4CF] mt-0.5">
                  Collection "{collections.find((c) => c.id === deletingCollectionId)?.name}" will be removed. All saved media will be kept in My Library.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCollectionId(null)}
                className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCollection}
                className="h-9 px-4 rounded-xl text-xs font-bold bg-[#FF667D] hover:bg-[#e65066] text-white shadow-md transition-colors"
              >
                Delete Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
