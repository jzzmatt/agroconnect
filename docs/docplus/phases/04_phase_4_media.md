# Phase 4 — Media Infrastructure Prompt

> Unchanged. Phases 0–6 keep their existing approved definitions. From Phase 7, AgriAcademy training video moves from Bunny Stream to YouTube Unlisted. ImageKit remains the product/application media provider. See `docs/agroconnect-updated-phases.md`.


@00-master
@04-media
@06-agrishopping
@07-agriacademy
@11-qa

Refactor media infrastructure.

Target:
ImageKit:
- product images
- product short videos
- profile/application images
- thumbnails

Bunny Stream:
- AgriAcademy training videos only

Evolve existing media_assets where appropriate instead of creating unnecessary parallel media systems.

Remove process-local durable ProductVideoService state.

Use Supabase as metadata source of truth.
Prefer signed/direct provider uploads.
Keep provider secrets server-side.
Implement lifecycle/error states and webhook handling where required.

Do not redesign Academy or Product UI in this phase.
