import type { GeoCoordinate } from "@/types/domain";
import { calculateDistance } from "../location-service";
import type { IMapProvider } from "../providers/types";

export interface MapFocusTarget {
  latitude: number;
  longitude: number;
}

/**
 * Chooses a zoom level based on how far the camera is from the entity.
 */
export function computeSmartFocusZoom(
  mapCenter: GeoCoordinate,
  target: MapFocusTarget,
  currentZoom: number
): number {
  const distanceKm = calculateDistance(mapCenter, {
    latitude: target.latitude,
    longitude: target.longitude,
  });

  if (distanceKm < 2) return Math.max(currentZoom, 14);
  if (distanceKm < 15) return Math.max(currentZoom, 12);
  if (distanceKm < 80) return Math.max(10, Math.min(currentZoom + 1, 11));
  return Math.max(8, Math.min(currentZoom, 10));
}

export function focusMapEntity(
  provider: IMapProvider,
  target: MapFocusTarget,
  options?: { durationMs?: number }
): void {
  if (!Number.isFinite(target.latitude) || !Number.isFinite(target.longitude)) {
    return;
  }
  if (target.latitude === 0 && target.longitude === 0) return;

  const center = provider.getCenter();
  const zoom = computeSmartFocusZoom(center, target, provider.getZoom());
  provider.setCenter(
    { latitude: target.latitude, longitude: target.longitude },
    zoom,
    options?.durationMs ?? 800
  );
}
