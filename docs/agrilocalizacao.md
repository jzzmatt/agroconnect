# AgriLocalização Engine & Spatial Architecture

## 1. Concept

**AgriLocalização is NOT a separate business pillar or siloed marketplace.**

It is a platform-wide geospatial service that powers:
- Expert discovery in AgriExpert ("Especialistas perto de mim", "Veterinários em Luanda")
- Agricultural training centers in AgriAcademy ("Cursos no Huambo")
- Product and equipment availability in AgriShopping ("Adubos em Benguela")
- Farm, business, and service locations across Angola.

---

## 2. Angola Geographic Foundation

The platform seeds and supports all **18 Official Provinces of Angola** (`src/config/locations.ts`):

1. **Bengo** (Caxito)
2. **Benguela** (Benguela)
3. **Bié** (Kuito)
4. **Cabinda** (Cabinda)
5. **Cuando Cubango** (Menongue)
6. **Cuanza Norte** (Ndalatando)
7. **Cuanza Sul** (Sumbe)
8. **Cunene** (Ondjiva)
9. **Huambo** (Huambo)
10. **Huíla** (Lubango)
11. **Luanda** (Luanda)
12. **Lunda Norte** (Dundo)
13. **Lunda Sul** (Saurimo)
14. **Malanje** (Malanje)
15. **Moxico** (Luena)
16. **Namibe** (Moçâmedes)
17. **Uíge** (Uíge)
18. **Zaire** (Mbanza Kongo)

---

## 3. Geospatial Utility Library (`src/lib/location/index.ts`)

| Function | Purpose |
|---|---|
| `calculateDistance(coord1, coord2)` | Calculates distance between two coordinates in kilometers using the Haversine formula. |
| `isWithinRadius(center, target, radiusKm)` | Evaluates whether a coordinate falls within a specified radius (e.g. 50km). |
| `searchNearby(items, center, radiusKm)` | Filters and sorts domain objects by ascending proximity distance. |
| `formatLocation(loc)` | Formats location into Portuguese format (e.g., `Caála, Huambo • Angola`). |
| `getProvince(codeOrName)` | Finds province metadata by code or name (case-insensitive). |
| `getMunicipality(codeOrName)` | Finds municipality metadata by code or name. |
| `getMunicipalitiesByProvince(province)` | Returns all key municipalities in a province. |
| `getCoordinates(name)` | Returns default latitude/longitude for a region or Angola center. |
| `getUserLocation()` | Asynchronously retrieves browser GPS coordinates with graceful error handling. |

---

## 4. Provider-Agnostic Map & Geocoding Abstraction

AGROCONNECT strictly decouples map rendering and geocoding from vendor implementations via the `LocationProvider` architecture:

```
LocationProvider
├── MapProvider
│   └── OpenFreeMap + MapLibre GL (`MapLibreOpenFreeMapProvider`)
│
└── GeocodingProvider
    ├── Local Angola Dataset (`LocalAngolaGeocodingProvider`)
    └── Configurable Remote HTTP Geocoder (`ConfigurableHttpGeocodingProvider`)
```

### 4.1 MapProvider Contract (`IMapProvider`)
- Implemented with **MapLibre GL + OpenFreeMap** (`src/lib/location/providers/maplibre-openfreemap.ts`).
- Supports zero-API-key vector tile rendering using OpenFreeMap styles (`liberty`, `positron`, `bright`).
- Manages high-performance WebGL canvas, interactive marker pins, popups, and smooth camera transitions.

### 4.2 GeocodingProvider Contract (`IGeocodingProvider`)
- `LocalAngolaGeocodingProvider`: Instant, offline-capable forward and reverse geocoding across Angola's 18 provinces and agricultural hubs.
- `ConfigurableHttpGeocodingProvider`: Configurable remote HTTP geocoding endpoint (e.g. Pelias, Nominatim, custom microservice) with automatic fallback to the local Angola geographic database.

### 4.3 UI Components
- `LocationMap` (`src/components/location/LocationMap.tsx`): MapLibre vector map with marker clustering, category filters, and fallback canvas.
- `LocationSearch` (`src/components/location/LocationSearch.tsx`): Autocomplete geocoding search component.
- `LocationSelector` (`src/components/location/LocationSelector.tsx`): Province, municipality, and radius filter.

