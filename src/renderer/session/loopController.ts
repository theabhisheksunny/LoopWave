import { LoopMode, QueueItem, ResolvedSource } from '../../shared/types';
import { PlaybackSessionManager } from './sessionManager';
import { PlaybackAdapter } from '../adapters/adapterInterface';

export interface LoopControllerCallbacks {
  onRestartCurrentSource: (source: ResolvedSource) => Promise<void>;
  onPlayNextQueueItem: (nextItem: QueueItem) => Promise<void>;
  onDelayTick?: (secondsRemaining: number) => void;
}

export class LoopController {
  private loopMode: LoopMode = 'off';
  private interLoopDelaySeconds = 2;
  private pendingTimer: any = null;
  private countdownInterval: any = null;
  private isWaitingForLoop = false;

  private queue: QueueItem[] = [];
  private currentQueueIndex = -1;
  private currentSource: ResolvedSource | null = null;

  constructor(
    private sessionManager: PlaybackSessionManager,
    private callbacks: LoopControllerCallbacks
  ) {}

  public setLoopMode(mode: LoopMode): void {
    this.loopMode = mode;
    if (mode === 'off' && this.isWaitingForLoop) {
      this.cancelPendingLoop();
    }
  }

  public getLoopMode(): LoopMode {
    return this.loopMode;
  }

  public setInterLoopDelay(seconds: number): void {
    this.interLoopDelaySeconds = Math.max(0, Math.min(3600, seconds));
  }

  public getInterLoopDelay(): number {
    return this.interLoopDelaySeconds;
  }

  public setQueue(queue: QueueItem[], startIndex = 0): void {
    this.queue = [...queue];
    this.currentQueueIndex = startIndex;
  }

  public getQueue(): QueueItem[] {
    return [...this.queue];
  }

  public getCurrentQueueIndex(): number {
    return this.currentQueueIndex;
  }

  public setCurrentSource(source: ResolvedSource): void {
    this.cancelPendingLoop();
    this.currentSource = source;
  }

  public getCurrentSource(): ResolvedSource | null {
    return this.currentSource;
  }

  /**
   * Called when active adapter emits 'ended' event.
   */
  public handlePlaybackEnded(): void {
    // 1. Record verified cycle completion
    this.sessionManager.recordCompletion();

    // 2. Decide next action based on loop mode and queue
    if (this.loopMode === 'one' && this.currentSource) {
      this.scheduleLoopRestart(() => {
        this.sessionManager.prepareNextCycle();
        if (this.currentSource) {
          this.callbacks.onRestartCurrentSource(this.currentSource);
        }
      });
    } else if (this.loopMode === 'all') {
      const nextIndex = this.currentQueueIndex + 1;
      if (nextIndex < this.queue.length) {
        this.currentQueueIndex = nextIndex;
        const nextItem = this.queue[nextIndex];
        this.scheduleLoopRestart(() => {
          this.currentSource = nextItem.source;
          this.sessionManager.initTrack(nextItem.source);
          this.callbacks.onPlayNextQueueItem(nextItem);
        });
      } else if (this.queue.length > 0) {
        // Wrap around to start of queue
        this.currentQueueIndex = 0;
        const firstItem = this.queue[0];
        this.scheduleLoopRestart(() => {
          this.currentSource = firstItem.source;
          this.sessionManager.initTrack(firstItem.source);
          this.callbacks.onPlayNextQueueItem(firstItem);
        });
      } else if (this.currentSource) {
        // Fallback: repeat current if queue is empty
        this.scheduleLoopRestart(() => {
          this.sessionManager.prepareNextCycle();
          if (this.currentSource) {
            this.callbacks.onRestartCurrentSource(this.currentSource);
          }
        });
      }
    } else {
      // Loop mode is off: advance queue if items remain, otherwise finish
      const nextIndex = this.currentQueueIndex + 1;
      if (nextIndex < this.queue.length) {
        this.currentQueueIndex = nextIndex;
        const nextItem = this.queue[nextIndex];
        this.scheduleLoopRestart(() => {
          this.currentSource = nextItem.source;
          this.sessionManager.initTrack(nextItem.source);
          this.callbacks.onPlayNextQueueItem(nextItem);
        });
      } else {
        // Natural end of playback
        this.isWaitingForLoop = false;
      }
    }
  }

  private scheduleLoopRestart(action: () => void): void {
    this.cancelPendingLoop();

    const delaySec = this.interLoopDelaySeconds;
    if (delaySec <= 0) {
      action();
      return;
    }

    this.isWaitingForLoop = true;
    let remaining = delaySec;

    if (this.callbacks.onDelayTick) {
      this.callbacks.onDelayTick(remaining);
    }

    this.countdownInterval = setInterval(() => {
      remaining -= 1;
      if (remaining >= 0 && this.callbacks.onDelayTick) {
        this.callbacks.onDelayTick(remaining);
      }
    }, 1000);

    this.pendingTimer = setTimeout(() => {
      this.clearTimers();
      this.isWaitingForLoop = false;
      if (this.callbacks.onDelayTick) {
        this.callbacks.onDelayTick(0);
      }
      action();
    }, delaySec * 1000);
  }

  public cancelPendingLoop(): void {
    this.clearTimers();
    if (this.isWaitingForLoop) {
      this.isWaitingForLoop = false;
      if (this.callbacks.onDelayTick) {
        this.callbacks.onDelayTick(0);
      }
    }
  }

  private clearTimers(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  public isWaiting(): boolean {
    return this.isWaitingForLoop;
  }

  public dispose(): void {
    this.cancelPendingLoop();
    this.queue = [];
    this.currentSource = null;
  }
}
