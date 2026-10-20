import React from 'react';
import { PlayerStatus } from '../../../shared/types';

interface PlaybackStatusBadgeProps {
  status: PlayerStatus | 'idle';
  className?: string;
}

export const PlaybackStatusBadge: React.FC<PlaybackStatusBadgeProps> = ({ status, className = '' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'playing':
        return {
          color: 'bg-[#12C98A]',
          text: 'Playing',
          pulse: true,
          badgeBg: 'bg-[#18243A]',
          badgeBorder: 'border-[#12C98A]/30',
          textColor: 'text-[#12C98A]'
        };
      case 'paused':
        return {
          color: 'bg-[#A5B4CF]',
          text: 'Paused',
          pulse: false,
          badgeBg: 'bg-[#18243A]',
          badgeBorder: 'border-[#293750]',
          textColor: 'text-[#A5B4CF]'
        };
      case 'loading':
        return {
          color: 'bg-[#18D8E8]',
          text: 'Loading',
          pulse: true,
          badgeBg: 'bg-[#18243A]',
          badgeBorder: 'border-[#18D8E8]/30',
          textColor: 'text-[#18D8E8]'
        };
      case 'buffering':
        return {
          color: 'bg-[#18D8E8]',
          text: 'Buffering',
          pulse: true,
          badgeBg: 'bg-[#18243A]',
          badgeBorder: 'border-[#18D8E8]/30',
          textColor: 'text-[#18D8E8]'
        };
      case 'ended':
        return {
          color: 'bg-[#3478FF]',
          text: 'Completed',
          pulse: false,
          badgeBg: 'bg-[#18243A]',
          badgeBorder: 'border-[#3478FF]/30',
          textColor: 'text-[#3478FF]'
        };
      case 'error':
        return {
          color: 'bg-[#FF667D]',
          text: 'Error',
          pulse: false,
          badgeBg: 'bg-[#18243A]',
          badgeBorder: 'border-[#FF667D]/30',
          textColor: 'text-[#FF667D]'
        };
      default:
        return {
          color: 'bg-[#64748B]',
          text: 'Idle',
          pulse: false,
          badgeBg: 'bg-[#18243A]',
          badgeBorder: 'border-[#293750]',
          textColor: 'text-[#64748B]'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium ${config.badgeBg} ${config.badgeBorder} ${className}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${config.color} ${
          config.pulse ? 'animate-pulse' : ''
        }`}
      />
      <span className={`text-[11px] uppercase tracking-wider font-semibold ${config.textColor}`}>
        {config.text}
      </span>
    </div>
  );
};
