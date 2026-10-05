import type { GeoCoordinate } from "@/types/domain";
import type {
  IMapProvider,
  MapLayerType,
  MapMarkerDescriptor,
  MapOptions,
} from "./types";

/**
 * Presentation adapter for the GeoJSON agricultural atlas (no external map SDK).
 * LocationMap renders SVG directly; this class satisfies ILocationProvider contracts and tests.
 */
export class GeoJsonMapProvider implements IMapProvider {
  public readonly id = "geojson-atlas";
  public readonly name = "AgroConnect GeoJSON Atlas";

  private center: GeoCoordinate = { latitude: -12.5, longitude: 17.5 };
  private zoom = 6;
  private layer: MapLayerType = "map";

  initialize(_options: MapOptions): void {
    _options.onLoad?.();
  }

  setCenter(center: GeoCoordinate, zoom?: number): void {
    this.center = center;
    if (zoom !== undefined) this.zoom = zoom;
  }

  getCenter(): GeoCoordinate {
    return this.center;
  }

  setZoom(zoom: number): void {
    this.zoom = zoom;
  }

  getZoom(): number {
    return this.zoom;
  }

  setLayerType(layerType: MapLayerType): void {
    this.layer = layerType === "satellite" || layerType === "hybrid" ? "map" : layerType;
  }

  getLayerType(): MapLayerType {
    return this.layer;
  }

  resize(): void {}

  addMarker(_marker: MapMarkerDescriptor): void {}
  removeMarker(_markerId: string): void {}
  clearMarkers(): void {}
  fitBounds(_bounds: [GeoCoordinate, GeoCoordinate], _padding?: number): void {}
  addUserLocationMarker(_coordinates: GeoCoordinate): void {}
  removeUserLocationMarker(): void {}
  destroy(): void {}
}
