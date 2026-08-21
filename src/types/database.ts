export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRoleType =
  | "student"
  | "creator"
  | "seller"
  | "instructor"
  | "expert"
  | "veterinarian"
  | "agronomist"
  | "agricultural_consultant"
  | "business"
  | "admin";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
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
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          profile_slug?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          profile_slug?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          clerk_user_id: string;
          role: UserRoleType;
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          role: UserRoleType;
          created_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          role?: UserRoleType;
          created_at?: string;
        };
      };
      locations: {
        Row: {
          id: string;
          country_code: string;
          country_name: string;
          province_code: string | null;
          province_name: string;
          municipality_code: string | null;
          municipality_name: string | null;
          commune_code: string | null;
          commune_name: string | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          country_code?: string;
          country_name?: string;
          province_code?: string | null;
          province_name: string;
          municipality_code?: string | null;
          municipality_name?: string | null;
          commune_code?: string | null;
          commune_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          country_code?: string;
          country_name?: string;
          province_code?: string | null;
          province_name?: string;
          municipality_code?: string | null;
          municipality_name?: string | null;
          commune_code?: string | null;
          commune_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      sync_location_point: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      set_updated_at: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
    };
    Enums: {
      user_role: UserRoleType;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
export type LocationRecord = Database["public"]["Tables"]["locations"]["Row"];
