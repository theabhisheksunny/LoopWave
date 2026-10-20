import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AnalyticsScreen } from '../../src/renderer/routes/AnalyticsScreen';
import { AnalyticsService } from '../../src/renderer/analytics/analyticsService';
import { useLibraryStore } from '../../src/renderer/stores/libraryStore';
import { AnalyticsSummary, AnalyticsEvent } from '../../src/shared/types';

describe('AnalyticsScreen UI Dashboard (Phase 4)', () => {
  const sampleSummary: AnalyticsSummary = {
    totalSessions: 14,
    completedCycles: 10,
    totalWatchSeconds: 3665, // 1h 1m 5s
    avgSessionDurationSeconds: 366,
    failedSessions: 1,
    interruptedSessions: 3,
    bufferingCount: 4,
    perVideoStats: [
      {
        videoId: 'flower_mp4',
        sessions: 8,
        completed: 7,
        watchSeconds: 2400
      },
      {
        videoId: 't_rex_audio',
        sessions: 6,
        completed: 3,
        watchSeconds: 1265
      }
    ]
  };

  const sampleEvents: AnalyticsEvent[] = [
    {
      eventId: 'ev_1',
      sessionId: 'sess_1',
      videoId: 'flower_mp4',
      eventType: 'playback_started',
      timestamp: new Date().toISOString(),
      positionSeconds: 0
    },
    {
      eventId: 'ev_2',
      sessionId: 'sess_1',
      videoId: 'flower_mp4',
      eventType: 'playback_completed',
      timestamp: new Date().toISOString(),
      positionSeconds: 120
    },
    {
      eventId: 'ev_3',
      sessionId: 'sess_2',
      videoId: 't_rex_audio',
      eventType: 'buffering_started',
      timestamp: new Date().toISOString(),
      bufferDurationMs: 450
    },
    {
      eventId: 'ev_4',
      sessionId: 'sess_3',
      videoId: 'broken_video',
      eventType: 'playback_failed',
      timestamp: new Date().toISOString(),
      errorCode: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
    }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();

    const analytics = AnalyticsService.getInstance();
    vi.spyOn(analytics, 'getSummary').mockResolvedValue(sampleSummary);
    vi.spyOn(analytics, 'getEvents').mockResolvedValue(sampleEvents);
    vi.spyOn(analytics, 'clearAnalytics').mockResolvedValue(true);

    window.loopwaveApi = {
      ...window.loopwaveApi,
      exportData: vi.fn().mockResolvedValue({ success: true, filePath: 'test.csv' })
    } as any;

    act(() => {
      useLibraryStore.setState({
        items: [
          {
            id: 'item_1',
            videoId: 'flower_mp4',
            url: 'https://example.com/flower.mp4',
            sourceType: 'direct-video',
            title: 'Flower Animation',
            collectionId: 'default',
            isFavorite: false,
            savedPositionSeconds: 0,
            createdAt: '2026-10-20T10:00:00.000Z',
            updatedAt: '2026-10-20T10:00:00.000Z'
          }
        ]
      });
    });
  });

  it('renders header, date range buttons, and summary metrics correctly', async () => {
    render(<AnalyticsScreen />);

    // Header
    expect(screen.getByText('Playback Analytics')).toBeInTheDocument();
    expect(screen.getByText('Understand your local playback activity.')).toBeInTheDocument();

    // Date range pills
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();

    // 6 KPI cards
    expect(await screen.findByText(/Total Sessions/i)).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();

    expect(screen.getByText(/Completed Cycles/i)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    expect(screen.getByText(/Watch Duration/i)).toBeInTheDocument();
    expect(screen.getByText('1h 1m 5s')).toBeInTheDocument();

    expect(screen.getByText(/Avg Cycle/i)).toBeInTheDocument();
    expect(screen.getByText('6m 6s')).toBeInTheDocument();

    const interruptedLabels = screen.getAllByText(/Interrupted/i);
    expect(interruptedLabels.length).toBeGreaterThan(0);
    expect(screen.getByText('3')).toBeInTheDocument();

    expect(screen.getByText(/Failures & Stalls/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders Playback Activity chart and metric switcher', async () => {
    render(<AnalyticsScreen />);

    expect(await screen.findByText('Playback Activity')).toBeInTheDocument();
    const durationBtn = screen.getByRole('button', { name: /Duration \(min\)/i });
    expect(durationBtn).toBeInTheDocument();

    fireEvent.click(durationBtn);
    const cyclesBtn = screen.getByRole('button', { name: /Cycles/i });
    expect(cyclesBtn).toBeInTheDocument();
  });

  it('renders Top Played Media with matched titles from library and fallback IDs', async () => {
    render(<AnalyticsScreen />);

    expect(await screen.findByText('Top Played Media')).toBeInTheDocument();
    // 'flower_mp4' should match library item title 'Flower Animation'
    const titles = screen.getAllByText('Flower Animation');
    expect(titles.length).toBeGreaterThan(0);

    // 't_rex_audio' falls back to raw videoId
    const tRexElements = screen.getAllByText('t_rex_audio');
    expect(tRexElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/7 cycles/i)).toBeInTheDocument();
  });

  it('renders Lifecycle Event Stream and filters by search query', async () => {
    render(<AnalyticsScreen />);

    expect(await screen.findByText('Lifecycle Event Stream')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('BUFFERING')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();

    // Search for broken video
    const searchInput = screen.getByPlaceholderText(/Search events/i);
    fireEvent.change(searchInput, { target: { value: 'broken_video' } });

    expect(screen.getByText('broken_video')).toBeInTheDocument();
    expect(screen.queryByText('ev_1')).not.toBeInTheDocument();
  });

  it('filters by date range button', async () => {
    const analytics = AnalyticsService.getInstance();
    const getSummarySpy = vi.spyOn(analytics, 'getSummary');

    render(<AnalyticsScreen />);
    await screen.findByText('Playback Analytics');

    const btn7d = screen.getByRole('button', { name: 'Last 7 Days' });
    await act(async () => {
      fireEvent.click(btn7d);
    });

    expect(getSummarySpy).toHaveBeenCalled();
  });

  it('opens and cancels Clear Analytics confirmation modal', async () => {
    render(<AnalyticsScreen />);
    await screen.findByText('Playback Analytics');

    const clearBtn = screen.getByLabelText(/Clear Analytics Records/i);
    fireEvent.click(clearBtn);

    expect(screen.getByText('Clear Local Analytics?')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Clear Local Analytics?')).not.toBeInTheDocument();
  });

  it('triggers CSV and JSON export via electron API', async () => {
    render(<AnalyticsScreen />);
    await screen.findByText('Playback Analytics');

    const csvBtn = screen.getByRole('button', { name: /CSV/i });
    await act(async () => {
      fireEvent.click(csvBtn);
    });
    expect(window.loopwaveApi.exportData).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'csv', dataType: 'analytics' })
    );

    const jsonBtn = screen.getByRole('button', { name: /JSON/i });
    await act(async () => {
      fireEvent.click(jsonBtn);
    });
    expect(window.loopwaveApi.exportData).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'json', dataType: 'analytics' })
    );
  });

  it('renders graceful empty states when no analytics data exists', async () => {
    const analytics = AnalyticsService.getInstance();
    vi.spyOn(analytics, 'getSummary').mockResolvedValue({
      totalSessions: 0,
      completedCycles: 0,
      totalWatchSeconds: 0,
      avgSessionDurationSeconds: 0,
      failedSessions: 0,
      interruptedSessions: 0,
      bufferingCount: 0,
      perVideoStats: []
    });
    vi.spyOn(analytics, 'getEvents').mockResolvedValue([]);

    render(<AnalyticsScreen />);
    await screen.findByText('Playback Analytics');

    expect(await screen.findByText('No playback activity recorded in this time range.')).toBeInTheDocument();
    expect(screen.getByText('No media loops completed in this time range.')).toBeInTheDocument();
    expect(screen.getByText('No lifecycle events found matching criteria.')).toBeInTheDocument();
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  it('filters event stream by event type dropdown', async () => {
    render(<AnalyticsScreen />);
    await screen.findByText('Lifecycle Event Stream');

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'playback_failed' } });

    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.queryByText('COMPLETED')).not.toBeInTheDocument();
  });
});
