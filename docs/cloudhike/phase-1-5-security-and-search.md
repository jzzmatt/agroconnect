# Phase 1.5 — Security hardening and marketplace search parity

**Gate status: BLOCKED**

The marketplace text predicate is now applied in the CloudHike search entry point before pagination. The live Supabase RPCs were not changed. A transaction-local Clerk claims adapter was added and tested with the `pg` driver on a disposable local database. CloudHike production still has no non-owner runtime role, so the security gate stays blocked. No persistent DDL was applied to CloudHike. Supabase and Clerk remain the live services.

Checked 28 October 2026, 15:53 Africa/Luanda.

## 1. What changed

| Area | Change | Live traffic |
| --- | --- | --- |
| Product and service text search | `searchCloudhikeMarketplaceProducts` and `searchCloudhikeMarketplaceServices` run the RPC predicate in SQL, then call `pageMarketplaceCatalogue` | Not wired. `ShoppingService` and `MarketplaceService` still call the Supabase RPCs |
| Claims | `withAuthorizedCloudhikeTransaction` sets `request.jwt.claims` with `set_config(..., true)` after `auth().userId` | Not used by the Supabase clients |
| RLS | `901_force_row_level_security.sql` forces row security on the 39 tables that enable it | Applied on local `cloudhike_schema_dev` only. Not applied on CloudHike |
| Candidate views | `902_marketplace_candidate_views.sql` adds security-invoker views | Same local apply. Not applied on CloudHike |

## 2. Marketplace contracts

Product and service search are not the same predicate.

| Rule | Products (`search_marketplace_products`) | Services (`search_marketplace_services`) |
| --- | --- | --- |
| Full text | Portuguese `to_tsvector` over title, description, and seller business name | Portuguese `to_tsvector` over title, short description, description, and provider business name |
| ILIKE | title, description, and seller business name | title, short description, and provider business name. Description is not in the ILIKE list |
| Status | `status IN ('active','published')` and seller `status = 'active'` | `status IN ('active','published')` and provider `status = 'active'` |
| Extra filter | `availability_status` | `pricing_type` |
| Shared filters | category, province, municipality, minimum price, maximum price | same |
| Radius | Buyer radius capped at 200 km, or seller radius defaulting to 50 km | Buyer radius capped at 200 km, or service radius defaulting to 50 km |
| Sort | price, distance, newest, then featured and `created_at`. No rating key | Those keys, plus rating descending with nulls last |
| Page | `LIMIT` default 20, cap 100. The CloudHike page adds `id` ascending as a tie-break | same SQL defaults. The live service wrapper passes 50. This phase did not change that wrapper |

Empty `p_query` and SQL `NULL` skip the text test. A query of a single space does not. User text is bound as `$1`. It is not concatenated into the statement.

`pageMarketplaceCatalogue` still does not stem. It formats a page after the SQL predicate and the GeographicLib decision. Callers of the CloudHike prototype use the two search functions, which have no option to skip the predicate and which do not put `LIMIT` or `OFFSET` in the candidate SQL.

## 3. Search results

| Test | Result | Where |
| --- | --- | --- |
| `pães frescos` matches `pão` by full text | **PASS** | CloudHike read-only, 28 October 2026, 15:53 Africa/Luanda. `public` relations remained 0. Local disposable Postgres agrees |
| That row fails `ILIKE '%pão%'` and the OR keeps it | **PASS** | CloudHike read-only and local search. The local page included `bread` |
| `sementes` / `semente` full text | **PASS** | CloudHike read-only and local search |
| `caminhões` / `caminhão` full text and ILIKE both false | **PASS** | CloudHike read-only and local search. The page was empty |
| `ações de formação` / `ação` full text false, ILIKE true, OR keeps the row | **PASS** | CloudHike read-only and local search |
| Service description is full-text only | **PASS** | Local. Query `ães` kept the product whose description is `pães frescos` and dropped the service with that description |
| Text applied before `LIMIT` / `OFFSET` | **PASS** | Local. A non-matching cheaper row was not page 1. Milho price pages were `cheap`,`mid` then `dear`,`blank`, with total 4 |
| Status, category, province, municipality, availability, and price | **PASS** | Local, on the same candidate SQL as the text predicate |
| ID tie-break and page boundaries | **PASS** | Local. `tie-a` then `tie-b`, no duplicate |
| Seller-radius boundary inside a 10 km buyer search | **PASS** | Local. 6 text candidates, 5 included, `boundary-bread` included, `far-bread` excluded |
| Search text that looks like SQL | **PASS** | Local. The statement did not contain the text. The table still had every inserted row. A non-UUID category cast failed |
| Service rating nulls last and pricing filter | **PASS** | Local |
| Candidate query on CloudHike catalogue tables | **NOT RUN** | CloudHike `public` has 0 relations. The schema was not applied |
| Live Supabase RPCs unchanged | **PASS** | No migration under `supabase/migrations` was edited. The services do not import the CloudHike search |

