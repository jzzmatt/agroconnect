# Phase 1.4 — Validate the existing CloudHike environment

**Gate status: BLOCKED**

The existing CloudHike project was inspected. No second project, environment, or database was created. No persistent DDL was applied. Supabase and Clerk remain the live production services. The application was not pointed at CloudHike.

Checked 28 October 2026, 15:19 Africa/Luanda.

## 1. Target environment

| Evidence | Result |
| --- | --- |
| CloudHike projects visible to this account | One: `agroconnect`, slug `agroconnect-8shmts`, id `01c957fd-8d87-422c-8db9-9a66eddb87a1`, created 2026-10-28 13:19 Africa/Luanda |
| Environment requested | `production` |
| Development environment | Absent. The project API says the user can create one in the dashboard. This phase did not create it |
| Postgres service | `ready` |
| Dashboard | https://cloudhike.dev/dashboard/projects/agroconnect-8shmts |
| Connection | `DIRECT_URL` from `.env.cloudhike.local`. The value was not printed |
| What the session is | Remote (`inet_server_addr()` is not null). Database name `p_6498ece51771`. The connected role owns that database |

Classification: **production**. CloudHike has no staging or development environment on this project. The database is the production Postgres of the only project, and it is empty. It is not a separate sandbox.

The read-only catalog client reported `statement_timeout` 10s with source `client`. Role settings stored in `pg_db_role_setting` include `statement_timeout=30s`, `idle_in_transaction_session_timeout=60s`, and `idle_session_timeout=5min`. The server boot value for `statement_timeout` is 0. `shared_buffers` is 16384 × 8 kB (128 MB). `max_connections` is 300, source `command line`. `work_mem` is 4 MB.

## 2. Baseline

Read-only catalog, before the probe:

| Object | Count |
| --- | --- |
| Non-system schemas | `public` only |
| Public tables, views, sequences | 0 |
| Public functions | 0 |
| Policies | 0 |
| Estimated rows | 0 |
| Installed extensions | `plpgsql` 1.0 |
| Database size | 7583 kB |

After the rolled-back probe, a second read-only catalog check found 0 public relations, no `phase14_` objects, and size 7615 kB. The 32 kB difference is not a stored application table. No rows were committed.

Role attributes of the connected user: not superuser, cannot create roles, cannot create databases, `rolbypassrls` false, can `CREATE` in `public`, and is the database owner.

| Extension | In the catalog | Installed | Notes |
| --- | --- | --- | --- |
| `postgis` | no | no | Not available to install |
| `uuid-ossp` 1.1 | yes | no | Creation was not attempted |
| `pgcrypto`, `citext`, `hstore`, `pg_trgm`, `unaccent`, `cube`, `btree_gin`, `btree_gist` | yes | no | Not required for the prepared schema |
| `earthdistance` | yes, not trusted | no | Not used for inclusion |
| `gen_random_uuid()` | core | present | Read-only call returned a value |
| `portuguese` text search | config present | n/a | Read-only stemming queries ran |

`jsonb` accepted a GeoJSON polygon and returned the coordinate `13.2` unchanged.

## 3. Changes proposed, not applied

The prepared files in `cloudhike/schema/postgis-free` match an empty destination: there is no existing AgroConnect table to alter and no unrelated application data in `public`. Applying that SQL would still be the first persistent schema on this production database.

Approval is required before any of the following:

1. Apply `cloudhike/schema/postgis-free` with `DIRECT_URL`, in a maintenance window, after a CloudHike backup of this empty database.
2. Add `FORCE ROW LEVEL SECURITY` on the new tables. The probe showed the owner bypasses a deny-all policy until that clause is set.
3. Ask CloudHike for a non-owner login role. `rolcreaterole` is false, so this phase cannot create one.

Rollback if that approved apply fails and the database is still empty of business rows: restore the CloudHike backup, or drop only the objects created by that apply. Do not drop anything that existed in the baseline above, because that baseline is empty. This phase did not take a backup and did not apply the schema.

No other persistent change is proposed.

## 4. Geospatial results

GeographicLib remains the inclusion test. Haversine, `earth_box`, and spherical distance were not used.

