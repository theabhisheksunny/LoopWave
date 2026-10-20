import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PlaylistScreen } from '../../src/renderer/routes/PlaylistScreen';
import { usePlayerStore } from '../../src/renderer/stores/playerStore';
import { ResolvedSource } from '../../src/shared/types';

describe('PlaylistScreen UI Redesign', () => {
  const sample1: ResolvedSource = {
    sourceType: 'youtube',
    originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    duration: 212
  };

  const sample2: ResolvedSource = {
    sourceType: 'direct-video',
    originalUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    canonicalUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    videoId: 'bunny',
    title: 'Big Buck Bunny',
    duration: 596
  };

  beforeEach(() => {
    act(() => {
      usePlayerStore.getState().clearQueue();
      usePlayerStore.getState().stop();
      usePlayerStore.getState().setLoopMode('off');
    });
  });

  it('renders the page header and summary cards when queue is empty', () => {
    render(<PlaylistScreen />);

    // Header
    expect(screen.getByText('Playlist & Queue')).toBeInTheDocument();
    expect(
      screen.getByText('Organize your media and control what plays next.')
    ).toBeInTheDocument();
    expect(screen.getByText('0 items')).toBeInTheDocument();

    // Summary Cards
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByText('Total Duration')).toBeInTheDocument();
    expect(screen.getByText('Queue Loop Mode')).toBeInTheDocument();

    // Empty state
    expect(screen.getByText('Your Queue is Empty')).toBeInTheDocument();
    expect(screen.getByText('Add Your First Link')).toBeInTheDocument();
  });

  it('validates URLs and adds items to queue via Add Link form', () => {
    render(<PlaylistScreen />);

    const input = screen.getByPlaceholderText(/Paste video or audio stream URL/i);
    const submitBtn = screen.getByRole('button', { name: /Add to Queue/i });

    // Try submitting invalid URL
    fireEvent.change(input, { target: { value: 'not-a-valid-url' } });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText(/Malformed URL/i)
    ).toBeInTheDocument();

    // Submit valid YouTube URL
    fireEvent.change(input, {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
    });
    fireEvent.click(submitBtn);

    // Queue count should be 1
    expect(usePlayerStore.getState().queue.length).toBe(1);
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('renders populated queue items with index, status, duration, and action buttons', () => {
    act(() => {
      usePlayerStore.getState().addToQueue(sample1);
      usePlayerStore.getState().addToQueue(sample2);
    });

    render(<PlaylistScreen />);

    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('Never Gonna Give You Up')).toBeInTheDocument();
    expect(screen.getByText('Big Buck Bunny')).toBeInTheDocument();

    // Duration formatting check: 212s = 03:32, 596s = 09:56
    expect(screen.getByText('03:32')).toBeInTheDocument();
    expect(screen.getByText('09:56')).toBeInTheDocument();

    // Total duration should show formatted sum: 808s = 13m 28s
    expect(screen.getByText('13m 28s')).toBeInTheDocument();

    // Action buttons
    const playButtons = screen.getAllByRole('button', { name: /Play/i });
    expect(playButtons.length).toBeGreaterThan(0);
  });

  it('allows cycling loop mode via loop card or pill', () => {
    render(<PlaylistScreen />);

    expect(usePlayerStore.getState().loopMode).toBe('off');

    const loopCard = screen.getByText('Queue Loop Mode').closest('div')?.parentElement;
    expect(loopCard).toBeInTheDocument();

    if (loopCard) {
      fireEvent.click(loopCard);
      expect(usePlayerStore.getState().loopMode).toBe('one');
      fireEvent.click(loopCard);
      expect(usePlayerStore.getState().loopMode).toBe('all');
      fireEvent.click(loopCard);
      expect(usePlayerStore.getState().loopMode).toBe('off');
    }
  });

  it('filters queue items dynamically with search input', () => {
    act(() => {
      usePlayerStore.getState().addToQueue(sample1);
      usePlayerStore.getState().addToQueue(sample2);
    });

    render(<PlaylistScreen />);

    const searchInput = screen.getByPlaceholderText(/Search queue by title or URL/i);
    fireEvent.change(searchInput, { target: { value: 'Bunny' } });

    expect(screen.getByText('Big Buck Bunny')).toBeInTheDocument();
    expect(screen.queryByText('Never Gonna Give You Up')).not.toBeInTheDocument();
  });

  it('displays clear confirmation and clears queue when confirmed', () => {
    act(() => {
      usePlayerStore.getState().addToQueue(sample1);
    });

    render(<PlaylistScreen />);

    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearBtn);

    expect(
      screen.getByText(/Clear entire queue of 1 items\?/i)
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm Clear/i });
    fireEvent.click(confirmBtn);

    expect(usePlayerStore.getState().queue.length).toBe(0);
    expect(screen.getByText('Your Queue is Empty')).toBeInTheDocument();
  });
});
