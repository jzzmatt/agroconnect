# Phase 0 — Repository Audit

A read-only forensic audit of the AgroConnect repository. No application code, schema or
configuration was modified in producing this report.

This document is a historical snapshot of the Phase 0 audit. From Phase 7, AgriAcademy training video is YouTube Unlisted; do not treat the Bunny Stream findings below as the current Academy media rule.

- **Commit audited:** `ca07038`
- **Method:** static reading of all source, migrations and configuration, plus one
  execution of the four validation commands to establish a baseline.
- **Evidence rule:** every finding below cites `file:line`. Where something could not be
  determined from the repository alone, it is stated as such rather than inferred.

---

## 1. Baseline validation state

All four commands were executed against a clean `npm install`. This is the measured
starting point for every later phase.

| Command | Result |
| --- | --- |
| `npm run typecheck` | **Pass** — `tsc --noEmit`, no errors |
| `npm run lint` | **Pass** — `eslint .`, no errors |
| `npm test` | **Pass** — 152 passed, 5 skipped, 157 total across 22 files |
| `npm run build` | **Pass** — Next.js production build completes |

The 5 skipped tests are the opt-in live-Supabase integration suite, gated behind
`RUN_SUPABASE_INTEGRATION=1` (`src/test/publish-pipeline.integration.test.ts:40-44`).
They do not run in a default CI invocation.

**The codebase is green.** Every risk in this report exists in a passing build, which
means the test suite does not currently detect any of them.

---

## 2. Current state

### 2.1 Stack and shape

- Next.js `^16.3.2` App Router, React `^19.2.8`, TypeScript `^6.0.3` (`package.json:24-46`)
- Clerk `^7.8.0` for identity, Supabase `^2.112.3` for data, PostGIS for geography
- 213 `.ts`/`.tsx` files, 33,343 lines under `src/`
- 26 migrations in `supabase/migrations/`, plus 3 operator scripts in `supabase/repair/`

Directory weight: `src/lib` 62 files, `src/components` 59, `src/app` 52, `src/test` 23,
`src/i18n` 8, `src/config` 6, `src/types` 2, `src/features` 1.

### 2.2 Identity and authentication — real and sound

Clerk is the identity provider and the wiring is correct. `clerkMiddleware` with
`auth.protect()` on non-public routes (`src/middleware.ts:24-28`), `ClerkProvider` at the
root (`src/app/layout.tsx:21`), and server-side helpers in `src/lib/clerk/auth.ts`:
`getCurrentUserId` (`:14-17`), `requireAuth` (`:22-28`), `getCurrentUserProfile`
(`:58-165`).

Profiles sync two ways: the Clerk webhook creates and updates them
(`src/app/api/webhooks/clerk/route.ts:82-241`), and `getCurrentUserProfile()` lazily
bootstraps a profile if the webhook has not yet fired (`src/lib/clerk/auth.ts:74-119`).
The Clerk JWT is passed to Supabase so RLS can see the user
(`src/lib/supabase/server.ts:13-15`, `:37-38`).

### 2.3 Authorization and subscriptions — the weakest layer

**No centralized capability API exists.** A search for exported functions named `can`,
`requirePermission`, `requireEntitlement`, `hasPermission` or `checkAccess` across `src/`
returns nothing. Authorization is instead performed ad hoc through
`getUserEntitlements()` (`src/lib/services/pricing-service.ts:190-243`) and inline
per-plan predicates such as `canCreateProducts()` (`:153-155`) and
`canPublishProducts()` (`:157-159`).

`requireRole()` is defined (`src/lib/clerk/auth.ts:33-45`) but **never called anywhere
else in `src/`** — it is dead code, despite `docs/authentication.md:76` describing it as
the capability mechanism.

Plan slugs are `basic | professional | business | enterprise`, with `free → basic`,
`pro → professional` and `premium → enterprise` normalized in `normalizePlanSlug()`
(`src/lib/services/pricing-service.ts:111-123`). The `basic` slug the architecture asks
to preserve **already exists** and is the NOT NULL default in the database
(`supabase/migrations/20260822000007_017_basic_default_plan_strict_access.sql:16-22`).