The distance cases below were not recomputed inside CloudHike. CloudHike has no PostGIS and no GeographicLib. They remain the local proofs from Phases 1.2 and 1.3. This phase rechecked the candidate index and coordinate storage on CloudHike inside a temporary table that was rolled back.

| Test | Result | Where |
| --- | --- | --- |
| WGS84 distance within 1 m of PostGIS 3.4.2 | PASS | Local `geospatial_baseline`, existing differential test |
| Inclusive radius and the 1e-6 m bridge | PASS | Local unit tests |
| Buyer radius capped at 200 km | PASS | Local unit tests |
| Seller/service radius default 50 km | PASS | Local unit tests |
| Buyer OR coverage inclusion | PASS | Local unit tests |
| Missing and invalid coordinates | PASS | Local unit tests. CloudHike stored latitude 95 and longitude 200 unchanged in the temporary table |
| Bounding box has no false negatives | PASS | CloudHike temporary table, 28 October 2026, 15:19 Africa/Luanda. 8 included rows, 9 candidates, 0 missing from the index filter |
| GeoJSON coordinate round-trip | PASS | CloudHike read-only `jsonb` select, and the same value in the probe |
| Polygon contains / intersects | PASS | Local Turf tests. NOT RUN as a CloudHike SQL operation. PostGIS is absent |
| Ordering, pagination, id tie-break | PASS | Local unit tests. CloudHike `ORDER BY price ASC NULLS LAST, id ASC LIMIT 2 OFFSET 1` returned `mid`, `dear`, the same page as `pageMarketplaceCatalogue` |

The CloudHike candidate plan was a bitmap index scan on `phase14_lat_lon`. Planning 0.073 ms. Execution 0.092 ms. 9 rows from 2,011 temporary rows. The transaction rolled back.

`caminhões` and `caminhão` do not share a Portuguese lexeme on this server (`caminhõ` versus `caminhã`). That is the installed text-search configuration. The marketplace RPC uses that configuration, so a future candidate query must call the same functions rather than a different stemmer.

## 5. Marketplace search, full text, and pagination

Live `search_marketplace_products` and `search_marketplace_services` are still the Supabase RPCs. `ShoppingService` and `MarketplaceService` do not import the Phase 1.3 page functions. Those RPCs were not modified.

`pageMarketplaceCatalogue` still does not run Portuguese full text. The RPC predicate is an OR of `to_tsvector('portuguese', ... ) @@ plainto_tsquery(...)` and `ILIKE` on title, description, and seller name. The application page must receive rows that already passed that predicate.

Measured on CloudHike, read-only and again inside the temporary table:

| Input | `to_tsvector` match | `ILIKE` match | RPC-style OR |
| --- | --- | --- | --- |
| Text `pães frescos`, query `pão` | true | false | true |
| Text `sementes de milho`, query `semente` | true | not required | true |

An ILIKE-only filter would drop `pães frescos` for the query `pão`. The RPC would keep it. That is why the text predicate stays in SQL. The constant is `MARKETPLACE_PRODUCT_TEXT_SQL`. It is not installed as a CloudHike function.

| Test | Result | Where |
| --- | --- | --- |
| Portuguese configuration exists | PASS | CloudHike read-only |
| RPC OR keeps a stemmed row that ILIKE drops | PASS | CloudHike read-only and rolled-back temp row |
| Application page function performs that text test | FAIL | The function has no `to_tsvector`. Callers must apply the SQL predicate first |
| Status, price, category, and province filters in the page function | NOT RUN on CloudHike | Those filters stay in the candidate SQL. The page function sorts and pages the set it is given |
| Pagination duplicates or omissions on the price page | PASS | CloudHike SQL and the application returned the same two ids |
| Production RPCs untouched | PASS | No Supabase migration was edited or applied |

## 6. RLS and authorization

| Test | Result | Where |
| --- | --- | --- |
| Policies and grants already present | PASS as a baseline | CloudHike: 0 policies, 0 functions, 0 tables |
| `rolbypassrls` | false | CloudHike catalog |
| Table owner bypass | PASS as a finding | CloudHike temporary table. A deny-all policy still returned the row to the owner |
| `FORCE ROW LEVEL SECURITY` hides that row from the owner | PASS | Same temporary table, then rolled back |
| Non-owner application role | BLOCKED | `rolcreaterole` is false. No second role was created |
| `request.jwt.claims` populated by CloudHike for Clerk | BLOCKED | Nothing in this database sets that value. The rewritten policies would see a null subject |

