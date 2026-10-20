import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../../src/renderer/stores/playerStore';
import { ResolvedSource } from '../../src/shared/types';

describe('PlayerStore Queue & State Management', () => {
  const sampleSource1: ResolvedSource = {
    sourceType: 'direct-video',
    originalUrl: 'https://example.com/one.mp4',
    canonicalUrl: 'https://example.com/one.mp4',
    videoId: 'v1',
    title: 'One'
  };

  const sampleSource2: ResolvedSource = {
    sourceType: 'direct-video',
    originalUrl: 'https://example.com/two.mp4',
    canonicalUrl: 'https://example.com/two.mp4',
    videoId: 'v2',
    title: 'Two'
  };

  const sampleSource3: ResolvedSource = {
    sourceType: 'direct-video',
    originalUrl: 'https://example.com/three.mp4',
    canonicalUrl: 'https://example.com/three.mp4',
    videoId: 'v3',
    title: 'Three'
  };

  beforeEach(() => {
    usePlayerStore.getState().clearQueue();
    usePlayerStore.getState().stop();
  });

  it('adds items to queue correctly', () => {
    usePlayerStore.getState().addToQueue(sampleSource1);
    usePlayerStore.getState().addToQueue(sampleSource2);

    const q = usePlayerStore.getState().queue;
    expect(q.length).toBe(2);
    expect(q[0].source.videoId).toBe('v1');
    expect(q[1].source.videoId).toBe('v2');
  });

  it('reorders items in the queue', () => {
    usePlayerStore.getState().addToQueue(sampleSource1);
    usePlayerStore.getState().addToQueue(sampleSource2);
    usePlayerStore.getState().addToQueue(sampleSource3);

    // Move index 0 to index 2
    usePlayerStore.getState().reorderQueue(0, 2);

    const q = usePlayerStore.getState().queue;
    expect(q[0].source.videoId).toBe('v2');
    expect(q[1].source.videoId).toBe('v3');
    expect(q[2].source.videoId).toBe('v1');
  });

  it('removes item from queue and adjusts queue index', () => {
    usePlayerStore.getState().addToQueue(sampleSource1);
    usePlayerStore.getState().addToQueue(sampleSource2);

    usePlayerStore.getState().removeFromQueue(0);

    const q = usePlayerStore.getState().queue;
    expect(q.length).toBe(1);
    expect(q[0].source.videoId).toBe('v2');
  });

  it('updates loop mode and delay preferences', () => {
    usePlayerStore.getState().setLoopMode('one');
    expect(usePlayerStore.getState().loopMode).toBe('one');

    usePlayerStore.getState().setInterLoopDelay(10);
    expect(usePlayerStore.getState().interLoopDelaySeconds).toBe(10);
  });
});
