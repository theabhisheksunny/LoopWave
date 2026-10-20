import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SettingsScreen } from '../../src/renderer/routes/SettingsScreen';
import { useSettingsStore } from '../../src/renderer/stores/settingsStore';
import { DEFAULT_SETTINGS } from '../../src/shared/defaults';

describe('SettingsScreen UI Component (Phase 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      storagePolicy: {
        privateMode: false,
        analyticsPersistenceEnabled: true,
        retentionDays: 30,
        databasePath: 'C:\\Users\\JohnDoe\\AppData\\Roaming\\LoopWave\\loopwave.db',
        approximateDbSizeBytes: 65536,
        activeSessionStorageType: 'SQLite-File'
      },
      isLoading: false
    });
  });

  it('renders header, title, and all 5 major settings sections', () => {
    render(<SettingsScreen />);

    expect(screen.getByRole('heading', { name: /Settings & Privacy/i })).toBeInTheDocument();
    expect(screen.getByText(/Manage playback, local storage, and privacy preferences/i)).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /Privacy & Local Storage Policy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Default Playback Behavior/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Keyboard Shortcuts Reference/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Local Storage Diagnostics & Management/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /About LoopWave & System Transparency/i })).toBeInTheDocument();
  });

  it('toggles Private Mode and displays the RAM-Only callout banner', async () => {
    render(<SettingsScreen />);

    const privateSwitch = screen.getByRole('switch', { name: /Toggle Private Mode/i });
    expect(privateSwitch).toHaveAttribute('aria-checked', 'false');

    await act(async () => {
      fireEvent.click(privateSwitch);
    });

    const updated = useSettingsStore.getState().settings;
    expect(updated.privateMode).toBe(true);

    // RAM-Only banner should now be visible
    expect(screen.getByText(/RAM-Only Session Active/i)).toBeInTheDocument();
  });

  it('toggles Persist Analytics state', async () => {
    render(<SettingsScreen />);

    const analyticsSwitch = screen.getByRole('switch', { name: /Toggle Persist Analytics/i });
    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'true');

    await act(async () => {
      fireEvent.click(analyticsSwitch);
    });

    expect(useSettingsStore.getState().settings.persistAnalytics).toBe(false);
  });

  it('updates Analytics Retention days when selecting options', async () => {
    render(<SettingsScreen />);

    const btn90 = screen.getByRole('button', { name: '90 Days' });
    await act(async () => {
      fireEvent.click(btn90);
    });
    expect(useSettingsStore.getState().settings.analyticsRetentionDays).toBe(90);

    const btnForever = screen.getByRole('button', { name: 'Keep Forever' });
    await act(async () => {
      fireEvent.click(btnForever);
    });
    expect(useSettingsStore.getState().settings.analyticsRetentionDays).toBe(0);
  });

  it('updates Default Loop Mode', async () => {
    render(<SettingsScreen />);

    const repeat1Btn = screen.getByRole('button', { name: /Repeat 1/i });
    await act(async () => {
      fireEvent.click(repeat1Btn);
    });
    expect(useSettingsStore.getState().settings.defaultLoopMode).toBe('one');

    const repeatAllBtn = screen.getByRole('button', { name: /Repeat All/i });
    await act(async () => {
      fireEvent.click(repeatAllBtn);
    });
    expect(useSettingsStore.getState().settings.defaultLoopMode).toBe('all');
  });

  it('updates Default Inter-Loop Delay via presets and numeric input', async () => {
    render(<SettingsScreen />);

    const btn5s = screen.getByRole('button', { name: '5s' });
    await act(async () => {
      fireEvent.click(btn5s);
    });
    expect(useSettingsStore.getState().settings.defaultDelaySeconds).toBe(5);

    const delayInput = screen.getByLabelText(/Default delay in seconds/i);
    await act(async () => {
      fireEvent.change(delayInput, { target: { value: '12' } });
    });
    expect(useSettingsStore.getState().settings.defaultDelaySeconds).toBe(12);
  });

  it('updates Default Volume slider and presets', async () => {
    render(<SettingsScreen />);

    const volSlider = screen.getByLabelText(/Default volume percentage/i);
    await act(async () => {
      fireEvent.change(volSlider, { target: { value: '65' } });
    });
    expect(useSettingsStore.getState().settings.defaultVolume).toBe(65);

    const preset100 = screen.getByRole('button', { name: '100%' });
    await act(async () => {
      fireEvent.click(preset100);
    });
    expect(useSettingsStore.getState().settings.defaultVolume).toBe(100);
  });

  it('toggles Auto-Play on load', async () => {
    render(<SettingsScreen />);

    const autoPlaySwitch = screen.getByRole('switch', { name: /Toggle Auto-Play/i });
    expect(autoPlaySwitch).toHaveAttribute('aria-checked', 'true');

    await act(async () => {
      fireEvent.click(autoPlaySwitch);
    });
    expect(useSettingsStore.getState().settings.autoPlay).toBe(false);
  });

  it('displays keyboard shortcuts reference table accurately', () => {
    render(<SettingsScreen />);

    expect(screen.getByText('Space')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
    expect(screen.getByText(/Suppressed while typing in text inputs/i)).toBeInTheDocument();
  });

  it('displays storage diagnostics and masks sensitive username in database path', () => {
    render(<SettingsScreen />);

    expect(screen.getByText(/SQLite-File/i)).toBeInTheDocument();
    expect(screen.getByText(/64 KB/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero \(Disabled\)/i)).toBeInTheDocument();

    // Sensitive path should be masked: C:\Users\***\AppData\...
    const maskedPath = screen.getByText(/C:\\Users\\\*\*\*\\AppData\\Roaming\\LoopWave\\loopwave\.db/i);
    expect(maskedPath).toBeInTheDocument();
    expect(screen.queryByText(/JohnDoe/)).not.toBeInTheDocument();
  });

  it('handles destructive action modals: Clear Analytics, Clear Library, Purge All', async () => {
    const clearAnalyticsSpy = vi.spyOn(useSettingsStore.getState(), 'clearAnalytics');
    const clearLibrarySpy = vi.spyOn(useSettingsStore.getState(), 'clearLibrary');
    const purgeAllSpy = vi.spyOn(useSettingsStore.getState(), 'purgeAllData');

    render(<SettingsScreen />);

    // 1. Open and Cancel Clear Analytics modal
    const clearAnalyticsBtn = screen.getByRole('button', { name: /Clear Analytics/i });
    await act(async () => {
      fireEvent.click(clearAnalyticsBtn);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Clear Playback Analytics\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Your saved Media Library bookmarks and collections will be preserved/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 2. Open and Confirm Clear Analytics
    await act(async () => {
      fireEvent.click(clearAnalyticsBtn);
    });
    const confirmClearAnalytics = screen.getByRole('button', { name: /Confirm Clear Analytics/i });
    await act(async () => {
      fireEvent.click(confirmClearAnalytics);
    });
    expect(clearAnalyticsSpy).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 3. Open and Confirm Clear Library
    const clearLibraryBtn = screen.getByRole('button', { name: /Clear Library/i });
    await act(async () => {
      fireEvent.click(clearLibraryBtn);
    });
    expect(screen.getByText(/Clear Media Library\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Your playback analytics and cycle metrics will be preserved/i)).toBeInTheDocument();

    const confirmClearLibrary = screen.getByRole('button', { name: /Confirm Clear Library/i });
    await act(async () => {
      fireEvent.click(confirmClearLibrary);
    });
    expect(clearLibrarySpy).toHaveBeenCalled();

    // 4. Open and Confirm Purge All
    const purgeAllBtn = screen.getByRole('button', { name: /Purge All/i });
    await act(async () => {
      fireEvent.click(purgeAllBtn);
    });
    expect(screen.getByText(/Purge All Local Data\?/i)).toBeInTheDocument();
    const confirmPurgeAll = screen.getByRole('button', { name: /Confirm Purge All/i });
    await act(async () => {
      fireEvent.click(confirmPurgeAll);
    });
    expect(purgeAllSpy).toHaveBeenCalled();
  });
});
