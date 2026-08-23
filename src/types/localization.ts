export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface GeographicLocation {
  id?: string;
  countryCode: string;
  countryName: string;
  provinceCode?: string | null;
  provinceName: string;
  municipalityCode?: string | null;
  municipalityName?: string | null;
  communeCode?: string | null;
  communeName?: string | null;
  coordinates?: GeoCoordinate | null;
}
