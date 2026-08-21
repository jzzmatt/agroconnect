# Database Schema & PostGIS Architecture

## 1. PostgreSQL Extensions

The AGROCONNECT database enables two core extensions:

1. `uuid-ossp` — Generation of RFC 4122 compliant UUID primary keys.
2. `postgis` — Geospatial storage, indexing, and proximity calculations.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

---

## 2. Core Tables

### 2.1 `public.profiles`

Stores public and user profile details linked directly to Clerk identity.

| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT uuid_generate_v4()` | Internal profile ID |
| `clerk_user_id` | `TEXT` | `UNIQUE NOT NULL` | Clerk User Identifier |
| `display_name` | `TEXT` | `NULL` | Public display name |
| `first_name` | `TEXT` | `NULL` | First name |
| `last_name` | `TEXT` | `NULL` | Last name |
| `email` | `TEXT` | `NULL` | Contact email |
| `phone` | `TEXT` | `NULL` | Contact phone (+244 format) |
| `avatar_url` | `TEXT` | `NULL` | Avatar image URL |
| `bio` | `TEXT` | `NULL` | Biography and credentials |
| `profile_slug` | `TEXT` | `UNIQUE NULL` | URL slug |
| `is_active` | `BOOLEAN` | `DEFAULT true NOT NULL` | Profile status |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now() NOT NULL` | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT now() NOT NULL` | Timestamp |

---

### 2.2 `public.user_roles`

Supports **multiple simultaneous roles** per user (e.g., User A can be a `veterinarian` + `instructor`, User B can be a `seller` + `expert`).

| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT uuid_generate_v4()` | Role record ID |
| `clerk_user_id` | `TEXT` | `REFERENCES profiles(clerk_user_id) ON DELETE CASCADE` | Linked User |
| `role` | `TEXT` | `CHECK (role IN ('student', 'creator', 'seller', 'instructor', 'expert', 'veterinarian', 'agronomist', 'agricultural_consultant', 'business', 'admin'))` | Assigned Role |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now() NOT NULL` | Timestamp |

> **Unique constraint**: `UNIQUE(clerk_user_id, role)` prevents duplicate role assignment.

---

### 2.3 `public.locations` (AgriLocalização Core)

Platform-wide geographic model supporting administrative hierarchy and spatial points.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Location record ID |
| `country_code` | `TEXT` | Default: `AO` (Angola) |
| `country_name` | `TEXT` | Default: `Angola` |
| `province_code` | `TEXT` | Province code (e.g. `HUA`, `LUA`, `BGU`) |
| `province_name` | `TEXT` | Official Province Name |
| `municipality_code` | `TEXT` | Municipality Code |
| `municipality_name` | `TEXT` | Municipality Name |
| `commune_code` | `TEXT` | Commune Code |
| `commune_name` | `TEXT` | Commune Name |
| `latitude` | `NUMERIC(10, 7)` | Decimal Latitude |
| `longitude` | `NUMERIC(10, 7)` | Decimal Longitude |
| `location` | `GEOGRAPHY(Point, 4326)` | PostGIS spatial point with GiST index |

---

## 3. Spatial Trigger & Automatic Point Sync

Whenever `latitude` or `longitude` is inserted or updated on `public.locations`, a PostgreSQL trigger automatically synchronizes the PostGIS `GEOGRAPHY(Point, 4326)` geometry:

```sql
CREATE OR REPLACE FUNCTION public.sync_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location = NULL;
  END IF;
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
