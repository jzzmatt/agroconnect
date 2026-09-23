# AgriConnect Architecture v2

## Status
Architecture Freeze — Phase 1

**Later supersession (Phase 7+):** locked decision 6 is superseded **for AgriAcademy training video only**. From Phase 7, AgriAcademy stores YouTube Unlisted Video IDs. AgroConnect does not host Academy video and must not keep Bunny as an Academy fallback. ImageKit remains the product/application media provider. See `docs/agroconnect-updated-phases.md` and `docs/docplus/phases/README.md`.

## Core principle
AgriConnect is an existing production-oriented Next.js application under controlled evolution.
Refactor existing capabilities instead of rebuilding working domains.

## Locked decisions

These decisions are frozen by Phase 1. Later phases implement them and must not
renegotiate them, except where a later approved roadmap explicitly supersedes a
decision (decision 6, AgriAcademy video provider, from Phase 7).

| # | Decision | Specified in |
|---|---|---|
| 1 | AgriProfile is the user workspace at `/[userId]/agriprofile` | `route-map.md`, this document |
| 2 | The internal `basic` subscription slug is preserved; the UI may display `Free` | `authorization-model.md` |
| 3 | Roles, subscriptions and entitlements are three separate concepts | `authorization-model.md`, `domain-map.md` |
| 4 | Capabilities use granular permissions such as `product.create` and `academy.course.create` | `authorization-model.md` |
| 5 | Product images and short product videos use ImageKit | `media-architecture.md`, this document |
| 6 | AgriAcademy training videos use Bunny Stream (Phase 1 freeze; **superseded from Phase 7** by YouTube Unlisted Video IDs) | `media-architecture.md`, this document |
| 7 | Supabase stores durable media metadata | `media-architecture.md`, this document |
| 8 | Process-local durable state is removed in later phases | `media-architecture.md`, `migration-strategy.md` |
| 9 | Domain types are split by domain | this document, `migration-strategy.md` |
| 10 | Existing routes migrate incrementally; no big-bang rewrite | `route-map.md`, `migration-strategy.md` |

Decisions 5, 6 and 9 describe work that does not exist yet rather than a change to
working code. See `phase-0-audit.md`: ImageKit is absent from the repository entirely,
Bunny Stream currently serves product video as well as Academy video, and domain types
live in one 1,839-line module. Treat these as construction, not substitution.

## Platform domains

Seven domains, matching `.cursor/rules/01-architecture.mdc`:

- Core Platform — Identity, Authorization/Entitlements, Media, Notifications, Audit
- AgriProfile
- AgriShopping
- AgriAcademy
- AgriExpert
- Localization
- Commerce

Localization is a domain in its own right rather than a Core Platform sub-capability,
because it owns the geographic primitives that other domains consume.

## Technology
- Next.js 16 / React 19 / TypeScript
- Clerk: identity/authentication
- Supabase/PostgreSQL: durable application data
- PostGIS: geographic data/search
- ImageKit: product/application images and short product videos
- AgriAcademy training video (from Phase 7): YouTube Unlisted Video ID stored in AgroConnect; Bunny Stream is not an Academy provider
- Figma: visual source of truth
- Portuguese: primary language
- Angola: primary market/geographic model

## Source-of-truth rules
- Clerk owns identity.
- Supabase owns durable application state.
- Supabase migrations define database schema.
- Entitlement service defines capabilities.
- ImageKit owns product/application media delivery.
- AgriAcademy owns Academy training-video references (YouTube Unlisted Video IDs from Phase 7). Bunny Stream must not remain as an Academy fallback.
- Figma owns approved visual design.

## Domain ownership
AgriShopping owns products, seller product management, inventory and product media metadata.
AgriAcademy owns courses, sections, lessons, enrollments, progress, certificates and training video metadata.
AgriProfile owns the user's workspace at `/[userId]/agriprofile` and aggregates information from other domains; it does not duplicate domain business logic.
AgriExpert owns experts, services, requests and appointments.
Commerce owns cart, checkout, orders, payments and delivery.
Localization owns geographic infrastructure and discovery primitives.
Authorization owns subscription resolution, entitlements and permission guards.

## Domain type organization
Domain types are split by domain. A single type module spanning multiple domains is not
acceptable, because it makes domain boundaries inexpressible in the type system and forces
unrelated domains to change together.

Each domain owns its own types and publishes the subset other domains may consume. Shared
primitives that genuinely belong to no single domain live in a shared contract module.
Generated database types are split along the same domain lines.

## Durable state
Supabase is the source of truth for all durable business state. Process-local state — a
module-level `Map`, `Set`, array or object — is never the source of truth for media,
subscriptions, products, courses, enrollments, orders, notifications or permissions.

Such state exists in the current implementation and is removed in the phase that owns each
affected domain, not in a single sweep. `phase-0-audit.md` inventories every occurrence.

## Migration philosophy
Use incremental strangler migrations. Preserve working behavior unless explicitly replaced. Do not perform a big-bang rewrite.
