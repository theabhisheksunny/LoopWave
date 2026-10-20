import React, { useEffect } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { MainPlayerView } from './components/player/MainPlayerView';
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
      // Escape closes any open overlay modal
      if (e.key === 'Escape') {
        if (currentRoute !== 'main') {
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0B0E14] text-slate-100 select-none">
      {/* 1. Header with Window Drag & Clean Secondary Nav */}
      <TitleBar />

      {/* 2. Main Player View (Always Mounted) */}
      <main className="flex-1 overflow-hidden relative bg-[#0B0E14]">
        <MainPlayerView />

        {/* 3. Secondary Screens as High-Polish Non-Destructive Modals */}
        {currentRoute !== 'main' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-40 animate-fadeIn">
            <div className="relative w-full max-w-4xl h-[88vh] bg-[#121721] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              {/* Modal Close Button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 z-50 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex-1 overflow-y-auto">
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
  );
};
