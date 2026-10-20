import React, { useEffect } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { AppSidebar } from './components/layout/AppSidebar';
import { MainPlayerView } from './components/player/MainPlayerView';
import { PlaylistScreen } from './routes/PlaylistScreen';
import { LibraryScreen } from './routes/LibraryScreen';
import { AnalyticsScreen } from './routes/AnalyticsScreen';
import { SettingsScreen } from './routes/SettingsScreen';
import { AboutScreen } from './routes/AboutScreen';
import { useNavigationStore } from './stores/navigationStore';
import { useSettingsStore } from './stores/settingsStore';
import { useLibraryStore } from './stores/libraryStore';
import { usePlayerStore } from './stores/playerStore';
import { X } from 'lucide-react';

export const App: React.FC = () => {
  const { currentRoute, setRoute, closeModal } = useNavigationStore();
  const { loadSettings } = useSettingsStore();
  const { loadAll: loadLibrary } = useLibraryStore();
  const {
    adapterState,
    play,
    pause,
    seek,
    setVolume,
    setMuted,
    setLoopMode,
    loopMode,
    toggleFullscreen
  } = usePlayerStore();

  useEffect(() => {
    loadSettings();
    loadLibrary();
  }, [loadSettings, loadLibrary]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes any open secondary screen overlay
      if (e.key === 'Escape') {
        if (currentRoute !== 'home' && currentRoute !== 'main') {
          closeModal();
          return;
        }
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (adapterState.status === 'playing') {
            pause();
          } else {
            play();
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          seek(Math.max(0, adapterState.currentTime - 5));
          break;

        case 'ArrowRight':
          e.preventDefault();
          seek(adapterState.currentTime + 5);
          break;

        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(100, adapterState.volume + 5));
          break;

        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, adapterState.volume - 5));
          break;

        case 'KeyM':
          e.preventDefault();
          setMuted(!adapterState.isMuted);
          break;

        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;

        case 'KeyL':
          e.preventDefault();
          const nextMode =
            loopMode === 'off' ? 'one' : loopMode === 'one' ? 'all' : 'off';
          setLoopMode(nextMode);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    currentRoute,
    closeModal,
    adapterState.status,
    adapterState.currentTime,
    adapterState.volume,
    adapterState.isMuted,
    loopMode,
    play,
    pause,
    seek,
    setVolume,
    setMuted,
    setLoopMode,
    toggleFullscreen
  ]);

  const isHome = currentRoute === 'home' || currentRoute === 'main';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080D17] text-[#F5F7FF] select-none">
      {/* 1. Header with Window Drag & Window Controls */}
      <TitleBar />

      {/* 2. Workspace Layout: Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <AppSidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative bg-[#080D17]">
          {/* Main Player View (Always mounted in DOM to prevent player destruction) */}
          <div className="w-full h-full overflow-hidden">
            <MainPlayerView />
          </div>

          {/* Secondary Screens as High-Polish Non-Destructive Modals */}
          {!isHome && (
            <div className="absolute inset-0 bg-[#080D17]/85 backdrop-blur-md flex items-center justify-center p-4 z-40 animate-fadeIn">
              <div className="relative w-full max-w-5xl h-[88vh] bg-[#101827] border border-[#293750] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Close Button */}
                <button
                  type="button"
                  onClick={closeModal}
                  className="absolute top-4 right-4 z-50 p-2 rounded-xl bg-[#18243A] hover:bg-[#293750] text-[#A5B4CF] hover:text-[#F5F7FF] border border-[#293750] transition-colors"
                  title="Close (Esc)"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex-1 overflow-y-auto">
                  {currentRoute === 'playlist' && <PlaylistScreen />}
                  {currentRoute === 'library' && <LibraryScreen />}
                  {currentRoute === 'analytics' && <AnalyticsScreen />}
                  {currentRoute === 'settings' && <SettingsScreen />}
                  {currentRoute === 'about' && <AboutScreen />}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
