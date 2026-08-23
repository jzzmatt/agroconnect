# Phase 2 — Foundation Refactor Prompt

@00-master

Refactor only foundational architecture.

Goals:
- split monolithic domain types by domain
- establish shared contracts
- normalize service boundaries
- preserve current behavior
- remove obvious dead/duplicate abstractions only when proven safe

Do not implement AgriProfile, ImageKit migration, Academy LMS, or new commerce features.

Required:
- typecheck
- lint
- tests
- build

Document any compatibility adapters introduced.
