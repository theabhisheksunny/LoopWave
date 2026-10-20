import React from 'react';
import {
  Home,
  ListMusic,
  FolderHeart,
  BarChart3,
  Settings,
  Info,
  Radio,
  Repeat,
  Repeat1
} from 'lucide-react';
import { useNavigationStore, AppRoute } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';

export const AppSidebar: React.FC = () => {
  const { currentRoute, setRoute } = useNavigationStore();
  const { currentSource, adapterState, loopMode } = usePlayerStore();

  const navItems: Array<{ id: AppRoute; label: string; tooltip: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Home', tooltip: 'Home View', icon: Home },
    { id: 'playlist', label: 'Playlist', tooltip: 'Queue Manager', icon: ListMusic },
    { id: 'library', label: 'Library', tooltip: 'Library', icon: FolderHeart },
    { id: 'analytics', label: 'Analytics', tooltip: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', tooltip: 'Settings', icon: Settings }
  ];

  const isPlaying = adapterState.status === 'playing';

  return (
    <aside className="w-56 shrink-0 h-full bg-[#101827] border-r border-[#293750] flex flex-col justify-between p-3 select-none z-30 transition-all">
      <div className="space-y-6">
        {/* Brand / Logo Area */}
        <div
          onClick={() => setRoute('home')}
          className="flex items-center gap-2.5 px-2 py-1.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6547FF] to-[#18D8E8] flex items-center justify-center shadow-lg shadow-[#6547FF]/20">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide text-[#F5F7FF]">LoopWave</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#18243A] text-[#18D8E8] border border-[#293750]">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-[#A5B4CF] tracking-tight">Looping Desktop Player</p>
          </div>
        </div>

        {/* Primary Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id || (item.id === 'home' && currentRoute === 'main');
            return (
              <button
                key={item.id}
                onClick={() => setRoute(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#6547FF]/25 to-[#3478FF]/20 text-white border-l-3 border-[#18D8E8] shadow-sm'
                    : 'text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A]/60'
                }`}
                title={item.tooltip}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#18D8E8]' : 'text-[#A5B4CF]'
                  }`}
                />
                <span>{item.label}</span>
                {item.id === 'home' && isPlaying && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#18D8E8] animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Mini Playing Card & About Link */}
      <div className="space-y-3">
        {/* Active Source Mini Card */}
        {currentSource && (
          <div
            onClick={() => setRoute('home')}
            className="p-3 rounded-xl bg-[#111B2B] border border-[#293750] hover:border-[#18D8E8]/50 cursor-pointer transition-all space-y-1.5 group"
            title="Click to view player"
          >
            <div className="flex items-center justify-between text-[11px] text-[#A5B4CF]">
              <span className="flex items-center gap-1.5 font-medium text-[#F5F7FF]">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#12C98A] animate-pulse' : 'bg-slate-500'}`} />
                {isPlaying ? 'Playing' : 'Paused'}
              </span>
              {loopMode !== 'off' && (
                <span className="flex items-center gap-1 text-[10px] text-[#18D8E8] bg-[#18243A] px-1.5 py-0.5 rounded border border-[#293750]">
                  {loopMode === 'one' ? <Repeat1 className="w-2.5 h-2.5" /> : <Repeat className="w-2.5 h-2.5" />}
                  {loopMode === 'one' ? '1' : 'All'}
                </span>
              )}
            </div>
            <p className="text-xs text-[#F5F7FF] font-medium truncate group-hover:text-[#18D8E8] transition-colors">
              {currentSource.title || currentSource.videoId}
            </p>
          </div>
        )}

        {/* About Link Pinned to Bottom */}
        <button
          onClick={() => setRoute('about')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
            currentRoute === 'about'
              ? 'bg-gradient-to-r from-[#6547FF]/25 to-[#3478FF]/20 text-white border-l-3 border-[#18D8E8]'
              : 'text-[#A5B4CF] hover:text-[#F5F7FF] hover:bg-[#18243A]/60'
          }`}
          title="About LoopWave"
        >
          <Info className={`w-4 h-4 ${currentRoute === 'about' ? 'text-[#18D8E8]' : 'text-[#A5B4CF]'}`} />
          <span>About</span>
        </button>
      </div>
    </aside>
  );
};
