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
import { calculateDistance } from "../index";

/**
 * Local Angola Dataset Geocoding Provider.
 * Fast, reliable, offline-ready forward and reverse geocoding for Angola's 18 provinces and key municipalities.
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

    // Optional proximity sort
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
}

export interface HttpGeocoderConfig {
  endpointUrl: string;
  apiKey?: string;
  countryCode?: string;
}

/**
 * Configurable Remote HTTP Geocoding Provider (e.g. Nominatim / Pelias / Geocodio / Custom Gateway)
 * Falls back gracefully to LocalAngolaGeocodingProvider if the remote request fails or is offline.
 */
export class ConfigurableHttpGeocodingProvider implements IGeocodingProvider {
  public readonly id: string;
  public readonly name: string;
  private config: HttpGeocoderConfig;
  private fallbackProvider: LocalAngolaGeocodingProvider;

  constructor(
    config: HttpGeocoderConfig,
    id = "configurable-http",
    name = "Serviço Geocoding Remoto"
  ) {
    this.id = id;
    this.name = name;
    this.config = config;
    this.fallbackProvider = new LocalAngolaGeocodingProvider();
  }

  public async forward(
    query: string,
    options?: GeocodingQueryOptions
  ): Promise<GeocodingResult[]> {
    if (!this.config.endpointUrl) {
      return this.fallbackProvider.forward(query, options);
    }

    try {
      const url = new URL(this.config.endpointUrl);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("countrycodes", options?.countryCode || this.config.countryCode || "ao");
      if (options?.limit) url.searchParams.set("limit", String(options.limit));
      if (this.config.apiKey) url.searchParams.set("key", this.config.apiKey);

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return this.fallbackProvider.forward(query, options);
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any, idx: number) => ({
          id: String(item.place_id || item.id || idx),
          name: item.name || item.display_name?.split(",")[0] || query,
          formattedAddress: item.display_name || query,
          countryCode: ANGOLA_COUNTRY_CODE,
          countryName: ANGOLA_COUNTRY_NAME,
          coordinates: {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          },
          raw: item,
        }));
      }

      return this.fallbackProvider.forward(query, options);
    } catch {
      return this.fallbackProvider.forward(query, options);
    }
  }

  public async reverse(coordinates: GeoCoordinate): Promise<GeocodingResult | null> {
    return this.fallbackProvider.reverse(coordinates);
  }
}
