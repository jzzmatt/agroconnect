# CloudHike migration runbook

The migration database is the production Postgres on CloudHike project `agroconnect` (`agroconnect-8shmts`). There is no second project and no development environment. This runbook does not load Supabase production rows, user accounts, passwords, sessions, or files, and it does not modify Supabase.

Phase 1.1 keeps the schema unloaded. The geospatial gate is **BLOCKED — NOT VERIFIED** (`geospatial-compatibility.md`). `npm run cloudhike:check` connected to this database on 28 October 2026, 14:17 Africa/Luanda, and exited 2 because PostGIS is absent. No file from `supabase/migrations` was applied. Spatial experiments stay off this production database.

## Preconditions

1. The CloudHike project is `agroconnect` (`agroconnect-8shmts`). Do not create a second project. A development environment, if one is created later from the dashboard, is the only place spatial experiments may run. This production database is not that place.
2. Postgres on that project's production environment remains the intended migration database. Do not apply `CREATE EXTENSION`, fixture SQL, or `supabase/migrations` to it while the geospatial gate is blocked.
3. `.env.cloudhike.local` contains `DATABASE_URL` and `DIRECT_URL` from that project's Environment tab. Both are server-side. The file is git-ignored.
4. `npm install` has been run so the `pg` dev dependency is present.

Confirm the URLs belong to `agroconnect-8shmts`, not to another project. Dashboard: https://cloudhike.dev/dashboard/projects/agroconnect-8shmts

## Procedure

From the repository root:

```bash
npm run cloudhike:inventory
npm run cloudhike:check
```

`cloudhike:inventory` prints tag counts for the 54 migration files and the Angola seed files. It does not connect.

`cloudhike:check` connects with `DIRECT_URL`, reads the extension catalog, and exits. It never reads migration files into the database.

| Exit | Meaning |
| --- | --- |
| 1 | `DATABASE_URL` or `DIRECT_URL` is missing, `pg` is missing, or the connection failed. No SQL was applied. |
| 2 | Connected. PostGIS is absent. Code `POSTGIS_UNSUPPORTED`. No SQL was applied. This is the expected result on the image measured on 28 October 2026. |
| 0 | Connected. PostGIS is present. Code `POSTGIS_PRESENT_APPLY_NOT_RUN`. Schema apply is still a separate decision. Phase 1 does not apply it. |

Do not point `npm run dev` at CloudHike. The Next.js app ignores these two variables.

`scripts/cloudhike/geospatial-baseline.sql` reproduces the current PostGIS radius and polygon cases. Run it only on an isolated local or development database. Do not pass it `DATABASE_URL` or `DIRECT_URL` from `.env.cloudhike.local`.

### What a later replay must separate

When PostGIS exists, replay is still not a blind `supabase db push` onto CloudHike. Before any apply:

- Keep the versioned files in `supabase/migrations` as the history. Do not rewrite files that already ran on Supabase.
- Skip or split statements against `storage.buckets` and `storage.objects`. The four files are listed in `database-compatibility.md`.
- Replace grants to `anon`, `authenticated`, and `service_role`. Those roles are not created by CloudHike.
- Replace `auth.jwt()`, `auth.uid()`, and `auth.role()` before enabling policies that call them. `current_clerk_user_id()` compiles only as a reader of `request.jwt.claims`. Nothing in CloudHike sets that claim today.
- Apply Angola reference data only after `countries` and `provinces` exist. Prefer `20261005160000_angola_21_provinces.sql` over the older 18-province description in `supabase/seed/angola/provinces.sql`.
- Use `DIRECT_URL` for the session that applies SQL. `DATABASE_URL` is transaction-pooled.
- Take a CloudHike backup from this database's card before the first apply, even though the database is empty.

No second migration framework is introduced. `pg` is the client CloudHike documents. The checker is a gate, not a schema history.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run cloudhike:inventory
npm run cloudhike:check
```

Schema comparison for this phase is the inventory, not a loaded destination:

- 54 source migration files.
- 12 reference PostGIS and must not be stripped.
- 4 reference Supabase Storage.
- 8 reference `auth.jwt`, `auth.role`, or `request.jwt`.
- 10 grant Supabase roles.
- 17 enable RLS or create policies.
- 23 mention `clerk_user_id` or `current_clerk_user_id`.
- 20 have none of those markers.

Those counts come from `npm run cloudhike:inventory`. A file can carry more than one marker, so the tag counts overlap. The destination table count is not compared, because no destination schema was created.

PostGIS verification is the catalog query, not a spatial function call. `ST_DWithin` cannot be called where the type does not exist.

Authentication, Supabase access, media storage, and the PWA are unchanged when `git diff` for this phase does not touch `src/lib/supabase`, `src/middleware.ts`, `src/app/api/webhooks/clerk`, storage upload code, or `public/sw.js`.

## Backup

Before any future apply on this database:

1. Confirm the dashboard project is `agroconnect-8shmts`.
2. Use Backup now on that database, or rely on the nightly 02:00 `pg_dump` after the first objects exist.
3. Free retention is 7 days. Download the dump if the apply might need to be inspected later.

This database has no AgriConnect tables. Do not restore a Supabase dump into it as a shortcut. A Supabase dump contains roles, the `storage` and `auth` schemas, and PostGIS types this server does not have.

## Rollback

Phase 1 rollback:

1. Leave application environment variables on Supabase and Clerk.
2. Delete `.env.cloudhike.local` locally if the migration should stop using this database from this machine.
3. Do not deploy the app with CloudHike database URLs.

If a future apply on this database goes wrong, restore it from its CloudHike backup. A failed CloudHike restore leaves the current database in place. Deleting the project is permanent and removes this migration database. This phase does not delete it.

## Production cutover prerequisites

Do not start a production cutover, and do not start the authentication migration, until:

1. The geospatial gate in `geospatial-compatibility.md` is `PASS`. That requires either PostGIS enabled by the owner role on an isolated development database, with the baseline inclusion booleans and distances within 1 m, or an explicitly approved alternative that preserves those results. A catalog read is not that proof. This production database is not updated until that pass exists.
2. Storage SQL is split out of the migration chain and the application still uses Supabase Storage until a storage phase says otherwise.
3. RLS is redesigned for a non-superuser owner. On CloudHike the database owner bypasses row security unless `FORCE ROW LEVEL SECURITY` is set, and that behavior was not re-tested in this phase.
4. `uuid-ossp` creation by the owner role is verified, or primary keys move to `gen_random_uuid()` in a new forward migration.
5. A maintenance window, row-count checksums, and a rehearsed return to Supabase are written down. Production rows are still only in Supabase.
6. The database that passed steps 1–4 is this project's Postgres, `agroconnect-8shmts`.

## Current stop

`cloudhike:check` connects to this database and exits 2. PostGIS is absent, the owner is not a superuser, and the project has no development environment. The geospatial gate is **BLOCKED — NOT VERIFIED**.

The migration still targets this database. It does not move to another project. `geographiclib-geodesic` 2.2.0 was explicitly approved as the distance engine on 28 October 2026, 14:50 Africa/Luanda. The schema still stays unloaded. Exit 2 stays the correct result for `cloudhike:check` because PostGIS is absent. The approved path stores latitude and longitude and calculates WGS84 distance in the application, after the conservative btree box in `phase-1-2-geospatial-prototype.md`.

Do not start Phase 2. Do not change authentication configuration, migrate identity data, or cut production traffic onto CloudHike while the gate is blocked.
