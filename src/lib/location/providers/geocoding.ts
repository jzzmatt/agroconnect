import type {
  IGeocodingProvider,
  GeocodingResult,
  GeocodingQueryOptions,
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
