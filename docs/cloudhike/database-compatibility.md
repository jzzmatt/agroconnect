# CloudHike PostgreSQL compatibility

Classification uses the CloudHike Postgres 16.15 catalog read on 28 October 2026 (Africa/Luanda) and a static scan of `supabase/migrations` (54 files) plus `supabase/seed/angola` (2 files). The scan is `npm run cloudhike:inventory`. It does not execute SQL.

Status values:

| Status | Meaning |
| --- | --- |
| Compatible and verified | Observed on this CloudHike database, or plain SQL with no provider-specific dependency. |
| Compatible with modifications | The statement shape is PostgreSQL, and it still depends on a Supabase role, JWT claim, or storage schema. |
| Unsupported | The feature is absent on the measured CloudHike image. |
| Not yet verified | The catalog or the docs do not prove the behavior, and it was not executed. |

## PostGIS and AgriLocalização

PostGIS is **unsupported** on the measured database. The Phase 1.1 gate is **BLOCKED — NOT VERIFIED**. The full record is `geospatial-compatibility.md`. The catalog was read again on 28 October 2026, 14:17 Africa/Luanda. `npm run cloudhike:check` exited 2. No spatial SQL was applied to this database.

| Check | Result |
| --- | --- |
| `server_version` | 16.15 |
| Build | x86_64-pc-linux-musl, Alpine |
| `postgis` in `pg_available_extensions` | false |
| `postgis_topology` | false |
| Extensions in the catalog | 61 |
| Installed extensions | `plpgsql` only |
| `uuid-ossp` in the catalog | true, version 1.1, not installed |
| `gen_random_uuid()` | present in core |
| `earthdistance` and `cube` | present in the catalog, not installed |
| CloudHike docs | No PostGIS page. The Extensions tab examples are `pgcrypto`, `citext`, and `hstore`. |
| Role | Not a superuser. Cannot create databases. Can `CREATE` in the current database. |
| `ST_*` functions | 0 |
| Development environment | None. Spatial experiments were not written here. |

`CREATE EXTENSION postgis` cannot succeed while the control file is absent. This was not executed on CloudHike. The catalog is sufficient evidence. A Pro resize is documented as the same database moved to its own container. This account was not upgraded, and the docs do not list PostGIS as a paid feature.

On an isolated local PostgreSQL 16.15 with PostGIS 3.4.2, the extension is untrusted (`superuser = true`). A non-superuser role that can `CREATE` in its database still receives `permission denied to create extension "postgis"`. That is a local permission result, not a CloudHike execution. It means shipping the Ubuntu package unchanged would still leave this owner unable to enable PostGIS. A trusted build is not in the measured image.

### Spatial objects the migrations require

Twelve migration files reference PostGIS. They create:

- `CREATE EXTENSION postgis` in the foundation migration and again in `001_extensions_and_triggers.sql`.
- Sixteen `GEOGRAPHY(Point, 4326)` columns: `locations`, `countries`, `provinces`, `municipalities`, `communes`, `localities`, `profile_locations`, `provider_profiles`, `services`, `products`, `agricultural_resources`, `service_requests`, `customer_addresses`, and the three transport points `origin_location`, `destination_location`, and `base_location`.
- GiST indexes on those points, except `customer_addresses`, which has the column and the sync trigger and no GiST index.
- `delivery_zones.boundary` as `GEOMETRY(Polygon, 4326)` with a GiST index. Application TypeScript does not read that column. The table still cannot be created.
- Trigger function `sync_geography_point`, using `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography`.
- `search_marketplace_products` and `search_marketplace_services`, the only spatial RPCs the app calls. Both use `ST_DWithin` and `ST_Distance`.
- `get_nearby_services`, `get_nearby_products`, `get_nearby_agricultural_resources`, and `get_entities_in_bounds` (`ST_MakeEnvelope` and the `&&` overlap operator). TypeScript does not call these four.

Province and municipality filters in those RPCs are UUID predicates. The Angola map is the bundled GeoJSON atlas, not a PostGIS polygon layer. Course map pins are `double precision` latitude and longitude with a partial btree index (`20260923190000_academy_course_location.sql`). That file does not reference PostGIS.

The seed files `supabase/seed/angola/provinces.sql` and `municipalities.sql` do not contain the strings the scanner uses for PostGIS. They insert administrative rows, including `public.locations`. After the geography trigger exists, those inserts maintain `location`. They must not be loaded ahead of a PostGIS-capable schema. `20261005160000_angola_21_provinces.sql` updates the 21-province set (Lei n.º 14/24) and also calls `uuid_generate_v4()`. The older seed file still describes 18 provinces. The migration is the later administrative source.

`earthdistance` can measure great-circle distance between points. It does not create `geography`, `geometry`, or polygon boundaries. The in-memory haversine (`R = 6371`) is also a sphere. On the local PostGIS 3.4.2 baseline, a point exactly 50.000 km north of Luanda on the spheroid is inside `ST_DWithin` for a 50 km seller radius and 50.269 km by that haversine, so the haversine excludes it. Neither substitute is approved. The measured cases are in `geospatial-compatibility.md`.

### Blocker

