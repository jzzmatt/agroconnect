import type { SubscriptionPlan } from "./database";

export interface UserEntitlements {
  /** Null means the user has no subscription saved in the database. */
  plan: SubscriptionPlan | null;
  subscription_status: "active" | "pending" | "cancelled" | "expired";
  /** True only when a plan row is stored. Distinct from plan-specific feature flags. */
  has_subscription: boolean;
  /** Any stored plan (including Basic) unlocks the Control Panel. No plan keeps it locked. */
  can_access_control_panel: boolean;
  can_access_agrishopping: boolean;
  can_access_agriproduct: boolean;
  can_access_agriacademy: boolean;
  can_access_agrilocalizacao: boolean;
  /** Compatibility alias for can_access_agrilocalizacao */
  can_access_agrilocalization?: boolean;
  can_access_agriexpert: boolean;
  can_access_business_dashboard: boolean;

  can_sell_products: boolean;
  can_create_products: boolean;
  can_edit_products: boolean;
  can_publish_products: boolean;
  can_manage_inventory: boolean;
  can_upload_product_images: boolean;
  can_upload_product_video: boolean;
  product_limit_reached: boolean;
  can_manage_services: boolean;
  can_publish_public_provider: boolean;
  can_teach_courses: boolean;
  can_create_courses: boolean;
  can_publish_courses: boolean;
  can_manage_locations: boolean;
  can_change_market_country: boolean;
  can_request_custom_payment_gateway: boolean;

  product_limit: number | null;
  max_products: number | null;
  max_services: number | null;
  video_storage_limit_bytes: number;
  video_storage_limit_gb: number;
}

export interface SubscriptionPlanDefinition {
  id: SubscriptionPlan;
  slug: "basic" | "professional" | "business" | "enterprise";
  name: string;
  priceMonthlyAoa: number;
  priceFormatted: string;
  period: string;
  tagline: string;
  highlightBadge?: string;
  isPopular?: boolean;
  productLimit: number | null;
  videoStorageLimitGb: number;
  features: string[];
  lockedFeatures?: string[];
  ctaText: string;
}
