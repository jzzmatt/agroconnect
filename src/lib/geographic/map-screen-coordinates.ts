import type { GeoCoordinate } from "@/types/domain";

export interface MapTransform {
  x: number;
  y: number;
  k: number;
}

type Projection = ((coords: [number, number]) => [number, number] | null) & {
  invert?: (coords: [number, number]) => [number, number] | null;
};

/** WGS84 point → screen pixels inside the map container (same transform as province labels). */
export function projectGeoToScreen(
  coordinate: GeoCoordinate,
  projection: Projection,
  transform: MapTransform
): { x: number; y: number } | null {
  const projected = projection([coordinate.longitude, coordinate.latitude]);
  if (!projected) return null;
  return {
    x: transform.x + transform.k * projected[0],
    y: transform.y + transform.k * projected[1],
  };
}
