# CloudHike development migration runbook

This runbook prepares an empty CloudHike development database. It does not load production data, user accounts, passwords, sessions, or files. It does not modify Supabase.

Phase 1 stops before replay. PostGIS is unsupported on the measured CloudHike image, and the development environment has not been created. The commands below record that stop. They do not apply `supabase/migrations`.

## Preconditions

1. The CloudHike project is `agroconnect` (`agroconnect-8shmts`). Do not create a second project.
2. A development environment exists. Production Postgres on that project is a catalog probe only.
3. Development Postgres is the only service deployed for this phase.
4. `.env.cloudhike.local` contains `DATABASE_URL` and `DIRECT_URL` from the **development** Environment tab. Both are server-side. The file is git-ignored.
5. `npm install` has been run so the `pg` dev dependency is present.

Confirm the URLs are the development database before continuing. The dashboard development URL is `/dashboard/projects/agroconnect-8shmts-dev`.

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

### What a later replay must separate

When PostGIS exists, replay is still not a blind `supabase db push` onto CloudHike. Before any apply:

- Keep the versioned files in `supabase/migrations` as the history. Do not rewrite files that already ran on Supabase.
- Skip or split statements against `storage.buckets` and `storage.objects`. The four files are listed in `database-compatibility.md`.
- Replace grants to `anon`, `authenticated`, and `service_role`. Those roles are not created by CloudHike.
- Replace `auth.jwt()`, `auth.uid()`, and `auth.role()` before enabling policies that call them. `current_clerk_user_id()` compiles only as a reader of `request.jwt.claims`. Nothing in CloudHike sets that claim today.
- Apply Angola reference data only after `countries` and `provinces` exist. Prefer `20261005160000_angola_21_provinces.sql` over the older 18-province description in `supabase/seed/angola/provinces.sql`.
- Use `DIRECT_URL` for the session that applies SQL. `DATABASE_URL` is transaction-pooled.
- Take a CloudHike backup from the development database card before the first apply, even though the database is empty.

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

Before any future apply on development:

1. Confirm the Environment tab is Development.
2. Use Backup now on that database, or rely on the nightly 02:00 `pg_dump` after the first objects exist.
3. Free retention is 7 days. Download the dump if the apply might need to be inspected later.

The production probe has no AgriConnect tables. Do not restore a Supabase dump into it as a shortcut. A Supabase dump contains roles, the `storage` and `auth` schemas, and PostGIS types this server does not have.

## Rollback

Phase 1 rollback:

1. Leave application environment variables on Supabase and Clerk.
2. Delete `.env.cloudhike.local` locally if it was created.
3. Do not deploy the app with CloudHike database URLs.

If a future development apply goes wrong, restore that development database from its CloudHike backup. A failed CloudHike restore leaves the current development database in place. Deleting the development environment from its Settings page removes only development services. It does not remove production. Deletion is permanent. This phase does not delete either database.

## Production cutover prerequisites

Do not start a production cutover, and do not start the authentication migration, until:

1. PostGIS is verified with `CREATE EXTENSION postgis` on an empty development database, and the two marketplace search functions return a known distance for a fixture point.
2. Storage SQL is split out of the migration chain and the application still uses Supabase Storage until a storage phase says otherwise.
3. RLS is redesigned for a non-superuser owner. On CloudHike the database owner bypasses row security unless `FORCE ROW LEVEL SECURITY` is set, and that behavior was not re-tested in this phase.
4. `uuid-ossp` creation by the owner role is verified, or primary keys move to `gen_random_uuid()` in a new forward migration.
5. A maintenance window, row-count checksums, and a rehearsed return to Supabase are written down. Production rows are still only in Supabase.
6. The development environment, not the production probe, is the database that passed steps 1–4.

## Current stop

`cloudhike:check` cannot succeed against a development database yet, because that environment does not exist. The production probe already showed PostGIS is absent, so creating the development database will not by itself make the schema loadable. Create the development environment when a PostGIS-capable image is available, or when an approved schema design preserves the spatial results. Until then, exit 2 is the correct Phase 1 result.
