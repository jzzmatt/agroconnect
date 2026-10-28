# Geospatial compatibility gate

Phase 1.1 decides whether AgriLocalização can move onto CloudHike PostgreSQL. Supabase remains the production database. Clerk and the existing authentication flows are unchanged. No user, password, session, or identity mapping was migrated. No application traffic was pointed at CloudHike.

**Gate status: BLOCKED — NOT VERIFIED**

`geographiclib-geodesic` was explicitly approved as the CloudHike distance engine on 28 October 2026, 14:50 Africa/Luanda. Phase 1.3 prepared a PostGIS-free schema and loaded it on local socket database `cloudhike_schema_dev` on 28 October 2026, 15:07 Africa/Luanda. The representative searches were not executed on CloudHike. A catalog read, a local PostGIS baseline, a local destination schema, and that approval are not result equivalence on CloudHike.

Authentication migration stays stopped. Phase 2 does not start while this gate is blocked.

Checked 28 October 2026, 14:17 Africa/Luanda.

## 1. CloudHike and PostGIS capability

Evidence is the live catalog of CloudHike project `agroconnect` (`agroconnect-8shmts`, id `01c957fd-8d87-422c-8db9-9a66eddb87a1`) and the Postgres page fetched from CloudHike the same day. `npm run cloudhike:check` connected with `DIRECT_URL`, read the catalog, and exited 2 (`POSTGIS_UNSUPPORTED`). It applied no SQL. A second catalog query read only capability flags.

| Capability | Result on this database |
| --- | --- |
| Server | PostgreSQL 16.15, x86_64-pc-linux-musl, Alpine gcc 15.2.0 |
| `postgis` in `pg_available_extensions` | false |
| `postgis_topology`, `postgis_raster` | false |
| `ST_*` functions | 0 |
| Installed extensions | `plpgsql` only |
| Extensions in the catalog | 61, including `btree_gist`, `cube`, `earthdistance`, `citext`, `hstore`, `pgcrypto`, `uuid-ossp` |
| Role | Not a superuser. Cannot create databases. Can `CREATE` in the current database. |
| Development environment | None. CloudHike reports that one can be created in the dashboard. This gate did not create a second project and did not write to production. |

The CloudHike Postgres guide describes a non-superuser owner and an Extensions tab that enables trusted extensions such as `pgcrypto`, `citext`, and `hstore`. It has no PostGIS page, no `geography` or `geometry` type, and no spatial-index statement. A Pro resize is documented as the same database moved to its own container. This account was not upgraded, and the guide does not list PostGIS as a paid feature. Standard PostgreSQL 16 on this image is not PostGIS support.

`CREATE EXTENSION postgis` was not executed on CloudHike. The control file is absent, so the statement cannot succeed.

### Permission check on a PostGIS build this image does not ship

An isolated local PostgreSQL 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1) has PostGIS 3.4.2 (`c19ce56`), GEOS 3.12.1, PROJ 9.4.0. In `pg_available_extension_versions`, PostGIS 3.4.2 is `superuser = true` and `trusted = false`. A non-superuser role that can `CREATE` in its database received:

```text
ERROR:  permission denied to create extension "postgis"
HINT:  Must be superuser to create this extension.
```

That local failure is additional evidence, not a CloudHike test. If CloudHike later shipped this untrusted build without installing it as the platform, the project owner still could not enable it. A trusted build, or an extension installed before the role connects, remains an open possibility. It is not present today.

### What was not proven on CloudHike

These exist on the local PostGIS 3.4.2 database and were not callable on CloudHike, because the types and functions are absent:

- `geography(Point, 4326)` and `geometry(Polygon, 4326)`
- GiST operator classes `gist_geography_ops` and `gist_geometry_ops_2d`
- `ST_DWithin`, `ST_Distance`, `ST_Project`, `ST_Contains`, `ST_Intersects`, `ST_Intersection`, `ST_Touches`, `ST_Overlaps`, `&&`
- Point-in-polygon, polygon intersection, and spheroidal radius search

`earthdistance` and `cube` are available and were not installed. They measure a sphere. They do not create `geography`, polygon boundaries, or the GiST classes the migrations use. `btree_gist` does not add those types either.

