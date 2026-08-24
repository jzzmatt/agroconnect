import type {
  UserRoleType,
  ThemePreference,
  AccountType,
  UserStatus,
  ProfessionalTitle,
  ProfileType,
  SubscriptionPlan,
} from "./database";

export interface UserProfileWithRoles {
  id: string;
  clerk_user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_phone?: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_slug: string | null;
  professional_title?: ProfessionalTitle;
  professional_title_custom?: string | null;
  active_profile_type?: ProfileType;
  subscription_plan?: SubscriptionPlan | null;
  preferred_language: string;
  market_country_code?: string;
  video_storage_used_bytes?: number;
  account_type: AccountType;
  status: UserStatus;
  theme_preference: ThemePreference;
  is_active: boolean;
  roles: UserRoleType[];
  created_at: string;
  updated_at: string;
}

export interface UserGreetingResult {
  greeting: string;
  fullNameOrTitle: string;
  displayName: string;
  activeProfileLabel: string;
  activeProfileIcon: string;
}

export interface PillarCapability {
  id: "agriexpert" | "agriacademy" | "agrishopping" | "agrilocalizacao";
  name: string;
  slug: string;
  tagline: string;
  allowedRoles: UserRoleType[];
}