Security gate: **BLOCKED**.

Proposed authorization design, not implemented:

- The runtime connection is a non-owner role supplied by CloudHike.
- After the server verifies the Clerk session, it sets `request.jwt.claims` for that transaction only.
- Policies keep using `current_clerk_user_id()`.
- Tables are created with `FORCE ROW LEVEL SECURITY`.
- The database owner is not the role the application uses for requests.

Authentication migration stays out of this phase. Passwords, sessions, and OAuth accounts were not read or copied.

## 7. Storage dependencies

Storage was not migrated. CloudHike Storage is not deployed on this project. The application on this branch still reads and writes Supabase Storage, and it still contains ImageKit and Bunny code paths.

| Bucket | Public flag in SQL | Used by |
| --- | --- | --- |
| `product-images` | true | `20260822000014_024_product_image_storage.sql` |
| `product-media` | false | Product images and video paths, signed upload and display |
| `transport-media` | false | Transport image and video paths |
| `profile-media` | false | Profile avatars |
| `academy-videos` | false | Lesson video upload and signed playback |
| `academy-course-thumbnails` | false | Course thumbnails |

Signed display URLs are issued by the application from Supabase Storage. A cutover that leaves these buckets behind would break product media, transport media, avatars, lesson playback, and course thumbnails. ImageKit and Bunny URLs remain in the current branch as well. The application cannot move to CloudHike while those dependencies remain.

## 8. Performance on CloudHike

The only CloudHike timing is the rolled-back probe: bitmap index scan, 2,011 temporary rows, 9 candidates, execution 0.092 ms, planning 0.073 ms. That is not a catalogue benchmark and it is not the local 100,000-row result. No 100,000-row load was sent to CloudHike.

Local Phase 1.2 numbers stay local evidence. They are not CloudHike capacity. The measured server has 128 MB `shared_buffers`, a 30s role `statement_timeout`, and 300 `max_connections`. A heavy load test was not run.

## 9. Rollback and recovery

This phase committed nothing.

- Application environment variables stay on Supabase and Clerk.
- The probe's `ROLLBACK` removed the temporary tables. The follow-up catalog read found no `phase14_` objects and no public relations.
- Do not apply `cloudhike/schema/postgis-free` until the approval in section 3.
- Do not delete the CloudHike project. It is the migration database, and this phase did not write a schema that needs restoring.
- If a future approved apply fails, use the backup taken immediately before that apply.

## 10. Blockers

| Item | State |
| --- | --- |
| Persistent PostGIS-free schema on CloudHike | BLOCKED until explicit approval. The database is production, even though it is empty |
| GeographicLib inclusion executed against rows stored on CloudHike | NOT RUN as a committed dataset. The temporary candidate check passed and was rolled back |
| Full polygon operations inside CloudHike | NOT RUN. No geometry type |
| Application full-text search | FAIL until the candidate query uses `MARKETPLACE_PRODUCT_TEXT_SQL` |
| Pagination contract on a real catalogue | NOT RUN. The four-row price page matched |
| RLS for a non-owner Clerk session | BLOCKED |
| Storage cutover | BLOCKED. Supabase Storage, ImageKit, and Bunny remain |
| Production traffic | Not switched |
| Authentication migration | Not started |
| Phase 2 | Not started |

`npx tsc --noEmit` passed. `npm run lint` passed. `npm test` on 28 October 2026, 15:22 Africa/Luanda, reported 613 passed and 5 skipped. One earlier full run failed an unrelated AgriAcademy button test; that file then passed on its own, and the following full run passed. `npm run build` was not repeated in this phase. The previous phase build passed, and this phase did not change application routes.

## Gate

**BLOCKED**

CloudHike can store numeric coordinates, JSONB, UUIDs, Portuguese full text, and a btree latitude/longitude candidate index. The owner bypasses row level security unless it is forced. There is no non-owner role and no Clerk claim. The schema files were not applied. Those gaps are enough to keep the gate blocked.
