import { PlaybackAdapter } from './adapterInterface';
import { YouTubeAdapter } from './youtubeAdapter';
import { DirectMediaAdapter } from './directMediaAdapter';
import { ResolvedSource } from '../../shared/types';

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: PlaybackAdapter[] = [];

  private constructor() {
    // Register default built-in adapters
    this.registerAdapter(new YouTubeAdapter());
    this.registerAdapter(new DirectMediaAdapter());
  }

  public static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  public registerAdapter(adapter: PlaybackAdapter): void {
    const existingIndex = this.adapters.findIndex((a) => a.id === adapter.id);
    if (existingIndex >= 0) {
      this.adapters[existingIndex] = adapter;
    } else {
      this.adapters.push(adapter);
    }
  }

  public getAdapterForSource(source: ResolvedSource): PlaybackAdapter | null {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(source)) {
        return adapter;
      }
    }
    return null;
  }

  public getAvailableAdapters(): Array<{ id: string; name: string; capabilities: any }> {
    return this.adapters.map((a) => ({
      id: a.id,
      name: a.name,
      capabilities: a.getCapabilities()
    }));
  }
}
