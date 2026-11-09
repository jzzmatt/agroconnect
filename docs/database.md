# AGROCONNECT — Supabase PostgreSQL Database Architecture (Phase 3)

## 1. Overview & Core Philosophy

AGROCONNECT's database is a production-grade relational PostgreSQL architecture designed for **scalability**, **spatial discovery**, **multi-role identity**, and **Row Level Security (RLS)**.

- **Primary Market**: Angola (AO)
- **Primary Language**: Portuguese (`pt`)
- **Spatial Engine**: PostGIS `GEOGRAPHY(Point, 4326)` with spatial GiST indexing
- **Identity Decoupling**: Application uses internal `UUID` primary keys; Clerk's user identifier is stored strictly as an external identity link (`clerk_user_id`).
- **Source of Truth**: Supabase migrations under `supabase/migrations/`.

---

## 2. Entity Relationship Diagram (ERD Overview)

```
┌─────────────────┐       1:N       ┌────────────────────────┐
│    countries    │────────────────▶│       provinces        │
└─────────────────┘                 └───────────┬────────────┘
                                                │ 1:N
                                                ▼
┌─────────────────┐       1:N       ┌────────────────────────┐
│    communes     │◀────────────────│     municipalities     │
└────────┬────────┘                 └────────────────────────┘
         │ 1:N
         ▼
┌─────────────────┐
│   localities    │
└─────────────────┘
         ▲
         │ (References geographic hierarchy)
         │
┌────────┴────────┐       1:N       ┌────────────────────────┐
│profile_locations│◀────────────────│        profiles        │
└─────────────────┘                 └───────────┬────────────┘
                                                │ 1:1
                                                ▼
┌─────────────────┐       1:N       ┌────────────────────────┐
│   categories    │◀────────────────│   provider_profiles    │
└────────┬────────┘                 └───────────┬────────────┘
         │                                      │
         │           ┌──────────────────────────┼──────────────────────────┐
         │ 1:N       │ 1:N                      │ 1:N                      │ 1:N
         ▼           ▼                          ▼                          ▼
   ┌───────────┐┌───────────┐             ┌───────────┐             ┌──────────────┐
   │ services  ││ products  │             │ reviews   │             │ agricultural │
   └─────┬─────┘└─────┬─────┘             └───────────┘             │  resources   │
         │            │                                             └──────────────┘
         └─────┬──────┘
               │ 1:N
               ▼
   ┌───────────────────────┐   ┌───────────────┐   ┌───────────────┐   ┌──────────────┐
   │   service_requests    │   │ notifications │   │   favorites   │   │  audit_logs  │
   └───────────────────────┘   └───────────────┘   └───────────────┘   └──────────────┘
```

---

## 3. Core Database Domains & Tables

### 3.1 Identity & Capabilities Domain
1. **`public.profiles`**:
   - Stores application user profiles.
   - Columns: `id` (UUID PK), `clerk_user_id` (Unique external auth key), `display_name`, `first_name`, `last_name`, `email`, `phone`, `avatar_url`, `bio`, `profile_slug`, `preferred_language` (`pt`), `account_type` (`customer`, `provider`, `seller`, `farmer`, `instructor`, `organization`, `admin`), `status` (`active`, `inactive`, `suspended`, `pending_verification`), `theme_preference` (`light`, `dark`), `is_active`, `created_at`, `updated_at`.
2. **`public.user_roles`**:
   - Supports multiple simultaneous capabilities per user (e.g., `veterinarian` + `instructor`).
   - Columns: `id`, `profile_id` (FK profiles), `clerk_user_id`, `role`, `is_primary`, `created_at`.

### 3.2 Angola Geographic Hierarchy Domain
1. **`public.countries`**: Country reference (`name`, `slug`, `code`, `currency_code`, `location`).
2. **`public.provinces`**: 18 Official Provinces of Angola with capital, agricultural focus, and coordinates.
3. **`public.municipalities`**: Municipal administrative divisions linked to provinces.
4. **`public.communes`**: Sub-municipal commune divisions.
5. **`public.localities`**: Neighborhoods, agricultural polos, and villages.
6. **`public.profile_locations`**: Multiple saved locations per user (with unique partial index enforcing a single primary address per profile).

### 3.3 Marketplace Categories Domain
1. **`public.categories`**: Hierarchical category tree supporting unlimited nesting for `service`, `product`, `agricultural_resource`, and `academy_course`.

### 3.4 Provider & Commerce Domain
1. **`public.provider_profiles`**: Business & specialist profiles (`individual`, `company`, `cooperative`, `technician`, `veterinarian`, `agronomist`, etc.).
2. **`public.services`**: Expert services and consultations with pricing models (`hourly`, `daily`, `fixed`, `quotation`, `free`), location, and service radius.
3. **`public.products`**: AgriShopping items (`condition`, `price`, `quantity`, `unit`, `sku`, `location`, `status`).
4. **`public.agricultural_resources`**: Dedicated agricultural infrastructure and equipment listings (`resource_type`, `location`, `service_radius_km`).

