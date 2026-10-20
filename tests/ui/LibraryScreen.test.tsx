import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LibraryScreen } from '../../src/renderer/routes/LibraryScreen';
import { useLibraryStore } from '../../src/renderer/stores/libraryStore';
import { LibraryItem, Collection } from '../../src/shared/types';

describe('LibraryScreen UI Redesign (Phase 3)', () => {
  const sampleItem1: LibraryItem = {
    id: 'lib_1',
    videoId: 'dQw4w9WgXcQ',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    sourceType: 'youtube',
    title: 'Never Gonna Give You Up',
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    collectionId: 'default',
    isFavorite: false,
    savedPositionSeconds: 45,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z'
  };

  const sampleItem2: LibraryItem = {
    id: 'lib_2',
    videoId: 'bunny',
    url: 'https://example.com/BigBuckBunny.mp4',
    sourceType: 'direct-video',
    title: 'Big Buck Bunny Film',
    collectionId: 'ambient',
    isFavorite: true,
    savedPositionSeconds: 0,
    createdAt: '2026-10-20T11:00:00.000Z',
    updatedAt: '2026-10-20T11:00:00.000Z'
  };

  const sampleCollection: Collection = {
    id: 'ambient',
    name: 'Ambient Relax',
    description: 'Relaxing ambient media',
    createdAt: '2026-10-20T09:00:00.000Z'
  };

  beforeEach(() => {
    act(() => {
      useLibraryStore.setState({
        items: [],
        collections: [{ id: 'default', name: 'My Library', createdAt: '2026-10-20T08:00:00.000Z' }],
        selectedCollectionId: 'all',
        searchQuery: '',
        onlyFavorites: false,
        isLoading: false,
        error: null
      });
    });
  });

  it('renders header, collection bar, toolbar, and empty library state when no items exist', () => {
    render(<LibraryScreen />);

    // Header
    expect(screen.getByText('Media Library')).toBeInTheDocument();
    expect(
      screen.getByText('Your saved video and audio links, organized your way.')
    ).toBeInTheDocument();
    expect(screen.getByText('0 items')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Link/i })).toBeInTheDocument();

    // Collection tab pills
    expect(screen.getByText('All Media')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('New Collection')).toBeInTheDocument();

    // Empty state
    expect(screen.getByText('Your Library is Empty')).toBeInTheDocument();
    expect(screen.getByText('Add Your First Link')).toBeInTheDocument();
  });

  it('renders populated media cards in Grid view with badges and actions', () => {
    act(() => {
      useLibraryStore.setState({
        items: [sampleItem1, sampleItem2],
        collections: [
          { id: 'default', name: 'My Library', createdAt: '2026-10-20T08:00:00.000Z' },
          sampleCollection
        ]
      });
    });

    render(<LibraryScreen />);

    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('Never Gonna Give You Up')).toBeInTheDocument();
    expect(screen.getByText('Big Buck Bunny Film')).toBeInTheDocument();

    // Badges
    const ytBadges = screen.getAllByText('YouTube');
    expect(ytBadges.length).toBeGreaterThan(0);
    const videoBadges = screen.getAllByText('Video');
    expect(videoBadges.length).toBeGreaterThan(0);

    // Actions
    const playButtons = screen.getAllByRole('button', { name: /Play/i });
    expect(playButtons.length).toBeGreaterThan(0);

    const queueButtons = screen.getAllByRole('button', { name: /Queue/i });
    expect(queueButtons.length).toBeGreaterThan(0);
  });

  it('switches between Grid and List views', () => {
    act(() => {
      useLibraryStore.setState({
        items: [sampleItem1]
      });
    });

    render(<LibraryScreen />);

    const listBtn = screen.getByTitle('List View');
    fireEvent.click(listBtn);

    // In list view, item should still be rendered
    expect(screen.getByText('Never Gonna Give You Up')).toBeInTheDocument();

    const gridBtn = screen.getByTitle('Grid View');
    fireEvent.click(gridBtn);
    expect(screen.getByText('Never Gonna Give You Up')).toBeInTheDocument();
  });

  it('filters library items by search query and shows no matching state', () => {
    act(() => {
      useLibraryStore.setState({
        items: [sampleItem1, sampleItem2]
      });
    });

    render(<LibraryScreen />);

    const searchInput = screen.getByPlaceholderText(/Search by title, URL, or video ID/i);
    fireEvent.change(searchInput, { target: { value: 'Bunny' } });

    expect(screen.getByText('Big Buck Bunny Film')).toBeInTheDocument();
    expect(screen.queryByText('Never Gonna Give You Up')).not.toBeInTheDocument();

    // Search for non-existent item
    fireEvent.change(searchInput, { target: { value: 'NonExistentXYZ' } });
    expect(screen.getByText('No Matching Media Found')).toBeInTheDocument();
    expect(screen.getByText('Reset All Filters')).toBeInTheDocument();
  });

  it('filters items by Favorites tab', () => {
    act(() => {
      useLibraryStore.setState({
        items: [sampleItem1, sampleItem2]
      });
    });

    render(<LibraryScreen />);

    // Click Favorites tab
    const favTabs = screen.getAllByRole('button', { name: /Favorites/i });
    fireEvent.click(favTabs[0]);

    // sampleItem2 is favorite, sampleItem1 is not
    expect(screen.getByText('Big Buck Bunny Film')).toBeInTheDocument();
    expect(screen.queryByText('Never Gonna Give You Up')).not.toBeInTheDocument();
  });

  it('opens Add Link modal and closes cleanly', () => {
    render(<LibraryScreen />);

    const addLinkBtn = screen.getByRole('button', { name: /Add Link/i });
    fireEvent.click(addLinkBtn);

    expect(screen.getByText('Add Link to Media Library')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/https:\/\/www.youtube.com\/watch/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Add Link to Media Library')).not.toBeInTheDocument();
  });

  it('verifies Phase 3.1 visual polish: grouped secondary actions, toolbar labels, and contextual collection controls', () => {
    act(() => {
      useLibraryStore.setState({
        items: [sampleItem1, sampleItem2],
        collections: [
          { id: 'default', name: 'My Library', createdAt: '2026-10-20T08:00:00.000Z' },
          sampleCollection
        ],
        selectedCollectionId: 'ambient'
      });
    });

    render(<LibraryScreen />);

    // Grouped secondary actions
    expect(screen.getByTitle('Import library from JSON file')).toBeInTheDocument();
    expect(screen.getByTitle('Export library as JSON file')).toBeInTheDocument();

    // Standardized toolbar labels
    expect(screen.getByText('Source:')).toBeInTheDocument();
    expect(screen.getByText('Sort:')).toBeInTheDocument();

    // Contextual collection controls for active custom collection
    expect(screen.getByTitle(`Rename "${sampleCollection.name}"`)).toBeInTheDocument();
    expect(screen.getByTitle(`Delete "${sampleCollection.name}"`)).toBeInTheDocument();
  });
});