The CloudHike stemming check was one read-only transaction. It did not create a table. SSL mode was left as stored. The driver warning about `sslmode` was not treated as a reason to weaken TLS.

## 4. Authorization design

The server boundary is `requireVerifiedClerkSession`. It calls Clerk `auth()` and passes only `userId` to `sessionFromClerkAuth`. It does not read `sessionClaims` and it does not decode a JWT.

The claims object is built on the server:

```json
{ "sub": "<auth().userId>", "role": "authenticated" }
```

`current_clerk_user_id()` reads `sub`. `is_current_user_admin()` reads `profiles.account_type` for that subject. The adapter does not copy a client role, organization id, or email into the claim. It never sets `role` to `service_role`.

`withAuthorizedCloudhikeTransaction`:

1. Rejects a missing subject before `connect`.
2. Begins a transaction.
3. Runs `SELECT set_config('request.jwt.claims', $1, true)`.
4. Rejects a superuser, a `BYPASSRLS` role, the database owner, and an owner of any `public` table.
5. Gives the callback a client that rejects later `set_config` / `SET` of `request.jwt.claims`.
6. Commits, or rolls back on any error. It does not open a second connection as the owner.
7. Runs `RESET request.jwt.claims` before `release`. A failed reset destroys the pooled client.

## 5. Runtime role request

CloudHike cannot create this role from the current connection: `rolcreaterole` is false. This phase did not try to create it and did not grant privileges on the production database.

Ask CloudHike to provision one login role for application requests:

| Role | Use | Must not |
| --- | --- | --- |
| Current database owner | Approved migrations only, with `DIRECT_URL` | Serve application requests, sit in the browser, or act as a fallback when RLS denies a row |
| New runtime login | Application requests after the server has verified Clerk | Own the database, own application tables, `BYPASSRLS`, `SUPERUSER`, `CREATEROLE`, `CREATEDB`, or hold `GRANT OPTION` |

After that role exists, grant it `CONNECT`, schema `USAGE`, and the `SELECT` / `INSERT` / `UPDATE` / `DELETE` privileges the policies expect. Do not grant it DDL. The adapter refuses the owner connection, so the runtime credential has to be a different role before any protected CloudHike request can run.

## 6. RLS review

`901_force_row_level_security.sql` contains `FORCE ROW LEVEL SECURITY` for every table that enables RLS. On 28 October 2026 the local socket database `cloudhike_schema_dev` loaded that file: 39 tables had RLS enabled and 39 had it forced. `inet_server_addr()` was null. The candidate views loaded with `security_invoker=true`. That apply did not connect to CloudHike.

`FORCE` stops the table owner from bypassing policies. It does not stop a superuser or a `BYPASSRLS` role. A missing `sub` makes `clerk_user_id = current_clerk_user_id()` unknown, so owner policies fail closed. Policies with `USING (true)` still allow the read.

These existing policies are permissive. They were not rewritten:

| Policy | Effect |
| --- | --- |
| `Locations are viewable by everyone` | `SELECT` with `USING (true)` |
| `Authenticated users can insert locations` | Any non-null `sub` can insert a location. The check is not ownership |
| `Authenticated users can update locations` | Any non-null `sub` can update every location row |
| `Public read user roles` and `User roles are viewable by everyone` | `SELECT` with `USING (true)` |
| `Public read media assets`, `Public read product images` | `SELECT` with `USING (true)` |
| `System insert audit logs` | `INSERT` with `WITH CHECK (true)`, including a session with no subject |
| Public catalogue `SELECT` on products and services | Products: `status = 'active'`. Services also have a published-read policy. The marketplace RPC returns both `active` and `published` |

The product gap matters for the new view. `marketplace_product_candidates` is `security_invoker`, so a non-owner sees only rows the product policies allow. The RPC is `SECURITY DEFINER` and also returns `published`. A runtime `SELECT` on the view can therefore drop published products the RPC would return. This phase did not widen that policy. Closing it needs an explicit decision before the schema is applied on CloudHike.

