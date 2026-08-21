import type {
  IGeocodingProvider,
  GeocodingResult,
  GeocodingQueryOptions,
  DirectionResult,
} from "./types";
import type { GeoCoordinate } from "@/types/domain";
import {
  ANGOLA_PROVINCES,
  ANGOLA_KEY_MUNICIPALITIES,
  ANGOLA_COUNTRY_CODE,
  ANGOLA_COUNTRY_NAME,
} from "@/config/locations";
import { calculateDistance } from "../location-service";

/**
 * Local Angola Administrative Dataset Geocoding Provider.
 * Fast, offline-capable fallback for Angola's 18 provinces and key municipalities.
 */
export class LocalAngolaGeocodingProvider implements IGeocodingProvider {
  public readonly id = "local-angola";
  public readonly name = "Base Geográfica Local (Angola)";

  public async forward(
    query: string,
    options?: GeocodingQueryOptions
  ): Promise<GeocodingResult[]> {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const results: GeocodingResult[] = [];

    // 1. Search Municipalities
    for (const muni of ANGOLA_KEY_MUNICIPALITIES) {
      const matchName = muni.name.toLowerCase().includes(cleanQuery);
      const matchProvince = muni.provinceName.toLowerCase().includes(cleanQuery);
      const matchCode = muni.code.toLowerCase().includes(cleanQuery);

      if (matchName || matchProvince || matchCode) {
        results.push({
          id: `muni-${muni.code}`,
          name: muni.name,
          formattedAddress: `${muni.name}, ${muni.provinceName} • ${ANGOLA_COUNTRY_NAME}`,
          countryCode: ANGOLA_COUNTRY_CODE,
          countryName: ANGOLA_COUNTRY_NAME,
          provinceCode: muni.provinceCode,
          provinceName: muni.provinceName,
          municipalityCode: muni.code,
          municipalityName: muni.name,
          coordinates: { latitude: muni.latitude, longitude: muni.longitude },
          confidence: matchName ? 0.95 : 0.8,
        });
      }
    }

    // 2. Search Provinces
    for (const prov of ANGOLA_PROVINCES) {
      const matchName = prov.name.toLowerCase().includes(cleanQuery);
      const matchCapital = prov.capital.toLowerCase().includes(cleanQuery);
      const matchCode = prov.code.toLowerCase() === cleanQuery;

      if (matchName || matchCapital || matchCode) {
        results.push({
          id: `prov-${prov.code}`,
          name: prov.name,
          formattedAddress: `${prov.name} (Cap: ${prov.capital}) • ${ANGOLA_COUNTRY_NAME}`,
          countryCode: ANGOLA_COUNTRY_CODE,
          countryName: ANGOLA_COUNTRY_NAME,
          provinceCode: prov.code,
          provinceName: prov.name,
          coordinates: { latitude: prov.latitude, longitude: prov.longitude },
          confidence: matchName ? 1.0 : 0.85,
        });
      }
    }

    if (options?.proximity) {
      const p = options.proximity;
      results.sort(
        (a, b) =>
          calculateDistance(p, a.coordinates) - calculateDistance(p, b.coordinates)
      );
    }

    const limit = options?.limit ?? 10;
    return results.slice(0, limit);
  }

  public async reverse(coordinates: GeoCoordinate): Promise<GeocodingResult | null> {
    let closestMuni: (typeof ANGOLA_KEY_MUNICIPALITIES)[0] | null = null;
    let minDistance = Infinity;

    for (const muni of ANGOLA_KEY_MUNICIPALITIES) {
      const dist = calculateDistance(coordinates, {
        latitude: muni.latitude,
        longitude: muni.longitude,
      });
      if (dist < minDistance) {
        minDistance = dist;
        closestMuni = muni;
      }
    }

    if (closestMuni && minDistance <= 150) {
      return {
        id: `rev-${closestMuni.code}`,
        name: closestMuni.name,
        formattedAddress: `${closestMuni.name}, ${closestMuni.provinceName} • ${ANGOLA_COUNTRY_NAME}`,
        countryCode: ANGOLA_COUNTRY_CODE,
        countryName: ANGOLA_COUNTRY_NAME,
        provinceCode: closestMuni.provinceCode,
        provinceName: closestMuni.provinceName,
        municipalityCode: closestMuni.code,
        municipalityName: closestMuni.name,
        coordinates: { latitude: closestMuni.latitude, longitude: closestMuni.longitude },
        confidence: Math.max(0, 1 - minDistance / 200),
      };
    }

    return null;
  }

  public async searchPlaces(
    query: string,
    options?: GeocodingQueryOptions
  ): Promise<GeocodingResult[]> {
    return this.forward(query, options);
  }
}

/**
 * Official MapQuest Geocoding, Reverse Geocoding & Place Search Provider
 * API Documentation: https://developer.mapquest.com/documentation/api/geocoding/
 */
export class MapQuestGeocodingProvider implements IGeocodingProvider {
  public readonly id = "mapquest-geocoding";
  public readonly name = "MapQuest Geocoding & Search";

