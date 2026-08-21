import {
  ANGOLA_PROVINCES,
  ANGOLA_KEY_MUNICIPALITIES,
  ANGOLA_COUNTRY_CODE,
  ANGOLA_COUNTRY_NAME,
  type AngolaProvince,
  type AngolaMunicipality,
} from "@/config/locations";
import type { GeoCoordinate } from "@/types/domain";
import type {
  AdministrativeLocation,
  CoordinateBounds,
  LocationFilterModel,
  LocationSearchResultItem,
  NearbyEntityResult,
} from "./types";

/**
 * Validates geographic coordinate values under WGS84 standard
 */
export function isValidCoordinate(coord: Partial<GeoCoordinate> | null | undefined): coord is GeoCoordinate {
  if (!coord) return false;
  const { latitude, longitude } = coord;
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Calculates distance between two coordinates using the Haversine formula (in kilometers)
 */
export function calculateDistance(coord1: GeoCoordinate, coord2: GeoCoordinate): number {
  if (!isValidCoordinate(coord1) || !isValidCoordinate(coord2)) return 0;
  const earthRadiusKm = 6371;

  const latDistance = degreesToRadians(coord2.latitude - coord1.latitude);
  const lonDistance = degreesToRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(degreesToRadians(coord1.latitude)) *
      Math.cos(degreesToRadians(coord2.latitude)) *
      Math.sin(lonDistance / 2) *
      Math.sin(lonDistance / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c * 10) / 10;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Checks if a target coordinate is within a given radius (km) from center
 */
export function isWithinRadius(
  center: GeoCoordinate,
  target: GeoCoordinate,
  radiusKm: number
): boolean {
  if (!isValidCoordinate(center) || !isValidCoordinate(target)) return false;
  const safeRadius = Math.max(0, Math.min(radiusKm, 200));
  return calculateDistance(center, target) <= safeRadius;
}

/**
 * Checks if a coordinate is strictly contained within bounding box extents
 */
export function isWithinBounds(coord: GeoCoordinate, bounds: CoordinateBounds): boolean {
  if (!isValidCoordinate(coord)) return false;
  return (
    coord.latitude >= bounds.south &&
    coord.latitude <= bounds.north &&
    coord.longitude >= bounds.west &&
    coord.longitude <= bounds.east
  );
}

/**
 * Generates human-readable, clean Portuguese location labels without duplicate names
 * Examples:
 * - "Caála, Huambo • Angola"
 * - "Talatona, Luanda • Angola"
 * - "Huambo • Angola"
 */
export function formatLocation(loc: Partial<AdministrativeLocation> | null | undefined): string {
  if (!loc) return ANGOLA_COUNTRY_NAME;

  const parts: string[] = [];
  if (loc.localityName) parts.push(loc.localityName);
  if (loc.communeName && loc.communeName !== loc.localityName) parts.push(loc.communeName);
  if (loc.municipalityName && loc.municipalityName !== loc.communeName && loc.municipalityName !== loc.localityName) {
    parts.push(loc.municipalityName);
  }
  if (loc.provinceName && loc.provinceName !== loc.municipalityName) {
    parts.push(loc.provinceName);
  }

  if (parts.length === 0) {
    return loc.countryName || ANGOLA_COUNTRY_NAME;
  }

  return `${parts.join(", ")} • ${loc.countryName || ANGOLA_COUNTRY_NAME}`;
}

/**
 * Formats a distance number in kilometers with Portuguese unit
 * e.g. "1.2 km" or "850 m"
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * In-memory cached lookup of all official Angolan provinces
 */
export function getAllProvinces(): AngolaProvince[] {
  return ANGOLA_PROVINCES;
}

/**
 * Find province by code or name (case-insensitive)
 */
export function getProvince(codeOrName: string): AngolaProvince | undefined {
  const query = codeOrName.trim().toLowerCase();
  return ANGOLA_PROVINCES.find(
    (p) => p.code.toLowerCase() === query || p.name.toLowerCase() === query
  );
}

/**
 * Find municipality by code or name
 */
export function getMunicipality(codeOrName: string): AngolaMunicipality | undefined {
  const query = codeOrName.trim().toLowerCase();
  return ANGOLA_KEY_MUNICIPALITIES.find(
    (m) => m.code.toLowerCase() === query || m.name.toLowerCase() === query || m.name.toLowerCase().includes(query)
  );
}

/**
 * Returns all municipalities belonging to a specific province
 */
export function getMunicipalitiesByProvince(provinceCodeOrName: string): AngolaMunicipality[] {
  const province = getProvince(provinceCodeOrName);
  if (!province) return [];

  return ANGOLA_KEY_MUNICIPALITIES.filter(
    (m) => m.provinceCode === province.code || m.provinceName.toLowerCase() === province.name.toLowerCase()
  );
}

/**
 * Returns default coordinates for a given location or Angola center if not specified
 */
export function getCoordinates(provinceOrMunicipalityName?: string): GeoCoordinate {
  if (!provinceOrMunicipalityName) {
    // Default center of Angola (near Huambo/Bié)
    return { latitude: -12.5, longitude: 17.5 };
  }

  const muni = getMunicipality(provinceOrMunicipalityName);
  if (muni) {
    return { latitude: muni.latitude, longitude: muni.longitude };
  }

  const prov = getProvince(provinceOrMunicipalityName);
  if (prov) {
    return { latitude: prov.latitude, longitude: prov.longitude };
  }

  return { latitude: -12.5, longitude: 17.5 };
}

/**
 * Search locations by text with Angola-first prioritization and ranking
 */
export function searchLocations(
  query: string,
  options?: { limit?: number; center?: GeoCoordinate }
): LocationSearchResultItem[] {
  const clean = query.trim().toLowerCase();
  if (!clean || clean.length < 2) return [];

  const results: LocationSearchResultItem[] = [];

  // 1. Municipalities
  for (const m of ANGOLA_KEY_MUNICIPALITIES) {
    const exact = m.name.toLowerCase() === clean;
    const prefix = m.name.toLowerCase().startsWith(clean);
    const partial = m.name.toLowerCase().includes(clean) || m.provinceName.toLowerCase().includes(clean);

    if (exact || prefix || partial) {
      const coord = { latitude: m.latitude, longitude: m.longitude };
      const distanceKm = options?.center ? calculateDistance(options.center, coord) : undefined;

      results.push({
        id: `muni-${m.code}`,
        name: m.name,
        type: "municipality",
        formattedAddress: `${m.name}, ${m.provinceName} • ${ANGOLA_COUNTRY_NAME}`,
        countryCode: ANGOLA_COUNTRY_CODE,
        countryName: ANGOLA_COUNTRY_NAME,
        provinceName: m.provinceName,
        provinceCode: m.provinceCode,
        municipalityName: m.name,
        municipalityCode: m.code,
        coordinates: coord,
        distanceKm,
        confidence: exact ? 1.0 : prefix ? 0.9 : 0.75,
      });
    }
  }

  // 2. Provinces
  for (const p of ANGOLA_PROVINCES) {
    const exact = p.name.toLowerCase() === clean || p.code.toLowerCase() === clean;
    const prefix = p.name.toLowerCase().startsWith(clean);
    const partial = p.name.toLowerCase().includes(clean) || p.capital.toLowerCase().includes(clean);

    if (exact || prefix || partial) {
      const coord = { latitude: p.latitude, longitude: p.longitude };
      const distanceKm = options?.center ? calculateDistance(options.center, coord) : undefined;

      results.push({
        id: `prov-${p.code}`,
        name: p.name,
        type: "province",
        formattedAddress: `${p.name} (Cap: ${p.capital}) • ${ANGOLA_COUNTRY_NAME}`,
        countryCode: ANGOLA_COUNTRY_CODE,
        countryName: ANGOLA_COUNTRY_NAME,
        provinceName: p.name,
        provinceCode: p.code,
        coordinates: coord,
        distanceKm,
        confidence: exact ? 1.0 : prefix ? 0.95 : 0.8,
      });
    }
  }

  // Sort by confidence (descending) and distance (if center provided)
  results.sort((a, b) => {
    if ((b.confidence || 0) !== (a.confidence || 0)) {
      return (b.confidence || 0) - (a.confidence || 0);
    }
    if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
      return a.distanceKm - b.distanceKm;
    }
    return a.name.localeCompare(b.name);
  });

  const limit = options?.limit ?? 10;
  return results.slice(0, limit);
}

/**
 * Filter and sort local domain items by proximity to center coordinate
 */
export function searchNearby<T extends { coordinates?: GeoCoordinate | null }>(
  items: T[],
  center: GeoCoordinate,
  radiusKm?: number
): Array<T & { distanceKm: number }> {
  if (!isValidCoordinate(center)) return [];
  const safeRadius = radiusKm ? Math.max(0, Math.min(radiusKm, 200)) : undefined;

  return items
    .filter((item): item is T & { coordinates: GeoCoordinate } => isValidCoordinate(item.coordinates))
    .map((item) => ({
      ...item,
      distanceKm: calculateDistance(center, item.coordinates),
    }))
    .filter((item) => (safeRadius !== undefined ? item.distanceKm <= safeRadius : true))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Safely requests browser geolocation with natural user permission trigger
 */
export async function getUserLocation(): Promise<GeoCoordinate | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}