Those literals are scattered across roughly 40 non-test sites spanning services, API
routes, UI pages, components, types and all three i18n dictionaries. Representative:
`src/lib/products/create-product.ts:75,145`, `src/app/(dashboard)/dashboard/page.tsx:48,70,136`,
`src/components/dashboard/Sidebar.tsx:31`, `src/components/ui/UpgradePlanModal.tsx:15`.

Roles, subscriptions and entitlements are separate in the **type system**
(`src/types/database.ts:9-21`, `:36`; `src/types/domain.ts:40-71`) but conflated in
**behaviour**: `getUserEntitlements()` accepts `roles` and `accountType` parameters and
never reads them (`src/lib/services/pricing-service.ts:193-195`). Capability is therefore
a pure function of plan name. The string `"business"` is simultaneously a role and a plan
(`src/types/database.ts:18` and `:36`).

There is **no subscriptions table and no entitlements table**. Plan is a single column,
`profiles.subscription_plan`. Capability is implied by plan name in both TypeScript and in
a SQL trigger, `check_product_limit_before_insert()`
(`supabase/migrations/20260822000005_015_subscription_product_limits_whatsapp.sql:33-74`,
replaced at `supabase/migrations/20260822000011_021_phase97_product_video_60s.sql:10-41`).

### 2.4 Database — broad, real, unevenly protected

36 tables are created across the migrations and none are ever dropped. Coverage is
genuinely wide: identity, the five-level Angolan geography hierarchy, categories,
providers, services, products, media, full commerce (carts, orders, order_seller_groups,
order_items, payments, payment_events), logistics and notifications.

RLS is enabled on 33 tables, mostly in
`supabase/migrations/20260821000009_007_row_level_security.sql`. Gaps:

| Gap | Tables | Evidence |
| --- | --- | --- |
| RLS never enabled | `delivery_zones`, `couriers`, `order_tracking_events` | Created in `supabase/migrations/20260822000008_018_delivery_logistics_tracking_notifications.sql:7,29,87`; no `ENABLE ROW LEVEL SECURITY` in that or any later migration |
| RLS enabled, zero policies | `payment_events` | Enabled at `supabase/migrations/20260822000003_013_commerce_orders_payments.sql:224`; no `CREATE POLICY` anywhere |
| Intended protection never created | `profiles.subscription_plan` | `supabase/migrations/20260822000009_019_phase95_i18n_market_video_product_images.sql:215` DROPs a policy `"Users cannot self-update subscription"` that no migration ever creates |

That last row matters: the `profiles` update policies (`supabase/migrations/20260821000009_007_row_level_security.sql:53-55`)
carry no column-level restriction, so nothing at the database layer prevents a user from
writing their own `subscription_plan`.

PostGIS is real and well-formed. Four proximity functions in
`supabase/migrations/20260821000012_010_postgis_location_functions.sql` (`get_nearby_services` `:8`,
`get_nearby_products` `:84`, `get_nearby_agricultural_resources` `:153`,
`get_entities_in_bounds` `:218`), plus `search_marketplace_products`
(`supabase/migrations/20260822000002_012_agrishopping_products_marketplace.sql:77`) and `search_marketplace_services` (`supabase/migrations/20260822000001_011_marketplace_services_enhancements.sql:32`). Angola is
seeded with 18 provinces and key municipalities (`supabase/migrations/20260821000010_008_seed_data.sql:24-130`).
Communes and localities have tables but no seed data.

### 2.5 Media — Bunny does everything, ImageKit does not exist

**ImageKit is absent from the entire repository.** No package in `package.json`, no
import in `src/`, no environment variable in `.env.example`, no column in any migration.
It appears only in planning documents.

Bunny Stream currently serves **both** product short videos and Academy videos — the
module header says so explicitly (`src/lib/video/bunny.ts:2`) and so does
`.env.example:27` ("product + AgriAcademy videos"). Product images go to **Supabase
Storage** via a server-proxied route (`src/app/api/products/images/route.ts:52-57`), with
an inline `data:` URL fallback under 350 KB (`:65-69`).