## 2. Current geospatial behavior and baseline

AgriLocalização stores WGS 84 longitude and latitude (SRID 4326) and keeps a `geography(Point, 4326)` column in sync. Distance is meters on the WGS 84 spheroid. The RPCs divide by 1000 when they return kilometres. `ST_Distance(geography, geography)` uses the spheroid by default.

Twelve migration files reference PostGIS. They define:

- Sixteen `geography(Point, 4326)` columns: `locations`, `countries`, `provinces`, `municipalities`, `communes`, `localities`, `profile_locations`, `provider_profiles`, `services`, `products`, `agricultural_resources`, `service_requests`, `customer_addresses`, and transport `origin_location`, `destination_location`, and `base_location`.
- GiST indexes on those points except `customer_addresses`, which has the column and `sync_geography_point` and no GiST index.
- `delivery_zones.boundary` as `geometry(Polygon, 4326)` with a GiST index. The Angola seed insert names four zones and does not set `boundary`, so those rows stay null.
- `sync_geography_point`: when both latitude and longitude are present, `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography`; otherwise `location` is null.

The only spatial RPCs the application calls are `search_marketplace_products` (`ShoppingService.searchProducts`) and `search_marketplace_services` (`MarketplaceService.searchServices`). With a search point, inclusion is:

```text
ST_DWithin(location, point, LEAST(buyer_radius_km, 200) * 1000)
OR ST_DWithin(location, point, COALESCE(selling_or_service_radius_km, 50) * 1000)
```

`ST_DWithin` includes the boundary. A null `location` is excluded while a search point is present. If the caller omits buyer coordinates, `v_max_radius_meters` stays null and the spatial predicate is skipped, so rows with missing coordinates can still be returned. Province and municipality filters are UUID predicates, not spatial predicates.

`get_nearby_services`, `get_nearby_products`, `get_nearby_agricultural_resources`, and `get_entities_in_bounds` are defined in `20260821000012_010_postgis_location_functions.sql` and have no TypeScript caller. The nearby functions reject latitude outside [-90, 90] or longitude outside [-180, 180] before the cast, and they cap radius at 200 km. The two marketplace searches do not raise on those ranges. `get_entities_in_bounds` uses `ST_MakeEnvelope` and the `&&` overlap operator. The application does not call `ST_Contains` or `ST_Intersects`.

The Angola atlas is bundled GeoJSON, 21 features, no `crs` member (RFC 7946 WGS 84). `public/geo/angola-provinces.geojson` and `src/lib/geographic/angola-provinces.json` are the same 510,110-byte file. Source outer rings are clockwise. `getAngolaProvinceGeoJson` rewinds a ring when `d3-geo` treats it as larger than a hemisphere, so the map draws the province instead of the rest of the globe. That rewind changes display geometry only. Search does not run point-in-polygon on it.

`calculateDistanceKm` in `shopping-service.ts` and `calculateHaversineDistanceKm` in `marketplace-service.ts` use a spherical haversine with `R = 6371`. They run on the in-memory seed fallback, not on the live RPC path.

### Local baseline

`scripts/cloudhike/geospatial-baseline.sql` was run on 28 October 2026 against the isolated local database `geospatial_baseline` (PostGIS 3.4.2). The anchor is Luanda, longitude 13.2344, latitude -8.8383. Points are `ST_Project` due north, so the spheroidal distance is exact. Seller radii are 50 km except `n_190`, which is 20 km. This measures current SQL behavior. It is not a CloudHike result.

Buyer radius 10 km, so inclusion follows the seller radius:

| Id | Spheroid distance | Buyer 10 km | Seller radius | Included |
| --- | --- | --- | --- | --- |
| `n_10` | 10,000.000 m | no | yes | yes |
| `n_49_9` | 49,900.000 m | no | yes | yes |
| `n_50` | 50,000.000 m | no | yes | yes |
| `n_50_1` | 50,100.000 m | no | no | no |
| `n_80` | 80,000.000 m | no | no | no |
| `n_190` | 190,000.000 m | no | no (seller radius 20 km) | no |
| `n_210` | 210,000.000 m | no | no | no |

Buyer radius 100 km includes `n_80`. Buyer radius 250 km is capped at 200 km: `n_190` is included and `n_210` is excluded.

