import {
  ANGOLA_PROVINCES,
  ANGOLA_KEY_MUNICIPALITIES,
  ANGOLA_COUNTRY_CODE,
  ANGOLA_COUNTRY_NAME,
  type AngolaProvince,
  type AngolaMunicipality,
} from "@/config/locations";
import type { GeoCoordinate, GeographicLocation } from "@/types/domain";

/**
 * Calculates distance between two coordinates using the Haversine formula (in kilometers)
 */
export function calculateDistance(coord1: GeoCoordinate, coord2: GeoCoordinate): number {
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
  return calculateDistance(center, target) <= radiusKm;
}

/**
 * Formats a location object into a clean Portuguese human-readable string
 * e.g. "Caála, Huambo • Angola" or "Luanda • Angola"
 */
export function formatLocation(loc: Partial<GeographicLocation> | null | undefined): string {
  if (!loc) return "Angola";

  const parts: string[] = [];
  if (loc.communeName) parts.push(loc.communeName);
  if (loc.municipalityName && loc.municipalityName !== loc.communeName) parts.push(loc.municipalityName);
  if (loc.provinceName && loc.provinceName !== loc.municipalityName) parts.push(loc.provinceName);

  if (parts.length === 0) {
    return loc.countryName || ANGOLA_COUNTRY_NAME;
  }

  return `${parts.join(", ")} • ${loc.countryName || ANGOLA_COUNTRY_NAME}`;
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
    (m) => m.code.toLowerCase() === query || m.name.toLowerCase() === query
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
 * Search and rank items with coordinates by proximity to a given center
 */
export function searchNearby<T extends { coordinates?: GeoCoordinate | null }>(
  items: T[],
  center: GeoCoordinate,
  radiusKm?: number
): Array<T & { distanceKm: number }> {
  return items
    .filter((item): item is T & { coordinates: GeoCoordinate } => Boolean(item.coordinates))
    .map((item) => ({
      ...item,
      distanceKm: calculateDistance(center, item.coordinates),
    }))
    .filter((item) => (radiusKm ? item.distanceKm <= radiusKm : true))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Safely requests the user's browser geolocation with graceful error handling
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

export * from "./providers";

