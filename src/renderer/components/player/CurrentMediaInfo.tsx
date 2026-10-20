import React, { useState } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  Youtube,
  Film,
  Music,
  Radio,
  Clock
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { PlaybackStatusBadge } from './PlaybackStatusBadge';

export const CurrentMediaInfo: React.FC = () => {
  const { currentSource, adapterState, currentSession } = usePlayerStore();
  const [copiedSession, setCopiedSession] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!currentSource) {
    return null;
  }

  const handleCopySession = () => {
    if (currentSession?.sessionId) {
      navigator.clipboard.writeText(currentSession.sessionId);
      setCopiedSession(true);
      setTimeout(() => setCopiedSession(false), 2000);
    }
  };

  const handleCopyUrl = () => {
    if (currentSource.canonicalUrl) {
      navigator.clipboard.writeText(currentSource.canonicalUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-400" />;
      case 'mp4':
      case 'webm':
        return <Film className="w-4 h-4 text-blue-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-emerald-400" />;
      default:
        return <Radio className="w-4 h-4 text-[#18D8E8]" />;
    }
  };

  const formatSeconds = (sec: number | undefined) => {
    if (!sec || isNaN(sec) || sec <= 0) return 'Unknown';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full bg-[#111B2B] rounded-2xl border border-[#293750] p-3.5 shadow-xl select-none">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left: Thumbnail / Source Icon + Title + Source URL */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#18243A] border border-[#293750] flex items-center justify-center shrink-0 shadow-sm">
            {getSourceIcon(currentSource.sourceType)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4
                className="font-semibold text-xs text-[#F5F7FF] truncate"
                title={currentSource.title || currentSource.videoId}
              >
                {currentSource.title || (currentSource.videoId ? `Video: ${currentSource.videoId}` : 'Direct Media Stream')}
              </h4>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#18243A] border border-[#293750] text-[#18D8E8] shrink-0">
                {currentSource.sourceType}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#A5B4CF]">
              <span className="truncate max-w-xs md:max-w-md font-mono" title={currentSource.canonicalUrl}>
                {currentSource.canonicalUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="p-0.5 hover:text-[#F5F7FF] transition-colors"
                title="Copy source link"
                aria-label="Copy source link"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-[#12C98A]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Duration, Status Badge, Session UUID & Cycle Badge */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono shrink-0">
          {/* Duration if known */}
          {adapterState.duration > 0 && (
            <div className="flex items-center gap-1 text-[#A5B4CF] bg-[#18243A] px-2.5 py-1 rounded-lg border border-[#293750]">
              <Clock className="w-3 h-3 text-[#A5B4CF]" />
              <span>{formatSeconds(adapterState.duration)}</span>
            </div>
          )}

          {/* Color-coded Status Badge */}
          <PlaybackStatusBadge status={adapterState.status} />

          {/* Cycle & Session Badge */}
          {currentSession && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-[#18D8E8] bg-[#18243A] px-2.5 py-1 rounded-lg border border-[#18D8E8]/30 glow-cyan">
                <Sparkles className="w-3 h-3 text-[#18D8E8]" />
                Cycle #{currentSession.cycleNumber}
              </span>

              <button
                type="button"
                onClick={handleCopySession}
                className="flex items-center gap-1 text-[11px] text-[#A5B4CF] hover:text-[#F5F7FF] bg-[#18243A] hover:bg-[#293750] px-2.5 py-1 rounded-lg border border-[#293750] transition-colors"
                title={`Cryptographically unique cycle session UUID: ${currentSession.sessionId} (Click to copy)`}
              >
                <span>UUID: {currentSession.sessionId.slice(0, 8)}...</span>
                {copiedSession ? (
                  <Check className="w-3 h-3 text-[#12C98A]" />
                ) : (
                  <Copy className="w-3 h-3 text-[#A5B4CF]" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
