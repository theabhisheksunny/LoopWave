import { BasePlaybackAdapter } from './adapterInterface';
import { AdapterCapabilities, ResolvedSource } from '../../shared/types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('YouTube API load timeout. Check network connection.'));
    }, 12000);

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      if (prevCallback) prevCallback();
      resolve();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to download YouTube IFrame API.'));
      };
      document.head.appendChild(tag);
    }
  });

  return apiLoadPromise;
}

export class YouTubeAdapter extends BasePlaybackAdapter {
  readonly id = 'youtube';
  readonly name = 'Official YouTube Player';

  private player: any = null;
  private timeUpdateInterval: any = null;
  private isDisposed = false;

  canHandle(source: ResolvedSource): boolean {
    return source.sourceType === 'youtube' && Boolean(source.videoId);
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsSpeed: true,
      supportsPiP: false,
      supportsSeeking: true,
      supportsVolume: true,
      supportsQuality: true
    };
  }

  async load(
    source: ResolvedSource,
    container: HTMLElement,
    options?: { autoPlay?: boolean; initialTime?: number; volume?: number }
  ): Promise<void> {
    this.dispose();
    this.isDisposed = false;
    this.updateState({ status: 'loading', error: null });

    try {
      await loadYouTubeIframeApi();
    } catch (err: any) {
      this.setError('YT_API_LOAD_FAILED', err.message || 'Failed to load YouTube API', true, err);
      return;
    }

    if (this.isDisposed) return;

    // Clean previous container contents
    container.innerHTML = '';
    const iframeMountId = `yt_player_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const iframeMount = document.createElement('div');
    iframeMount.id = iframeMountId;
    iframeMount.style.width = '100%';
    iframeMount.style.height = '100%';
    container.appendChild(iframeMount);

    const playerVars: Record<string, any> = {
      autoplay: options?.autoPlay ? 1 : 0,
      controls: 1,
      enablejsapi: 1,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      playsinline: 1,
      start: options?.initialTime ? Math.floor(options.initialTime) : 0
    };

    if (
      typeof window !== 'undefined' &&
      window.location &&
      window.location.origin &&
      window.location.origin !== 'null'
    ) {
      playerVars.origin = window.location.origin;
    }

    return new Promise((resolve) => {
      let isResolved = false;

      // Guard timeout against stuck loading
      const loadTimeout = setTimeout(() => {
        if (!isResolved && !this.isDisposed) {
          isResolved = true;
          this.setError(
            'YT_LOAD_TIMEOUT',
            'YouTube player took too long to initialize. Verify video availability and network.',
            true
          );
          resolve();
        }
      }, 15000);

      try {
        this.player = new window.YT.Player(iframeMountId, {
          videoId: source.videoId,
          width: '100%',
          height: '100%',
          playerVars,
          events: {
            onReady: () => {
              if (this.isDisposed || isResolved) return;
              isResolved = true;
              clearTimeout(loadTimeout);

              const duration = this.player.getDuration() || 0;
              const volume = options?.volume ?? 80;
              try {
                this.player.setVolume(volume);
              } catch {
                // ignore
              }

              this.updateState({
                status: 'ready',
                duration,
                volume,
                isMuted: false
              });

              this.startTimeTicker();

              if (options?.autoPlay) {
                try {
                  this.player.playVideo();
                } catch {
                  // ignore
                }
              }

              resolve();
            },
            onStateChange: (event: any) => {
              if (this.isDisposed) return;
              this.handlePlayerStateChange(event.data);
            },
            onError: (event: any) => {
              if (this.isDisposed) return;
              clearTimeout(loadTimeout);
              this.handlePlayerError(event.data);
              if (!isResolved) {
                isResolved = true;
                resolve();
              }
            }
          }
        });
      } catch (err: any) {
        clearTimeout(loadTimeout);
        this.setError('YT_INIT_EXCEPTION', err.message || 'Failed to initialize player', true, err);
        resolve();
      }
    });
  }

  private handlePlayerStateChange(stateCode: number): void {
    switch (stateCode) {
      case -1: // unstarted
        this.updateState({ status: 'loading' });
        break;
      case 0: // ended
        this.updateState({ status: 'ended' });
        this.emitEvent('ended');
        break;
      case 1: // playing
        this.updateState({ status: 'playing' });
        this.emitEvent('playing');
        this.startTimeTicker();
        break;
      case 2: // paused
        this.updateState({ status: 'paused' });
        this.emitEvent('paused');
        this.stopTimeTicker();
        break;
      case 3: // buffering
        this.updateState({ status: 'buffering' });
        this.emitEvent('buffering');
        break;
      case 5: // video cued
        this.updateState({ status: 'ready' });
        break;
      default:
        break;
    }
  }

  private handlePlayerError(errorCode: number): void {
    let message = 'An error occurred during YouTube playback.';
    let fatal = true;

    switch (errorCode) {
      case 2:
        message = 'Invalid video ID or parameter supplied.';
        break;
      case 5:
        message = 'HTML5 player playback error occurred.';
        break;
      case 100:
        message = 'The requested video was not found, is private, or has been removed.';
        break;
      case 101:
        message = 'The video owner does not allow embedded playback outside YouTube. Use "Open on YouTube" to watch directly.';
        break;
      case 150:
        message = 'The video owner does not allow embedded playback (error 150). Use "Open on YouTube" to watch directly.';
        break;
      case 152:
        message = 'Playback restricted by embed origin configuration (error 152). Use "Open on YouTube" to watch.';
        break;
      case 153:
        message = 'Missing Referer or API client identification required by YouTube (error 153). Use "Open on YouTube" to watch.';
        break;
      default:
        message = `YouTube playback error (${errorCode}).`;
        break;
    }

    this.setError(`YT_ERROR_${errorCode}`, message, fatal);
  }

  private startTimeTicker(): void {
    this.stopTimeTicker();
    this.timeUpdateInterval = setInterval(() => {
      if (!this.player || this.isDisposed) return;
      try {
        if (typeof this.player.getCurrentTime === 'function') {
          const currentTime = this.player.getCurrentTime() || 0;
          const duration = this.player.getDuration() || this.state.duration;
          const fraction =
            typeof this.player.getVideoLoadedFraction === 'function'
              ? this.player.getVideoLoadedFraction()
              : 0;
          const bufferedTime = fraction * duration;

          this.updateState({
            currentTime,
            duration,
            bufferedTime
          });
        }
      } catch {
        // transitioning
      }
    }, 250);
  }

  private stopTimeTicker(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  async play(): Promise<void> {
    if (this.player && typeof this.player.playVideo === 'function') {
      this.player.playVideo();
    }
  }

  pause(): void {
    if (this.player && typeof this.player.pauseVideo === 'function') {
      this.player.pauseVideo();
    }
  }

  stop(): void {
    this.stopTimeTicker();
    if (this.player && typeof this.player.stopVideo === 'function') {
      this.player.stopVideo();
    }
    this.updateState({ status: 'idle', currentTime: 0 });
  }

  seek(positionSeconds: number): void {
    if (this.player && typeof this.player.seekTo === 'function') {
      this.player.seekTo(positionSeconds, true);
      this.updateState({ currentTime: positionSeconds });
    }
  }

  setVolume(volumePercent: number): void {
    const clamped = Math.max(0, Math.min(100, volumePercent));
    if (this.player && typeof this.player.setVolume === 'function') {
      this.player.setVolume(clamped);
      if (clamped > 0 && this.state.isMuted) {
        this.player.unMute();
      }
    }
    this.updateState({ volume: clamped, isMuted: clamped === 0 });
  }

  setMuted(muted: boolean): void {
    if (this.player) {
      if (muted && typeof this.player.mute === 'function') {
        this.player.mute();
      } else if (!muted && typeof this.player.unMute === 'function') {
        this.player.unMute();
      }
    }
    this.updateState({ isMuted: muted });
  }

  setPlaybackRate(rate: number): void {
    if (this.player && typeof this.player.setPlaybackRate === 'function') {
      this.player.setPlaybackRate(rate);
      this.updateState({ playbackRate: rate });
    }
  }

  dispose(): void {
    this.isDisposed = true;
    this.stopTimeTicker();

    if (this.player) {
      try {
        if (typeof this.player.destroy === 'function') {
          this.player.destroy();
        }
      } catch (err) {
        console.warn('Error destroying YouTube player instance:', err);
      }
      this.player = null;
    }

    this.updateState({ status: 'idle', error: null, currentTime: 0, duration: 0 });
  }
}
