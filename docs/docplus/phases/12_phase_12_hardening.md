PHASE 12 — PRODUCTION HARDENING

> Academy update: this phase now includes a YouTube Academy hardening and Bunny-removal audit for AgriAcademy. See `docs/agroconnect-updated-phases.md`.


@00-master is the lead agent.

Supporting:
@11-qa
@12-docs
affected domain agents

GOAL

Perform a complete production hardening and architecture review of AGROCONNECT after Phases 5–11.

DO NOT introduce new product features.

This phase is for:
- security
- authorization
- RLS
- performance
- regression
- architecture consistency
- data integrity
- error handling
- localization completeness
- documentation
- production readiness

--------------------------------------------------
SUBSCRIPTION
--------------------------------------------------

Verify:

- no implicit Basic plan
- null subscription is valid
- Control Panel locked without eligible subscription
- database is source of truth
- Pro/Business/Enterprise publishing rules work correctly
- browser cache cannot bypass entitlement

--------------------------------------------------
PROVIDER
--------------------------------------------------

Verify:

/providers/[slug]

shows only published content.

Verify aggregation across:
- Profile
- Expert
- Services
- Transport
- Products
- Courses

No private data leakage.

--------------------------------------------------
AGRISERVICE
--------------------------------------------------

Verify:
- Expert
- Services
- Transport

Public discovery works for all users.

Publishing requires eligible plan.

--------------------------------------------------
TRANSPORT
--------------------------------------------------

Verify:
- origin/destination
- vehicle
- base location
- media
- price/trip
- price/load
- request state machine
- notifications
- authorization
- no payment logic accidentally embedded in AgriService

--------------------------------------------------
COMMERCE
--------------------------------------------------

Verify:
- cart
- checkout
- orders
- payments
- earnings
- commissions

Financial information remains inside Commerce.

--------------------------------------------------
SECURITY

Audit:
- Clerk integration
- Supabase RLS
- server actions/API
- ownership checks
- IDOR risks
- unauthorized publishing
- unauthorized profile access
- unauthorized transport modification
- unauthorized product modification
- unauthorized course modification

--------------------------------------------------
PERFORMANCE

Review:
- redundant auth calls
- profile database waterfalls
- subscription fetching
- route navigation
- unnecessary client rendering
- duplicate Supabase calls
- expensive geographic queries
- unnecessary media requests

Do not reintroduce the performance problems previously fixed.

--------------------------------------------------
YOUTUBE ACADEMY / BUNNY REMOVAL
--------------------------------------------------

Search the repository for Academy-specific references to:

- Bunny
- bunny.net
- BunnyCDN
- Bunny video IDs
- Bunny playback
- Bunny upload
- Bunny storage
- Bunny processing

Remove obsolete Academy dependencies.

If Bunny is used by another unrelated domain, do not remove that unrelated functionality.

Verify:

- YouTube URL validation
- Video ID extraction
- malformed URL rejection
- enrollment authorization
- course publication authorization
- protected learning route
- student privacy
- no unauthorized course data exposure

Use the official YouTube embedded-player architecture.

Do not allow arbitrary external iframe/video domains through the Academy lesson video field.

Enrollment security:

```text
Anonymous → cannot access learning experience
Authenticated + not enrolled → cannot access learning experience
Authenticated + enrolled → can access learning experience
```

Course lifecycle security, server-side:

```text
Published → cannot delete directly
Published → Pause → Delete
```

Client-side status must never be trusted for destructive authorization.

The approved direction is **remove Bunny immediately** for AgriAcademy.

Do not build an automatic Bunny → YouTube migration.

Existing Academy courses containing Bunny references must not remain publicly published in a broken state. Remove/archive them according to the implementation plan; do not silently convert them without a valid YouTube reference.

Avoid unnecessary YouTube API calls. The stored Video ID should be sufficient to render the embedded player.

Do not call external YouTube APIs on every Academy page load unless an explicit feature requires it.

No unresolved Academy Bunny dependency should remain.


--------------------------------------------------
REGRESSION

Run:
npm run typecheck
npm run lint
npm run test
npm run build

Review existing tests and add missing regression coverage.

--------------------------------------------------
DOCUMENTATION

Update relevant documentation for:
- architecture
- domain boundaries
- AgriService
- AgriProfile
- Transport
- Commerce
- authorization
- publication states
- provider aggregation
- development workflow

Do not create documentation that contradicts the implemented repository.

FINAL OUTPUT

Provide:
- architecture health
- security findings
- performance findings
- regression findings
- unresolved technical debt
- documentation status
- production readiness assessment

Do not modify unrelated functionality simply for cosmetic reasons.