Spheroid minus the app haversine, same points:

| Id | Spheroid | Sphere `ST_Distance(..., false)` | Haversine R=6371 | Spheroid − haversine |
| --- | --- | --- | --- | --- |
| `n_10` | 10,000.000 m | 10,053.784 m | 10,053.770 m | −53.770 m |
| `n_49_9` | 49,900.000 m | 50,168.854 m | 50,168.785 m | −268.785 m |
| `n_50` | 50,000.000 m | 50,269.394 m | 50,269.325 m | −269.325 m |
| `n_50_1` | 50,100.000 m | 50,369.934 m | 50,369.865 m | −269.865 m |
| `n_80` | 80,000.000 m | 80,431.586 m | 80,431.475 m | −431.475 m |
| `n_190` | 190,000.000 m | 191,029.620 m | 191,029.357 m | −1,029.357 m |
| `n_210` | 210,000.000 m | 211,138.882 m | 211,138.592 m | −1,138.592 m |

The same script reports haversine-within-seller as false for `n_49_9` (50,168.785 m) and `n_50` (50,269.325 m). PostGIS includes both. A 50 km haversine seller radius therefore drops rows the live predicate keeps.

Missing coordinates produce no radius row. Latitude 95 cast to `geography` yields 10,420,876.241 m from the anchor. Longitude 200 is coerced to −160 and yields 17,914,355.720 m. PostGIS emits `Coordinate values were coerced into range [-180 -90, 180 90] for GEOGRAPHY` on that out-of-range cast, and neither cast raises. Both distances sit outside a 200 km buyer cap and a 50 km seller radius. The marketplace RPCs would follow that cast. The uncalled `get_nearby_*` functions would raise first.

Polygon fixture, SRID 4326, valid square from (13.20, −8.90) to (13.30, −8.80):

| Case | `ST_Contains` | `ST_Intersects` |
| --- | --- | --- |
| Interior (13.25, −8.85) | true | true |
| Boundary (13.20, −8.85) | false | true |
| Exterior (13.10, −8.85) | false | false |

An overlapping square intersects, with intersection area 30,417,964.563 m² on the geography spheroid. A disjoint square does not intersect. A square that only shares the eastern edge intersects and touches, and `ST_Overlaps` is false. The GiST index `fixture_points_location_gist` was created on `geography(Point, 4326)`. Eight rows are too few to claim the planner picks that index.

## 3. Chosen path

On 28 October 2026, 14:50 Africa/Luanda, `geographiclib-geodesic` was explicitly approved as the CloudHike distance engine. The local proof is `phase-1-2-geospatial-prototype.md`. The schema on CloudHike production stays unloaded until an isolated development database runs the same cases.

**Path A — PostGIS on CloudHike.** This is the path that preserves the current types, GiST indexes, and functions. It is not available on the measured image. The project has no development database, so the destination schema was not created and the baseline was not replayed there. Path A stays unverified.

**Path B — approved engine.** `geographiclib-geodesic` 2.2.0, `Geodesic.WGS84.Inverse`, metres on the WGS84 ellipsoid, after a conservative latitude/longitude btree prefilter. The approved behaviour is:

- Types stay numeric latitude and longitude plus a stored distance result that matches spheroidal `ST_Distance(geography, geography)` in meters, SRID 4326.
- The live inclusion predicate stays the OR of the buyer cap (`LEAST(radius, 200)` kilometres) and the seller or service radius (default 50 km), with the boundary included.
- A search with coordinates excludes null locations. A search without coordinates does not add a spatial filter.
- Marketplace casts of out-of-range coordinates keep today's coercion unless a change to the `get_nearby_*` rejection behavior is explicitly accepted for those two RPCs as well.
- Polygon containment, if delivery zones gain boundaries, uses the measured rule: `ST_Contains` excludes the boundary and `ST_Intersects` includes it. Shared edges intersect and touch.
- The calculation may run in SQL or in the service. It has to be the spheroid used by PostGIS geography, not a sphere.

Haversine with `R = 6371`, and `earthdistance`, fail that rule. At the exact 50 km spheroid boundary they report about 50.269 km and exclude a row PostGIS includes. That difference is not accepted.

