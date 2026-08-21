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

## 4. Provider-Agnostic Map Abstraction

The map layer (`src/components/location/LocationMap.tsx`) provides a flexible visual abstraction:
- Renders interactive marker pins with category filtering (**AgriExpert**, **AgriAcademy**, **AgriShopping**).
- Displays detailed popup flyouts for clicked markers.
- Ready to swap in Leaflet, OpenStreetMap tiles, or Mapbox in Phase 2 without modifying parent views.
