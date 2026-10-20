import React, { useState } from 'react';
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
  Tv,
  Video,
  Radio,
  Clock
} from 'lucide-react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { useNavigationStore } from '../stores/navigationStore';

export const LibraryScreen: React.FC = () => {
  const {
    items,
    collections,
    selectedCollectionId,
    searchQuery,
    onlyFavorites,
    setSelectedCollectionId,
    setSearchQuery,
    setOnlyFavorites,
    saveItem,
    removeItem,
    toggleFavorite,
    saveCollection,
    deleteCollection,
    clearLibrary,
    exportLibrary,
    importLibrary
  } = useLibraryStore();

  const { loadUrl, addToQueue } = usePlayerStore();
  const { setRoute } = useNavigationStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filter items
  const filteredItems = items.filter((item) => {
    if (selectedCollectionId !== 'all' && item.collectionId !== selectedCollectionId) {
      return false;
    }
    if (onlyFavorites && !item.isFavorite) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        item.videoId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSaveNewItem = async () => {
    if (!newUrl.trim()) return;
    const res = await saveItem(
      newUrl.trim(),
      newTitle.trim() || undefined,
      selectedCollectionId !== 'all' ? selectedCollectionId : 'default'
    );
    if (res.success) {
      setNewUrl('');
      setNewTitle('');
      setIsAddModalOpen(false);
      setFeedbackMessage('Item added successfully');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } else {
      setFeedbackMessage(res.error || 'Failed to add item');
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    await saveCollection(newCollectionName.trim());
    setNewCollectionName('');
    setIsAddCollectionOpen(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = await importLibrary(content);
        if (res.success) {
          setFeedbackMessage(`Imported ${res.count} items.`);
        } else {
          setFeedbackMessage(res.error || 'Import failed.');
        }
        setTimeout(() => setFeedbackMessage(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderHeart className="w-5 h-5 text-cyan-400" />
            Personal Media Library
          </h2>
          <p className="text-xs text-slate-400">
            Saved media bookmarks, favorites, and playlists. No media files are downloaded to disk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Import JSON */}
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          {/* Export JSON */}
          <button
            onClick={exportLibrary}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* Add New Item */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-medium shadow-md transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Link</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-medium animate-fadeIn">
          {feedbackMessage}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121721] p-3 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Search by title, URL, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              onlyFavorites
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
            <span>Favorites</span>
          </button>

          <button
            onClick={() => setIsAddCollectionOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Collection</span>
          </button>
        </div>
      </div>

      {/* Collections Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCollectionId('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            selectedCollectionId === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          All Items ({items.length})
        </button>

        {collections.map((c) => (
          <div key={c.id} className="flex items-center">
            <button
              onClick={() => setSelectedCollectionId(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                selectedCollectionId === c.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {c.name}
            </button>
            {c.id !== 'default' && (
              <button
                onClick={() => deleteCollection(c.id)}
                className="p-1 text-slate-500 hover:text-red-400 text-xs"
                title="Delete collection"
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Media Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-[#121721] rounded-2xl border border-white/5">
          <FolderHeart className="w-10 h-10 text-slate-600 mb-2" />
          <h4 className="text-sm font-medium text-slate-300">No media items found</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {searchQuery
              ? 'No items match your search filter.'
              : 'Add your favorite YouTube or direct media links to build your collection.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#121721] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-4 transition-all group flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                    {item.sourceType === 'youtube' && <Tv className="w-3 h-3 text-cyan-400" />}
                    {item.sourceType === 'direct-video' && <Video className="w-3 h-3 text-violet-400" />}
                    {item.sourceType === 'hls' && <Radio className="w-3 h-3 text-emerald-400" />}
                    {item.sourceType}
                  </span>

                  <button
                    onClick={() => toggleFavorite(item.id)}
                    className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        item.isFavorite ? 'text-amber-400 fill-current' : ''
                      }`}
                    />
                  </button>
                </div>

                <h4 className="text-sm font-semibold text-white line-clamp-2">
                  {item.title}
                </h4>

                <p className="text-[11px] font-mono text-slate-500 truncate" title={item.url}>
                  {item.url}
                </p>

                {item.savedPositionSeconds > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>Saved position: {Math.floor(item.savedPositionSeconds)}s</span>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await loadUrl(item.url, true, item.savedPositionSeconds);
                      setRoute('player');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-medium border border-cyan-500/30 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play</span>
                  </button>

                  <button
                    onClick={async () => {
                      const res = await (usePlayerStore.getState() as any).loadUrl(item.url, false);
                      if (res.success) {
                        const src = usePlayerStore.getState().currentSource;
                        if (src) addToQueue(src);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Add to queue"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                  title="Remove from library"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#181F2E] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-white">Add Link to Library</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300">URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-[#121721] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Title (Optional)</label>
                <input
                  type="text"
                  placeholder="My favorite stream"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#121721] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewItem}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black"
              >
                Save Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Collection Modal */}
      {isAddCollectionOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#181F2E] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-white">New Collection</h3>
            <div className="space-y-1 text-xs">
              <label className="text-slate-300">Collection Name</label>
              <input
                type="text"
                placeholder="e.g. Ambient Music, Lo-Fi, Documentaries"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="w-full bg-[#121721] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddCollectionOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-500 hover:bg-violet-400 text-white"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