The product video upload flow is the strongest media code in the repo: the server
authorizes and returns a time-limited TUS signature, and the browser uploads directly to
Bunny without proxying bytes (`src/lib/video/bunny.ts:110-171`,
`src/lib/products/bunny-upload.ts:25-54`).

Twelve module-level in-memory stores exist under `src/lib/`. The ones holding what should
be durable business state:

| Store | Location | Holds |
| --- | --- | --- |
| `videos` | `src/lib/services/product-video-service.ts:25` | Product video records |
| `videos`, `usageByOwner` | `src/lib/services/academy-video-service.ts:26-27` | All Academy video metadata and per-owner quota |
| `imagesByProduct` | `src/lib/services/product-media-service.ts:17` | Product image descriptors |
| `memoryOrders` | `src/lib/services/commerce-service.ts:151` | **All orders** |
| `memoryCart` | `src/lib/services/commerce-service.ts:40-52` | The cart |
| `memoryTrackingEvents` | `src/lib/services/logistics-service.ts:109` | Delivery tracking |
| `memoryNotifications` | `src/lib/services/notification-service.ts:4` | Notifications |
| `publishedByIdempotencyKey` | `src/lib/products/create-product.ts:30` | Idempotency keys |
| `records` | `src/lib/subscription/store.ts:17` | Plan cache (documented as cache, DB is truth) |

Product videos are dual-written to Supabase on a best-effort basis, with persistence
failures logged and swallowed (`src/lib/services/product-video-actions.ts:74-90`).
Academy videos are **memory only** — the `academy_videos` table exists
(`supabase/migrations/20260822000009_019_phase95_i18n_market_video_product_images.sql:99-124`) but no code in `src/` ever queries it, and it is not even
present in `src/types/database.ts`.

### 2.6 Domain reality check

| Domain | Verdict | Real backbone | Mock or in-memory |
| --- | --- | --- | --- |
| AgriShopping | Partially real | Supabase publish pipeline, search RPC, seller CRUD | `INITIAL_PRODUCTS` seed fallback (`src/lib/services/shopping-service.ts:68-79`, `:443`), hardcoded product-requests dashboard (`src/app/(dashboard)/dashboard/product-requests/page.tsx:19-39`) |
| AgriAcademy | **Mock** | Bunny upload authorization, entitlement flags | `MOCK_COURSES` drives the whole catalogue (`src/app/agriacademy/page.tsx:9-17`, `src/config/mock-data.ts:65-78`); `my-courses` is a stub (`src/app/(dashboard)/dashboard/academy/my-courses/page.tsx:7-17`) |
| AgriExpert | Partially real | Services search RPC, service CRUD, request insert/read actions | `MOCK_EXPERTS` directory (`src/app/agriexpert/page.tsx:9-18`); requests dashboard imports the real actions but never calls them (`src/app/(dashboard)/dashboard/requests/page.tsx:18,23-37`) |
| Localization | Partially real | Static 18 provinces, MapQuest tiles, PostGIS inside RPCs | AgriLocalização page renders `MOCK_MAP_MARKERS` (`src/app/agrilocalizacao/page.tsx:9-24`); app-layer distance is client Haversine (`src/lib/location/location-service.ts:32-47`) |
| Commerce | **Mock** | Complete DB schema, payment adapter interfaces | Cart, orders, logistics, notifications all in memory; checkout validates against seed products (`src/lib/services/commerce-service.ts:298-302`) |
| Profile / dashboard | Partially real | Clerk + Supabase profile, settings, theme, locale | Hardcoded KPIs (`src/app/(dashboard)/dashboard/page.tsx:172-189`), fake appointment card (`:521-530`) |

**No AgriAcademy course, section, lesson, enrollment or progress table exists in any
migration.** Verified by search — the only academy table is `academy_videos`, whose
`course_id` and `chapter_id` columns are orphan UUIDs with no foreign key
(`supabase/migrations/20260822000009_019_phase95_i18n_market_video_product_images.sql:102-103`).

**No `/[userId]/agriprofile` route exists.** There are two dashboard patterns:
`src/app/(dashboard)/dashboard/*` (the active one) and
`src/app/(dashboard)/[userId]/dashboard/page.tsx`, which is a three-line re-export of the
same component and never reads or validates the `userId` segment
(`src/app/(dashboard)/[userId]/dashboard/page.tsx:1-3`).