The destination schema cannot be replayed onto this CloudHike Postgres without removing spatial types. That removal is not allowed. The gate stays **BLOCKED — NOT VERIFIED** until an isolated development database proves Path A or an explicitly approved Path B. Alternatives, in order:

1. CloudHike adds PostGIS that this owner role can enable. The existing migrations can then be reviewed for the Supabase-specific statements below and replayed onto an isolated development database before any apply to this one.
2. Keep Supabase as the system of record for the database until that proof exists.
3. A later, explicit schema design stores the numeric latitude and longitude columns the tables already have and reproduces spheroidal `ST_DWithin` / `ST_Distance` on `geography`, including the 50 km boundary. Delivery-zone polygons need the same approval. Haversine and `earthdistance` do not satisfy that design. A local prototype of this design is recorded in `phase-1-2-geospatial-prototype.md`. It is not wired to the live search, it was not loaded on CloudHike, and it is not approved.

### Phase 1.2 local prototype

Measured on 28 October 2026, 14:44 Africa/Luanda, against the isolated local database `geospatial_baseline` (PostGIS 3.4.2) and a separate local database `geospatial_proto`. CloudHike was not written.

`geographiclib-geodesic` 2.2.0 matched `ST_Distance(geography, geography)` within 1 metre on the baseline points, including the exact 50 km boundary. A raw `<=` comparison flipped that one boundary because GeographicLib returned 50000.00000000012 m where PostGIS returned 50000 m and included the point. The prototype includes a point that overshoots the radius by at most 1e-6 m and still returns the full-precision distance. The live differential test passed.

The candidate filter is a conservative latitude/longitude box on a btree `(latitude, longitude)` index. On 100,000 synthetic Angola rows the box returned 385 candidates and 284 final matches, the same 284 as a full ellipsoidal scan. `EXPLAIN ANALYZE` used a bitmap index scan in 0.929 ms. Forcing a sequential scan took 5.507 ms.

`earth_box` at the true radius missed 8 of 64 points that sit on the ellipsoidal boundary (north and south of the equator at 50 km and 200 km). It is not the candidate filter. The migration gate stays **BLOCKED — NOT VERIFIED**.

## Other PostgreSQL features

| Feature | Status | Evidence |
| --- | --- | --- |
| PostgreSQL 16, plpgsql, constraints, btree indexes, triggers, functions | Compatible and verified | Server is 16.15 and `plpgsql` is installed. Untagged migration files are ordinary DDL. The scanner reports 20 untagged files. They were not executed on CloudHike. |
| `gen_random_uuid()` | Compatible and verified | `to_regprocedure` finds it. |
| `uuid-ossp` / `uuid_generate_v4()` | Not yet verified | The extension is in the catalog and is not installed. Creating it needs the non-superuser owner to be allowed to create that trusted extension. This phase did not run `CREATE EXTENSION`. |
| `pgcrypto`, `citext`, `hstore` | Compatible and verified as available | Named by CloudHike docs and present in the catalog. The app migrations do not require them. |
| PostGIS types, GiST on those types, `ST_*` | Unsupported | Catalog check above. 12 migration files. |
| Row Level Security as a PostgreSQL feature | Compatible with modifications | RLS exists in PostgreSQL 16. Policies were not created here. |
| Supabase `auth.jwt()`, `auth.uid()`, `auth.role()` | Unsupported | Eight migration files. CloudHike Auth uses its own schema and bearer tokens. These functions are not in this database. |
| `request.jwt.claims` | Compatible with modifications | `current_clerk_user_id()` reads `current_setting('request.jwt.claims', true)`. The setting exists only when a session sets it. Supabase PostgREST sets it from the Clerk JWT. CloudHike's pooler does not. |
| Roles `anon`, `authenticated`, `service_role` | Unsupported | Ten migration files grant to those roles. They are Supabase roles, not CloudHike roles. |
| `storage.buckets` and `storage.objects` | Unsupported | Four files. CloudHike Storage is one private S3 bucket, not a `storage` schema. |
| Supabase Realtime, `pg_cron`, webhooks inside the database | Not used | No migration dependency found for this phase. |
| Foreign keys to `profiles.clerk_user_id` | Compatible with modifications | The column is text and can be created. It remains a legacy Clerk id. Phase 1 does not add `auth_user_id` and does not import users. |
| Angola province seed | Not yet verified on CloudHike | SQL is portable only after `countries` and `provinces` exist. Loading it was not attempted. |

Files that mention `storage.buckets` or `storage.objects`:

- `20260822000014_024_product_image_storage.sql`
- `20260923160000_academy_lesson_upload_video.sql`
- `20260923180000_academy_course_thumbnail.sql`
- `20260923210000_product_transport_profile_supabase_media.sql`

The last of those also changes application media columns. A future replay has to separate those statements from the storage policies. This phase does not rewrite the historical files.

## Supabase-specific dependencies that stay in the app

Phase 1 does not remove or retarget these:

- `@supabase/supabase-js` clients in `src/lib/supabase`
- Clerk middleware, provider, and webhook
- Supabase Storage uploads and signed URLs
- `public/sw.js` and the PWA manifest

`search_marketplace_products` and `search_marketplace_services` remain the live spatial path on Supabase.
