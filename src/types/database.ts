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
  | "farmer"
  | "service_provider"
  | "admin";

export type ProfessionalTitle = "none" | "Dr." | "Prof." | "Eng." | "Tec." | "custom";

export type ProfileType =
  | "veterinarian"
  | "expert"
  | "instructor"
  | "student"
  | "seller"
  | "farmer"
  | "service_provider"
  | "business"
  | "personal";

export type SubscriptionPlan = "basic" | "professional" | "business" | "enterprise";

export type AccountType =
  | "customer"
  | "provider"
  | "seller"
  | "farmer"
  | "instructor"
  | "organization"
  | "admin";

export type UserStatus = "active" | "inactive" | "suspended" | "pending_verification";

export type ThemePreference = "light" | "dark";

export type ProviderType =
  | "individual"
  | "company"
  | "cooperative"
  | "organization"
  | "technician"
  | "veterinarian"
  | "agronomist"
  | "instructor"
  | "supplier"
  | "agricultural_consultant";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export type PricingType =
  | "fixed"
  | "starting_from"
  | "hourly"
  | "daily"
  | "quotation"
  | "free";

export type ServiceStatus = "draft" | "published" | "active" | "paused" | "archived";
export type ProviderPublicationState = "draft" | "published" | "paused";
export type ServiceLocationType = "physical_location" | "service_area" | "remote";
export type ServiceContactPreference = "platform" | "phone" | "whatsapp" | "email";

export type ProductCondition = "new" | "used" | "refurbished" | "not_applicable";
export type ProductStatus = "draft" | "published" | "active" | "paused" | "out_of_stock" | "archived" | "rejected";
export type ProductAvailabilityStatus = "in_stock" | "out_of_stock" | "limited" | "pre_order" | "on_request";
export type ProductLocationType = "physical_location" | "service_area" | "remote";

export type ProductRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

export type CartStatus = "active" | "converted" | "abandoned";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "ready_for_fulfillment"
  | "shipped"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "failed"
  | "refunded";

export type OrderFulfillmentMethod = "delivery" | "pickup";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

export type PaymentMethod =
  | "card"
  | "bank_transfer"
  | "mobile_money"
  | "cash_on_delivery"
  | "mock_sandbox"
  | "multicaixa_online";

export type OrderSellerGroupStatus =
  | "pending"
  | "processing"
  | "ready_for_pickup"
  | "shipped"
  | "completed"
  | "cancelled";

export type DeliveryStatus =
  | "not_assigned"
  | "assigned"
  | "accepted"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed"
  | "cancelled";

export type CourierVehicleType =
  | "motorcycle"
  | "pickup_truck"
  | "van"
  | "heavy_truck"
  | "bicycle";

export type CourierStatus = "available" | "busy" | "offline" | "suspended";

export type ProofOfDeliveryType = "otp" | "photo" | "signature";

export type TrackingActorType =
  | "customer"
  | "seller"
  | "courier"
  | "logistics_admin"
  | "system";

export type AgriculturalResourceType =
  | "agronomist"
  | "veterinarian"
  | "agricultural_technician"
  | "irrigation_specialist"
  | "farm_equipment"
  | "machinery_rental"
  | "seed_supplier"
  | "fertilizer_supplier"
  | "soil_testing_lab"
  | "training_facility"
  | "agricultural_cooperative";

export type MediaEntityType =
  | "profile_avatar"
  | "provider_banner"
  | "service_image"
  | "product_image"
  | "course_thumbnail"
  | "course_video"
  | "document";

export type StorageProvider =
  | "cloudflare_r2"
  | "cloudflare_stream"
  | "supabase_storage"
  | "local"
  | "external"
  | "bunny_stream"
  | "imagekit";

export type AcademyVideoStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "deleted"
  | "video_unavailable";

export type ProductVideoProvider = "imagekit" | "bunny_stream";

export type ProductVideoStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "deleted";

export type ReviewStatus = "pending" | "published" | "flagged" | "hidden";

export type ServiceRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

