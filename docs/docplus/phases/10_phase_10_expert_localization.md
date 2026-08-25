PHASE 10 — AGRISERVICE

@09-localization is the lead agent.

Supporting:
@08-agriexpert
@05-agriprofile
@03-authorization
@04-media
@11-qa

IMPORTANT

This phase replaces the old AgriExpert concept with AgriService.

Do not treat this as a simple rename.

AgriService is a unified discovery layer containing:

1. Expert
2. Services
3. Transport

AGRISERVICE ACCESS

Public discovery:
- available to all users

Provider publishing/management:
- Pro
- Business
- Enterprise

Users without an eligible subscription may browse but cannot publish/manage eligible AgriService offerings.

Do not introduce a default Basic subscription.

--------------------------------------------------
EXPERT
--------------------------------------------------

Expert displays published user profiles that qualify as professional/expert profiles.

Only:
profile.status = published

may appear publicly.

The user's professional category determines expert classification.

Clicking an expert opens:

/providers/[slug]

--------------------------------------------------
SERVICES
--------------------------------------------------

Display published user services.

Clicking a service opens its public detail page.

Only published services are discoverable.

--------------------------------------------------
TRANSPORT
--------------------------------------------------

Create a proper Transport domain.

Transport is not merely a category inside Services.

A Transport Service must support:

- provider
- title/description
- flexible origin
- flexible destination
- vehicle
- vehicle type/model
- capacity/load
- vehicle media
- vehicle base location
- price per trip
- price per load
- publication state

Both pricing models must be supported simultaneously.

Example:

Origin: Luanda
Destination: Benguela
Vehicle: Kia Canter
Price/trip: 120,000 Kz
Price/load: 60,000 Kz

--------------------------------------------------
VEHICLE LOCATION
--------------------------------------------------

Implement BASE LOCATION only.

Do NOT implement:
- live GPS tracking
- continuous tracking
- background location streaming

Use the existing AgriLocalização architecture.

--------------------------------------------------
TRANSPORT REQUEST
--------------------------------------------------

Transport includes a mini booking/request workflow.

Customer:
    request transport

Transporter:
    receives notification

Transporter:
    accept OR reject

Customer:
    receives notification

States should support at minimum:

Pending
Accepted
Rejected
Cancelled

Do NOT implement payment yet.

Do NOT implement Commerce here.

The request is a transport request, not yet a financial order.

--------------------------------------------------
LOGISTICS
--------------------------------------------------

Transport becomes the centralized logistics service.

Remove the old:

"Logística e Entregas"

sidebar concept where applicable.

Do not maintain duplicate logistics functionality.

--------------------------------------------------
PROVIDER PAGE
--------------------------------------------------

Implement:

/providers/[slug]

This is a public aggregation page.

It must show ALL content published by that provider across AGROCONNECT, including:

- published profile
- published expert information
- published services
- published transport
- published products
- published courses/training

Only published content may appear.

The Provider page is an aggregation/read-only layer.

It does NOT own:
- products
- courses
- transport
- services

Each domain remains responsible for its own data.

--------------------------------------------------
SHARING
--------------------------------------------------

Create/reuse a common sharing capability.

Support:
- WhatsApp
- Facebook
- Copy link
- native Web Share where appropriate

Share canonical public URLs.

Do not share dashboard/private URLs.

--------------------------------------------------
LOCALIZATION
--------------------------------------------------

Use the existing Angola geographic model.

Do not create a second location engine.

Support:
- province
- municipality
- commune where applicable
- coordinates
- proximity/search where already supported

--------------------------------------------------
SIDEBAR
--------------------------------------------------

Rename/remove old AgriExpert references appropriately.

Add Transport where required.

Remove "Logística e Entregas".

Do not introduce financial/earnings functionality into AgriService.

--------------------------------------------------
AUTHORIZATION
--------------------------------------------------

Publishing and management require eligible subscription.

Public discovery does not.

Database remains source of truth.

--------------------------------------------------
IMPORTANT DOMAIN BOUNDARY

AgriService is a DISCOVERY layer.

It must NOT become the owner of:
- products
- courses
- profiles
- commerce
- payments

Use existing domain ownership.

--------------------------------------------------
VALIDATION

Test:
- public discovery
- subscription restrictions
- expert visibility
- service visibility
- transport publication
- transport request lifecycle
- provider aggregation
- published-only filtering
- localization
- sharing URLs
- authorization
- RLS

Run:
npm run typecheck
npm run lint
npm run test
npm run build
