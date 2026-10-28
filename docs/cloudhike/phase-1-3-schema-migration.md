# Phase 1.3 — CloudHike schema migration using GeographicLib

**Gate status: BLOCKED**

The PostGIS-free destination schema and the application radius rules were prepared and checked on an isolated local PostgreSQL socket. They were not executed on CloudHike. CloudHike project `agroconnect` (`agroconnect-8shmts`, id `01c957fd-8d87-422c-8db9-9a66eddb87a1`) still has no development environment. Its production Postgres is ready and was not changed. Supabase remains the production source of truth. Clerk and the live marketplace RPCs are unchanged.

`geographiclib-geodesic` 2.2.0 was approved as the distance engine on 28 October 2026, 14:50 Africa/Luanda. This phase uses that engine. It does not install PostGIS, dual-write, move production rows, or start an authentication migration.

## Pre-flight

Checked 28 October 2026.

| Check | Result |
| --- | --- |
| Branch | `cursor/cloudhike-phase-1-db-2e25` at `f046f6c` before this phase |
| Working tree | Clean before these edits |
| `main` | `7bcc366` |
| Phase 1.1 | `docs/cloudhike/geospatial-compatibility.md`, gate blocked |
| Phase 1.2 | Local prototype passed. GeographicLib matched PostGIS within 1 metre, with the 1e-6 m inclusion bridge. `earth_box` missed 8 of 64 boundary points and stays unused |
| CloudHike development database | Absent. `get_project` for environment `development` returned no development environment |
| CloudHike production | Postgres `ready`. Dashboard https://cloudhike.dev/dashboard/projects/agroconnect-8shmts |
| Package | `geographiclib-geodesic` 2.2.0, MIT, CommonJS. Default import of `Geodesic.WGS84` |
| Source migrations | 54 files. 12 reference PostGIS. Historical files were not rewritten |

Because no isolated CloudHike development database exists, no DDL was sent to CloudHike.

## Execution environment

| Database | Role in this phase |
| --- | --- |
| Supabase production | Untouched. Still serves the application |
| CloudHike `agroconnect` production | Untouched. No schema, no rows, no extensions |
| Local `cloudhike_schema_dev` | Destination schema applied 28 October 2026, 15:07 Africa/Luanda |
| Local `geospatial_baseline` | Existing PostGIS 3.4.2 baseline. Differential tests still read it. This phase did not modify it |

Local server: PostgreSQL 16.15 (Ubuntu), socket only, `inet_server_addr()` null. The apply command is `npm run cloudhike:apply-schema`. It refuses `--cloudhike` and refuses a hosted `DATABASE_URL` or `DIRECT_URL`.

Validation object from that apply:

```json
{
  "database": "cloudhike_schema_dev",
  "local": true,
  "postgis": false,
  "geography_columns": 0,
  "boundary_type": "jsonb",
  "spatial_functions": 0,
  "sync_functions": 2,
  "lat_lon_indexes": 16,
  "products": true,
  "services": true,
  "transport_services": true,
  "customer_addresses": true
}
```

The loaded schema has 43 base tables, 93 policies, 248 indexes, and 16 public functions. `activate_user_subscription_plan` accounts for two of those functions.

## Schema conversion

`npm run cloudhike:render-schema` reads `supabase/migrations` in filename order and writes `cloudhike/schema/postgis-free`, plus `cloudhike/schema/manifest.json`. The renderer never opens a connection.

Dropped statements in this render: 4 extension statements, 14 GiST indexes, 7 spatial functions, 1 spatial-function privilege statement, 6 Supabase role grants, 34 storage statements, and the two geography trigger functions were replaced.

### Columns

These `GEOGRAPHY(Point, 4326)` columns are omitted. The numeric latitude and longitude columns stay, with the same nullability. No range `CHECK` was added, because a check would reject values the geography cast currently folds and stores.

