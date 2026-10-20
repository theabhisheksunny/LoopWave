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
      reject(new Error('YouTube IFrame API script load timeout'));
    }, 10000);

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      if (prevCallback) prevCallback();
      resolve();
    };

    // Check if script tag already exists
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load YouTube IFrame API script'));
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
  private currentVideoId: string | null = null;
  private isDisposed = false;

  canHandle(source: ResolvedSource): boolean {
    return source.sourceType === 'youtube' && Boolean(source.videoId);
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsSpeed: true,
      supportsPiP: false, // YouTube iframe restricts native HTML5 PiP
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
    this.isDisposed = false;
    this.updateState({ status: 'loading', error: null });
    this.currentVideoId = source.videoId;

    try {
      await loadYouTubeIframeApi();
    } catch (err: any) {
      this.setError('YT_API_LOAD_FAILED', err.message || 'Failed to load YouTube API', true, err);
      return;
    }

    if (this.isDisposed) return;

    // Clean previous container contents
    container.innerHTML = '';
    const iframeMountId = `yt_player_${Date.now()}`;
    const iframeMount = document.createElement('div');
    iframeMount.id = iframeMountId;
    iframeMount.style.width = '100%';
    iframeMount.style.height = '100%';
    container.appendChild(iframeMount);

    return new Promise((resolve) => {
      this.player = new window.YT.Player(iframeMountId, {
        videoId: source.videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: options?.autoPlay ? 1 : 0,
          controls: 1, // Official YouTube player controls
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          start: options?.initialTime ? Math.floor(options.initialTime) : 0,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            if (this.isDisposed) return;

            const duration = this.player.getDuration() || 0;
            const volume = options?.volume ?? 80;
            this.player.setVolume(volume);

            this.updateState({
              status: 'ready',
              duration,
              volume,
              isMuted: this.player.isMuted()
            });

            this.startTimeTicker();
            resolve();
          },
          onStateChange: (event: any) => {
            if (this.isDisposed) return;
            this.handlePlayerStateChange(event.data);
          },
          onError: (event: any) => {
            if (this.isDisposed) return;
            this.handlePlayerError(event.data);
          }
        }
      });
    });
  }

  private handlePlayerStateChange(stateCode: number): void {
    // YT.PlayerState: -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = video cued
    switch (stateCode) {
      case -1:
        this.updateState({ status: 'loading' });
        break;
      case 0:
        this.updateState({ status: 'ended' });
        this.emitEvent('ended');
        break;
      case 1:
        this.updateState({ status: 'playing' });
        this.emitEvent('playing');
        this.startTimeTicker();
        break;
      case 2:
        this.updateState({ status: 'paused' });
        this.emitEvent('paused');
        this.stopTimeTicker();
        break;
      case 3:
        this.updateState({ status: 'buffering' });
        this.emitEvent('buffering');
        break;
      case 5:
        this.updateState({ status: 'ready' });
        break;
      default:
        break;
    }
  }

  private handlePlayerError(errorCode: number): void {
    let message = 'An error occurred while playing the YouTube video.';
    let fatal = true;

    switch (errorCode) {
      case 2:
        message = 'Invalid video ID or parameter value.';
        break;
      case 5:
        message = 'HTML5 player playback error occurred.';
        break;
      case 100:
        message = 'Video not found, private, or removed.';
        break;
      case 101:
      case 150:
        message = 'Embedding disabled by the video author/owner.';
        break;
      default:
        message = `YouTube player error code ${errorCode}.`;
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
        // player might be transitioning
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

    this.currentVideoId = null;
    this.updateState({ status: 'idle', error: null, currentTime: 0, duration: 0 });
  }
}
