import {
  AnalyticsEvent,
  AnalyticsEventType,
  PlaybackSession,
  AnalyticsSummary
} from '../../shared/types';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private currentBufferingStartMs: number | null = null;
  private recordedEventIds: Set<string> = new Set();
  private lastRecordedEvent: {
    sessionId: string;
    eventType: AnalyticsEventType;
    errorCode?: string;
    timeMs: number;
  } | null = null;

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public async recordEvent(
    eventType: AnalyticsEventType,
    session: PlaybackSession,
    metadata?: {
      positionSeconds?: number;
      errorCode?: string;
      errorMessage?: string;
      customData?: Record<string, unknown>;
    }
  ): Promise<AnalyticsEvent | null> {
    const now = performance.now();

    // Deduplication & idempotency guard against multiple callbacks firing for same event
    if (this.lastRecordedEvent && this.lastRecordedEvent.sessionId === session.sessionId) {
      if (
        this.lastRecordedEvent.eventType === eventType &&
        (eventType === 'playback_failed' ||
          eventType === 'playback_completed' ||
          eventType === 'playback_paused' ||
          now - this.lastRecordedEvent.timeMs < 1000)
      ) {
        if (eventType !== 'playback_failed' || this.lastRecordedEvent.errorCode === metadata?.errorCode) {
          return null;
        }
      }
    }

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    let bufferDurationMs: number | undefined;
    if (eventType === 'buffering_started') {
      this.currentBufferingStartMs = performance.now();
    } else if (eventType === 'buffering_ended' || eventType === 'playback_resumed') {
      if (this.currentBufferingStartMs !== null) {
        bufferDurationMs = Math.round(performance.now() - this.currentBufferingStartMs);
        this.currentBufferingStartMs = null;
      }
    }

    const event: AnalyticsEvent = {
      eventId,
      sessionId: session.sessionId,
      videoId: session.videoId,
      eventType,
      timestamp,
      positionSeconds: metadata?.positionSeconds,
      bufferDurationMs,
      errorCode: metadata?.errorCode,
      errorMessage: metadata?.errorMessage,
      metadata: metadata?.customData
    };

    // Cap in-memory deduplication set to avoid unbounded RAM growth
    if (this.recordedEventIds.size > 50) {
      this.recordedEventIds.clear();
    }
    this.recordedEventIds.add(eventId);
    this.lastRecordedEvent = {
      sessionId: session.sessionId,
      eventType,
      errorCode: metadata?.errorCode,
      timeMs: now
    };

    if (typeof window !== 'undefined' && window.loopwaveApi) {
      try {
        await window.loopwaveApi.recordAnalyticsEvent(event);
      } catch (err) {
        console.warn('Failed to record analytics event to main process:', err);
      }
    }

    return event;
  }

  public async recordSession(session: PlaybackSession): Promise<void> {
    if (typeof window !== 'undefined' && window.loopwaveApi) {
      try {
        await window.loopwaveApi.recordAnalyticsSession(session);
      } catch (err) {
        console.warn('Failed to record session update to main process:', err);
      }
    }
  }

  public async getSummary(filter?: {
    startDate?: string;
    endDate?: string;
    videoId?: string;
  }): Promise<AnalyticsSummary> {
    if (typeof window !== 'undefined' && window.loopwaveApi) {
      try {
        return await window.loopwaveApi.getAnalyticsSummary(filter);
      } catch (err) {
        console.error('Failed to fetch analytics summary:', err);
      }
    }

    return {
      totalSessions: 0,
      completedCycles: 0,
      totalWatchSeconds: 0,
      avgSessionDurationSeconds: 0,
      failedSessions: 0,
      interruptedSessions: 0,
      bufferingCount: 0
    };
  }

  public async getEvents(filter?: {
    sessionId?: string;
    videoId?: string;
    startDate?: string;
    endDate?: string;
    eventType?: string;
    limit?: number;
  }): Promise<AnalyticsEvent[]> {
    if (typeof window !== 'undefined' && window.loopwaveApi) {
      try {
        return await window.loopwaveApi.getAnalyticsEvents(filter);
      } catch (err) {
        console.error('Failed to fetch analytics events:', err);
      }
    }
    return [];
  }

  public async clearAnalytics(): Promise<boolean> {
    if (typeof window !== 'undefined' && window.loopwaveApi) {
      try {
        const res = await window.loopwaveApi.clearAnalytics();
        return res.success;
      } catch (err) {
        console.error('Failed to clear analytics:', err);
      }
    }
    return false;
  }
}
