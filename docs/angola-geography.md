# AGROCONNECT — Angola Geography & PostGIS Geospatial Engine (Phase 5)

## 1. Overview & Architectural Principles

AGROCONNECT treats **Location** as a core, platform-wide capability that enables producers, agricultural technicians, veterinarian specialists, and buyers to discover and transact across Angola.

### Core Concept: Dual Geographic Model
1. **Administrative Location**: Formal administrative divisions (`countries` → `provinces` → `municipalities` → `communes` → `localities`).
2. **Geographic Coordinates**: Exact spatial points (`latitude`, `longitude`, `location GEOGRAPHY(Point, 4326)`).

These two models operate in tandem: entities belong to an administrative division while exposing exact GPS coordinates for proximity and radius filtering.

---

## 2. Coordinate Reference System (CRS)

- **Standard**: **WGS84 (EPSG:4326)**
- **Format in Application Layer**: `latitude` (-90.0 to +90.0) and `longitude` (-180.0 to +180.0)
- **Format in Database PostGIS Layer**: `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography`
- **Spatial Indexing**: `USING GIST (location)` on all spatial tables.

---

## 3. Administrative Hierarchy & Seed Datasets

```
Country (Angola - AO)
└── 18 Official Provinces
    ├── Bengo (BGO)
    ├── Benguela (BGU)
    ├── Bié (BIE)
    ├── Cabinda (CAB)
    ├── Cuando Cubango (CCU)
    ├── Cuanza Norte (CNO)
    ├── Cuanza Sul (CUS)
    ├── Cunene (CNN)
    ├── Huambo (HUA)
    ├── Huíla (HUI)
    ├── Luanda (LUA)
    ├── Lunda Norte (LNO)
    ├── Lunda Sul (LSU)
    ├── Malanje (MAL)
    ├── Moxico (MOX)
    ├── Namibe (NAM)
    ├── Uíge (UIG)
    └── Zaire (ZAI)
        └── Municipalities (e.g. Caála, Lubango, Lobito, Cacuso, Viana)
            └── Communes
                └── Localities / Neighborhoods / Polos Agrícolas
```

---

## 4. PostGIS Geospatial Database Functions (`supabase/migrations/20260821000012_010_postgis_location_functions.sql`)

### 4.1 `get_nearby_services(p_latitude, p_longitude, p_radius_km, ...)`
- Computes distances using `ST_Distance()` and filters within search radius using `ST_DWithin()`.
- Evaluates whether the user's coordinate falls within the provider's `service_radius_km` coverage area.
- Enforces a safety limit (max 200 km radius, max 100 rows).

### 4.2 `get_nearby_products(p_latitude, p_longitude, p_radius_km, ...)`
- Discovers agricultural inputs, tools, and seeds within radius sorted by ascending distance.

### 4.3 `get_nearby_agricultural_resources(p_latitude, p_longitude, p_radius_km, ...)`
- Discovers veterinarians, agronomists, machinery rentals, and soil testing labs near a coordinate.

### 4.4 `get_entities_in_bounds(p_min_lat, p_min_lon, p_max_lat, p_max_lon, ...)`
- Dynamically queries services, products, and resources visible within the current viewport of the map using `ST_MakeEnvelope()`.

---

## 5. Location Service API (`src/lib/location/`)

- **`calculateDistance(coord1, coord2)`**: Haversine distance in kilometers.
- **`isWithinRadius(center, target, radiusKm)`**: Radius check with coordinate validation.
- **`isWithinBounds(coord, bounds)`**: Viewport bounding box check.
- **`formatLocation(administrativeLocation)`**: Human-readable Portuguese formatting (`Caála, Huambo • Angola`).
- **`formatDistance(distanceKm)`**: Distance badge string (`1.2 km` or `850 m`).
- **`searchLocations(query, options)`**: Angola-first text search prioritizing exact and prefix matches across provinces and municipalities.
- **`useGeolocation()`**: Natural permission UX hook with timeout and fallback handling.

---

## 6. Location Privacy Principles

1. **Private Coordinates**: Exact home coordinates of private customers are never exposed in public queries.
2. **Provider & Marketplace Locations**: Coordinates attached to published services, products, and provider profiles are public for discovery.
3. **No Background Tracking**: GPS coordinates are requested strictly upon user action (*"Usar a minha localização"*).
