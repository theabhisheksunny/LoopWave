import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainPlayerView } from '../../src/renderer/components/player/MainPlayerView';
import { PlaybackStatusBadge } from '../../src/renderer/components/player/PlaybackStatusBadge';
import { EmptyPlayerState } from '../../src/renderer/components/player/EmptyPlayerState';

describe('MainPlayerView & Home Screen Components', () => {
  it('renders url input, play button, canvas and controls', () => {
    const { container } = render(<MainPlayerView />);

    expect(
      screen.getByPlaceholderText(/Paste a video or audio link/i)
    ).toBeInTheDocument();
    expect(container.querySelector('#main-play-button')).toBeInTheDocument();
    expect(screen.getByText(/No Media Loaded/i)).toBeInTheDocument();
  });

  it('detects YouTube link and displays YOUTUBE badge', () => {
    const { container } = render(<MainPlayerView />);

    const input = screen.getByPlaceholderText(/Paste a video or audio link/i);
    fireEvent.change(input, {
      target: { value: 'https://www.youtube.com/shorts/n2YGWiRRxEs' }
    });

    const badge = container.querySelector('span.uppercase');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toBe('youtube');
  });

  it('detects HLS stream link and displays HLS badge', () => {
    const { container } = render(<MainPlayerView />);

    const input = screen.getByPlaceholderText(/Paste a video or audio link/i);
    fireEvent.change(input, {
      target: { value: 'https://example.com/live/stream.m3u8' }
    });

    const badge = container.querySelector('span.uppercase');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toBe('hls');
  });

  it('renders EmptyPlayerState correctly with guidance text', () => {
    render(<EmptyPlayerState />);
    expect(screen.getByText('No Media Loaded')).toBeInTheDocument();
    expect(screen.getByText(/Paste a video or audio link above/i)).toBeInTheDocument();
  });

  it('renders PlaybackStatusBadge for playing, paused, and buffering states', () => {
    const { rerender } = render(<PlaybackStatusBadge status="playing" />);
    expect(screen.getByText('Playing')).toBeInTheDocument();

    rerender(<PlaybackStatusBadge status="paused" />);
    expect(screen.getByText('Paused')).toBeInTheDocument();

    rerender(<PlaybackStatusBadge status="buffering" />);
    expect(screen.getByText('Buffering')).toBeInTheDocument();

    rerender(<PlaybackStatusBadge status="error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
