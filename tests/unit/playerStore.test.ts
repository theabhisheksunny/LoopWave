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

  it('moves item to play next immediately after the current active track', () => {
    usePlayerStore.getState().addToQueue(sampleSource1); // 0
    usePlayerStore.getState().addToQueue(sampleSource2); // 1
    usePlayerStore.getState().addToQueue(sampleSource3); // 2

    // Set current active track to index 0 (sampleSource1)
    usePlayerStore.setState({ currentQueueIndex: 0 });

    // Mark sampleSource3 (index 2) to play next
    usePlayerStore.getState().playNext(2);

    const q = usePlayerStore.getState().queue;
    expect(q.length).toBe(3);
    // Track 0 remains sampleSource1 (current active)
    expect(q[0].source.videoId).toBe('v1');
    // Track 1 should now be sampleSource3
    expect(q[1].source.videoId).toBe('v3');
    // Track 2 should now be sampleSource2
    expect(q[2].source.videoId).toBe('v2');
    expect(usePlayerStore.getState().currentQueueIndex).toBe(0);
  });

  it('updates loop mode and delay preferences', () => {
    usePlayerStore.getState().setLoopMode('one');
    expect(usePlayerStore.getState().loopMode).toBe('one');

    usePlayerStore.getState().setInterLoopDelay(10);
    expect(usePlayerStore.getState().interLoopDelaySeconds).toBe(10);
  });
});
