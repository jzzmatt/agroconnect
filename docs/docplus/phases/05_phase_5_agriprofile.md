PHASE 5 — AGRIPROFILE / PUBLIC PROVIDER FOUNDATION

@05-agriprofile is the lead agent.

Supporting agents:
@02-identity
@03-authorization
@04-media
@09-localization
@11-qa

GOAL

Refactor the current user profile into a publishable public provider profile.

The profile must support:
- private/draft state
- published state
- paused state
- public profile visibility
- professional/category information
- profile image
- public provider identity
- future aggregation through /providers/[slug]

IMPORTANT BUSINESS RULES

1. A user profile exists independently from its public publication state.
2. A profile must not automatically become public.
3. The user explicitly publishes the profile.
4. Published profiles can appear in AgriService > Expert.
5. Paused profiles must disappear from public discovery but remain available to the owner.
6. Unpublished/draft profiles must never appear publicly.
7. Only Pro, Business and Enterprise users can publish/manage public provider functionality.
8. Users without an eligible subscription can still maintain their private profile.
9. subscription_plan comes from the database.
10. Do not introduce a default Basic plan.

PROFILE MEDIA

Add profile picture support using the existing media architecture and ImageKit integration.

Do not create a parallel image-upload architecture.

The implementation must:
- upload the profile image through the existing media abstraction
- optimize it through ImageKit
- persist the required reference in the database
- display an optimized version
- handle replacement/removal safely

PUBLIC PROVIDER

Introduce the conceptual public provider identity required by:

/providers/[slug]

The provider page itself may be implemented only to the extent necessary to establish the foundation. Do not implement full cross-domain aggregation yet if that belongs to a later phase.

The provider identity must have a stable public slug/identifier.

SECURITY

Public users may only access:
- published profile information
- published profile media
- information explicitly intended for public display

Never expose:
- private profile fields
- internal user identifiers unless already designed for public use
- subscription information
- authorization information
- private contact/security information

DASHBOARD

Update the profile management UI so the user can:
- edit profile
- add/change profile image
- publish
- pause publication
- resume publication

Clearly communicate the current publication state.

Do not create a new unrelated profile management system.

VALIDATION

Add tests for:
- draft profile is not public
- published profile is public
- paused profile is not public
- eligible subscription can publish
- ineligible/no subscription cannot publish
- profile image persistence
- public profile only exposes intended fields

Run:
npm run typecheck
npm run lint
npm run test
