import { create } from 'zustand';
import {
  AdapterCapabilities,
  AdapterState,
  LoopMode,
  PlaybackSession,
  QueueItem,
  ResolvedSource
} from '../../shared/types';
import { resolveSource } from '../adapters/sourceResolver';
import { AdapterRegistry } from '../adapters/adapterRegistry';
import { PlaybackAdapter } from '../adapters/adapterInterface';
import { PlaybackSessionManager } from '../session/sessionManager';
import { LoopController } from '../session/loopController';
import { AnalyticsService } from '../analytics/analyticsService';

interface PlayerStoreState {
  currentSource: ResolvedSource | null;
  adapterState: AdapterState;
  capabilities: AdapterCapabilities;
  currentSession: PlaybackSession | null;

  loopMode: LoopMode;
  interLoopDelaySeconds: number;
  countdownRemaining: number;

  queue: QueueItem[];
  currentQueueIndex: number;

  containerElement: HTMLElement | null;
  activeAdapter: PlaybackAdapter | null;

  sessionManager: PlaybackSessionManager;
  loopController: LoopController;
  analyticsService: AnalyticsService;

  // Actions
  setContainerElement: (el: HTMLElement | null) => void;
  loadUrl: (url: string, autoPlay?: boolean, initialTime?: number) => Promise<{ success: boolean; error?: string }>;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setLoopMode: (mode: LoopMode) => void;
  setInterLoopDelay: (seconds: number) => void;

  // Queue actions
  addToQueue: (source: ResolvedSource) => void;
  removeFromQueue: (index: number) => void;
  playQueueItem: (index: number) => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;

  // Special
  toggleFullscreen: () => void;
  togglePiP: () => Promise<void>;
}

const sessionManager = new PlaybackSessionManager();
const analyticsService = AnalyticsService.getInstance();

