import type { GeoCoordinate } from "@/types/domain";
import type { IMapProvider, MapOptions } from "./providers/types";

export const DEFAULT_ANGOLA_CENTER: GeoCoordinate = {
  latitude: -12.5,
  longitude: 17.5,
};

/**
 * Owns a single map adapter instance for one DOM container.
 *
 * Initialization is separated from later data updates (markers, center, zoom).
 * A generation counter makes React Strict Mode's mount → unmount → mount
 * sequence safe: an in-flight initialize from the first mount is discarded.
 */
export class MapLifecycleManager {
  private provider: IMapProvider | null = null;
  private generation = 0;

  constructor(private readonly createProvider: () => IMapProvider) {}

  get instance(): IMapProvider | null {
    return this.provider;
  }

  async mount(
    container: HTMLElement,
    options: Omit<MapOptions, "container">
  ): Promise<IMapProvider | null> {
    const generation = ++this.generation;
    this.destroyProvider();

    const provider = this.createProvider();
    this.provider = provider;

    try {
      await provider.initialize({ container, ...options });
    } catch (error) {
      if (generation !== this.generation) {
        provider.destroy();
        return null;
      }
      throw error;
    }

    if (generation !== this.generation) {
      provider.destroy();
      if (this.provider === provider) {
        this.provider = null;
      }
      return null;
    }

    return provider;
  }

  unmount(): void {
    this.generation += 1;
    this.destroyProvider();
  }

  private destroyProvider(): void {
    if (!this.provider) return;
    this.provider.destroy();
    this.provider = null;
  }
}

export function coordinatesEqual(
  a?: GeoCoordinate | null,
  b?: GeoCoordinate | null
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.latitude === b.latitude && a.longitude === b.longitude;
}
