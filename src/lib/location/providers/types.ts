import type { GeoCoordinate, GeographicLocation } from "@/types/domain";

/**
 * Common Map Configuration Options
 */
export interface MapOptions {
  container: HTMLElement | string;
  center?: GeoCoordinate;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  pitch?: number;
  bearing?: number;
  styleUrl?: string;
  interactive?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Standard Marker Definition
 */
export interface MapMarkerDescriptor {
  id: string;
  coordinates: GeoCoordinate;
  title: string;
  category?: string;
  color?: string;
  element?: HTMLElement;
  popupHtml?: string;
  isUserLocation?: boolean;
  onClick?: () => void;
}

/**
 * Map View Mode (2D flat vs 3D pitched)
 */
export type MapViewMode = "2d" | "3d";

/**
 * MapProvider Interface: Contract for renderable map engines (e.g. MapLibre GL, OpenFreeMap)
 */
export interface IMapProvider {
  readonly id: string;
  readonly name: string;
  initialize(options: MapOptions): Promise<void> | void;
  setCenter(center: GeoCoordinate, zoom?: number, duration?: number): void;
  getCenter(): GeoCoordinate;
  setZoom(zoom: number, duration?: number): void;
  getZoom(): number;
  setPitch(pitch: number, duration?: number): void;
  getPitch(): number;
  setBearing(bearing: number, duration?: number): void;
  getBearing(): number;
  set2DView(duration?: number): void;
  set3DView(pitch?: number, bearing?: number, duration?: number): void;
  getViewMode(): MapViewMode;
  resize(): void;
  setStyle(styleUrl: string): void;
  addMarker(marker: MapMarkerDescriptor): void;
  removeMarker(markerId: string): void;
  clearMarkers(): void;
  fitBounds(bounds: [GeoCoordinate, GeoCoordinate], padding?: number): void;
  addUserLocationMarker(coordinates: GeoCoordinate): void;
  removeUserLocationMarker(): void;
  destroy(): void;
}

/**
 * Standard Geocoding Result
 */
export interface GeocodingResult {
  id: string;
  formattedAddress: string;
  name: string;
  countryCode: string;
  countryName: string;
  provinceCode?: string | null;
  provinceName?: string | null;
  municipalityCode?: string | null;
  municipalityName?: string | null;
  communeCode?: string | null;
  communeName?: string | null;
  coordinates: GeoCoordinate;
  confidence?: number;
  raw?: unknown;
}

/**
 * Geocoding Query Options
 */
export interface GeocodingQueryOptions {
  countryCode?: string;
  provinceName?: string;
  limit?: number;
  proximity?: GeoCoordinate;
}

/**
 * GeocodingProvider Interface: Contract for forward & reverse address resolution
 */
export interface IGeocodingProvider {
  readonly id: string;
  readonly name: string;
  forward(query: string, options?: GeocodingQueryOptions): Promise<GeocodingResult[]>;
  reverse(coordinates: GeoCoordinate): Promise<GeocodingResult | null>;
}

/**
 * Unified LocationProvider holding both Map and Geocoding capabilities
 */
export interface ILocationProvider {
  readonly mapProvider: IMapProvider;
  readonly geocodingProvider: IGeocodingProvider;
}
