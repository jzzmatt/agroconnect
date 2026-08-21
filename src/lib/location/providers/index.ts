import type {
  ILocationProvider,
  IMapProvider,
  IGeocodingProvider,
} from "./types";
import { MapQuestProvider } from "./mapquest-map";
import { MapQuestGeocodingProvider, LocalAngolaGeocodingProvider } from "./geocoding";

export * from "./types";
export * from "./mapquest-map";
export * from "./geocoding";

export interface LocationProviderOptions {
  apiKey?: string;
  initialLayer?: "map" | "satellite" | "hybrid" | "dark" | "light";
}

/**
 * Creates an authoritative MapQuest LocationProvider instance.
 * Decouples external mapping (MapQuest) from Supabase PostGIS spatial data models.
 */
export function createLocationProvider(options?: LocationProviderOptions): ILocationProvider {
  const apiKey = options?.apiKey || process.env.NEXT_PUBLIC_MAPQUEST_API_KEY || "";

  const mapProvider: IMapProvider = new MapQuestProvider(
    apiKey,
    options?.initialLayer || "map"
  );

  const geocodingProvider: IGeocodingProvider = apiKey
    ? new MapQuestGeocodingProvider(apiKey)
    : new LocalAngolaGeocodingProvider();

  return {
    mapProvider,
    geocodingProvider,
  };
}

/**
 * Singleton default location provider instance for general application use
 */
let defaultLocationProvider: ILocationProvider | null = null;

export function getDefaultLocationProvider(): ILocationProvider {
  if (!defaultLocationProvider) {
    defaultLocationProvider = createLocationProvider();
  }
  return defaultLocationProvider;
}
