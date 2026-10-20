import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  Download,
  Trash2,
  Layers,
  Sparkles,
  Info,
  RefreshCw,
  Search,
  Filter,
  X,
  Flame,
  Activity,
  Check,
  Timer,
  PauseCircle,
  ArrowUpDown
} from 'lucide-react';
import { AnalyticsEvent, AnalyticsSummary, SourceType } from '../../shared/types';
import { formatDuration } from '../../shared/defaults';
import { AnalyticsService } from '../analytics/analyticsService';
import { useLibraryStore } from '../stores/libraryStore';

type DateRange = 'today' | '7d' | '30d' | 'all';
type ChartMetric = 'cycles' | 'duration';

export const AnalyticsScreen: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalSessions: 0,
    completedCycles: 0,
    totalWatchSeconds: 0,
    avgSessionDurationSeconds: 0,
    failedSessions: 0,
    interruptedSessions: 0,
    bufferingCount: 0,
    perVideoStats: []
  });

  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('cycles');
  const [hoveredBucket, setHoveredBucket] = useState<{ label: string; cycles: number; duration: number } | null>(null);

  // Event stream filters & search
  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [eventSortOrder, setEventSortOrder] = useState<'desc' | 'asc'>('desc');

  // Dialogs & Feedback
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { items: libraryItems } = useLibraryStore();
  const analytics = AnalyticsService.getInstance();

  const showNotification = (message: string, type: 'success' | 'error' = 'success', duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), duration);
  };

  // Compute inclusive start date for current filter
  const getFilterStartDate = (range: DateRange): string | undefined => {
    const now = new Date();
    if (range === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    }
    if (range === '7d') {
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (range === '30d') {
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    return undefined;
  };

  const loadData = async () => {
    setIsLoading(true);
    const startDate = getFilterStartDate(dateRange);

    try {
      const [sum, rawEvents] = await Promise.all([
        analytics.getSummary({ startDate }),
        analytics.getEvents({ startDate, limit: 500 })
      ]);

      setSummary(sum);
      setEvents(rawEvents);
    } catch (err: any) {
      showNotification(err.message || 'Failed to load analytics data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  // Export handlers
  const handleExport = async (type: 'json' | 'csv') => {
    if (typeof window !== 'undefined' && window.loopwaveApi) {
      try {
        const startDate = getFilterStartDate(dateRange);
        const res = await window.loopwaveApi.exportData({
          type,
          dataType: 'analytics',
          startDate
        });

        if (res.success && res.filePath) {
          showNotification(`Analytics exported to ${res.filePath.split(/[\\/]/).pop()}!`, 'success');
        } else if (res.canceled) {
          // User cancelled save dialog
        } else {
          showNotification('Export failed', 'error');
        }
      } catch (err: any) {
        showNotification(err.message || 'Export error', 'error');
      }
    }
  };

  const handleClear = async () => {
    try {
      await analytics.clearAnalytics();
      setIsConfirmClearOpen(false);
      showNotification('Playback analytics cleared successfully', 'success');
      await loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to clear analytics', 'error');
    }
  };

  // Library video lookup map
  const libraryMap = useMemo(() => {
    const map = new Map<string, { title: string; sourceType: SourceType }>();
    libraryItems.forEach((item) => {
      map.set(item.videoId, { title: item.title, sourceType: item.sourceType });
    });
    return map;
  }, [libraryItems]);

  // Completion percentage
  const completionRate =
    summary.totalSessions > 0
      ? Math.round((summary.completedCycles / summary.totalSessions) * 100)
      : 0;

  // Generate chart buckets from actual events and sessions
  const chartBuckets = useMemo(() => {
    const now = new Date();
    const buckets: Array<{ label: string; cycles: number; duration: number }> = [];

    if (dateRange === 'today') {
      // 12 buckets of 2 hours
      for (let h = 0; h < 24; h += 2) {
        const label = `${h.toString().padStart(2, '0')}:00`;
        buckets.push({ label, cycles: 0, duration: 0 });
      }

      events.forEach((ev) => {
        const evDate = new Date(ev.timestamp);
        const hour = evDate.getHours();
        const bucketIdx = Math.min(buckets.length - 1, Math.floor(hour / 2));
        if (ev.eventType === 'playback_completed') {
          buckets[bucketIdx].cycles += 1;
          buckets[bucketIdx].duration += ev.positionSeconds || 0;
        }
      });
    } else if (dateRange === '7d') {
      // 7 daily buckets (oldest to newest)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
        buckets.push({ label, cycles: 0, duration: 0 });
      }

      events.forEach((ev) => {
        const evDate = new Date(ev.timestamp);
        const diffDays = Math.floor((now.getTime() - evDate.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < 7) {
          const bucketIdx = 6 - diffDays;
          if (ev.eventType === 'playback_completed') {
            buckets[bucketIdx].cycles += 1;
            buckets[bucketIdx].duration += ev.positionSeconds || 0;
          }
        }
      });
    } else {
      // 30d or all time: group into 6-7 intervals
      const bucketCount = 7;
      const intervalMs =
        dateRange === '30d' ? (30 * 86400000) / bucketCount : (60 * 86400000) / bucketCount;

      for (let i = bucketCount - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * intervalMs);
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        buckets.push({ label, cycles: 0, duration: 0 });
      }

      events.forEach((ev) => {
        const evDate = new Date(ev.timestamp);
        const elapsed = now.getTime() - evDate.getTime();
        const idx = bucketCount - 1 - Math.floor(elapsed / intervalMs);
        if (idx >= 0 && idx < bucketCount) {
          if (ev.eventType === 'playback_completed') {
            buckets[idx].cycles += 1;
            buckets[idx].duration += ev.positionSeconds || 0;
          }
        }
      });
    }

    return buckets;
  }, [events, dateRange]);

  const maxChartValue = useMemo(() => {
    let max = 0;
    chartBuckets.forEach((b) => {
      const val = chartMetric === 'cycles' ? b.cycles : Math.round(b.duration / 60);
      if (val > max) max = val;
    });
    return Math.max(max, 5);
  }, [chartBuckets, chartMetric]);

  // Filtered and sorted event stream
  const filteredEvents = useMemo(() => {
    let list = events.filter((ev) => {
      if (eventTypeFilter !== 'all' && ev.eventType !== eventTypeFilter) {
        return false;
      }
      if (eventSearch.trim()) {
        const q = eventSearch.toLowerCase();
        const matchType = ev.eventType.toLowerCase().includes(q);
        const matchVideo = ev.videoId.toLowerCase().includes(q);
        const matchError = ev.errorCode?.toLowerCase().includes(q) || ev.errorMessage?.toLowerCase().includes(q);
        const libItem = libraryMap.get(ev.videoId);
        const matchTitle = libItem?.title.toLowerCase().includes(q);
        return matchType || matchVideo || matchError || matchTitle;
      }
      return true;
    });

    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return eventSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [events, eventSearch, eventTypeFilter, eventSortOrder, libraryMap]);

  // Helper for source format badge
  const getSourceBadge = (type?: SourceType) => {
    switch (type) {
      case 'youtube':
        return (
          <span className="px-1.5 py-0.5 rounded bg-[#FF334B]/15 text-[#FF334B] border border-[#FF334B]/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            YouTube
          </span>
        );
      case 'direct-video':
        return (
          <span className="px-1.5 py-0.5 rounded bg-[#3478FF]/15 text-[#3478FF] border border-[#3478FF]/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            Video
          </span>
        );
      case 'direct-audio':
        return (
          <span className="px-1.5 py-0.5 rounded bg-[#12C98A]/15 text-[#12C98A] border border-[#12C98A]/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            Audio
          </span>
        );
      case 'hls':
        return (
          <span className="px-1.5 py-0.5 rounded bg-[#18D8E8]/15 text-[#18D8E8] border border-[#18D8E8]/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            HLS
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded bg-[#18243A] text-[#A5B4CF] border border-[#293750] text-[10px] font-mono font-bold uppercase tracking-wider">
            Direct
          </span>
        );
    }
  };

  // Helper for event type badges
  const getEventBadge = (type: string) => {
    switch (type) {
      case 'playback_completed':
        return <span className="px-2 py-0.5 rounded-full bg-[#12C98A]/15 text-[#12C98A] border border-[#12C98A]/30 text-[10px] font-mono font-bold">COMPLETED</span>;
      case 'playback_started':
        return <span className="px-2 py-0.5 rounded-full bg-[#18D8E8]/15 text-[#18D8E8] border border-[#18D8E8]/30 text-[10px] font-mono font-bold">STARTED</span>;
      case 'playback_paused':
        return <span className="px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">PAUSED</span>;
      case 'playback_resumed':
        return <span className="px-2 py-0.5 rounded-full bg-[#3478FF]/15 text-[#3478FF] border border-[#3478FF]/30 text-[10px] font-mono font-bold">RESUMED</span>;
      case 'buffering_started':
        return <span className="px-2 py-0.5 rounded-full bg-[#6547FF]/20 text-[#6547FF] border border-[#6547FF]/40 text-[10px] font-mono font-bold">BUFFERING</span>;
      case 'buffering_ended':
        return <span className="px-2 py-0.5 rounded-full bg-[#18243A] text-[#A5B4CF] border border-[#293750] text-[10px] font-mono font-bold">BUFFER END</span>;
      case 'playback_interrupted':
        return <span className="px-2 py-0.5 rounded-full bg-orange-400/15 text-orange-300 border border-orange-400/30 text-[10px] font-mono font-bold">INTERRUPTED</span>;
      case 'playback_failed':
        return <span className="px-2 py-0.5 rounded-full bg-[#FF667D]/15 text-[#FF667D] border border-[#FF667D]/30 text-[10px] font-mono font-bold">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-[#18243A] text-[#A5B4CF] border border-[#293750] text-[10px] font-mono font-bold">{type}</span>;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 max-w-7xl mx-auto select-none overflow-y-auto">
      {/* 1. Header with Title, Date Range Selector, Export Actions & Modal Close Clearance */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#293750]/80">
        {/* Left: Icon, Title & Subtitle */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6547FF] to-[#3478FF] flex items-center justify-center shadow-lg shadow-[#6547FF]/20 shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-[#F5F7FF] whitespace-nowrap">
              Playback Analytics
            </h1>
            <p className="text-xs text-[#A5B4CF] mt-0.5 truncate">
              Understand your local playback activity.
            </p>
          </div>
        </div>

        {/* Right: Date Range Selector, Export Actions, Refresh & Modal Close Clearance */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 flex-wrap sm:flex-nowrap">
          {/* Date Range Selector Pill */}
          <div className="flex items-center bg-[#18243A] border border-[#293750] rounded-xl p-1 gap-1 shadow-sm">
            {(['today', '7d', '30d', 'all'] as DateRange[]).map((r) => {
              const label = r === 'today' ? 'Today' : r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'All Time';
              const isSelected = dateRange === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDateRange(r)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#18D8E8]/20 border border-[#18D8E8]/40 text-[#18D8E8] shadow-sm'
                      : 'text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#293750]/60'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Grouped Export & Refresh Actions */}
          <div className="flex items-center bg-[#18243A] border border-[#293750] rounded-xl p-1 gap-1 shadow-sm">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#293750] text-[#A5B4CF] hover:text-[#18D8E8] transition-colors"
              title="Refresh Analytics"
              aria-label="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#18D8E8]' : ''}`} />
            </button>

            <div className="w-[1px] h-4 bg-[#293750]" aria-hidden="true" />

            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="h-8 flex items-center gap-1.5 px-2.5 rounded-lg hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] text-xs font-medium transition-colors"
              title="Export as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-[#12C98A]" />
              <span>CSV</span>
            </button>

            <div className="w-[1px] h-4 bg-[#293750]" aria-hidden="true" />

            <button
              type="button"
              onClick={() => handleExport('json')}
              className="h-8 flex items-center gap-1.5 px-2.5 rounded-lg hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] text-xs font-medium transition-colors"
              title="Export as JSON document"
            >
              <Download className="w-3.5 h-3.5 text-[#3478FF]" />
              <span>JSON</span>
            </button>
          </div>

          {/* Clear Analytics Action */}
          <button
            type="button"
            onClick={() => setIsConfirmClearOpen(true)}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#FF667D]/10 hover:bg-[#FF667D]/20 border border-[#FF667D]/30 text-[#FF667D] transition-colors shrink-0"
            title="Clear Analytics Records"
            aria-label="Clear Analytics Records"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Reserved slot for App.tsx top-right modal close button */}
          <div className="w-10 h-10 shrink-0 hidden sm:block" aria-hidden="true" />
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-medium animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-[#12C98A]/10 border-[#12C98A]/30 text-[#12C98A]'
              : 'bg-[#FF667D]/10 border-[#FF667D]/30 text-[#FF667D]'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Privacy Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-[#111B2B] border border-[#293750] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#18D8E8] shrink-0 mt-0.5" />
        <p className="text-xs text-[#A5B4CF] leading-relaxed">
          <strong className="text-[#F5F7FF]">Privacy-First Local Storage:</strong> Playback sessions and lifecycle events are stored locally on your device in SQLite. Metrics represent local application loops and are never sent to external servers or used to manipulate external platform view counts.
        </p>
      </div>

      {/* 2. Summary KPI Metrics: Responsive Grid with Balanced Padding & Typography */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Card 1: Total Sessions */}
        <div className="bg-[#111B2B] hover:bg-[#18243A]/40 border border-[#293750] rounded-2xl p-4 flex flex-col justify-between min-h-[114px] shadow-sm transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A5B4CF] truncate">
              Total Sessions
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#3478FF]/15 flex items-center justify-center shrink-0">
              <PlayCircle className="w-4 h-4 text-[#3478FF]" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-[#F5F7FF] my-1 tracking-tight truncate">
            {summary.totalSessions}
          </p>
          <span className="text-[11px] text-[#A5B4CF] truncate">
            Unique cycle sessions
          </span>
        </div>

        {/* Card 2: Completed Cycles */}
        <div className="bg-[#111B2B] hover:bg-[#18243A]/40 border border-[#293750] rounded-2xl p-4 flex flex-col justify-between min-h-[114px] shadow-sm transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A5B4CF] truncate">
              Completed Cycles
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#12C98A]/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#12C98A]" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-[#12C98A] my-1 tracking-tight truncate">
            {summary.completedCycles}
          </p>
          <span className="text-[11px] text-[#A5B4CF] truncate">
            {completionRate}% completion rate
          </span>
        </div>

        {/* Card 3: Watch Duration */}
        <div className="bg-[#111B2B] hover:bg-[#18243A]/40 border border-[#293750] rounded-2xl p-4 flex flex-col justify-between min-h-[114px] shadow-sm transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A5B4CF] truncate">
              Watch Duration
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#6547FF]/15 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[#6547FF]" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-[#6547FF] my-1 tracking-tight truncate">
            {formatDuration(summary.totalWatchSeconds)}
          </p>
          <span className="text-[11px] text-[#A5B4CF] truncate">
            Active playing time
          </span>
        </div>

        {/* Card 4: Avg Cycle Duration */}
        <div className="bg-[#111B2B] hover:bg-[#18243A]/40 border border-[#293750] rounded-2xl p-4 flex flex-col justify-between min-h-[114px] shadow-sm transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A5B4CF] truncate">
              Avg Cycle
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#18D8E8]/15 flex items-center justify-center shrink-0">
              <Timer className="w-4 h-4 text-[#18D8E8]" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-[#18D8E8] my-1 tracking-tight truncate">
            {summary.completedCycles > 0 ? formatDuration(summary.avgSessionDurationSeconds) : '--:--'}
          </p>
          <span className="text-[11px] text-[#A5B4CF] truncate">
            Per finished cycle
          </span>
        </div>

        {/* Card 5: Interrupted Sessions */}
        <div className="bg-[#111B2B] hover:bg-[#18243A]/40 border border-[#293750] rounded-2xl p-4 flex flex-col justify-between min-h-[114px] shadow-sm transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A5B4CF] truncate">
              Interrupted
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 flex items-center justify-center shrink-0">
              <PauseCircle className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400 my-1 tracking-tight truncate">
            {summary.interruptedSessions}
          </p>
          <span className="text-[11px] text-[#A5B4CF] truncate">
            Stopped or skipped
          </span>
        </div>

        {/* Card 6: Failures & Buffering */}
        <div className="bg-[#111B2B] hover:bg-[#18243A]/40 border border-[#293750] rounded-2xl p-4 flex flex-col justify-between min-h-[114px] shadow-sm transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A5B4CF] truncate">
              Failures & Stalls
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FF667D]/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#FF667D]" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-[#FF667D] my-1 tracking-tight truncate">
            {summary.failedSessions}
          </p>
          <span className="text-[11px] text-[#A5B4CF] truncate">
            {summary.bufferingCount} buffering stalls
          </span>
        </div>
      </div>

      {/* 3. Middle Region: Playback Activity Chart & Top-Played Media */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Playback Activity SVG Chart Panel */}
        <div className="bg-[#111B2B] border border-[#293750] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#293750]/40">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#18D8E8]/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#18D8E8]" />
              </div>
              <h3 className="text-sm font-bold text-[#F5F7FF]">Playback Activity</h3>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center bg-[#18243A] border border-[#293750] rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setChartMetric('cycles')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  chartMetric === 'cycles'
                    ? 'bg-[#111B2B] text-[#18D8E8] shadow-sm'
                    : 'text-[#A5B4CF] hover:text-[#F5F7FF]'
                }`}
              >
                Cycles
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('duration')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  chartMetric === 'duration'
                    ? 'bg-[#111B2B] text-[#18D8E8] shadow-sm'
                    : 'text-[#A5B4CF] hover:text-[#F5F7FF]'
                }`}
              >
                Duration (min)
              </button>
            </div>
          </div>

          {/* SVG Chart Render */}
          <div className="relative min-h-[180px] flex flex-col justify-end pt-2 pb-1">
            {summary.totalSessions === 0 ? (
              <div className="w-full h-40 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-[#18243A] border border-[#293750] flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-[#A5B4CF]/60" />
                </div>
                <p className="text-xs font-semibold text-[#F5F7FF]">No playback activity recorded in this time range.</p>
                <span className="text-[11px] text-[#A5B4CF]">Play media in the main player to generate local activity trends.</span>
              </div>
            ) : (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#A5B4CF]/70 px-1">
                  <span>Max: {maxChartValue} {chartMetric === 'cycles' ? 'cycles' : 'mins'}</span>
                  <span>Baseline: 0</span>
                </div>

                <svg
                  viewBox="0 0 500 130"
                  className="w-full h-32 overflow-visible select-none"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="chartBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#18D8E8" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#6547FF" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guideline lines */}
                  <line x1="0" y1="10" x2="500" y2="10" stroke="#293750" strokeDasharray="3 3" opacity="0.6" />
                  <line x1="0" y1="65" x2="500" y2="65" stroke="#293750" strokeDasharray="3 3" opacity="0.6" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#293750" opacity="0.9" />

                  {/* Render Bucketed Bars */}
                  {chartBuckets.map((b, idx) => {
                    const count = chartBuckets.length;
                    const colWidth = 500 / count;
                    const barWidth = Math.max(14, colWidth * 0.48);
                    const x = idx * colWidth + (colWidth - barWidth) / 2;
                    const val = chartMetric === 'cycles' ? b.cycles : Math.round(b.duration / 60);
                    const heightPercent = maxChartValue > 0 ? (val / maxChartValue) * 105 : 0;
                    const barHeight = Math.max(val > 0 ? 6 : 2, Math.min(110, heightPercent));
                    const y = 120 - barHeight;

                    return (
                      <g key={b.label}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={3}
                          fill={val > 0 ? 'url(#chartBarGradient)' : '#18243A'}
                          className="transition-all cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setHoveredBucket(b)}
                          onMouseLeave={() => setHoveredBucket(null)}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* X Axis Labels */}
                <div className="flex items-center justify-between text-[10px] font-mono text-[#A5B4CF] px-1">
                  {chartBuckets.map((b) => (
                    <span key={b.label} className="truncate max-w-[60px] text-center">
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Hover Tooltip */}
            {hoveredBucket && (
              <div className="absolute top-0 right-0 bg-[#080D17]/95 border border-[#18D8E8]/50 rounded-xl px-3 py-1.5 shadow-xl text-xs font-mono space-y-0.5 animate-fadeIn pointer-events-none z-10">
                <span className="text-[#A5B4CF] font-semibold block">{hoveredBucket.label}</span>
                <span className="text-[#18D8E8] font-bold block">{hoveredBucket.cycles} completed cycles</span>
                <span className="text-[#A5B4CF] text-[10px] block">{formatDuration(hoveredBucket.duration)} watched</span>
              </div>
            )}
          </div>
        </div>

        {/* Top-Played Media Card */}
        <div className="bg-[#111B2B] border border-[#293750] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#293750]/40">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center">
                <Flame className="w-4 h-4 text-[#FFB800]" />
              </div>
              <h3 className="text-sm font-bold text-[#F5F7FF]">Top Played Media</h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#18243A] text-[#18D8E8] border border-[#293750] font-semibold">
              {summary.perVideoStats ? summary.perVideoStats.length : 0} items
            </span>
          </div>

          {summary.perVideoStats && summary.perVideoStats.length > 0 ? (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {summary.perVideoStats.slice(0, 5).map((stat, idx) => {
                const libItem = libraryMap.get(stat.videoId);
                const title = libItem?.title || stat.videoId;
                const maxWatch = Math.max(...summary.perVideoStats!.map((s) => s.watchSeconds), 1);
                const percent = Math.min(100, Math.round((stat.watchSeconds / maxWatch) * 100));

                return (
                  <div key={stat.videoId} className="p-3 rounded-xl bg-[#18243A]/40 hover:bg-[#18243A]/80 border border-[#293750] space-y-2 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-md bg-[#101827] border border-[#293750] flex items-center justify-center text-[10px] font-mono font-bold text-[#A5B4CF] shrink-0">
                          #{idx + 1}
                        </span>
                        {getSourceBadge(libItem?.sourceType)}
                        <span className="text-xs font-semibold text-[#F5F7FF] truncate" title={title}>
                          {title}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#18D8E8] shrink-0 font-bold">
                        {stat.completed} {stat.completed === 1 ? 'cycle' : 'cycles'}
                      </div>
                    </div>

                    {/* Progress Bar & Watch Duration */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-[#101827] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#6547FF] to-[#18D8E8] rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#A5B4CF]">
                        <span>Watched: {formatDuration(stat.watchSeconds)}</span>
                        <span>{stat.sessions} total sessions</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-[#18243A] border border-[#293750] flex items-center justify-center">
                <Layers className="w-6 h-6 text-[#A5B4CF]/60" />
              </div>
              <p className="text-xs font-semibold text-[#F5F7FF]">No media loops completed in this time range.</p>
              <span className="text-[11px] text-[#A5B4CF]">Complete playback cycles to view performance ranking.</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Recent Lifecycle Events Table / Stream */}
      <div className="bg-[#111B2B] border border-[#293750] rounded-2xl p-5 space-y-4 shadow-sm">
        {/* Table Dedicated Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#293750]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#6547FF]/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#6547FF]" />
            </div>
            <h3 className="text-sm font-bold text-[#F5F7FF]">Lifecycle Event Stream</h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#18243A] text-[#18D8E8] border border-[#293750] font-semibold">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>
        </div>

        {/* Dedicated Toolbar Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A5B4CF] pointer-events-none" />
            <input
              type="text"
              placeholder="Search events by title, ID, or error..."
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              className="w-full h-9 bg-[#18243A] border border-[#293750] focus:border-[#18D8E8] rounded-xl pl-8 pr-7 text-xs text-[#F5F7FF] placeholder-[#A5B4CF]/60 focus:outline-none transition-colors"
            />
            {eventSearch && (
              <button
                type="button"
                onClick={() => setEventSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A5B4CF] hover:text-[#F5F7FF]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Event Type Filter */}
            <div className="h-9 flex items-center gap-1.5 bg-[#18243A] border border-[#293750] rounded-xl px-2.5">
              <Filter className="w-3 h-3 text-[#A5B4CF]" />
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="bg-transparent text-xs text-[#F5F7FF] focus:outline-none cursor-pointer font-medium"
                aria-label="Filter events by type"
              >
                <option value="all" className="bg-[#18243A] text-white">All Events</option>
                <option value="playback_started" className="bg-[#18243A] text-white">Started</option>
                <option value="playback_completed" className="bg-[#18243A] text-white">Completed</option>
                <option value="playback_paused" className="bg-[#18243A] text-white">Paused</option>
                <option value="playback_resumed" className="bg-[#18243A] text-white">Resumed</option>
                <option value="buffering_started" className="bg-[#18243A] text-white">Buffering</option>
                <option value="playback_interrupted" className="bg-[#18243A] text-white">Interrupted</option>
                <option value="playback_failed" className="bg-[#18243A] text-white">Failed</option>
              </select>
            </div>

            {/* Sort Order Toggle */}
            <button
              type="button"
              onClick={() => setEventSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-[#18243A] hover:bg-[#293750] border border-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] text-xs font-semibold transition-colors"
              title="Toggle sort order"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>{eventSortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>

        {/* Bounded Scrollable Event List */}
        {filteredEvents.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1.5">
            {filteredEvents.map((ev) => {
              const libItem = libraryMap.get(ev.videoId);
              const mediaTitle = libItem?.title || ev.videoId;

              return (
                <div
                  key={ev.eventId}
                  className="p-3 rounded-xl bg-[#18243A]/40 hover:bg-[#18243A]/80 border border-[#293750] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-all text-xs"
                >
                  {/* Left: Badge + Media Title */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {getEventBadge(ev.eventType)}
                    <span className="font-semibold text-[#F5F7FF] truncate max-w-sm sm:max-w-md" title={mediaTitle}>
                      {mediaTitle}
                    </span>
                  </div>

                  {/* Right: Metadata Details & Timestamp */}
                  <div className="flex items-center gap-3 text-[11px] font-mono text-[#A5B4CF] shrink-0 self-end sm:self-auto">
                    {ev.positionSeconds !== undefined && ev.positionSeconds > 0 && (
                      <span className="text-[#18D8E8] bg-[#18243A] px-2 py-0.5 rounded border border-[#293750]">at {Math.floor(ev.positionSeconds)}s</span>
                    )}
                    {ev.bufferDurationMs !== undefined && ev.bufferDurationMs > 0 && (
                      <span className="text-violet-400 bg-[#18243A] px-2 py-0.5 rounded border border-[#293750]">{ev.bufferDurationMs}ms stall</span>
                    )}
                    {ev.errorCode && (
                      <span className="text-[#FF667D] font-bold bg-[#FF667D]/10 px-2 py-0.5 rounded border border-[#FF667D]/30">[{ev.errorCode}]</span>
                    )}
                    <span className="text-[#A5B4CF]/80">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-center space-y-1.5">
            <Activity className="w-7 h-7 text-[#293750]" />
            <p className="text-xs text-[#A5B4CF]">No lifecycle events found matching criteria.</p>
            {eventSearch && (
              <button
                type="button"
                onClick={() => {
                  setEventSearch('');
                  setEventTypeFilter('all');
                }}
                className="text-xs text-[#18D8E8] hover:underline"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Clear Analytics Confirmation Dialog */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 bg-[#080D17]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#111B2B] border border-[#FF667D]/40 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#FF667D]">
              <div className="w-10 h-10 rounded-2xl bg-[#FF667D]/10 border border-[#FF667D]/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#FF667D]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F7FF]">Clear Local Analytics?</h3>
                <p className="text-xs text-[#A5B4CF] mt-0.5">
                  This will permanently delete all session records and event history from your local SQLite database. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="h-10 px-5 rounded-xl text-xs font-bold bg-[#FF667D] hover:bg-[#e65066] text-white shadow-md transition-colors"
              >
                Clear All Analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
