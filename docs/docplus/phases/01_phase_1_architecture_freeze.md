# Phase 1 — Architecture Freeze Prompt

@00-master

This phase is documentation/rules only. Do not refactor application code.

Create or update:
- docs/architecture-v2.md
- docs/domain-map.md
- docs/authorization-model.md
- docs/media-architecture.md
- docs/route-map.md
- docs/migration-strategy.md
- .cursor/rules/*
- .cursor/agents/*

Adopt these locked decisions:
1. AgriProfile becomes the user workspace at /[userId]/agriprofile.
2. Preserve the existing internal `basic` subscription slug; UI may display Free.
3. Roles, subscriptions and entitlements are separate.
4. Use granular permissions such as product.create and academy.course.create.
5. Product images and short product videos use ImageKit.
6. Academy training videos use Bunny Stream.
7. Supabase stores durable media metadata.
8. Remove process-local durable state in later phases.
9. Split domain types by domain.
10. Existing routes migrate incrementally; no big-bang rewrite.

Validate all artifacts for contradictions.
Do not start Phase 2.
