import type { UserRoleType, ThemePreference, AccountType, UserStatus } from "./database";

export interface UserProfileWithRoles {
  id: string;
  clerk_user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_slug: string | null;
  preferred_language: string;
  account_type: AccountType;
  status: UserStatus;
  theme_preference: ThemePreference;
  is_active: boolean;
  roles: UserRoleType[];
  created_at: string;
  updated_at: string;
}

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

export interface PillarCapability {
  id: "agriexpert" | "agriacademy" | "agrishopping" | "agrilocalizacao";
  name: string;
  slug: string;
  tagline: string;
  allowedRoles: UserRoleType[];
}
