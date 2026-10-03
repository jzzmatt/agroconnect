import type {
  IGeocodingProvider,
  GeocodingResult,
  GeocodingQueryOptions,
} from "./types";
import type { GeoCoordinate } from "@/types/domain";
import { ANGOLA_COUNTRY_CODE, ANGOLA_COUNTRY_NAME } from "@/config/locations";
import { loadGoogleMaps } from "../google-maps/loader";
import { LocalAngolaGeocodingProvider } from "./geocoding";

const PLACE_FIELDS = ["location", "formattedAddress", "displayName", "addressComponents"] as const;

/**
 * Google Places (New) autocomplete + place resolution with local Angola fallback.
 */
export class GoogleGeocodingProvider implements IGeocodingProvider {
  public readonly id = "google-places";
  public readonly name = "Google Places";

  private sessionToken: google.maps.places.AutocompleteSessionToken | null = null;
  private readonly localFallback = new LocalAngolaGeocodingProvider();

  private async ensurePlacesLibrary(): Promise<google.maps.PlacesLibrary> {
    await loadGoogleMaps();
    return (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
  }

  private nextSessionToken(
    places: google.maps.PlacesLibrary
  ): google.maps.places.AutocompleteSessionToken {
    this.sessionToken = new places.AutocompleteSessionToken();
    return this.sessionToken;
  }

  public async forward(
    query: string,
    options?: GeocodingQueryOptions
  ): Promise<GeocodingResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      const places = await this.ensurePlacesLibrary();
      const token = this.nextSessionToken(places);
      const { suggestions } =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: token,
          includedRegionCodes: [options?.countryCode?.toLowerCase() || "ao"],
        });

      const limit = options?.limit ?? 8;
      const mapped: GeocodingResult[] = [];

      for (const suggestion of suggestions.slice(0, limit)) {
        const prediction = suggestion.placePrediction;
        if (!prediction) continue;
        mapped.push({
          id: prediction.placeId,
          name: prediction.mainText?.text || prediction.text?.text || trimmed,
          formattedAddress: prediction.text?.text || prediction.mainText?.text || trimmed,
          countryCode: ANGOLA_COUNTRY_CODE,
          countryName: ANGOLA_COUNTRY_NAME,
          coordinates: { latitude: NaN, longitude: NaN },
          confidence: 0.9,
          raw: { placeId: prediction.placeId, pendingResolution: true },
        });
      }

      if (mapped.length > 0) return mapped;
    } catch {
      // fall through to local dataset
    }

    return this.localFallback.forward(trimmed, options);
  }

  public async resolvePlace(placeId: string): Promise<GeocodingResult | null> {
    if (!placeId) return null;
    try {
      const places = await this.ensurePlacesLibrary();
      const place = new places.Place({ id: placeId });
      await place.fetchFields({ fields: [...PLACE_FIELDS] });

      const location = place.location;
      if (!location) return null;

      const components = place.addressComponents ?? [];
      const province =
        components.find((c) => c.types.includes("administrative_area_level_1"))?.longText ??
        null;

      return {
        id: placeId,
        name: place.displayName || place.formattedAddress || placeId,
        formattedAddress: place.formattedAddress || place.displayName || placeId,
        countryCode: ANGOLA_COUNTRY_CODE,
        countryName: ANGOLA_COUNTRY_NAME,
        provinceName: province,
        coordinates: {
          latitude: location.lat(),
          longitude: location.lng(),
        },
        confidence: 1,
      };
    } catch {
      return null;
    } finally {
      this.sessionToken = null;
    }
  }

  public async reverse(coordinates: GeoCoordinate): Promise<GeocodingResult | null> {
    try {
      await loadGoogleMaps();
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({
        location: { lat: coordinates.latitude, lng: coordinates.longitude },
      });
      const first = response.results[0];
      if (!first?.geometry?.location) {
        return this.localFallback.reverse(coordinates);
      }
      return {
        id: first.place_id || `rev-${coordinates.latitude},${coordinates.longitude}`,
        name: first.formatted_address,
        formattedAddress: first.formatted_address,
        countryCode: ANGOLA_COUNTRY_CODE,
        countryName: ANGOLA_COUNTRY_NAME,
        coordinates: {
          latitude: first.geometry.location.lat(),
          longitude: first.geometry.location.lng(),
        },
        confidence: 0.85,
      };
    } catch {
      return this.localFallback.reverse(coordinates);
    }
  }

  public async searchPlaces(
    query: string,
    options?: GeocodingQueryOptions
  ): Promise<GeocodingResult[]> {
    return this.forward(query, options);
  }
}

export function isPendingPlaceResult(result: GeocodingResult): boolean {
  const raw = result.raw as { pendingResolution?: boolean } | undefined;
  return Boolean(raw?.pendingResolution) || !Number.isFinite(result.coordinates.latitude);
}
