# Phase 0 — Repository Audit Prompt

> Unchanged. Phases 0–6 keep their existing approved definitions. The AgriAcademy YouTube refactor starts at Phase 7. See `docs/agroconnect-updated-phases.md`.


@00-master

Perform a read-only forensic audit of the existing AgriConnect repository.

Inspect:
- routes
- components
- services
- Supabase migrations/schema/RLS
- Clerk/auth
- subscriptions
- media
- AgriShopping
- AgriAcademy
- AgriExpert
- Localization
- Commerce
- tests
- environment configuration
- documentation

Do not implement features.

Produce:
- current state
- architecture gaps
- risks
- existing assets to preserve
- migration candidates

Do not invent missing facts.
