import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainPlayerView } from '../../src/renderer/components/player/MainPlayerView';

describe('MainPlayerView Component', () => {
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
});
