import type {
  ILocationProvider,
  IMapProvider,
  IGeocodingProvider,
} from "./types";
import { MapLibreOpenFreeMapProvider } from "./maplibre-openfreemap";
import { LocalAngolaGeocodingProvider, ConfigurableHttpGeocodingProvider } from "./geocoding";

export * from "./types";
export * from "./maplibre-openfreemap";
export * from "./geocoding";

export interface LocationProviderOptions {
  mapStyle?: string;
  geocodingEndpointUrl?: string;
  geocodingApiKey?: string;
}

/**
 * Creates a configured LocationProvider instance decoupling Map rendering (OpenFreeMap + MapLibre)
 * and Geocoding search from the rest of AGROCONNECT.
 */
export function createLocationProvider(options?: LocationProviderOptions): ILocationProvider {
  const mapProvider: IMapProvider = new MapLibreOpenFreeMapProvider(
    options?.mapStyle || process.env.NEXT_PUBLIC_MAP_STYLE || "liberty"
  );

  let geocodingProvider: IGeocodingProvider;
  if (options?.geocodingEndpointUrl || process.env.NEXT_PUBLIC_GEOCODING_URL) {
    geocodingProvider = new ConfigurableHttpGeocodingProvider({
      endpointUrl: options?.geocodingEndpointUrl || process.env.NEXT_PUBLIC_GEOCODING_URL || "",
      apiKey: options?.geocodingApiKey || process.env.NEXT_PUBLIC_GEOCODING_KEY,
    });
  } else {
    geocodingProvider = new LocalAngolaGeocodingProvider();
  }

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
