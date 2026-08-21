import type { GeoCoordinate } from "@/types/domain";

/**
 * Common Map Configuration Options for MapQuest Map
 */
export interface MapOptions {
  container: HTMLElement | string;
  center?: GeoCoordinate;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  layerType?: "map" | "satellite" | "hybrid" | "dark" | "light";
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
 * Supported Map Layer Modes
 */
export type MapLayerType = "map" | "satellite" | "hybrid" | "dark" | "light";

/**
 * MapProvider Interface: Contract for renderable map engines (MapQuest JS + Leaflet)
 */
export interface IMapProvider {
  readonly id: string;
  readonly name: string;
  initialize(options: MapOptions): Promise<void> | void;
  setCenter(center: GeoCoordinate, zoom?: number, duration?: number): void;
  getCenter(): GeoCoordinate;
  setZoom(zoom: number): void;
  getZoom(): number;
  setLayerType(layerType: MapLayerType): void;
  getLayerType(): MapLayerType;
  resize(): void;
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
 * Direction/Routing result placeholder for future navigation
 */
export interface DirectionResult {
  distanceKm: number;
  durationMinutes: number;
  narrativeSteps: string[];
  bounds?: [GeoCoordinate, GeoCoordinate];
}

/**
 * GeocodingProvider Interface: Contract for forward, reverse, and place search address resolution
 */
export interface IGeocodingProvider {
  readonly id: string;
  readonly name: string;
  forward(query: string, options?: GeocodingQueryOptions): Promise<GeocodingResult[]>;
  reverse(coordinates: GeoCoordinate): Promise<GeocodingResult | null>;
  searchPlaces(query: string, options?: GeocodingQueryOptions): Promise<GeocodingResult[]>;
  getDirections?(start: GeoCoordinate, end: GeoCoordinate): Promise<DirectionResult | null>;
}

/**
 * Unified LocationProvider holding both Map and Geocoding capabilities
 */
export interface ILocationProvider {
  readonly mapProvider: IMapProvider;
  readonly geocodingProvider: IGeocodingProvider;
}
