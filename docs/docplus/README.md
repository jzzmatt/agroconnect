# AgriConnect Cursor AI Development Package

This package contains the Phase 1 architecture artifacts, Cursor rules,
specialized agent contracts, and implementation prompts for Phases 0–12.

## How to use

1. Back up/commit the current AgriConnect repository.
2. Copy `.cursor/` and `docs/` into the repository.
3. Start with `phases/01_phase_1_architecture_freeze.md`.
4. Do not allow implementation work from later phases until the current phase passes validation.
5. Use only the relevant @contexts/agent contracts for each task.
6. After each phase, run the project's validation commands and update documentation.

## Locked architectural decisions

- AgriProfile: `/[userId]/agriprofile`
- Existing internal `basic` subscription slug is preserved; UI can display `Free`.
- Roles, subscriptions and entitlements are separate.
- Product images: ImageKit.
- Product short videos: ImageKit.
- AgriAcademy training videos: Bunny Stream.
- Supabase: durable metadata/application state.
- Clerk: identity.
- PostGIS: geographic infrastructure.
- Figma: UI source of truth.
- Portuguese: primary language.
- Angola: primary market.

## Important

These prompts are designed for Cursor to inspect the existing codebase before editing.
They are intentionally scoped so that each agent receives a small context window.
Do not paste all phase prompts into a single Cursor conversation.