export type FavoriteEntityType =
  | "service"
  | "product"
  | "provider"
  | "agricultural_resource"
  | "course";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          clerk_user_id: string;
          email: string | null;
          phone: string | null;
          first_name: string | null;
          last_name: string | null;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          profile_slug: string | null;
          whatsapp_phone: string | null;
          professional_title: ProfessionalTitle;
          professional_title_custom: string | null;
          active_profile_type: ProfileType;
          subscription_plan: SubscriptionPlan | null;
          preferred_language: string;
          market_country_code: string;
          video_storage_used_bytes: number;
          subscription_updated_at: string | null;
          account_type: AccountType;
          status: UserStatus;
          theme_preference: ThemePreference;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          email?: string | null;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          profile_slug?: string | null;
          whatsapp_phone?: string | null;
          professional_title?: ProfessionalTitle;
          professional_title_custom?: string | null;
          active_profile_type?: ProfileType;
          subscription_plan?: SubscriptionPlan | null;
          preferred_language?: string;
          market_country_code?: string;
          video_storage_used_bytes?: number;
          subscription_updated_at?: string | null;
          account_type?: AccountType;
          status?: UserStatus;
          theme_preference?: ThemePreference;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          email?: string | null;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          profile_slug?: string | null;
          whatsapp_phone?: string | null;
          professional_title?: ProfessionalTitle;
          professional_title_custom?: string | null;
          active_profile_type?: ProfileType;
          subscription_plan?: SubscriptionPlan | null;
          preferred_language?: string;
          market_country_code?: string;
          video_storage_used_bytes?: number;
          subscription_updated_at?: string | null;
          account_type?: AccountType;
          status?: UserStatus;
          theme_preference?: ThemePreference;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          profile_id: string;
          clerk_user_id: string;
          role: UserRoleType;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          clerk_user_id: string;
          role: UserRoleType;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          clerk_user_id?: string;
          role?: UserRoleType;
          is_primary?: boolean;
          created_at?: string;
        };
      };
      countries: {
        Row: {
          id: string;
          name: string;
          slug: string;
          code: string;
          code3: string;
          currency_code: string;
          currency_symbol: string;
          phone_code: string;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          code: string;
          code3: string;
          currency_code?: string;
          currency_symbol?: string;
          phone_code?: string;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          code?: string;
          code3?: string;
          currency_code?: string;
          currency_symbol?: string;
          phone_code?: string;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      provinces: {
        Row: {
          id: string;
          country_id: string;
          name: string;
          slug: string;
          code: string;
          capital: string | null;
          agricultural_focus: string[] | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          country_id: string;
          name: string;
          slug: string;
          code: string;
          capital?: string | null;
          agricultural_focus?: string[] | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          country_id?: string;
          name?: string;
          slug?: string;
          code?: string;
          capital?: string | null;
          agricultural_focus?: string[] | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      municipalities: {
        Row: {
          id: string;
          province_id: string;
          country_id: string;
          name: string;
          slug: string;
          code: string | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          province_id: string;
          country_id: string;
          name: string;
          slug: string;
          code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          province_id?: string;
          country_id?: string;
          name?: string;
          slug?: string;
          code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      communes: {
        Row: {
          id: string;
          municipality_id: string;
          province_id: string;
          country_id: string;
          name: string;
          slug: string;
          code: string | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          municipality_id: string;
          province_id: string;
          country_id: string;
          name: string;
          slug: string;
          code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          municipality_id?: string;
          province_id?: string;
          country_id?: string;
          name?: string;
          slug?: string;
          code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      localities: {
        Row: {
          id: string;
          commune_id: string | null;
          municipality_id: string;
          province_id: string;
          country_id: string;
          name: string;
          slug: string;
          address_line: string | null;
          postal_code: string | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          commune_id?: string | null;
          municipality_id: string;
          province_id: string;
          country_id: string;
          name: string;
          slug: string;
          address_line?: string | null;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          commune_id?: string | null;
          municipality_id?: string;
          province_id?: string;
          country_id?: string;
          name?: string;
          slug?: string;
          address_line?: string | null;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      profile_locations: {
        Row: {
          id: string;
          profile_id: string;
          label: string;
          country_id: string;
          province_id: string;
          municipality_id: string | null;
          commune_id: string | null;
          locality_id: string | null;
          address_line: string | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          is_primary: boolean;
          service_radius_km: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          label?: string;
          country_id: string;
          province_id: string;
          municipality_id?: string | null;
          commune_id?: string | null;
          locality_id?: string | null;
          address_line?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_primary?: boolean;
          service_radius_km?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          label?: string;
          country_id?: string;
          province_id?: string;
          municipality_id?: string | null;
          commune_id?: string | null;
          locality_id?: string | null;
          address_line?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          is_primary?: boolean;
          service_radius_km?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          category_type: string;
          pillar: string;
          is_active: boolean;
          sort_order: number;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          icon?: string | null;
          category_type?: string;
          pillar?: string;
          is_active?: boolean;
          sort_order?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          icon?: string | null;
          category_type?: string;
          pillar?: string;
          is_active?: boolean;
          sort_order?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      provider_profiles: {
        Row: {
          id: string;
          profile_id: string;
          provider_type: ProviderType;
          business_name: string;
          slug: string;
          description: string | null;
          headline: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          tax_id: string | null;
          verification_status: VerificationStatus;
          status: string;
          rating: number | null;
          reviews_count: number | null;
          country_id: string | null;
          province_id: string | null;
          municipality_id: string | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          service_radius_km: number | null;
          publication_state: ProviderPublicationState;
          published_at: string | null;
          paused_at: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          provider_type?: ProviderType;
          business_name: string;
          slug: string;
          description?: string | null;
          headline?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          tax_id?: string | null;
          verification_status?: VerificationStatus;
          status?: string;
          rating?: number | null;
          reviews_count?: number | null;
          country_id?: string | null;
          province_id?: string | null;
          municipality_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          service_radius_km?: number | null;
          publication_state?: ProviderPublicationState;
          published_at?: string | null;
          paused_at?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          provider_type?: ProviderType;
          business_name?: string;
          slug?: string;
          description?: string | null;
          headline?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          tax_id?: string | null;
          verification_status?: VerificationStatus;
          status?: string;
          rating?: number | null;
          reviews_count?: number | null;
          country_id?: string | null;
          province_id?: string | null;
          municipality_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          service_radius_km?: number | null;
          publication_state?: ProviderPublicationState;
          published_at?: string | null;
          paused_at?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          provider_id: string;
          category_id: string | null;
          title: string;
          slug: string;
          short_description: string | null;
          description: string | null;
          pricing_type: PricingType;
          price: number;
          currency: string;
          location_type: ServiceLocationType;
          contact_preference: ServiceContactPreference | null;
          country_id: string | null;
          province_id: string | null;
          municipality_id: string | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          service_radius_km: number | null;
          status: ServiceStatus;
          is_featured: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          category_id?: string | null;
          title: string;
          slug: string;
          short_description?: string | null;
          description?: string | null;
          pricing_type?: PricingType;
          price?: number;
          currency?: string;
          location_type?: ServiceLocationType;
          contact_preference?: ServiceContactPreference | null;
          country_id?: string | null;
          province_id?: string | null;
          municipality_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          service_radius_km?: number | null;
          status?: ServiceStatus;
          is_featured?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          category_id?: string | null;
          title?: string;
          slug?: string;
          short_description?: string | null;
          description?: string | null;
          pricing_type?: PricingType;
          price?: number;
          currency?: string;
          location_type?: ServiceLocationType;
          contact_preference?: ServiceContactPreference | null;
          country_id?: string | null;
          province_id?: string | null;
          municipality_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          service_radius_km?: number | null;
          status?: ServiceStatus;
          is_featured?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          seller_id: string;
          category_id: string | null;
          title: string;
          slug: string;
          description: string | null;
          condition: ProductCondition;
          price: number;
          currency: string;
          quantity: number;
          unit: string;
          sku: string | null;
          availability_status: ProductAvailabilityStatus;
          location_type: ProductLocationType;
          selling_radius_km: number | null;
          country_id: string | null;
          province_id: string | null;
          municipality_id: string | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          status: ProductStatus;
          is_featured: boolean;
          metadata: Json | null;
          product_video_id: string | null;
          primary_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          category_id?: string | null;
          title: string;
          slug: string;
          description?: string | null;
          condition?: ProductCondition;
          price?: number;
          currency?: string;
          quantity?: number;
          unit?: string;
          sku?: string | null;
          availability_status?: ProductAvailabilityStatus;
          location_type?: ProductLocationType;
          selling_radius_km?: number | null;
          country_id?: string | null;
          province_id?: string | null;
          municipality_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          status?: ProductStatus;
          is_featured?: boolean;
          metadata?: Json | null;
          product_video_id?: string | null;
          primary_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          category_id?: string | null;
          title?: string;
          slug?: string;
          description?: string | null;
          condition?: ProductCondition;
          price?: number;
          currency?: string;
          quantity?: number;
          unit?: string;
          sku?: string | null;
          availability_status?: ProductAvailabilityStatus;
          location_type?: ProductLocationType;
          selling_radius_km?: number | null;
          country_id?: string | null;
          province_id?: string | null;
          municipality_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          status?: ProductStatus;
          is_featured?: boolean;
          metadata?: Json | null;
          product_video_id?: string | null;
          primary_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      customer_addresses: {
        Row: {
          id: string;
          profile_id: string;
          label: string | null;
          recipient_name: string;
          phone: string;
          province_id: string | null;
          municipality_id: string | null;
          address_line: string;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          notes: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          label?: string | null;
          recipient_name: string;
          phone: string;
          province_id?: string | null;
          municipality_id?: string | null;
          address_line: string;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          notes?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          label?: string | null;
          recipient_name?: string;
          phone?: string;
          province_id?: string | null;
          municipality_id?: string | null;
          address_line?: string;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          notes?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      carts: {
        Row: {
          id: string;
          customer_id: string;
          currency: string;
          status: CartStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          currency?: string;
          status?: CartStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          currency?: string;
          status?: CartStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          seller_id: string;
          quantity: number;
          unit_price: number;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          seller_id: string;
          quantity?: number;
          unit_price?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          seller_id?: string;
          quantity?: number;
          unit_price?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          customer_id: string;
          order_number: string;
          status: OrderStatus;
          payment_status: PaymentStatus;
          fulfillment_method: OrderFulfillmentMethod;
          currency: string;
          subtotal: number;
          delivery_fee: number;
          discount: number;
          tax: number;
          total: number;
          shipping_address_id: string | null;
          shipping_address_snapshot: Json | null;
          notes: string | null;
          cancelled_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          order_number?: string;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          fulfillment_method?: OrderFulfillmentMethod;
          currency?: string;
          subtotal?: number;
          delivery_fee?: number;
          discount?: number;
          tax?: number;
          total?: number;
          shipping_address_id?: string | null;
          shipping_address_snapshot?: Json | null;
          notes?: string | null;
          cancelled_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          order_number?: string;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          fulfillment_method?: OrderFulfillmentMethod;
          currency?: string;
          subtotal?: number;
          delivery_fee?: number;
          discount?: number;
          tax?: number;
          total?: number;
          shipping_address_id?: string | null;
          shipping_address_snapshot?: Json | null;
          notes?: string | null;
          cancelled_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_seller_groups: {
        Row: {
          id: string;
          order_id: string;
          seller_id: string;
          status: OrderSellerGroupStatus;
          delivery_status: DeliveryStatus;
          fulfillment_method: OrderFulfillmentMethod;
          courier_id: string | null;
          delivery_otp_plain: string | null;
          delivery_otp_hash: string | null;
          proof_of_delivery_type: ProofOfDeliveryType | null;
          proof_of_delivery_url: string | null;
          assigned_at: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
          failed_reason: string | null;
          subtotal: number;
          delivery_fee: number;
          total: number;
          seller_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          seller_id: string;
          status?: OrderSellerGroupStatus;
          delivery_status?: DeliveryStatus;
          fulfillment_method?: OrderFulfillmentMethod;
          courier_id?: string | null;
          delivery_otp_plain?: string | null;
          delivery_otp_hash?: string | null;
          proof_of_delivery_type?: ProofOfDeliveryType | null;
          proof_of_delivery_url?: string | null;
          assigned_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          failed_reason?: string | null;
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          seller_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          seller_id?: string;
          status?: OrderSellerGroupStatus;
          delivery_status?: DeliveryStatus;
          fulfillment_method?: OrderFulfillmentMethod;
          courier_id?: string | null;
          delivery_otp_plain?: string | null;
          delivery_otp_hash?: string | null;
          proof_of_delivery_type?: ProofOfDeliveryType | null;
          proof_of_delivery_url?: string | null;
          assigned_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          failed_reason?: string | null;
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          seller_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_zones: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          province_id: string | null;
          municipality_id: string | null;
          boundary: unknown | null;
          base_fee: number;
          per_km_fee: number;
          estimated_hours: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          province_id?: string | null;
          municipality_id?: string | null;
          boundary?: unknown | null;
          base_fee?: number;
          per_km_fee?: number;
          estimated_hours?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          province_id?: string | null;
          municipality_id?: string | null;
          boundary?: unknown | null;
          base_fee?: number;
          per_km_fee?: number;
          estimated_hours?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      couriers: {
        Row: {
          id: string;
          profile_id: string;
          company_name: string | null;
          vehicle_type: CourierVehicleType;
          license_plate: string | null;
          phone: string;
          whatsapp_phone: string | null;
          status: CourierStatus;
          verification_status: VerificationStatus;
          rating: number | null;
          deliveries_count: number | null;
          operating_province_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          company_name?: string | null;
          vehicle_type?: CourierVehicleType;
          license_plate?: string | null;
          phone: string;
          whatsapp_phone?: string | null;
          status?: CourierStatus;
          verification_status?: VerificationStatus;
          rating?: number | null;
          deliveries_count?: number | null;
          operating_province_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          company_name?: string | null;
          vehicle_type?: CourierVehicleType;
          license_plate?: string | null;
          phone?: string;
          whatsapp_phone?: string | null;
          status?: CourierStatus;
          verification_status?: VerificationStatus;
          rating?: number | null;
          deliveries_count?: number | null;
          operating_province_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_tracking_events: {
        Row: {
          id: string;
          order_id: string;
          order_number: string;
          seller_group_id: string | null;
          status: string;
          title: string;
          description: string;
          actor_name: string | null;
          actor_type: TrackingActorType;
          location_name: string | null;
          latitude: number | null;
          longitude: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          order_number: string;
          seller_group_id?: string | null;
          status: string;
          title: string;
          description: string;
          actor_name?: string | null;
          actor_type?: TrackingActorType;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          order_number?: string;
          seller_group_id?: string | null;
          status?: string;
          title?: string;
          description?: string;
          actor_name?: string | null;
          actor_type?: TrackingActorType;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          seller_group_id: string | null;
          product_id: string | null;
          seller_id: string;
          product_title: string;
          product_slug: string | null;
          sku: string | null;
          unit: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          seller_group_id?: string | null;
          product_id?: string | null;
          seller_id: string;
          product_title: string;
          product_slug?: string | null;
          sku?: string | null;
          unit?: string;
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          seller_group_id?: string | null;
          product_id?: string | null;
          seller_id?: string;
          product_title?: string;
          product_slug?: string | null;
          sku?: string | null;
          unit?: string;
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
          currency?: string;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          provider: string;
          provider_payment_id: string | null;
          payment_method: PaymentMethod;
          amount: number;
          currency: string;
          status: PaymentStatus;
          idempotency_key: string | null;
          metadata: Json | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider?: string;
          provider_payment_id?: string | null;
          payment_method?: PaymentMethod;
          amount?: number;
          currency?: string;
          status?: PaymentStatus;
          idempotency_key?: string | null;
          metadata?: Json | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          provider?: string;
          provider_payment_id?: string | null;
          payment_method?: PaymentMethod;
          amount?: number;
          currency?: string;
          status?: PaymentStatus;
          idempotency_key?: string | null;
          metadata?: Json | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_requests: {
        Row: {
          id: string;
          customer_id: string;
          seller_id: string;
          product_id: string | null;
          quantity: number;
          unit: string;
          status: ProductRequestStatus;
          message: string | null;
          delivery_location_notes: string | null;
          offered_price: number | null;
          currency: string;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          seller_id: string;
          product_id?: string | null;
          quantity?: number;
          unit?: string;
          status?: ProductRequestStatus;
          message?: string | null;
          delivery_location_notes?: string | null;
          offered_price?: number | null;
          currency?: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          seller_id?: string;
          product_id?: string | null;
          quantity?: number;
          unit?: string;
          status?: ProductRequestStatus;
          message?: string | null;
          delivery_location_notes?: string | null;
          offered_price?: number | null;
          currency?: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      agricultural_resources: {
        Row: {
          id: string;
          provider_id: string;
          category_id: string | null;
          title: string;
          slug: string;
          description: string | null;
          resource_type: AgriculturalResourceType;
          country_id: string | null;
          province_id: string | null;
          municipality_id: string | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          service_radius_km: number | null;
          status: string;
          is_verified: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          category_id?: string | null;
          title: string;
          slug: string;
          description?: string | null;
          resource_type: AgriculturalResourceType;
          country_id?: string | null;
          province_id?: string | null;
          municipality_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          service_radius_km?: number | null;
          status?: string;
          is_verified?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          category_id?: string | null;
          title?: string;
          slug?: string;
          description?: string | null;
          resource_type?: AgriculturalResourceType;
          country_id?: string | null;
          province_id?: string | null;
          municipality_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          service_radius_km?: number | null;
          status?: string;
          is_verified?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      media_assets: {
        Row: {
          id: string;
          owner_profile_id: string;
          entity_type: MediaEntityType;
          entity_id: string | null;
          storage_provider: StorageProvider;
          storage_key: string;
          url: string;
          mime_type: string | null;
          file_size: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_profile_id: string;
          entity_type: MediaEntityType;
          entity_id?: string | null;
          storage_provider?: StorageProvider;
          storage_key: string;
          url: string;
          mime_type?: string | null;
          file_size?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_profile_id?: string;
          entity_type?: MediaEntityType;
          entity_id?: string | null;
          storage_provider?: StorageProvider;
          storage_key?: string;
          url?: string;
          mime_type?: string | null;
          file_size?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          owner_id: string;
          storage_provider: StorageProvider;
          storage_path: string;
          external_id: string | null;
          url: string;
          alt_text: string | null;
          mime_type: "image/jpeg" | "image/png" | "image/webp";
          file_size: number;
          width: number | null;
          height: number | null;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          owner_id: string;
          storage_provider?: StorageProvider;
          storage_path: string;
          external_id?: string | null;
          url: string;
          alt_text?: string | null;
          mime_type: "image/jpeg" | "image/png" | "image/webp";
          file_size?: number;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          owner_id?: string;
          storage_provider?: StorageProvider;
          storage_path?: string;
          external_id?: string | null;
          url?: string;
          alt_text?: string | null;
          mime_type?: "image/jpeg" | "image/png" | "image/webp";
          file_size?: number;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_videos: {
        Row: {
          id: string;
          product_id: string;
          owner_id: string;
          provider: ProductVideoProvider;
          external_id: string | null;
          bunny_video_id: string | null;
          bunny_library_id: string | null;
          filename: string | null;
          mime_type: "video/mp4" | "video/webm";
          file_size: number;
          duration_seconds: number;
          status: ProductVideoStatus;
          thumbnail_url: string | null;
          playback_url: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          owner_id: string;
          provider?: ProductVideoProvider;
          external_id?: string | null;
          bunny_video_id?: string | null;
          bunny_library_id?: string | null;
          filename?: string | null;
          mime_type: "video/mp4" | "video/webm";
          file_size?: number;
          duration_seconds: number;
          status?: ProductVideoStatus;
          thumbnail_url?: string | null;
          playback_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          owner_id?: string;
          provider?: ProductVideoProvider;
          external_id?: string | null;
          bunny_video_id?: string | null;
          bunny_library_id?: string | null;
          filename?: string | null;
          mime_type?: "video/mp4" | "video/webm";
          file_size?: number;
          duration_seconds?: number;
          status?: ProductVideoStatus;
          thumbnail_url?: string | null;
          playback_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      academy_videos: {
        Row: {
          id: string;
          owner_id: string;
          course_id: string | null;
          chapter_id: string | null;
          bunny_video_id: string | null;
          bunny_library_id: string | null;
          title: string;
          description: string | null;
          filename: string | null;
          mime_type: string | null;
          file_size: number;
          duration_seconds: number | null;
          status: AcademyVideoStatus;
          visibility: "private" | "unlisted" | "public" | "enrolled_only";
          thumbnail_url: string | null;
          playback_url: string | null;
          upload_authorization_expires_at: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          course_id?: string | null;
          chapter_id?: string | null;
          bunny_video_id?: string | null;
          bunny_library_id?: string | null;
          title: string;
          description?: string | null;
          filename?: string | null;
          mime_type?: string | null;
          file_size?: number;
          duration_seconds?: number | null;
          status?: AcademyVideoStatus;
          visibility?: "private" | "unlisted" | "public" | "enrolled_only";
          thumbnail_url?: string | null;
          playback_url?: string | null;
          upload_authorization_expires_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          course_id?: string | null;
          chapter_id?: string | null;
          bunny_video_id?: string | null;
          bunny_library_id?: string | null;
          title?: string;
          description?: string | null;
          filename?: string | null;
          mime_type?: string | null;
          file_size?: number;
          duration_seconds?: number | null;
          status?: AcademyVideoStatus;
          visibility?: "private" | "unlisted" | "public" | "enrolled_only";
          thumbnail_url?: string | null;
          playback_url?: string | null;
          upload_authorization_expires_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          reviewer_id: string;
          provider_id: string;
          service_id: string | null;
          product_id: string | null;
          rating: number;
          title: string | null;
          comment: string | null;
          status: ReviewStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reviewer_id: string;
          provider_id: string;
          service_id?: string | null;
          product_id?: string | null;
          rating: number;
          title?: string | null;
          comment?: string | null;
          status?: ReviewStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reviewer_id?: string;
          provider_id?: string;
          service_id?: string | null;
          product_id?: string | null;
          rating?: number;
          title?: string | null;
          comment?: string | null;
          status?: ReviewStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_requests: {
        Row: {
          id: string;
          customer_id: string;
          provider_id: string;
          service_id: string | null;
          status: ServiceRequestStatus;
          requested_date: string | null;
          message: string | null;
          location_notes: string | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          estimated_price: number | null;
          currency: string;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          provider_id: string;
          service_id?: string | null;
          status?: ServiceRequestStatus;
          requested_date?: string | null;
          message?: string | null;
          location_notes?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          estimated_price?: number | null;
          currency?: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          provider_id?: string;
          service_id?: string | null;
          status?: ServiceRequestStatus;
          requested_date?: string | null;
          message?: string | null;
          location_notes?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          estimated_price?: number | null;
          currency?: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          type: string;
          title: string;
          message: string;
          data: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          type: string;
          title: string;
          message: string;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          type?: string;
          title?: string;
          message?: string;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          profile_id: string;
          entity_type: FavoriteEntityType;
          entity_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          entity_type: FavoriteEntityType;
          entity_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          entity_type?: FavoriteEntityType;
          entity_id?: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_profile_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_profile_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_profile_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      // Backward compatibility for Phase 1 flat locations view/table
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
      handle_updated_at: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      sync_geography_point: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      current_clerk_user_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      search_marketplace_services: {
        Args: {
          p_query: string | null;
          p_category_id: string | null;
          p_province_id: string | null;
          p_municipality_id: string | null;
          p_pricing_type: string | null;
          p_min_price: number | null;
          p_max_price: number | null;
          p_latitude: number | null;
          p_longitude: number | null;
          p_radius_km: number | null;
          p_sort_by: string;
          p_limit: number;
          p_offset: number;
        };
        Returns: {
          id: string;
          provider_id: string;
          provider_name: string | null;
          provider_slug: string | null;
          provider_rating: number | null;
          provider_verified: string | null;
          category_id: string | null;
          category_name: string | null;
          title: string;
          slug: string;
          short_description: string | null;
          description: string | null;
          pricing_type: string;
          price: number;
          currency: string | null;
          location_type: string | null;
          province_id: string | null;
          province_name: string | null;
          municipality_id: string | null;
          municipality_name: string | null;
          latitude: number | null;
          longitude: number | null;
          service_radius_km: number | null;
          distance_km: number | null;
          is_within_service_area: boolean | null;
          status: string;
          is_featured: boolean | null;
          created_at: string;
          total_count: number;
        }[];
      };
      activate_user_subscription_plan: {
        Args: { p_plan: string } | { p_clerk_user_id: string; p_plan: string };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRoleType;
      account_type: AccountType;
      theme_preference: ThemePreference;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
export type Country = Database["public"]["Tables"]["countries"]["Row"];
export type Province = Database["public"]["Tables"]["provinces"]["Row"];
export type Municipality = Database["public"]["Tables"]["municipalities"]["Row"];
export type Commune = Database["public"]["Tables"]["communes"]["Row"];
export type Locality = Database["public"]["Tables"]["localities"]["Row"];
export type ProfileLocation = Database["public"]["Tables"]["profile_locations"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type ProviderProfile = Database["public"]["Tables"]["provider_profiles"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type AgriculturalResource = Database["public"]["Tables"]["agricultural_resources"]["Row"];
export type MediaAsset = Database["public"]["Tables"]["media_assets"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ServiceRequest = Database["public"]["Tables"]["service_requests"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Favorite = Database["public"]["Tables"]["favorites"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type LocationRecord = Database["public"]["Tables"]["locations"]["Row"];
