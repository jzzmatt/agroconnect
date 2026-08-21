import type { GeoCoordinate } from "@/types/domain";

export type LocationSource = "gps" | "manual" | "profile" | "search" | "map";

export interface CoordinateBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface AdministrativeLocation {
  countryId?: string;
  countryName: string;
  countryCode: string; // e.g. 'AO'
  provinceId?: string;
  provinceName: string;
  provinceCode?: string; // e.g. 'HUA'
  municipalityId?: string;
  municipalityName?: string;
  municipalityCode?: string;
  communeId?: string;
  communeName?: string;
  communeCode?: string;
  localityId?: string;
  localityName?: string;
  addressLine?: string;
}

export interface UserLocationState {
  coordinates: GeoCoordinate | null;
  administrative: AdministrativeLocation | null;
  accuracyMeters?: number;
  source: LocationSource;
  timestamp: number;
  isCustom?: boolean;
}

export interface LocationFilterModel {
  countryCode?: string;
  provinceId?: string;
  provinceName?: string;
  municipalityId?: string;
  municipalityName?: string;
  communeId?: string;
  communeName?: string;
  localityId?: string;
  localityName?: string;
  center?: GeoCoordinate;
  radiusKm?: number;
  bounds?: CoordinateBounds;
}

export interface LocationSearchResultItem {
  id: string;
  name: string;
  type: "country" | "province" | "municipality" | "commune" | "locality" | "custom_place";
  formattedAddress: string;
  countryCode: string;
  countryName: string;
  provinceName?: string;
  provinceCode?: string;
  municipalityName?: string;
  municipalityCode?: string;
  communeName?: string;
  localityName?: string;
  coordinates: GeoCoordinate;
  distanceKm?: number;
  confidence?: number;
}

export interface NearbyEntityResult {
  id: string;
  title: string;
  slug: string;
  entityType: "service" | "product" | "provider" | "agricultural_resource";
  categoryName?: string;
  priceFormatted?: string;
  coordinates: GeoCoordinate;
  distanceMeters: number;
  distanceKm: number;
  isWithinServiceArea?: boolean;
  provinceName?: string;
  municipalityName?: string;
}
