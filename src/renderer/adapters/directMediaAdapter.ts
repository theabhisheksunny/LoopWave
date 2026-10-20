import Hls from 'hls.js';
import { BasePlaybackAdapter } from './adapterInterface';
import { AdapterCapabilities, ResolvedSource } from '../../shared/types';

export class DirectMediaAdapter extends BasePlaybackAdapter {
  readonly id = 'direct-media';
  readonly name = 'Direct Media & HLS Player';

  private mediaElement: HTMLVideoElement | null = null;
  private hls: Hls | null = null;
  private isDisposed = false;
  private retryCount = 0;
  private maxRetries = 3;

  canHandle(source: ResolvedSource): boolean {
    return (
      source.sourceType === 'direct-video' ||
      source.sourceType === 'direct-audio' ||
      source.sourceType === 'hls'
    );
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsSpeed: true,
      supportsPiP: true,
      supportsSeeking: true,
      supportsVolume: true,
      supportsQuality: Boolean(this.hls)
    };
  }

  async load(
    source: ResolvedSource,
    container: HTMLElement,
    options?: { autoPlay?: boolean; initialTime?: number; volume?: number }
  ): Promise<void> {
    this.dispose();
    this.isDisposed = false;
    this.retryCount = 0;

    this.updateState({ status: 'loading', error: null });

    // Clean container
    container.innerHTML = '';

    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.backgroundColor = '#000';
    video.playsInline = true;
    video.controls = false; // We use rich LoopWave controls

    const initialVolume = options?.volume ?? 80;
    video.volume = initialVolume / 100;

    this.mediaElement = video;
    container.appendChild(video);

    this.bindMediaEvents(video, options);

    if (source.sourceType === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          manifestLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 3,
          enableWorker: true
        });
        this.hls = hls;

        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(source.canonicalUrl);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (this.isDisposed) return;
          if (options?.initialTime && options.initialTime > 0) {
            video.currentTime = options.initialTime;
          }
          if (options?.autoPlay) {
            video.play().catch((err) => {
              console.warn('Autoplay prevented or failed:', err);
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (this.retryCount < this.maxRetries) {
                  this.retryCount++;
                  console.warn(`HLS network error, retry ${this.retryCount}/${this.maxRetries}...`);
                  hls.startLoad();
                } else {
                  this.setError(
                    'HLS_NETWORK_FATAL',
                    'Network error loading live HLS stream. Please check connection and URL.',
                    true
                  );
                  hls.destroy();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('HLS media error, recovering...');
                hls.recoverMediaError();
                break;
              default:
                this.setError(
                  'HLS_FATAL_ERROR',
                  `Fatal streaming error: ${data.details || 'unknown'}`,
                  true
                );
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support
        video.src = source.canonicalUrl;
      } else {
        this.setError('HLS_NOT_SUPPORTED', 'HLS streaming is not supported on this device/engine.', true);
        return;
      }
    } else {
      // Standard MP4 / WebM / Audio
      video.src = source.canonicalUrl;
    }

    if (options?.initialTime && options.initialTime > 0) {
      video.currentTime = options.initialTime;
    }

    if (options?.autoPlay) {
      video.play().catch((err) => {
        console.warn('Autoplay prevented:', err);
      });
    }
  }

  private bindMediaEvents(
    video: HTMLVideoElement,
    options?: { autoPlay?: boolean; initialTime?: number }
  ): void {
    video.addEventListener('loadedmetadata', () => {
      if (this.isDisposed) return;
      this.updateState({
        status: 'ready',
        duration: isFinite(video.duration) ? video.duration : 0,
        volume: Math.round(video.volume * 100),
        isMuted: video.muted
      });
    });

    video.addEventListener('playing', () => {
      if (this.isDisposed) return;
      this.updateState({ status: 'playing' });
      this.emitEvent('playing');
    });

    video.addEventListener('pause', () => {
      if (this.isDisposed) return;
      // If ended, do not overwrite ended status with paused
      if (this.state.status !== 'ended') {
        this.updateState({ status: 'paused' });
        this.emitEvent('paused');
      }
    });

    video.addEventListener('waiting', () => {
      if (this.isDisposed) return;
      this.updateState({ status: 'buffering' });
      this.emitEvent('buffering');
    });

    video.addEventListener('ended', () => {
      if (this.isDisposed) return;
      this.updateState({ status: 'ended' });
      this.emitEvent('ended');
    });

    video.addEventListener('timeupdate', () => {
      if (this.isDisposed) return;
      let buffered = 0;
      if (video.buffered.length > 0) {
        buffered = video.buffered.end(video.buffered.length - 1);
      }
      this.updateState({
        currentTime: video.currentTime,
        duration: isFinite(video.duration) ? video.duration : this.state.duration,
        bufferedTime: buffered
      });
    });

    video.addEventListener('volumechange', () => {
      if (this.isDisposed) return;
      this.updateState({
        volume: Math.round(video.volume * 100),
        isMuted: video.muted
      });
    });

    video.addEventListener('error', () => {
      if (this.isDisposed) return;
      const mediaErr = video.error;
      let code = 'MEDIA_PLAYBACK_ERROR';
      let message = 'An error occurred during media playback.';

      if (mediaErr) {
        switch (mediaErr.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            message = 'Playback was aborted by the client.';
            code = 'MEDIA_ABORTED';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            message = 'A network error caused the media download to fail.';
            code = 'MEDIA_NETWORK_ERROR';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            message = 'The media playback was aborted due to a corruption or unsupported codec.';
            code = 'MEDIA_DECODE_ERROR';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = 'The media format or MIME type is not supported by the playback engine.';
            code = 'MEDIA_SRC_NOT_SUPPORTED';
            break;
        }
      }

      this.setError(code, message, true, mediaErr);
    });
  }

  async play(): Promise<void> {
    if (this.mediaElement) {
      await this.mediaElement.play();
    }
  }

  pause(): void {
    if (this.mediaElement) {
      this.mediaElement.pause();
    }
  }

  stop(): void {
    if (this.mediaElement) {
      this.mediaElement.pause();
      this.mediaElement.currentTime = 0;
    }
    this.updateState({ status: 'idle', currentTime: 0 });
  }

  seek(positionSeconds: number): void {
    if (this.mediaElement && isFinite(positionSeconds)) {
      this.mediaElement.currentTime = positionSeconds;
      this.updateState({ currentTime: positionSeconds });
    }
  }

  setVolume(volumePercent: number): void {
    const clamped = Math.max(0, Math.min(100, volumePercent));
    if (this.mediaElement) {
      this.mediaElement.volume = clamped / 100;
      if (clamped > 0 && this.mediaElement.muted) {
        this.mediaElement.muted = false;
      }
    }
    this.updateState({ volume: clamped, isMuted: clamped === 0 });
  }

  setMuted(muted: boolean): void {
    if (this.mediaElement) {
      this.mediaElement.muted = muted;
    }
    this.updateState({ isMuted: muted });
  }

  setPlaybackRate(rate: number): void {
    if (this.mediaElement) {
      this.mediaElement.playbackRate = rate;
    }
    this.updateState({ playbackRate: rate });
  }

  async togglePictureInPicture(): Promise<boolean> {
    if (!this.mediaElement) return false;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return false;
      } else {
        await this.mediaElement.requestPictureInPicture();
        return true;
      }
    } catch (err) {
      console.warn('Picture-in-picture failed:', err);
      return false;
    }
  }

  dispose(): void {
    this.isDisposed = true;

    if (this.hls) {
      try {
        this.hls.destroy();
      } catch (err) {
        console.warn('Error destroying HLS instance:', err);
      }
      this.hls = null;
    }

    if (this.mediaElement) {
      this.mediaElement.pause();
      this.mediaElement.removeAttribute('src');
      this.mediaElement.load();
      if (this.mediaElement.parentElement) {
        this.mediaElement.parentElement.removeChild(this.mediaElement);
      }
      this.mediaElement = null;
    }

    this.updateState({ status: 'idle', error: null, currentTime: 0, duration: 0 });
  }
}
