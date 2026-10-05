import type {
  ILocationProvider,
  IMapProvider,
  IGeocodingProvider,
} from "./types";
import { GeoJsonMapProvider } from "./geojson-map-provider";
import { LocalAngolaGeocodingProvider } from "./geocoding";

export * from "./types";
export * from "./geojson-map-provider";
export * from "./geocoding";

export interface LocationProviderOptions {
  apiKey?: string;
  initialLayer?: "map" | "satellite" | "hybrid" | "dark" | "light";
}

/**
 * Supabase/PostGIS = durable geography; bundled GeoJSON atlas = map presentation; local dataset = search.
 */
export function createLocationProvider(_options?: LocationProviderOptions): ILocationProvider {
  const mapProvider: IMapProvider = new GeoJsonMapProvider();
  const geocodingProvider: IGeocodingProvider = new LocalAngolaGeocodingProvider();

  return {
    mapProvider,
    geocodingProvider,
  };
}

let defaultLocationProvider: ILocationProvider | null = null;

export function getDefaultLocationProvider(): ILocationProvider {
  if (!defaultLocationProvider) {
    defaultLocationProvider = createLocationProvider();
  }
  return defaultLocationProvider;
}
