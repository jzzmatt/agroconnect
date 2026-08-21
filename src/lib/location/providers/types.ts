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
  styleUrl?: string;
  interactive?: boolean;
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
  onClick?: () => void;
}

/**
 * MapProvider Interface: Contract for renderable map engines (e.g. MapLibre GL, OpenFreeMap, Leaflet, Mapbox)
 */
export interface IMapProvider {
  readonly id: string;
  readonly name: string;
  initialize(options: MapOptions): Promise<void> | void;
  setCenter(center: GeoCoordinate, zoom?: number): void;
  getCenter(): GeoCoordinate;
  setZoom(zoom: number): void;
  getZoom(): number;
  addMarker(marker: MapMarkerDescriptor): void;
  removeMarker(markerId: string): void;
  clearMarkers(): void;
  fitBounds(bounds: [GeoCoordinate, GeoCoordinate], padding?: number): void;
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
