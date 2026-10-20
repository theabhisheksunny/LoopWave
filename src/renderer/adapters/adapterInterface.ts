import {
  ResolvedSource,
  AdapterCapabilities,
  AdapterState,
  PlayerError
} from '../../shared/types';

export type StateChangeListener = (state: AdapterState) => void;
export type EventListener = (eventType: string, payload?: any) => void;

export interface PlaybackAdapter {
  readonly id: string;
  readonly name: string;

  canHandle(source: ResolvedSource): boolean;
  getCapabilities(): AdapterCapabilities;
  getState(): AdapterState;

  load(
    source: ResolvedSource,
    container: HTMLElement,
    options?: { autoPlay?: boolean; initialTime?: number; volume?: number }
  ): Promise<void>;

  play(): Promise<void>;
  pause(): void;
  stop(): void;
  seek(positionSeconds: number): void;
  setVolume(volumePercent: number): void; // 0 to 100
  setMuted(muted: boolean): void;
  setPlaybackRate(rate: number): void;

  clearListeners(): void;
  onStateChange(listener: StateChangeListener): () => void;
  onEvent(listener: EventListener): () => void;

  dispose(): void;
}

export abstract class BasePlaybackAdapter implements PlaybackAdapter {
  abstract readonly id: string;
  abstract readonly name: string;

  protected state: AdapterState = {
    status: 'idle',
    currentTime: 0,
    duration: 0,
    volume: 80,
    isMuted: false,
    playbackRate: 1.0,
    bufferedTime: 0,
    error: null
  };

  private stateListeners: Set<StateChangeListener> = new Set();
  private eventListeners: Set<EventListener> = new Set();

  abstract canHandle(source: ResolvedSource): boolean;
  abstract getCapabilities(): AdapterCapabilities;
  abstract load(
    source: ResolvedSource,
    container: HTMLElement,
    options?: { autoPlay?: boolean; initialTime?: number; volume?: number }
  ): Promise<void>;
  abstract play(): Promise<void>;
  abstract pause(): void;
  abstract stop(): void;
  abstract seek(positionSeconds: number): void;
  abstract setVolume(volumePercent: number): void;
  abstract setMuted(muted: boolean): void;
  abstract setPlaybackRate(rate: number): void;
  abstract dispose(): void;

  public getState(): AdapterState {
    return { ...this.state };
  }

  public clearListeners(): void {
    this.stateListeners.clear();
    this.eventListeners.clear();
  }

  public onStateChange(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  protected updateState(partial: Partial<AdapterState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.stateListeners) {
      try {
        listener(this.getState());
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    }
  }

  protected emitEvent(eventType: string, payload?: any): void {
    for (const listener of this.eventListeners) {
      try {
        listener(eventType, payload);
      } catch (err) {
        console.error('Error in event listener:', err);
      }
    }
  }

  protected setError(code: string, message: string, fatal = false, underlyingError?: unknown): void {
    const error: PlayerError = { code, message, fatal, underlyingError };
    this.updateState({ status: 'error', error });
    this.emitEvent('error', error);
  }
}
