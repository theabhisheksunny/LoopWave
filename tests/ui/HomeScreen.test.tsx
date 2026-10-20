import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeScreen } from '../../src/renderer/routes/HomeScreen';

describe('HomeScreen Component', () => {
  it('renders headline, url input, and action buttons', () => {
    render(<HomeScreen />);

    expect(screen.getByText(/Stream Online Media/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste YouTube watch/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play Now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add to Queue/i })).toBeInTheDocument();
  });

  it('detects YouTube link and displays detection badge', () => {
    render(<HomeScreen />);

    const input = screen.getByPlaceholderText(/Paste YouTube watch/i);
    fireEvent.change(input, {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
    });

    expect(screen.getByText(/Detected: YOUTUBE/i)).toBeInTheDocument();
  });

  it('detects HLS stream link and displays detection badge', () => {
    render(<HomeScreen />);

    const input = screen.getByPlaceholderText(/Paste YouTube watch/i);
    fireEvent.change(input, {
      target: { value: 'https://example.com/live/stream.m3u8' }
    });

    expect(screen.getByText(/Detected: HLS/i)).toBeInTheDocument();
  });
});
