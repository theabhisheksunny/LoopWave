import React from 'react';
import { PlayCircle } from 'lucide-react';

export const EmptyPlayerState: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-[#080D17] flex flex-col items-center justify-center gap-3 text-center p-8 z-10 select-none">
      <div className="w-16 h-16 rounded-2xl bg-[#111B2B] border border-[#293750] flex items-center justify-center text-[#6547FF] shadow-inner">
        <PlayCircle className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[#F5F7FF]">No Media Loaded</h3>
        <p className="text-xs text-[#A5B4CF] max-w-sm">
          Paste a video or audio link above or select an example to start streaming and looping.
        </p>
      </div>
    </div>
  );
};
