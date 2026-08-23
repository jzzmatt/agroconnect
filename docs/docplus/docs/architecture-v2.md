# AgriConnect Architecture v2

## Status
Architecture Freeze — Phase 1

## Core principle
AgriConnect is an existing production-oriented Next.js application under controlled evolution.
Refactor existing capabilities instead of rebuilding working domains.

## Platform domains
- Core Platform
  - Identity
  - Authorization / Entitlements
  - Media
  - Localization
  - Notifications
  - Audit
- AgriProfile
- AgriShopping
- AgriAcademy
- AgriExpert
- Commerce

## Technology
- Next.js 16 / React 19 / TypeScript
- Clerk: identity/authentication
- Supabase/PostgreSQL: durable application data
- PostGIS: geographic data/search
- ImageKit: product/application images and short product videos
- Bunny Stream: AgriAcademy training videos only
- Figma: visual source of truth
- Portuguese: primary language
- Angola: primary market/geographic model

## Source-of-truth rules
- Clerk owns identity.
- Supabase owns durable application state.
- Supabase migrations define database schema.
- Entitlement service defines capabilities.
- ImageKit owns product/application media delivery.
- Bunny Stream owns Academy training video delivery.
- Figma owns approved visual design.

## Domain ownership
AgriShopping owns products, seller product management, inventory and product media metadata.
AgriAcademy owns courses, sections, lessons, enrollments, progress, certificates and training video metadata.
AgriProfile owns the user's workspace and aggregates information from other domains; it does not duplicate domain business logic.
AgriExpert owns experts, services, requests and appointments.
Commerce owns cart, checkout, orders, payments and delivery.
Localization owns geographic infrastructure and discovery primitives.

## Migration philosophy
Use incremental strangler migrations. Preserve working behavior unless explicitly replaced. Do not perform a big-bang rewrite.
