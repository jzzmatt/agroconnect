# AgriConnect Cursor AI Development Package

This package contains the Phase 1 architecture artifacts, Cursor rules,
specialized agent contracts, and implementation prompts for Phases 0–12.

## Layout

- `/.cursor/rules/` — the eleven `.mdc` rules (including `11-agridev.mdc`), at the repository root so they apply repository-wide.
- `/.cursor/agents/` — the twelve domain contracts, registered as live Cursor subagents.
- `docs/docplus/docs/` — the Phase 1 architecture artifacts.
- `docs/docplus/phases/` — the implementation prompts for Phases 0–12.
- `docs/docplus/CONTEXT_MAP.md` — which files to load for each `@context`.
- `docs/docplus/EXECUTION_GUIDE.md` — the step-by-step runbook for executing the phases.

## How to use

Follow `EXECUTION_GUIDE.md`, which pairs each phase with the subagent that owns it and
gives a copy-paste prompt per step. In summary:

1. Back up/commit the current AgriConnect repository.
2. Start with Step 1 (Phase 0, the read-only audit), then work through the steps in order.
3. Do not allow implementation work from later phases until the current phase passes validation.
4. Use only the relevant @contexts/agent contracts for each task, in a fresh chat per phase.
5. After each phase, run the project's validation commands and update documentation.

## Subagents

The twelve domain contracts in `/.cursor/agents/` are live Cursor subagents. Each
carries `name` and `description` frontmatter, so Cursor can delegate to them
automatically, and each can be invoked explicitly by name:

`foundation`, `identity`, `authorization`, `media`, `agriprofile`,
`agrishopping`, `agriacademy`, `agriexpert`, `localization`, `commerce`,
`qa`, `documentation`.

Every subagent prompt carries a phase gate: none of them may start, resume or
execute a numbered phase from `phases/` without explicit human approval for that
specific phase.

## Locked architectural decisions

- AgriProfile: `/[userId]/agriprofile` and public provider identity (Phases 5+)
- Existing internal `basic` subscription slug is preserved; UI can display `Free`.
- Roles, subscriptions and entitlements are separate.
- Public publishing/management requires a stored Pro/Business/Enterprise plan.
- Product images: ImageKit.
- Product short videos: ImageKit.
- AgriAcademy training videos: Bunny Stream.
- AgriService (Phases 10+): public discovery for Expert, Services and Transport; replaces AgriExpert.
- `/providers/[slug]`: read-only aggregation of published content.
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
