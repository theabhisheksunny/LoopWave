import { create } from 'zustand';
import { Collection, LibraryItem } from '../../shared/types';
import { resolveSource } from '../adapters/sourceResolver';

interface LibraryState {
  items: LibraryItem[];
  collections: Collection[];
  selectedCollectionId: string;
  searchQuery: string;
  onlyFavorites: boolean;
  isLoading: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  setSelectedCollectionId: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setOnlyFavorites: (fav: boolean) => void;

  saveItem: (url: string, title?: string, collectionId?: string) => Promise<{ success: boolean; item?: LibraryItem; error?: string }>;
  removeItem: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  updateItemPosition: (id: string, positionSeconds: number) => Promise<void>;

  saveCollection: (name: string, description?: string, id?: string) => Promise<void>;
  updateItemCollection: (id: string, collectionId: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  clearLibrary: () => Promise<void>;

  importLibrary: (jsonContent: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  exportLibrary: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: [],
  collections: [],
  selectedCollectionId: 'all',
  searchQuery: '',
  onlyFavorites: false,
  isLoading: false,
  error: null,

  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        const [items, collections] = await Promise.all([
          window.loopwaveApi.getLibrary(),
          window.loopwaveApi.getCollections()
        ]);
        set({ items, collections, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      console.error('Failed to load library:', err);
      set({ isLoading: false, error: err.message });
    }
  },

  setSelectedCollectionId: (id) => set({ selectedCollectionId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setOnlyFavorites: (fav) => set({ onlyFavorites: fav }),

  saveItem: async (url: string, customTitle?: string, collectionId = 'default') => {
    const resolved = resolveSource(url);
    if (!resolved.success || !resolved.source) {
      return { success: false, error: resolved.error || 'Invalid media URL' };
    }

    const { source } = resolved;
    const existing = get().items.find(
      (i) => i.url === source.canonicalUrl || i.videoId === source.videoId
    );
    if (existing) {
      return {
        success: false,
        error: 'This link is already in your library ("' + existing.title + '")'
      };
    }

    const title = customTitle?.trim() || source.title || 'Untitled Media';

    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        const res = await window.loopwaveApi.saveLibraryItem({
          videoId: source.videoId,
          url: source.canonicalUrl,
          sourceType: source.sourceType,
          title,
          thumbnailUrl: source.thumbnailUrl,
          collectionId,
          isFavorite: false,
          savedPositionSeconds: 0
        });

        if (res.success && res.item) {
          set({ items: [res.item, ...get().items] });
          return { success: true, item: res.item };
        }
        return { success: false, error: res.error || 'Failed to save item' };
      }
      return { success: false, error: 'API unavailable' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  removeItem: async (id: string) => {
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        await window.loopwaveApi.removeLibraryItem(id);
      }
      set({ items: get().items.filter((item) => item.id !== id) });
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  },

  toggleFavorite: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    const newFav = !item.isFavorite;
    const updated = { ...item, isFavorite: newFav };

    set({
      items: get().items.map((i) => (i.id === id ? updated : i))
    });

    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        await window.loopwaveApi.saveLibraryItem(updated);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  },

  updateItemPosition: async (id: string, positionSeconds: number) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    const updated = { ...item, savedPositionSeconds: Math.round(positionSeconds) };
    set({
      items: get().items.map((i) => (i.id === id ? updated : i))
    });

    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        await window.loopwaveApi.saveLibraryItem(updated);
      }
    } catch (err) {
      console.error('Failed to update position:', err);
    }
  },

  saveCollection: async (name: string, description?: string, id?: string) => {
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        const res = await window.loopwaveApi.saveCollection({ id, name, description });
        if (res.success && res.collection) {
          if (id) {
            set({
              collections: get().collections.map((c) => (c.id === id ? res.collection! : c))
            });
          } else {
            set({ collections: [...get().collections, res.collection] });
          }
        }
      }
    } catch (err) {
      console.error('Failed to save collection:', err);
    }
  },

  updateItemCollection: async (id: string, collectionId: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    const updated = { ...item, collectionId };
    set({
      items: get().items.map((i) => (i.id === id ? updated : i))
    });

    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        await window.loopwaveApi.saveLibraryItem(updated);
      }
    } catch (err) {
      console.error('Failed to update item collection:', err);
    }
  },

  deleteCollection: async (id: string) => {
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        await window.loopwaveApi.deleteCollection(id);
      }
      set({
        collections: get().collections.filter((c) => c.id !== id),
        items: get().items.map((i) => (i.collectionId === id ? { ...i, collectionId: 'default' } : i))
      });
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  },

  clearLibrary: async () => {
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        await window.loopwaveApi.clearLibrary();
      }
      set({ items: [] });
    } catch (err) {
      console.error('Failed to clear library:', err);
    }
  },

  importLibrary: async (jsonContent: string) => {
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        const res = await window.loopwaveApi.importData(jsonContent, 'library');
        if (res.success) {
          await get().loadAll();
          return { success: true, count: res.importedCount };
        }
        return { success: false, error: res.error };
      }
      return { success: false, error: 'API unavailable' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  exportLibrary: async () => {
    try {
      if (typeof window !== 'undefined' && window.loopwaveApi) {
        await window.loopwaveApi.exportData({ type: 'json', dataType: 'library' });
      }
    } catch (err) {
      console.error('Failed to export library:', err);
    }
  }
}));