Ownership policies use `USING` and `WITH CHECK` with the same subject comparison, including profiles, notifications, favorites, and the seller/provider `FOR ALL` policies. Service-request and transport updates use an OR of customer and provider. That OR is participant access. It does not treat a null subject as a match.

## 7. Security tests

Local disposable database `cloudhike_phase15`, PostgreSQL 16.15, socket confirmed with `inet_server_addr() IS NULL`, then dropped. Roles were `NOSUPERUSER`. The runtime role was not the database owner and did not have `BYPASSRLS`. The driver was `pg`.

| Test | Result | Where |
| --- | --- | --- |
| Missing or blank Clerk subject | **PASS** | Unit. Connection was not opened |
| Client `sessionClaims.sub` ignored | **PASS** | Unit. Claims stayed `user_a` / `authenticated` |
| Later `set_config` of the claims GUC | **PASS** | Unit. Rejected, then `ROLLBACK` |
| Database owner connection | **PASS** | Unit and local `pg` pool. Work did not run |
| Unauthenticated `SELECT` | **PASS** | Local runtime. 0 rows |
| Unauthenticated `INSERT` | **PASS** | Local runtime. Policy error, row absent |
| User A cannot read, insert, update, or delete User B | **PASS** | Local runtime with forced RLS |
| Empty, malformed, blank `sub`, and `role=service_role` without `sub` | **PASS** | Local. Subject null, 0 rows |
| Claims do not leak to the next pooled checkout | **PASS** | Local pool `max: 1`. Next checkout saw an empty setting and 0 rows |
| Failed write rolls back and is not retried as owner | **PASS** | Local |
| Table owner bypass without `FORCE` | **PASS** | Local owner saw both rows while claims named User A |
| `FORCE` hides the other row from the owner | **PASS** | Same table, same claims |
| `BYPASSRLS` still sees both rows | **PASS** | Local role created only for this test |
| Superuser sees both rows under `FORCE` | **PASS** | Local `postgres` via peer auth |
| Runtime `CREATE TABLE`, `ALTER TABLE`, and `CREATE ROLE` | **PASS** | Local. Permission denied |
| Runtime `GRANT INSERT` does not confer the privilege | **PASS** | Local. The command tag came back and `has_table_privilege` stayed false |
| Same matrix on CloudHike | **NOT RUN** | No non-owner role. No schema. Production was not used as a fixture |

Security gate: **BLOCKED**. These results are local. They are not CloudHike authorization.

`npx tsc --noEmit` passed. `npm run lint` passed. `npm test` on 28 October 2026, 15:56 Africa/Luanda, reported 634 passed and 5 skipped.

## 8. Rollback

This phase wrote no CloudHike rows and no CloudHike objects. The read-only stemming transaction rolled back. `public` still had 0 relations.

- Leave application environment variables on Supabase and Clerk.
- Do not apply `901` or `902` to CloudHike until the production schema apply is explicitly approved and a backup of the empty database has been taken.
- Local `cloudhike_schema_dev` can be dropped and recreated with `npm run cloudhike:apply-schema`. That command refuses a hosted URL.
- The adapter is unused by the live request path. Removing the new modules returns search to the Phase 1.4 state without a data migration.

## 9. Blockers

| Item | State |
| --- | --- |
| Non-owner CloudHike runtime role | **BLOCKED**. `rolcreaterole` is false. The owner credential must not become the request credential |
| Clerk claims on a CloudHike connection | **NOT RUN**. The adapter was not pointed at CloudHike |
| `FORCE ROW LEVEL SECURITY` on CloudHike | **NOT RUN**. SQL is prepared. Local socket apply passed |
| Published products versus the public `status = 'active'` policy | Open contract gap. Not changed |
| Location insert/update for any authenticated subject | Open. Not changed |
| Audit insert `WITH CHECK (true)` | Open. Not changed |
| Persistent schema on CloudHike | **BLOCKED** until explicit approval |
| Storage cutover | **BLOCKED**. Unchanged from Phase 1.4 |
| Production traffic | Not switched |
| Authentication migration | Not started |
| Phase 2 | Not started |

## Gate

**BLOCKED**

The search predicate matches the RPCs on the local fixture and the Portuguese functions match the read-only CloudHike configuration. Security is not established on CloudHike: there is still no runtime role that is distinct from the database owner, and the claims adapter has not run there.
