import { LoopMode, QueueItem, ResolvedSource } from '../../shared/types';
import { PlaybackSessionManager } from './sessionManager';
import { scheduleRandomDelay, ScheduledDelayTask } from '../../shared/randomDelay';

export interface LoopControllerCallbacks {
  onRestartCurrentSource: (source: ResolvedSource) => Promise<void>;
  onPlayNextQueueItem: (nextItem: QueueItem, nextIndex: number) => Promise<void>;
  onDelayTick?: (secondsRemaining: number, selectedDelaySeconds?: number) => void;
}

export class LoopController {
  private loopMode: LoopMode = 'off';
  private interLoopDelaySeconds = 2;
  private randomizedDelayEnabled = false;
  private pendingTimer: any = null;
  private countdownInterval: any = null;
  private isWaitingForLoop = false;
  private activeScheduledTask: ScheduledDelayTask | null = null;
  private lastScheduledDelayMs: number | null = null;

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

  public setRandomizedDelayEnabled(enabled: boolean): void {
    this.randomizedDelayEnabled = enabled;
  }

  public isRandomizedDelayEnabled(): boolean {
    return this.randomizedDelayEnabled;
  }

  public getLastScheduledDelayMs(): number | null {
    return this.lastScheduledDelayMs;
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
          this.callbacks.onPlayNextQueueItem(nextItem, nextIndex);
        });
      } else if (this.queue.length > 0) {
        // Wrap around to start of queue
        this.currentQueueIndex = 0;
        const firstItem = this.queue[0];
        this.scheduleLoopRestart(() => {
          this.currentSource = firstItem.source;
          this.sessionManager.initTrack(firstItem.source);
          this.callbacks.onPlayNextQueueItem(firstItem, 0);
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
          this.callbacks.onPlayNextQueueItem(nextItem, nextIndex);
        });
      } else {
        // Natural end of playback
        this.isWaitingForLoop = false;
      }
    }
  }

  private scheduleLoopRestart(action: () => void): void {
    this.cancelPendingLoop();

    if (this.randomizedDelayEnabled) {
      this.isWaitingForLoop = true;

      // Generates a fresh unrounded random delay (0 to 10,000 ms) for every eligible loop cycle
      const task = scheduleRandomDelay(
        () => {
          this.clearTimers();
          this.isWaitingForLoop = false;
          this.activeScheduledTask = null;
          if (this.callbacks.onDelayTick) {
            this.callbacks.onDelayTick(0, task.delayMs / 1000);
          }
          action();
        },
        {
          minMs: 0,
          maxMs: 10_000,
          enabled: true,
          operationName: 'playback-loop-cycle'
        }
      );

      this.activeScheduledTask = task;
      this.lastScheduledDelayMs = task.delayMs;
      const selectedDelaySec = task.delayMs / 1000;

      if (task.delayMs <= 0) {
        this.isWaitingForLoop = false;
        this.activeScheduledTask = null;
        if (this.callbacks.onDelayTick) {
          this.callbacks.onDelayTick(0, 0);
        }
        return;
      }

      const startPerf = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const totalDelayMs = task.delayMs;

      // Initial tick with exact fractional selected delay
      if (this.callbacks.onDelayTick) {
        this.callbacks.onDelayTick(selectedDelaySec, selectedDelaySec);
      }

      // Smooth, non-framerate-saturating countdown updates every 50ms (preserves fractional precision)
      this.countdownInterval = setInterval(() => {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const elapsed = now - startPerf;
        const remainingMs = Math.max(0, totalDelayMs - elapsed);
        const remainingSec = remainingMs / 1000;

        if (this.callbacks.onDelayTick) {
          this.callbacks.onDelayTick(remainingSec, selectedDelaySec);
        }

        if (remainingMs <= 0) {
          this.clearTimers();
        }
      }, 50);

      return;
    }

    const delaySec = this.interLoopDelaySeconds;
    if (delaySec <= 0) {
      this.lastScheduledDelayMs = 0;
      if (this.callbacks.onDelayTick) {
        this.callbacks.onDelayTick(0, 0);
      }
      action();
      return;
    }

    this.isWaitingForLoop = true;
    this.lastScheduledDelayMs = delaySec * 1000;
    let remaining = delaySec;

    if (this.callbacks.onDelayTick) {
      this.callbacks.onDelayTick(remaining, delaySec);
    }

    this.countdownInterval = setInterval(() => {
      remaining -= 1;
      if (remaining >= 0 && this.callbacks.onDelayTick) {
        this.callbacks.onDelayTick(remaining, delaySec);
      }
    }, 1000);

    this.pendingTimer = setTimeout(() => {
      this.clearTimers();
      this.isWaitingForLoop = false;
      if (this.callbacks.onDelayTick) {
        this.callbacks.onDelayTick(0, delaySec);
      }
      action();
    }, delaySec * 1000);
  }

  public cancelPendingLoop(): void {
    if (this.activeScheduledTask && !this.activeScheduledTask.isCancelled) {
      this.activeScheduledTask.cancel();
      this.activeScheduledTask = null;
    }
    this.clearTimers();
    if (this.isWaitingForLoop) {
      this.isWaitingForLoop = false;
      if (this.callbacks.onDelayTick) {
        this.callbacks.onDelayTick(0, 0);
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
    this.lastScheduledDelayMs = null;
  }
}