| Table | Removed geography column | Retained coordinates | btree index |
| --- | --- | --- | --- |
| `locations` | `location` | `latitude`, `longitude` | `idx_locations_lat_lon` |
| `countries` | `location` | `latitude`, `longitude` | `idx_countries_lat_lon` |
| `provinces` | `location` | `latitude`, `longitude` | `idx_provinces_lat_lon` |
| `municipalities` | `location` | `latitude`, `longitude` | `idx_municipalities_lat_lon` |
| `communes` | `location` | `latitude`, `longitude` | `idx_communes_lat_lon` |
| `localities` | `location` | `latitude`, `longitude` | `idx_localities_lat_lon` |
| `profile_locations` | `location` | `latitude`, `longitude` | `idx_profile_locations_lat_lon` |
| `provider_profiles` | `location` | `latitude`, `longitude` | `idx_provider_profiles_lat_lon` |
| `services` | `location` | `latitude`, `longitude` | `idx_services_lat_lon` |
| `products` | `location` | `latitude`, `longitude` | `idx_products_lat_lon` |
| `agricultural_resources` | `location` | `latitude`, `longitude` | `idx_agricultural_resources_lat_lon` |
| `service_requests` | `location` | `latitude`, `longitude` | `idx_service_requests_lat_lon` |
| `customer_addresses` | `location` | `latitude`, `longitude` | `idx_customer_addresses_lat_lon` |
| `transport_services` | `origin_location` | `origin_latitude`, `origin_longitude` | `idx_transport_services_origin_lat_lon` |
| `transport_services` | `destination_location` | `destination_latitude`, `destination_longitude` | `idx_transport_services_destination_lat_lon` |
| `transport_services` | `base_location` | `base_latitude`, `base_longitude` | `idx_transport_services_base_lat_lon` |

`customer_addresses` had a geography column and a sync trigger and no GiST index. The destination still has the numeric columns and a btree index.

Course pins in `20260923190000_academy_course_location.sql` were already `double precision` latitude and longitude with `idx_courses_map_location`. That file is not a PostGIS file and is copied through.

### Polygon column

`delivery_zones.boundary` keeps its name and becomes `jsonb`. The GiST index `idx_delivery_zones_boundary` is omitted. The column comment defines the contract:

- GeoJSON `Polygon` or `MultiPolygon`.
- WGS84 longitude/latitude, RFC 7946.
- Nullable. The Angola seed inserts zones without a boundary, and those rows stay null.
- Coordinates are stored as JSON values. `jsonb` normalises whitespace and key order. It does not drop or simplify positions.
- Validity is an application concern in `src/lib/geospatial/polygon-relations.ts`. There is no geometry check in the database.
- `contains` excludes a boundary point. `intersects` includes boundary contact. Shared-edge overlap stays false. This matches the Phase 1.1 planar measurements. It is not a claim of full DE-9IM equivalence.

The local apply stored this value and read it back with the same coordinates:

`[[[13.2, -8.9], [13.3, -8.9], [13.3, -8.8], [13.2, -8.8], [13.2, -8.9]]]`

### Functions and triggers

| Object | Destination |
| --- | --- |
| `sync_geography_point()` | Kept as a no-op that returns `NEW`. Existing spatial triggers still compile |
| `sync_location_point()` | Still sets `updated_at`. It no longer writes a geography value |
| `search_marketplace_products` | Omitted. Replaced in the application by `pageMarketplaceCatalogue` |
| `search_marketplace_services` | Omitted. Same page function, including the service `rating` sort key |
| `get_nearby_services` | Omitted. Replaced by `nearbyServices` |
| `get_nearby_products` | Omitted. Replaced by `nearbyProducts` |
| `get_nearby_agricultural_resources` | Omitted. Replaced by `nearbyAgriculturalResources` |
| `get_entities_in_bounds` | Omitted. Replaced by `entitiesInBounds` |

The six replacements are not imported by `ShoppingService` or `MarketplaceService`. The live path remains the Supabase RPCs.

### Other deliberate differences

- `CREATE EXTENSION postgis` and `CREATE EXTENSION "uuid-ossp"` are omitted.
- `uuid_generate_v4()` becomes `gen_random_uuid()`. PostgreSQL 16 provides that function in core. `uuid-ossp` was not created on CloudHike or on the local destination.
- `auth.jwt()` becomes `(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb)`. `auth.role()` becomes that jsonb value's `role` text. `current_clerk_user_id()` already read the same setting. CloudHike does not set the setting. This rewrite lets the SQL parse. It is not an authentication migration.
- `GRANT` and `REVOKE` aimed at `anon`, `authenticated`, or `service_role` are omitted. Comparisons such as `v_role IN ('authenticated', 'anon')` stay inside the subscription guard.
- Statements against `storage.buckets`, `storage.objects`, and `storage.foldername` are omitted. `ALTER TABLE` statements in `20260923210000_product_transport_profile_supabase_media.sql` stay.
- `NOTIFY pgrst` statements stay. They do not require PostgREST to be installed.
- Foreign keys, uniqueness constraints, defaults, and non-spatial indexes are copied.
- Row Level Security policies are copied. The local database owner bypasses them unless `FORCE ROW LEVEL SECURITY` is set. That change is an authorization task and was not made here.
- A latitude of 95 and a longitude of 200 were inserted into `locations` and stored as 95 and 200. Search code coerces those numbers the way the geography cast did. The numeric columns keep the raw value.

## Radius contract