### 2.7 Cross-cutting layers

**i18n** is in better shape than the docs claim: three locales `pt`, `en`, `fr` are wired
(`src/i18n/config.ts:1-2`), Portuguese is the default, and preference persists via
localStorage, cookie and `profiles.preferred_language`
(`src/lib/auth/profile-actions.ts:239-253`). There is no URL locale segment. Many
Portuguese strings are still hardcoded in services and API routes, for example
`src/lib/products/publish.ts:81-188` and `src/app/api/webhooks/bunny/route.ts:17-24`.

**Types** are two monolithic files: `src/types/database.ts` at 1,839 lines spanning every
domain, and `src/types/domain.ts` at 494 lines. `academy_videos` and
`enterprise_service_requests` exist in migrations but are missing from the generated types.

**Theme** works client-side with FOIT prevention (`src/lib/theme/provider.tsx:23-40`), but
the `theme_preference` column is written only at profile creation — `setTheme` touches
localStorage only (`:98-105`) and the `initialServerTheme` prop is declared and never
consumed (`:46-52`).

**Configuration** has no startup fail-fast and no Zod env schema. Supabase falls back to
placeholder values (`src/lib/supabase/client.ts:4-5`). Four variables in `.env.example`
are never read by code (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MAP_PROVIDER`,
`NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_MAP_DARK_STYLE_URL`), and
`MULTICAIXA_ONLINE_API_KEY` is read (`src/lib/payments/multicaixa-online-adapter.ts:19-22`) but
undocumented. `eslint.config.mjs` does not extend `eslint-config-next` even though it is
a dependency (`package.json:42`).

**Tests** cover domain logic well — 157 cases, strong on plan and entitlement matrices
(`src/test/pricing-entitlements.test.ts`). They cover authorization badly: no test
exercises unauthenticated versus authenticated access to a route, wrong owner versus
correct owner, or wrong role versus correct role. `@testing-library/react` is installed
but no test calls `render()`.

**Documentation** is materially stale. `docs/architecture.md:52` and `README.md:8,36`
claim 31 or 41 tests when there are 157. `docs/agrilocalizacao.md:63-72` describes a
MapLibre/OpenFreeMap provider at a file that does not exist; the code uses MapQuest with
Leaflet. `docs/database.md:130-139` lists migrations only through `008`. `docs/development.md:43-50`
documents an `osm` map provider and Cloudflare variables that `.env.example` has replaced.

---

## 3. Architecture gaps

1. **No capability layer.** Authorization is expressed as plan-name comparisons at ~40
   sites instead of `can(user, permission)`. Adding a permission or a plan means editing
   every site.
2. **Entitlement has no storage.** Capability is derived from a single plan string with no
   subscription or entitlement table, so per-account overrides, trials and grace periods
   have nowhere to live.
3. **Role is decorative.** `requireRole()` is never called and `getUserEntitlements()`
   ignores the roles it is passed. Only plan actually gates anything.
4. **Durable state in process memory.** Carts, orders, tracking, notifications and all
   Academy video metadata live in module-level variables that are lost on restart and not
   shared between instances.
5. **Academy has no domain model.** No course, section, lesson, enrollment or progress
   table exists. The catalogue is a hardcoded array.
6. **Media provider split does not match the target.** Bunny serves product video;
   ImageKit is entirely absent; product images sit in Supabase Storage behind a
   server-proxied upload.
7. **Two dashboard patterns, neither user-scoped.** `/[userId]/dashboard` ignores its own
   route parameter, and the AgriProfile workspace does not exist.
8. **Domain types are monolithic.** One 1,839-line file spans every domain, so no domain
   boundary is expressible in the type system.
9. **Commerce schema and commerce runtime are disconnected.** Complete tables exist and
   the service layer never reads them.
10. **Two parallel geography systems.** The flat `locations` table (`supabase/migrations/20260821000001_phase1_foundation.sql:64`) coexists
    with the `countries → localities` hierarchy (`supabase/migrations/20260821000005_003_geography_and_profile_locations.sql:7-121`), and the manual
    seed files in `supabase/seed/angola/` populate the former.
11. **Four overlapping media tables.** `media_assets` predates and overlaps
    `product_images`, `product_videos` and `academy_videos`.
12. **JSONB holds core relational data.** Category-specific product fields are explicitly
    kept in `metadata JSONB` (`supabase/migrations/20260822000010_020_phase96_animals_land_product_video.sql:19`).

---

## 4. Risks

Ordered by severity. Every one of these is present in a build where typecheck, lint, tests
and build all pass.

### Critical

**R1 — Any authenticated user can grant themselves any plan.**
`POST /api/subscription/activate` reads `plan` from the request body, normalizes it, and
activates it (`src/app/api/subscription/activate/route.ts:14-16`).
`activateUserSubscriptionPlan()` calls `requireAuth()` and then persists — it contains no
payment verification whatsoever (`src/lib/subscription/activate-plan.ts:207-259`;
a search for "payment" in that file returns nothing). The route is also public at the
middleware layer (`src/middleware.ts:17`). A single POST escalates an account to
`enterprise` and unlocks every paid entitlement. Compounding this, no RLS policy restricts
`profiles.subscription_plan`, and the migration that was meant to add one only drops it
(`supabase/migrations/20260822000009_019_phase95_i18n_market_video_product_images.sql:215`).

**R2 — Any paid user can overwrite any other seller's product image.**
`POST /api/products/images` authenticates and checks the uploader's entitlement, but never
verifies that the submitted `productId` belongs to the caller
(`src/app/api/products/images/route.ts:25-33`). It then performs the write with the
**service-role admin client** (`:47`), which bypasses RLS, inserts a `product_images` row
against the attacker-supplied product (`:72-84`), and updates that product's
`primary_image_url` (`:90-93`). The same missing-ownership pattern applies to product
video upload (`src/lib/services/product-video-actions.ts:62-90`).

**R3 — Orders, carts and payments are not persisted.**
`memoryOrders` (`src/lib/services/commerce-service.ts:151`) and `memoryCart` (`:40-52`)
are module-level variables. A process restart or a second instance loses or diverges every
order. The `orders`, `payments` and `carts` tables exist and are never written.

**R4 — Cross-tenant order exposure.**
`CommerceService.getSellerOrders(sellerId?)` returns **all** orders when the argument is
omitted (`src/lib/services/commerce-service.ts:444-449`), and
`getSellerOrdersAction(sellerId?)` calls it after only `requireAuth()`
(`src/lib/services/commerce-actions.ts:79-81`). Neither binds `sellerId` to the session.
`updateFulfillmentStatus` likewise matches a client-supplied `sellerId` with no ownership
check (`src/lib/services/commerce-service.ts:454-468`).

**R5 — Unsigned webhooks are accepted.**
`verifyBunnyWebhook()` returns `isBunnyConfigured()` when `BUNNY_STREAM_WEBHOOK_SECRET` is
unset (`src/lib/video/bunny.ts:243-251`), so any caller can post video status transitions.
When the secret *is* set, verification is plain string equality, not an HMAC. The default
payment adapter is `SandboxPaymentAdapter` (`src/lib/payments/payment-service.ts:21-25`),
whose `validateWebhook()` returns `isValid: true` unconditionally
(`src/lib/payments/sandbox-adapter.ts:73-98`) and which marks orders paid immediately
(`:15-17,40`).

### High

**R6 — Three tables have no RLS at all:** `delivery_zones`, `couriers`,
`order_tracking_events` (`supabase/migrations/20260822000008_018_delivery_logistics_tracking_notifications.sql:7,29,87`). `payment_events` has RLS with zero
policies, which fails closed but signals unfinished work.

**R7 — Academy video metadata is unrecoverable.** `AcademyVideoService` holds all records
and per-owner storage quota in memory (`src/lib/services/academy-video-service.ts:26-27`),
never writes to the `academy_videos` table that exists for it, and the Bunny webhook
updates only memory (`src/app/api/webhooks/bunny/route.ts:35-38`). Storage quota
enforcement resets on every restart.

**R8 — Authorization has no test coverage.** No test in `src/test/` exercises
unauthenticated versus authenticated route access, wrong versus correct owner, or wrong
versus correct role. The eight-case matrix the target testing rule requires is absent, so
R1, R2 and R4 would not be caught by CI.

**R9 — Deletes do not persist.** `deleteProductVideoAction` marks the in-memory record
deleted with no corresponding Supabase update
(`src/lib/services/product-video-actions.ts:131`).

### Medium

**R10 — Plan literals are unmaintainable.** ~40 non-test occurrences across services, API
routes, pages, components, types and three dictionaries.

**R11 — No startup configuration validation.** Placeholder Supabase credentials let the
app boot into a broken state (`src/lib/supabase/client.ts:4-5`).

**R12 — Documentation actively misleads.** Wrong map provider, wrong test counts,
migration registry five files behind, `requireRole()` described as the capability
mechanism when it is dead code.

**R13 — Migration hygiene.** Dual numbering (timestamp plus internal `0NN`), duplicated
`profiles`/`user_roles` creation and duplicated RLS between `phase1` and `007`, three
operator repair scripts outside the migration chain, and a subscription constraint
rewritten four times across `014`–`017`.

**R14 — ESLint is weaker than intended.** `eslint.config.mjs:1-11` disables
`no-unused-vars` and `no-undef` and does not extend `eslint-config-next`.

---

## 5. Existing assets to preserve

These are working and should be evolved, not rebuilt.

- **Clerk-to-Supabase identity bridge**, including JWT template passing for RLS and the
  lazy profile bootstrap that covers webhook lag (`src/lib/clerk/auth.ts:58-165`,
  `src/lib/supabase/server.ts:37-53`).
- **The 26-migration schema.** Commerce, geography and provider/product modelling are more
  complete than the runtime that uses them. The commerce tables in particular are ready to
  receive the Phase 11 migration off in-memory state.
- **PostGIS functions and the five-level Angolan hierarchy**, plus the 18-province seed
  (`supabase/migrations/20260821000012_010_postgis_location_functions.sql`, `supabase/migrations/20260821000010_008_seed_data.sql:24-130`).
- **The product publish pipeline** — entitlement-gated, idempotent, server-resolved seller
  identity (`src/lib/products/create-product.ts:42-177`).
- **Bunny direct TUS upload.** Server authorizes and signs, browser uploads directly, no
  proxying of bytes (`src/lib/video/bunny.ts:110-171`). This is the correct shape for
  signed direct uploads and should be the template for the ImageKit work.
- **`reconcileProductVideoStatus`** — polls the provider to recover from missed webhooks
  (`src/lib/products/video-status.ts:29-54`).
- **The i18n system** — three locales with cookie, localStorage and DB persistence, plus
  the structured `localizeError()` mapping (`src/i18n/errors.ts:3-16`).
- **The theme system** with inline FOIT prevention (`src/lib/theme/provider.tsx:23-40`).
- **The 157-test suite**, all green, especially the plan and entitlement matrices.
- **The Supabase retry wrapper** (`src/lib/supabase/retry.ts:65-94`).
- **The design token system** aligned to Figma (`src/config/tokens.ts`).
- **`normalizePlanSlug()`** — already handles the legacy `free`/`premium` aliases the
  architecture requires preserving (`src/lib/services/pricing-service.ts:111-123`).

---

## 6. Migration candidates

Mapped to the phase that owns each. Ordering follows the dependency chain.

**Phase 2 — Foundation.** Split `src/types/database.ts` (1,839 lines) and
`src/types/domain.ts` (494 lines) into per-domain type modules. Add the two tables missing
from the generated types (`academy_videos`, `enterprise_service_requests`). Establish
shared contracts so cross-domain access stops reaching into other domains' internals.
Behaviour must not change; the 157 tests are the guardrail.

**Phase 3 — Authorization.** Introduce `can()`, `requirePermission()` and
`requireEntitlement()`, and route the ~40 scattered plan literals through them. Give
entitlement real storage so it stops being a pure function of plan name. Make
`getUserEntitlements()` actually use the roles it accepts, or drop the parameters. Close
**R1** by requiring verified payment before plan activation and adding a column-level RLS
policy on `profiles.subscription_plan` — the policy the `019` migration only ever dropped.
Add the eight-case authorization test matrix (**R8**). Preserve the `basic` slug, which
already exists.

**Phase 4 — Media.** Introduce ImageKit for product images, product short videos, profile
images and thumbnails; narrow Bunny to Academy training video only. Remove the in-memory
`ProductVideoService`, `AcademyVideoService` and `ProductMediaService` stores and make
Supabase the metadata source of truth, including the `academy_videos` table that already
exists but is never written (**R7**). Replace the plain-equality Bunny webhook check with a
real signature and remove the unsigned fallback (**R5**). Fix the missing ownership checks
on image and video upload (**R2**). Make deletes persist (**R9**). Evolve `media_assets`
rather than adding a fifth media table.

**Phase 5 — AgriProfile.** Build `/[userId]/agriprofile` as a genuinely user-scoped
workspace, replacing the `/dashboard` pattern and retiring the
`/[userId]/dashboard` alias that ignores its own route parameter. Replace the hardcoded
KPIs and the fake appointment card with aggregation over domain services.

**Phase 6 — AgriShopping.** Remove the `INITIAL_PRODUCTS` fallback so the catalogue cannot
silently serve seed data when the RPC returns empty. Wire the product-requests dashboard to
the `product_requests` table its create-action already writes. Add the missing edit-product
route.

**Phases 7–9 — AgriAcademy.** This is greenfield, not a refactor: create the courses,
sections, lessons, enrollments and progress tables, since none exist. Give
`academy_videos.course_id` and `chapter_id` real foreign keys. Replace `MOCK_COURSES` with
the real catalogue, build the student experience at `/[userId]/my-courses`, and build the
instructor flows with entitlement-gated create, edit, delete and publish.

**Phase 10 — AgriExpert and Localization.** Wire the requests dashboard to the server
actions it already imports but never calls. Model appointments, which do not exist in any
form. Replace `MOCK_MAP_MARKERS` with live entities and move proximity work from the
client-side Haversine onto the existing PostGIS functions. Resolve the two parallel
geography systems.

**Phase 11 — Commerce.** Move cart, checkout, orders, payments, logistics and
notifications from memory onto the tables that already exist (**R3**). Bind every
`sellerId` to the authenticated session and remove the unbounded `getSellerOrders()`
(**R4**). Replace the sandbox adapter's unconditional webhook validation before anything
resembling real payment (**R5**).

**Phase 12 — Hardening.** Enable RLS on `delivery_zones`, `couriers` and
`order_tracking_events`, and add policies to `payment_events` (**R6**). Add startup
configuration validation (**R11**). Extend ESLint to the Next config and re-enable the
disabled rules (**R14**). Move the remaining hardcoded Portuguese strings out of services
and API routes. Bring the top-level docs back in line with the code (**R12**).

**Unscheduled, worth a decision.** Migration hygiene (**R13**): the dual numbering scheme,
the duplicated `profiles`/RLS creation, and the three repair scripts outside the chain.
The rules forbid rewriting migration history, so this is likely a documentation and
convention fix rather than a schema change.

---

## 7. Verification limits

Stated explicitly so later phases do not treat inference as fact.

- **No live database was inspected.** Every schema claim comes from migration files. Which
  migrations have actually been applied, whether the `supabase/repair/` scripts were run,
  and whether duplicate RLS policies from `phase1` and `007` coexist at runtime are all
  unknown.
- **RLS was not executed.** Policy correctness is asserted from SQL text, not tested
  against a real Postgres.
- **No Clerk or provider dashboard was checked.** Whether the `supabase` JWT template
  exists, and how webhooks are configured, cannot be seen from the repository.
- **Deployment topology is unknown.** The severity of every in-memory-state finding
  depends on instance count, and nothing in the repository pins it to a single instance.
- **The 5 skipped integration tests were not run.** They need live Supabase credentials.
- **Runtime behaviour was not exercised.** The application was built but not started, and
  no request was issued against any route. Findings are from code reading plus the four
  validation commands.