export const usePlayerStore = create<PlayerStoreState>((set, get) => {
  const loopController = new LoopController(sessionManager, {
    onRestartCurrentSource: async (source) => {
      const state = get();
      if (state.activeAdapter && state.containerElement) {
        await state.activeAdapter.load(source, state.containerElement, {
          autoPlay: true,
          volume: state.adapterState.volume
        });
      }
    },
    onPlayNextQueueItem: async (nextItem) => {
      await get().loadSource(nextItem.source, true);
    },
    onDelayTick: (secondsRemaining) => {
      set({ countdownRemaining: secondsRemaining });
    }
  });

  // Track session updates
  sessionManager.onSessionChange((session) => {
    set({ currentSession: session });
    analyticsService.recordSession(session);
  });

  return {
    currentSource: null,
    adapterState: {
      status: 'idle',
      currentTime: 0,
      duration: 0,
      volume: 80,
      isMuted: false,
      playbackRate: 1.0,
      bufferedTime: 0,
      error: null
    },
    capabilities: {
      supportsSpeed: true,
      supportsPiP: false,
      supportsSeeking: true,
      supportsVolume: true,
      supportsQuality: false
    },
    currentSession: null,

    loopMode: 'off',
    interLoopDelaySeconds: 2,
    countdownRemaining: 0,

    queue: [],
    currentQueueIndex: -1,

    containerElement: null,
    activeAdapter: null,

    sessionManager,
    loopController,
    analyticsService,

    setContainerElement: (el) => {
      set({ containerElement: el });
    },

    loadUrl: async (url: string, autoPlay = true, initialTime = 0) => {
      const resolved = resolveSource(url);
      if (!resolved.success || !resolved.source) {
        return { success: false, error: resolved.error || 'Invalid URL' };
      }

      await (get() as any).loadSource(resolved.source, autoPlay, initialTime);
      return { success: true };
    },

    loadSource: async (source: ResolvedSource, autoPlay = true, initialTime = 0) => {
      const {
        activeAdapter: prevAdapter,
        containerElement,
        adapterState,
        sessionManager: sm,
        loopController: lc,
        analyticsService: as
      } = get();

      lc.cancelPendingLoop();

      if (prevAdapter) {
        prevAdapter.dispose();
      }

      const registry = AdapterRegistry.getInstance();
      const adapter = registry.getAdapterForSource(source);

      if (!adapter) {
        set({
          currentSource: source,
          adapterState: {
            ...adapterState,
            status: 'error',
            error: {
              code: 'NO_ADAPTER',
              message: `No playback adapter found for type "${source.sourceType}"`,
              fatal: true
            }
          }
        });
        return;
      }

      set({
        currentSource: source,
        activeAdapter: adapter,
        capabilities: adapter.getCapabilities(),
        countdownRemaining: 0
      });

      sm.initTrack(source);
      lc.setCurrentSource(source);

      // Subscribe to adapter state changes
      adapter.onStateChange((state) => {
        set({ adapterState: state });

        const session = sm.getCurrentSession();
        if (state.status === 'playing') {
          const s = sm.startSession();
          as.recordEvent('playback_started', s, { positionSeconds: state.currentTime });
        } else if (state.status === 'paused') {
          sm.onPause();
          if (session) {
            as.recordEvent('playback_paused', session, { positionSeconds: state.currentTime });
          }
        } else if (state.status === 'buffering') {
          sm.onBuffering();
          if (session) {
            as.recordEvent('buffering_started', session, { positionSeconds: state.currentTime });
          }
        } else if (state.status === 'error' && state.error) {
          sm.recordFailure(state.error.code);
          if (session) {
            as.recordEvent('playback_failed', session, {
              errorCode: state.error.code,
              errorMessage: state.error.message
            });
          }
        }
      });

      adapter.onEvent((eventType) => {
        if (eventType === 'ended') {
          const session = sm.getCurrentSession();
          if (session) {
            as.recordEvent('playback_completed', session, {
              positionSeconds: get().adapterState.duration
            });
          }
          lc.handlePlaybackEnded();
        }
      });

      if (containerElement) {
        await adapter.load(source, containerElement, {
          autoPlay,
          initialTime,
          volume: adapterState.volume
        });
      }
    },

    play: async () => {
      const { activeAdapter, sessionManager: sm } = get();
      if (activeAdapter) {
        sm.onResume();
        await activeAdapter.play();
      }
    },

    pause: () => {
      const { activeAdapter, sessionManager: sm } = get();
      if (activeAdapter) {
        sm.onPause();
        activeAdapter.pause();
      }
    },

    stop: () => {
      const { activeAdapter, sessionManager: sm, loopController: lc } = get();
      lc.cancelPendingLoop();
      sm.closeCurrentSession('stopped');
      if (activeAdapter) {
        activeAdapter.stop();
      }
      set({ countdownRemaining: 0 });
    },

    seek: (seconds: number) => {
      const { activeAdapter } = get();
      if (activeAdapter) {
        activeAdapter.seek(seconds);
      }
    },

    setVolume: (volume: number) => {
      const { activeAdapter } = get();
      if (activeAdapter) {
        activeAdapter.setVolume(volume);
      } else {
        set((s) => ({ adapterState: { ...s.adapterState, volume } }));
      }
    },

    setMuted: (muted: boolean) => {
      const { activeAdapter } = get();
      if (activeAdapter) {
        activeAdapter.setMuted(muted);
      } else {
        set((s) => ({ adapterState: { ...s.adapterState, isMuted: muted } }));
      }
    },

    setPlaybackRate: (rate: number) => {
      const { activeAdapter } = get();
      if (activeAdapter) {
        activeAdapter.setPlaybackRate(rate);
      }
    },

    setLoopMode: (mode: LoopMode) => {
      get().loopController.setLoopMode(mode);
      set({ loopMode: mode });
    },

    setInterLoopDelay: (seconds: number) => {
      get().loopController.setInterLoopDelay(seconds);
      set({ interLoopDelaySeconds: seconds });
    },

    addToQueue: (source: ResolvedSource) => {
      const newItem: QueueItem = {
        id: crypto.randomUUID(),
        source,
        addedAt: new Date().toISOString()
      };
      const updated = [...get().queue, newItem];
      set({ queue: updated });
      get().loopController.setQueue(updated, get().currentQueueIndex);
    },

    removeFromQueue: (index: number) => {
      const { queue, currentQueueIndex } = get();
      const updated = queue.filter((_, i) => i !== index);
      let newIdx = currentQueueIndex;
      if (index < currentQueueIndex) {
        newIdx--;
      } else if (index === currentQueueIndex && newIdx >= updated.length) {
        newIdx = updated.length - 1;
      }
      set({ queue: updated, currentQueueIndex: newIdx });
      get().loopController.setQueue(updated, newIdx);
    },

    playQueueItem: async (index: number) => {
      const { queue } = get();
      if (index >= 0 && index < queue.length) {
        set({ currentQueueIndex: index });
        get().loopController.setQueue(queue, index);
        await (get() as any).loadSource(queue[index].source, true);
      }
    },

    nextTrack: async () => {
      const { queue, currentQueueIndex } = get();
      if (currentQueueIndex + 1 < queue.length) {
        await get().playQueueItem(currentQueueIndex + 1);
      } else if (queue.length > 0 && get().loopMode === 'all') {
        await get().playQueueItem(0);
      }
    },

    previousTrack: async () => {
      const { queue, currentQueueIndex, adapterState } = get();
      if (adapterState.currentTime > 3) {
        get().seek(0);
        return;
      }
      if (currentQueueIndex - 1 >= 0) {
        await get().playQueueItem(currentQueueIndex - 1);
      }
    },

    clearQueue: () => {
      set({ queue: [], currentQueueIndex: -1 });
      get().loopController.setQueue([], -1);
    },

    reorderQueue: (fromIndex: number, toIndex: number) => {
      const { queue, currentQueueIndex } = get();
      if (fromIndex === toIndex) return;
      const updated = [...queue];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);

      let newIdx = currentQueueIndex;
      if (currentQueueIndex === fromIndex) {
        newIdx = toIndex;
      } else if (fromIndex < currentQueueIndex && toIndex >= currentQueueIndex) {
        newIdx--;
      } else if (fromIndex > currentQueueIndex && toIndex <= currentQueueIndex) {
        newIdx++;
      }

      set({ queue: updated, currentQueueIndex: newIdx });
      get().loopController.setQueue(updated, newIdx);
    },

    toggleFullscreen: () => {
      const container = get().containerElement;
      if (!container) return;
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch((err) => {
          console.warn('Fullscreen error:', err);
        });
      } else {
        document.exitFullscreen().catch(console.warn);
      }
    },

    togglePiP: async () => {
      const { activeAdapter } = get();
      if (activeAdapter && (activeAdapter as any).togglePictureInPicture) {
        await (activeAdapter as any).togglePictureInPicture();
      }
    }
  };
});