`src/lib/geospatial/wgs84-distance.ts` remains the WGS84 inverse. Distances are metres and are not rounded before the inclusion test. `withinRadius` allows an overshoot of at most `1e-6` m so the exact 50 km boundary that PostGIS includes stays included. A point 1 mm outside stays outside. Missing, non-finite, and out-of-range coordinates are classified by `inspectCoordinate`. Marketplace search coerces out-of-range coordinates. Nearby search rejects them.

The candidate box is `conservativeRadiusBounds`. It is a superset of the geodesic ball. GeographicLib makes the final decision. `earthdistance` and haversine do not.

`pageMarketplaceCatalogue` receives the full non-spatial match set, or a conservative latitude/longitude superset of it. It then applies the radius rule, the SQL `ORDER BY`, and `LIMIT`/`OFFSET`. `totalCount` is the exact included count before the page. Portuguese full text stays in SQL. This module does not fetch one SQL page and then filter it.

Marketplace rule, matching the current RPCs:

- The spatial predicate runs when both search coordinates are present and `p_radius_km` is non-null.
- Omitted search coordinates, or a null buyer radius, skip spatial filtering. Distance is still computed when both sides have coordinates.
- Buyer radius is `LEAST(p_radius_km, 200)` kilometres.
- Seller or service radius defaults to 50 km when null.
- A row is included when the ellipsoidal distance is within the capped buyer radius or within the coverage radius.
- The boundary is inclusive.
- A row with no usable coordinate is excluded while the predicate is active.
- Out-of-range marketplace coordinates are coerced. Non-finite search input returns no rows.
- Sort keys follow the product RPC: `price_asc`, `price_desc`, `distance`, `newest`, then `is_featured DESC`, then `created_at DESC`. The service RPC also has `rating DESC NULLS LAST`. Inactive `CASE` keys are null for every row. Ascending nulls sort last and descending nulls sort first, except rating. An `id` ascending tie-break is added so a page is stable. The SQL functions do not order by id.
- Limit defaults to 20, is capped at 100, and a negative limit is rejected. Offset below zero becomes 0.

Nearby replacements:

- `nearbyServices` uses the same OR rule. A null radius defaults to 50 km and the predicate still runs. Out-of-range search coordinates raise `Coordenadas inválidas fornecidas.` A null search coordinate returns no rows.
- `nearbyProducts` and `nearbyAgriculturalResources` use the buyer radius only. Coverage radius does not include a row. Status must be `active`. The marketplace status set `active` plus `published` is a different contract and is left with the marketplace page.
- Results are ordered by distance, then id, then limited. The default limit is 20 and the cap is 100.

`entitiesInBounds` uses an inclusive latitude/longitude box. Reversed corners are normalised to the bounding box of `ST_MakeEnvelope`. That box does not select the antimeridian complement: a query from longitude 170 to -170 contains longitude 0 and excludes longitude 179. Stored out-of-range coordinates are coerced before the box test. Rows are ordered by entity type (services, then products, then agricultural resources) and then id. The SQL function has no `ORDER BY`, so this order is a deliberate stable contract. The default limit is 50 and the cap is 100. `matchedCount` is the full match count and is not a column of the SQL return.

## Polygon operations

`src/lib/geospatial/polygon-relations.ts` uses Turf 7.4.0. `booleanContains` excludes the boundary. `booleanIntersects` includes it. Shared-edge contact is touches, and the area overlap test stays false. `booleanOverlap` is not used. A bowtie is invalid because `kinks()` finds the self-intersection. Rings are planar longitude/latitude, matching `geometry(Polygon, 4326)`. Marketplace search does not call these predicates. The tests cover interior, boundary, exterior, overlap, disjoint, invalid, and the planar antimeridian ring. This is not a claim that every PostGIS geometry operation has been reproduced.

## Tests executed

`npx tsc --noEmit` passed. `npm run lint` passed. `npm run build` passed on Next.js 16.3.2. `npm test` on 28 October 2026, 15:08 Africa/Luanda, reported 611 passed, 5 skipped, 84 files passed, and 1 file skipped. The PostGIS differential ran: the log shows the expected geography coercion notices and the bowtie self-intersection notice from local PostGIS 3.4.2.

The geospatial files in that run include:

- `src/test/geospatial-wgs84-distance.test.ts`
- `src/test/geospatial-radius-bounds.test.ts`
- `src/test/geospatial-postgis-free-search.test.ts` — 10 km buyer radius, 49.9/50/50.1 km, 80 km, 190/210 km with the 200 km cap, null coordinates, non-finite input, coercion, exact boundary versus 1 mm outside, and 2,000 random rows with no candidate false negative
- `src/test/geospatial-polygon-relations.test.ts`
- `src/test/geospatial-catalogue-page.test.ts` — distance page after the exact filter, price and featured null ordering, the proof that an early limit hides a closer row, negative limit
- `src/test/geospatial-nearby-queries.test.ts` — service OR versus product buyer-only, 200 km cap, boundary and zero distance, rejected coordinates, inactive rows, antimeridian and near-pole inclusion, bounds boundary and reversed-corner behaviour
- `src/test/cloudhike-postgis-free-schema.test.ts` — renderer invariants and the loaded `cloudhike_schema_dev` checks
- `src/test/geospatial-postgis-live.test.ts` — inclusion booleans and distances within 1 metre of PostGIS 3.4.2 on `geospatial_baseline`

The 1 metre tolerance was not widened. The 1e-6 m bridge was not widened.

`src/lib/services/shopping-service.ts` and `src/lib/services/marketplace-service.ts` still call `search_marketplace_products` and `search_marketplace_services`. They do not import the new page or nearby functions.

## Performance

Phase 1.2 in-memory catalogue, search at Luanda with a 50 km buyer radius and 50 km coverage, measured 28 October 2026, about 14:44 Africa/Luanda:

| Rows | Candidates | Matches | Candidate filter | Exact distance on candidates | Full scan |
| --- | --- | --- | --- | --- | --- |
| 1,000 | 3 | 3 | 0.275 ms | 1.696 ms | 18.427 ms |
| 10,000 | 38 | 27 | 2.091 ms | 1.187 ms | 31.202 ms |
| 100,000 | 385 | 284 | 13.119 ms | 19.831 ms | 141.725 ms |

The filtered match count equalled the full-scan match count. Heap after 100,000 rows was 46.7 MB.

This phase, on `public.locations` in `cloudhike_schema_dev`, inserted 100,000 rows with latitude from -18 to -2 and longitude from 11 to 24, then ran the same Luanda candidate box:

- Bitmap index scan on `idx_locations_lat_lon`: 410 rows, execution 2.011 ms.
- Sequential scan with index scans disabled: 410 rows, 99,591 rows removed by the filter, execution 16.304 ms.

The 410 rows are the random rows inside that box. They are not the Phase 1.2 match count, because this insert uses `random()` and does not run GeographicLib. The index is the candidate filter only.

One very large coverage radius widens the box for the whole query. The page function must receive every non-spatial match, or a proven superset, before it limits. A SQL `LIMIT` before the exact test changes the page.

These timings were not measured on CloudHike. The Free plan statement timeout and memory limits are still unverified for this workload.

## Rollback

1. Leave the application on Supabase and Clerk.
2. Do not apply `cloudhike/schema/postgis-free` to CloudHike production.
3. Remove the local destination database with `sudo -u postgres dropdb --if-exists cloudhike_schema_dev`.
4. Do not delete the CloudHike project. Nothing in this phase wrote to it, so there is no CloudHike schema restore.
5. Revert this branch to drop the destination files from the repository. Historical `supabase/migrations` files were not edited.

## Remaining blockers

- CloudHike has no development database, so the destination schema and the radius cases have not run there.
- Production traffic, production rows, and the live RPCs stay on Supabase.
- The database owner bypasses row level security unless it is forced. Policies were created locally and were not re-tested as a non-owner.
- `request.jwt.claims` is not set by CloudHike. The rewritten policies do not authenticate Clerk sessions.
- Storage policies were omitted. Media remains on Supabase Storage.
- Password, OAuth, and session import were not attempted.
- `entitiesInBounds` order is now stable by type and id. The original SQL order inside each `UNION ALL` arm was undefined.
- Marketplace text search is still the SQL full-text predicate. The page function does not repeat it.
- Polygon coverage is the measured contains, intersects, touches, and invalid-ring cases. It is not every PostGIS geometry operator.
- `earthdistance` remains available on CloudHike and remains unused.

## Files

- `scripts/cloudhike/render-postgis-free-schema.mjs`
- `scripts/cloudhike/apply-postgis-free-schema.mjs`
- `cloudhike/schema/manifest.json`
- `cloudhike/schema/postgis-free/*.sql`
- `src/lib/geospatial/catalogue-page.ts`
- `src/lib/geospatial/nearby-queries.ts`
- `src/test/geospatial-catalogue-page.test.ts`
- `src/test/geospatial-nearby-queries.test.ts`
- `src/test/cloudhike-postgis-free-schema.test.ts`
- `docs/cloudhike/database-compatibility.md`
- `docs/cloudhike/migration-runbook.md`
- `docs/cloudhike/geospatial-compatibility.md`

Existing distance, bounds, and polygon modules were reused and not replaced.
