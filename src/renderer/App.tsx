import React, { useEffect } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { HomeScreen } from './routes/HomeScreen';
import { PlayerScreen } from './routes/PlayerScreen';
import { LibraryScreen } from './routes/LibraryScreen';
import { AnalyticsScreen } from './routes/AnalyticsScreen';
import { SettingsScreen } from './routes/SettingsScreen';
import { AboutScreen } from './routes/AboutScreen';
import { useNavigationStore } from './stores/navigationStore';
import { useSettingsStore } from './stores/settingsStore';
import { useLibraryStore } from './stores/libraryStore';
import { usePlayerStore } from './stores/playerStore';

export const App: React.FC = () => {
  const { currentRoute } = useNavigationStore();
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
      // Ignore keystrokes when typing into input fields
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
      {/* Top draggable frameless TitleBar */}
      <TitleBar />

      {/* Main body: Sidebar + Content screen */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden relative bg-[#0E121B]">
          {currentRoute === 'home' && <HomeScreen />}
          {currentRoute === 'player' && <PlayerScreen />}
          {currentRoute === 'library' && <LibraryScreen />}
          {currentRoute === 'analytics' && <AnalyticsScreen />}
          {currentRoute === 'settings' && <SettingsScreen />}
          {currentRoute === 'about' && <AboutScreen />}
        </main>
      </div>
    </div>
  );
};
