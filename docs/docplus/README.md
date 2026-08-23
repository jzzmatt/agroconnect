# AgriConnect Cursor AI Development Package

This package contains the Phase 1 architecture artifacts, Cursor rules,
specialized agent contracts, and implementation prompts for Phases 0–12.

## Layout

- `/.cursor/rules/` — the ten `.mdc` rules, at the repository root so they apply repository-wide.
- `docs/docplus/.cursor/agents/` — the specialized agent contracts.
- `docs/docplus/docs/` — the Phase 1 architecture artifacts.
- `docs/docplus/phases/` — the implementation prompts for Phases 0–12.
- `docs/docplus/CONTEXT_MAP.md` — which files to load for each `@context`.

## How to use

1. Back up/commit the current AgriConnect repository.
2. Start with `phases/01_phase_1_architecture_freeze.md`.
3. Do not allow implementation work from later phases until the current phase passes validation.
4. Use only the relevant @contexts/agent contracts for each task.
5. After each phase, run the project's validation commands and update documentation.

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
