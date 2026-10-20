import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle,
  Clock,
  AlertTriangle,
  PlayCircle,
  Download,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { AnalyticsEvent, AnalyticsSummary } from '../../shared/types';
import { AnalyticsService } from '../analytics/analyticsService';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

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

  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | '30d' | '7d' | 'today'>('all');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const analytics = AnalyticsService.getInstance();

  const loadData = async () => {
    setIsLoading(true);
    let startDate: string | undefined;
    const now = new Date();

    if (dateFilter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (dateFilter === '7d') {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (dateFilter === '30d') {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const [sum, events] = await Promise.all([
      analytics.getSummary({ startDate }),
      analytics.getEvents({ limit: 50 })
    ]);

    setSummary(sum);
    setRecentEvents(events);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  const handleExport = async (type: 'json' | 'csv') => {
    if (typeof window !== 'undefined' && window.loopwaveApi) {
      await window.loopwaveApi.exportData({ type, dataType: 'analytics' });
    }
  };

  const handleClear = async () => {
    await analytics.clearAnalytics();
    setIsConfirmClearOpen(false);
    await loadData();
  };

  // Completion percentage
  const completionRate =
    summary.totalSessions > 0
      ? Math.round((summary.completedCycles / summary.totalSessions) * 100)
      : 0;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Local Playback Analytics
          </h2>
          <p className="text-xs text-slate-400">
            Privacy-first local playback statistics. Metrics remain on your device and are never transmitted externally.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Filter */}
          <div className="flex items-center bg-[#121721] p-1 rounded-xl border border-white/5 text-xs font-medium">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                dateFilter === 'today' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('7d')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                dateFilter === '7d' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateFilter('30d')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                dateFilter === '30d' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                dateFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => setIsConfirmClearOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition-colors"
            title="Clear all analytics"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-[#121721] border border-cyan-500/20 flex items-start gap-3">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong>Application Event Tracking:</strong> Internal playback cycles and session UUIDs represent local player loops. LoopWave does not scrape private APIs or manipulate external view counts on YouTube or third-party servers.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#121721] border border-white/5 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Total Sessions
          </span>
          <p className="text-2xl font-bold font-mono text-white">
            {summary.totalSessions}
          </p>
          <span className="text-[10px] text-slate-500">Unique cycle UUIDs</span>
        </div>

        <div className="bg-[#121721] border border-white/5 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Completed Cycles
          </span>
          <p className="text-2xl font-bold font-mono text-cyan-400">
            {summary.completedCycles}
          </p>
          <span className="text-[10px] text-emerald-400">{completionRate}% completion</span>
        </div>

        <div className="bg-[#121721] border border-white/5 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Watch Duration
          </span>
          <p className="text-2xl font-bold font-mono text-violet-400">
            {formatDuration(summary.totalWatchSeconds)}
          </p>
          <span className="text-[10px] text-slate-500">Non-overlapping</span>
        </div>

        <div className="bg-[#121721] border border-white/5 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Avg Cycle Length
          </span>
          <p className="text-2xl font-bold font-mono text-white">
            {formatDuration(summary.avgSessionDurationSeconds)}
          </p>
          <span className="text-[10px] text-slate-500">Per finished cycle</span>
        </div>

        <div className="bg-[#121721] border border-white/5 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Interrupted
          </span>
          <p className="text-2xl font-bold font-mono text-amber-400">
            {summary.interruptedSessions}
          </p>
          <span className="text-[10px] text-slate-500">User stopped/skipped</span>
        </div>

        <div className="bg-[#121721] border border-white/5 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Failures & Buffering
          </span>
          <p className="text-2xl font-bold font-mono text-red-400">
            {summary.failedSessions}
          </p>
          <span className="text-[10px] text-slate-500">{summary.bufferingCount} buffer events</span>
        </div>
      </div>

      {/* Visual Analytics: Per-Video breakdown chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Video Performance Table / Chart */}
        <div className="bg-[#121721] border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Top Played Media
          </h3>

          {summary.perVideoStats && summary.perVideoStats.length > 0 ? (
            <div className="space-y-3">
              {summary.perVideoStats.slice(0, 6).map((vid) => {
                const maxWatch = Math.max(
                  ...summary.perVideoStats!.map((v) => v.watchSeconds),
                  1
                );
                const barWidth = Math.round((vid.watchSeconds / maxWatch) * 100);

                return (
                  <div key={vid.videoId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300 truncate max-w-[200px]">
                        {vid.videoId}
                      </span>
                      <span className="font-mono text-slate-400">
                        {vid.completed} completed &bull; {formatDuration(vid.watchSeconds)}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-36 flex flex-col items-center justify-center text-slate-500 text-xs">
              No playback history recorded yet.
            </div>
          )}
        </div>

        {/* Recent Events Log */}
        <div className="bg-[#121721] border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Recent Lifecycle Events
          </h3>

          {recentEvents.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {recentEvents.slice(0, 10).map((ev) => (
                <div
                  key={ev.eventId}
                  className="p-2 rounded-xl bg-[#181F2E]/60 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        ev.eventType.includes('completed')
                          ? 'bg-emerald-400'
                          : ev.eventType.includes('failed')
                          ? 'bg-red-400'
                          : ev.eventType.includes('started')
                          ? 'bg-cyan-400'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-mono text-slate-300">{ev.eventType}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-36 flex flex-col items-center justify-center text-slate-500 text-xs">
              No recent events in stream.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation modal for clearing analytics */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#181F2E] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-semibold text-white">Clear Analytics?</h3>
            </div>
            <p className="text-xs text-slate-300">
              This will permanently delete all session records and event history from your local SQLite database.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-400 text-white"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