### 3.5 Interaction, Media & Governance Domain
1. **`public.media_assets`**: Storage metadata foundation compatible with Cloudflare R2 / Stream.
2. **`public.reviews`**: 1–5 star ratings and reviews for providers and products.
3. **`public.service_requests`**: Booking and service requests lifecycle (`pending`, `accepted`, `rejected`, `cancelled`, `completed`).
4. **`public.notifications`**: User notifications with JSONB metadata and read status tracking.
5. **`public.favorites`**: User bookmarks across services, products, providers, and courses.
6. **`public.audit_logs`**: Security and operational audit trail for admin moderation and tracking.

---

## 4. PostGIS Spatial Architecture & Spatial Indexes

All geographic entities (`countries`, `provinces`, `municipalities`, `communes`, `localities`, `profile_locations`, `provider_profiles`, `services`, `products`, `agricultural_resources`, `service_requests`) utilize PostGIS `GEOGRAPHY(Point, 4326)`.

Automatic spatial trigger synchronization:
```sql
CREATE TRIGGER tr_services_spatial_sync
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();
```

Spatial GiST indexing enables fast spatial radius and bounding-box queries:
```sql
CREATE INDEX idx_services_location ON public.services USING GIST (location);
```

---

## 5. Row Level Security (RLS) Strategy

Row Level Security is enabled on **all 18 application tables**. 

### Security Design Rules:
- **No `auth.uid()` dependencies**: Policies do not assume Supabase native auth.
- **Clerk JWT Integration**: Policies evaluate `public.current_clerk_user_id()`, extracting `auth.jwt() ->> 'sub'`.
- **Public vs Private Data**:
  - Active catalog items, published categories, public profiles, and published reviews are readable by everyone.
  - Profile editing, favorites, notifications, service requests, and audit logs are strictly restricted to the resource owner.

---

## 6. Migration Registry

| Migration File | Description |
|---|---|
| `20260821000003_001_extensions_and_triggers.sql` | `uuid-ossp`, `postgis`, updated_at, spatial sync functions |
| `20260821000004_002_profiles_and_roles.sql` | `profiles` & `user_roles` tables |
| `20260821000005_003_geography_and_profile_locations.sql` | `countries`, `provinces`, `municipalities`, `communes`, `localities`, `profile_locations` |
| `20260821000006_004_categories.sql` | Hierarchical `categories` table |
| `20260821000007_005_providers_services_products.sql` | `provider_profiles`, `services`, `products`, `agricultural_resources` |
| `20260821000008_006_media_reviews_requests_audit.sql` | `media_assets`, `reviews`, `service_requests`, `notifications`, `favorites`, `audit_logs` |
| `20260821000009_007_row_level_security.sql` | Comprehensive RLS enablement & security policies |
| `20260821000010_008_seed_data.sql` | Seed data for Angola, 18 provinces, municipalities & categories |

---

## 7. WhatsApp connections

`whatsapp_connections` stores one WaAPI instance per profile. `business_id` points at `provider_profiles` when the profile has one, and stays null otherwise. `whatsapp_saved_groups` stores the groups that owner chose to keep. Both tables have row level security: an authenticated user can read only their own rows, and the webhook token plus instance id are not granted to `anon` or `authenticated`. Writes go through the service role after the application checks the Clerk user.

Apply `supabase/migrations/20261106104021_whatsapp_connections.sql` before using the dashboard screen.

`products.transport_included` records whether the vendor includes transport. `whatsapp_product_publications` and `whatsapp_product_publication_targets` record each AgriProduct send to a saved group. `sent` means WaAPI accepted the message. It does not mean delivered or read. Apply `supabase/migrations/20261106171305_whatsapp_product_publications.sql` before publishing products to WhatsApp.

`courses.price_confirmed` is true only after the instructor enters a price. Zero is a free course. Courses that were already published or paused stay confirmed at their stored price. `whatsapp_course_publications` and `whatsapp_course_publication_targets` record each completion message sent to a saved group. Apply `supabase/migrations/20261109103206_course_completion_price_whatsapp.sql` before asking for a course price or sharing a completed course. Apply `supabase/migrations/20261109150035_lesson_demo_campaign.sql` before marking a lesson as the WhatsApp demo. The public video address is `https://{origin}/a/{code}`. No new environment variable is required.

## 8. AgriProduct temporary videos

`product_temp_videos` stores the selected video before the product is published. A video longer than 60 seconds is rejected and is not trimmed. The file lives in the private bucket `agroproduct-temp-videos`. Publishing copies it into the private bucket `agroproduct-media`, confirms the object can be read, then removes the temporary object. `product_videos.storage_bucket` names the bucket for `upload_storage_path`. A null bucket means the older `product-media` bucket. Authenticated users can read only their own temporary rows. Writes use the service role after the route checks the Clerk user. Apply `supabase/migrations/20261108050911_product_temp_videos.sql` before saving product videos. `supabase/migrations/20261108062537_product_video_thumbnails.sql` adds optional thumbnail paths and records each WhatsApp image separately. Saving a video does not create a thumbnail. A thumbnail is stored only after the seller asks OpenAI to generate one.

## 9. Next Phase Readiness

The database foundation is 100% prepared for:
👉 **PHASE 4 — CLERK AUTHENTICATION & USER IDENTITY INTEGRATION**
