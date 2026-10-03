import type {
  ILocationProvider,
  IMapProvider,
  IGeocodingProvider,
} from "./types";
import { GoogleMapProvider } from "./google-map";
import { GoogleGeocodingProvider } from "./google-geocoding";
import { LocalAngolaGeocodingProvider } from "./geocoding";
import { getGoogleMapsApiKey } from "../google-maps/loader";

export * from "./types";
export * from "./google-map";
export * from "./google-geocoding";
export * from "./geocoding";

export interface LocationProviderOptions {
  apiKey?: string;
  initialLayer?: "map" | "satellite" | "hybrid" | "dark" | "light";
}

/**
 * Supabase/PostGIS remains the geographic data layer; Google Maps is presentation + place search.
 */
export function createLocationProvider(options?: LocationProviderOptions): ILocationProvider {
  const googleKey = options?.apiKey || getGoogleMapsApiKey() || "";

  const mapProvider: IMapProvider = new GoogleMapProvider(
    options?.initialLayer || "map"
  );

  const geocodingProvider: IGeocodingProvider = googleKey
    ? new GoogleGeocodingProvider()
    : new LocalAngolaGeocodingProvider();

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