The approved engine was compared with PostGIS 3.4.2 on an isolated local database. It has not been executed on CloudHike. The production schema stays unloaded until an isolated CloudHike development database repeats these cases.

## 4. Comparison, tolerance, and limitations

| Comparison | Destination result |
| --- | --- |
| Same record ids | Not run. CloudHike has no AgriConnect tables and no PostGIS types. |
| Radius inclusion and exclusion | Not run on CloudHike. Local PostGIS results are in the table above. |
| Polygon containment and boundary | Not run on CloudHike. Local GEOS results are in the table above. Application search does not call these operators today. |
| Distance tolerance | A future pass needs the same ids and inclusion booleans, and spheroidal distance within 1 meter of `ST_Distance(geography, geography)` for these projected points. The measured haversine gap is 53.8 m at 10 km and 1,138.6 m at 210 km, so this tolerance rejects the haversine fallback. |
| Invalid or missing coordinates | Not run on CloudHike. Local cast and null behavior is recorded above. |

No mismatch list exists for CloudHike, because the destination queries were not executed. Documenting the local baseline is not a pass.

Limitations and uncertainties:

- CloudHike may later add PostGIS, including a trusted build the owner can enable. The 28 October 2026 catalog and docs do not contain it.
- The local baseline uses Ubuntu PostGIS 3.4.2. A future CloudHike build can differ by GEOS or PROJ patch version. Equivalence still has to be measured there.
- Angola province and municipality polygons are not a PostGIS layer. Map rewind is client-side. Boundary display was not compared numerically to a GEOS import.
- `delivery_zones.boundary` is null in the seed, so there is no production polygon-search result to preserve yet. The destination schema stores that column as GeoJSON `jsonb`. The GiST index is omitted. Polygon checks stay in the application.
- Fixture cardinality does not prove GiST selectivity or the 30-second Free statement timeout.

## 5. Performance

On the current Supabase schema, radius search is `ST_DWithin` against GiST indexes on `geography`. The buyer radius is capped at 200 km inside the RPCs. That bound limits the candidate set once an index can be used.

CloudHike Free Postgres is 500 MB, 128 MB RAM, at most 30 connections, and a 30-second statement timeout. The database sleeps after 6 hours with no connection. Those limits do not add PostGIS. They do mean a sequential scan that evaluates a distance function per row is a poor substitute for GiST `ST_DWithin` once the catalogue grows, and it still has to match the spheroid or the inclusion results change.

The Angola GeoJSON file is about 510 KB. Loading it is not the blocker. The missing extension and the untrusted-extension permission are.

The approved candidate filter is a bounding box on raw latitude and longitude, followed by the GeographicLib inverse. Local timings are in `phase-1-2-geospatial-prototype.md`. That benchmark did not run on CloudHike.

## 6. Gate status

**BLOCKED — NOT VERIFIED**

Path A is not verified: PostGIS is absent, the owner is not a superuser, and there is no isolated CloudHike development database. Path B’s distance engine, `geographiclib-geodesic`, was explicitly approved on 28 October 2026, 14:50 Africa/Luanda. Phase 1.3 proved the destination schema and the radius page locally. Phase 1.4 read the existing CloudHike production database and rolled back a temporary candidate-index probe. Phase 1.5 runs the marketplace text predicate before that page on a local fixture, and a read-only CloudHike check confirmed the Portuguese stemming. The schema was not loaded on CloudHike, so this gate stays blocked. Haversine and `earthdistance` remain rejected. The Phase 1.5 record is `phase-1-5-security-and-search.md`.

Do not start Phase 2. Do not change Clerk or authentication configuration. Do not migrate identity data. Do not cut production traffic over to CloudHike while this status stands.

The gate can move to `PASS` only after one of these is true:

- Path A: an isolated CloudHike development database has PostGIS enabled by its owner role, the destination objects exist, and `scripts/cloudhike/geospatial-baseline.sql` (or the same cases) returns the inclusion booleans and distances within 1 m recorded here.
- Path B: `geographiclib-geodesic` is now explicitly approved. The gate still needs the same cases on an isolated CloudHike development database, preserving the radius and polygon results recorded here.
