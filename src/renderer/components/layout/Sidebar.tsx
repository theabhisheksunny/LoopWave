import React from 'react';
import {
  Home,
  PlayCircle,
  FolderHeart,
  BarChart3,
  Settings,
  Info,
  Repeat
} from 'lucide-react';
import { useNavigationStore, AppRoute } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';

export const Sidebar: React.FC = () => {
  const { currentRoute, setRoute } = useNavigationStore();
  const { currentSource, adapterState, loopMode } = usePlayerStore();

  const navItems: Array<{ id: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'player', label: 'Player', icon: PlayCircle },
    { id: 'library', label: 'Library', icon: FolderHeart },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'about', label: 'About', icon: Info }
  ];

  const isPlaying = adapterState.status === 'playing';

  return (
    <aside className="w-56 h-full bg-[#121721] border-r border-white/5 flex flex-col justify-between p-3 select-none">
      <div className="space-y-6">
        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setRoute(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-violet-500/15 text-white border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
                {item.id === 'player' && isPlaying && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mini player status preview at bottom of sidebar */}
      {currentSource && (
        <div
          onClick={() => setRoute('player')}
          className="p-3 rounded-xl bg-[#181F2E] border border-white/5 hover:border-cyan-500/30 cursor-pointer transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
            {loopMode !== 'off' && (
              <span className="flex items-center gap-1 text-[10px] text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                <Repeat className="w-2.5 h-2.5" />
                {loopMode === 'one' ? '1' : 'All'}
              </span>
            )}
          </div>
          <p className="text-xs text-white font-medium truncate group-hover:text-cyan-300 transition-colors">
            {currentSource.title || currentSource.videoId}
          </p>
        </div>
      )}
    </aside>
  );
};
