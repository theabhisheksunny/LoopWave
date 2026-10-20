import {
  PlaybackSession,
  ResolvedSource,
  SessionStatus,
  SourceType
} from '../../shared/types';

export type SessionChangeCallback = (session: PlaybackSession) => void;

export class PlaybackSessionManager {
  private currentSession: PlaybackSession | null = null;
  private currentVideoId: string | null = null;
  private currentSourceType: SourceType = 'unsupported';
  private currentCycleNumber = 0;

  // Watch-time accumulation
  private isCurrentlyPlaying = false;
  private playSegmentStartMs = 0;
  private accumulatedWatchSeconds = 0;

  // Deduplication & concurrency guard
  private hasRecordedStart = false;
  private hasRecordedCompletion = false;

  private listeners: Set<SessionChangeCallback> = new Set();

  /**
   * Subscribes to session updates.
   */
  public onSessionChange(cb: SessionChangeCallback): () => void {
    this.listeners.add(cb);
    if (this.currentSession) {
      cb({ ...this.currentSession });
    }
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(): void {
    if (!this.currentSession) return;
    const clone = { ...this.currentSession };
    for (const listener of this.listeners) {
      try {
        listener(clone);
      } catch (err) {
        console.error('Session listener error:', err);
      }
    }
  }

  /**
   * Initializes a new media track (resets cycle counter to 1).
   */
  public initTrack(source: ResolvedSource): void {
    if (this.currentSession && this.currentSession.completionStatus === 'active') {
      this.closeCurrentSession('interrupted');
    }

    this.currentVideoId = source.videoId;
    this.currentSourceType = source.sourceType;
    this.currentCycleNumber = 1;
    this.resetCycleState();
    this.currentSession = null;
  }

  /**
   * Prepares for the next loop cycle of the same video.
   */
  public prepareNextCycle(): void {
    if (this.currentSession && this.currentSession.completionStatus === 'active') {
      this.closeCurrentSession('interrupted');
    }

    this.currentCycleNumber += 1;
    this.resetCycleState();
    this.currentSession = null;
  }

  /**
   * Resets active session state and releases all in-memory references when playback is stopped or cleared.
   */
  public reset(): void {
    if (this.currentSession && this.currentSession.completionStatus === 'active') {
      this.closeCurrentSession('interrupted');
    }

    this.currentVideoId = null;
    this.currentCycleNumber = 0;
    this.resetCycleState();
    this.currentSession = null;
    this.notify();
  }

  private resetCycleState(): void {
    this.isCurrentlyPlaying = false;
    this.playSegmentStartMs = 0;
    this.accumulatedWatchSeconds = 0;
    this.hasRecordedStart = false;
    this.hasRecordedCompletion = false;
  }

  /**
   * Starts a new session when the player begins actual playback.
   * Deduplicated so multiple player events cannot start multiple sessions.
   */
  public startSession(): PlaybackSession {
    if (this.hasRecordedStart && this.currentSession) {
      this.resumeWatchTimer();
      return { ...this.currentSession };
    }

    if (!this.currentVideoId) {
      throw new Error('Cannot start session without initialized video source');
    }

    const sessionId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    this.currentSession = {
      sessionId,
      videoId: this.currentVideoId,
      cycleNumber: this.currentCycleNumber,
      startedAt,
      endedAt: null,
      watchedSeconds: 0,
      completionStatus: 'active',
      errorCode: null,
      sourceType: this.currentSourceType
    };

    this.hasRecordedStart = true;
    this.hasRecordedCompletion = false;
    this.accumulatedWatchSeconds = 0;
    this.resumeWatchTimer();

    this.notify();
    return { ...this.currentSession };
  }

  /**
   * Call when playback transitions to pause.
   */
  public onPause(): void {
    this.pauseWatchTimer();
    this.updateCurrentWatchedSeconds();
  }

  /**
   * Call when playback resumes.
   */
  public onResume(): void {
    if (!this.hasRecordedStart) {
      this.startSession();
      return;
    }
    this.resumeWatchTimer();
  }

  /**
   * Call when playback is buffering.
   */
  public onBuffering(): void {
    this.pauseWatchTimer();
    this.updateCurrentWatchedSeconds();
  }

  /**
   * Records successful cycle completion from adapter.
   * Guarded against duplicate completion events.
   */
  public recordCompletion(): PlaybackSession | null {
    if (!this.currentSession || this.currentSession.completionStatus !== 'active' || this.hasRecordedCompletion) {
      return this.currentSession ? { ...this.currentSession } : null;
    }

    this.hasRecordedCompletion = true;
    return this.closeCurrentSession('completed');
  }

  /**
   * Records failure for the current session or initialization attempt.
   */
  public recordFailure(errorCode: string): PlaybackSession | null {
    if (this.currentSession && this.currentSession.completionStatus === 'failed') {
      return { ...this.currentSession };
    }

    if (!this.currentSession) {
      if (!this.currentVideoId) return null;
      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();
      this.currentSession = {
        sessionId,
        videoId: this.currentVideoId,
        cycleNumber: this.currentCycleNumber || 1,
        startedAt: now,
        endedAt: now,
        watchedSeconds: 0,
        completionStatus: 'failed',
        errorCode,
        sourceType: this.currentSourceType
      };
      const finalSession = { ...this.currentSession };
      this.notify();
      return finalSession;
    }

    return this.closeCurrentSession('failed', errorCode);
  }

  /**
   * Closes current session with explicit status.
   */
  public closeCurrentSession(
    status: SessionStatus,
    errorCode: string | null = null
  ): PlaybackSession | null {
    if (!this.currentSession) return null;

    this.pauseWatchTimer();
    this.updateCurrentWatchedSeconds();

    this.currentSession.endedAt = new Date().toISOString();
    this.currentSession.completionStatus = status;
    this.currentSession.errorCode = errorCode;

    const finalSession = { ...this.currentSession };
    this.notify();

    return finalSession;
  }

  private resumeWatchTimer(): void {
    if (!this.isCurrentlyPlaying) {
      this.isCurrentlyPlaying = true;
      this.playSegmentStartMs = performance.now();
    }
  }

  private pauseWatchTimer(): void {
    if (this.isCurrentlyPlaying) {
      const elapsedMs = performance.now() - this.playSegmentStartMs;
      if (elapsedMs > 0) {
        this.accumulatedWatchSeconds += elapsedMs / 1000;
      }
      this.isCurrentlyPlaying = false;
    }
  }

  private updateCurrentWatchedSeconds(): void {
    if (!this.currentSession) return;
    let total = this.accumulatedWatchSeconds;
    if (this.isCurrentlyPlaying) {
      total += (performance.now() - this.playSegmentStartMs) / 1000;
    }
    this.currentSession.watchedSeconds = Math.round(total * 10) / 10;
  }

  public getCurrentSession(): PlaybackSession | null {
    if (this.currentSession) {
      this.updateCurrentWatchedSeconds();
      return { ...this.currentSession };
    }
    return null;
  }

  public getCycleNumber(): number {
    return this.currentCycleNumber;
  }

  public isCycleActive(): boolean {
    return Boolean(this.currentSession && this.currentSession.completionStatus === 'active');
  }

  public resetAll(): void {
    if (this.currentSession && this.currentSession.completionStatus === 'active') {
      this.closeCurrentSession('stopped');
    }
    this.currentSession = null;
    this.currentVideoId = null;
    this.currentCycleNumber = 0;
    this.resetCycleState();
  }
}