  private apiKey: string;
  private fallbackProvider: LocalAngolaGeocodingProvider;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_MAPQUEST_API_KEY || "";
    this.fallbackProvider = new LocalAngolaGeocodingProvider();
  }

  /**
   * Forward Geocoding via MapQuest Address API
   */
  public async forward(
    query: string,
    options?: GeocodingQueryOptions
  ): Promise<GeocodingResult[]> {
    if (!this.apiKey) {
      return this.fallbackProvider.forward(query, options);
    }

    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    try {
      // Prioritize Angola in address lookup
      const locationParam = cleanQuery.toLowerCase().includes("angola")
        ? cleanQuery
        : `${cleanQuery}, Angola`;

      const url = new URL("https://www.mapquestapi.com/geocoding/v1/address");
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("location", locationParam);
      url.searchParams.set("maxResults", String(options?.limit || 10));
      url.searchParams.set("thumbMaps", "false");

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return this.fallbackProvider.forward(query, options);
      }

      const data = await response.json();
      const locations = data?.results?.[0]?.locations;

      if (Array.isArray(locations) && locations.length > 0) {
        const results: GeocodingResult[] = locations
          .filter((loc: any) => loc.latLng && loc.latLng.lat !== 0 && loc.latLng.lng !== 0)
          .map((loc: any, idx: number) => {
            const muni = loc.adminArea5 || loc.adminArea4 || "";
            const province = loc.adminArea3 || "";
            const country = loc.adminArea1 || ANGOLA_COUNTRY_NAME;
            const formatted = [loc.street, muni, province, country]
              .filter(Boolean)
              .join(", ");

            return {
              id: `mq-${idx}-${loc.latLng.lat}-${loc.latLng.lng}`,
              name: muni || province || cleanQuery,
              formattedAddress: formatted || cleanQuery,
              countryCode: loc.adminArea1 === "AO" ? "AO" : ANGOLA_COUNTRY_CODE,
              countryName: country,
              provinceName: province || null,
              municipalityName: muni || null,
              coordinates: {
                latitude: loc.latLng.lat,
                longitude: loc.latLng.lng,
              },
              confidence: 0.9,
              raw: loc,
            };
          });

        if (results.length > 0) {
          return results;
        }
      }

      return this.fallbackProvider.forward(query, options);
    } catch {
      return this.fallbackProvider.forward(query, options);
    }
  }

  /**
   * Reverse Geocoding via MapQuest Reverse API
   */
  public async reverse(coordinates: GeoCoordinate): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      return this.fallbackProvider.reverse(coordinates);
    }

    try {
      const url = new URL("https://www.mapquestapi.com/geocoding/v1/reverse");
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("location", `${coordinates.latitude},${coordinates.longitude}`);
      url.searchParams.set("thumbMaps", "false");

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return this.fallbackProvider.reverse(coordinates);
      }

      const data = await response.json();
      const loc = data?.results?.[0]?.locations?.[0];

      if (loc) {
        const muni = loc.adminArea5 || loc.adminArea4 || "";
        const province = loc.adminArea3 || "";
        const country = loc.adminArea1 || ANGOLA_COUNTRY_NAME;
        const formatted = [loc.street, muni, province, country]
          .filter(Boolean)
          .join(", ");

        return {
          id: `mq-rev-${coordinates.latitude}-${coordinates.longitude}`,
          name: muni || province || "Localização",
          formattedAddress: formatted || `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`,
          countryCode: loc.adminArea1 === "AO" ? "AO" : ANGOLA_COUNTRY_CODE,
          countryName: country,
          provinceName: province || null,
          municipalityName: muni || null,
          coordinates,
          confidence: 0.95,
          raw: loc,
        };
      }

      return this.fallbackProvider.reverse(coordinates);
    } catch {
      return this.fallbackProvider.reverse(coordinates);
    }
  }

  /**
   * MapQuest Place Search / Prediction API
   */
  public async searchPlaces(
    query: string,
    options?: GeocodingQueryOptions
  ): Promise<GeocodingResult[]> {
    if (!this.apiKey) {
      return this.fallbackProvider.searchPlaces(query, options);
    }

    const clean = query.trim();
    if (!clean) return [];

    try {
      const url = new URL("https://www.mapquestapi.com/search/v3/prediction");
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("q", clean);
      url.searchParams.set("collection", "adminArea,poi,address");
      url.searchParams.set("limit", String(options?.limit || 10));
      // Prioritize Angola coordinates bounding box
      url.searchParams.set("bbox", "11.6,-18.1,24.1,-4.3");

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return this.forward(query, options);
      }

      const data = await response.json();
      const results = data?.results;

      if (Array.isArray(results) && results.length > 0) {
        return results.map((item: any, idx: number) => ({
          id: `mq-place-${idx}-${item.displayString}`,
          name: item.name || item.displayString?.split(",")[0] || clean,
          formattedAddress: item.displayString || clean,
          countryCode: ANGOLA_COUNTRY_CODE,
          countryName: ANGOLA_COUNTRY_NAME,
          coordinates: {
            latitude: item.place?.geometry?.coordinates?.[1] || 0,
            longitude: item.place?.geometry?.coordinates?.[0] || 0,
          },
          confidence: 0.9,
          raw: item,
        }));
      }

      return this.forward(query, options);
    } catch {
      return this.forward(query, options);
    }
  }

  /**
   * Optional Directions calculation for future navigation foundations
   */
  public async getDirections(
    start: GeoCoordinate,
    end: GeoCoordinate
  ): Promise<DirectionResult | null> {
    if (!this.apiKey) return null;

    try {
      const url = new URL("https://www.mapquestapi.com/directions/v2/route");
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("from", `${start.latitude},${start.longitude}`);
      url.searchParams.set("to", `${end.latitude},${end.longitude}`);
      url.searchParams.set("unit", "k"); // Kilometers

      const response = await fetch(url.toString());
      if (!response.ok) return null;

      const data = await response.json();
      const route = data?.route;

      if (route) {
        const narrativeSteps = (route.legs?.[0]?.maneuvers || []).map(
          (m: any) => m.narrative
        );

        return {
          distanceKm: route.distance || 0,
          durationMinutes: Math.round((route.time || 0) / 60),
          narrativeSteps,
          bounds: [
            { latitude: route.boundingBox.lr.lat, longitude: route.boundingBox.ul.lng },
            { latitude: route.boundingBox.ul.lat, longitude: route.boundingBox.lr.lng },
          ],
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}
