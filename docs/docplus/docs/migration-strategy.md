# AgriConnect Migration Strategy

## Principle
Strangler migration, not big-bang rewrite.

## Sequence
1. Architecture freeze
2. Foundation/type refactor
3. Authorization/entitlements
4. Media infrastructure
5. AgriProfile
6. AgriShopping
7. AgriAcademy foundation
8. Academy student
9. Academy instructor
10. AgriExpert + Localization integration
11. Commerce stabilization
12. Production hardening

## Migration pattern
CURRENT implementation
→ adapter/compatibility layer
→ new domain service
→ new UI
→ tests
→ deprecate old implementation
→ remove old implementation after verification

## Cross-phase workstreams
Two locked decisions are not phases of their own and are executed inside the phase that
owns each affected domain:

- **Domain type split (decision 9)** begins in phase 2 and each later phase keeps its own
  domain's types separate. Phase 2 does not finish the job for domains it does not own.
- **Removal of process-local durable state (decision 8)** happens per domain: media state
  in phase 4, order/cart/notification state in phase 11, Academy state in phases 7–9.
  `phase-0-audit.md` inventories every occurrence.

## Database
Never rewrite historical migrations to hide changes. Add new corrective migrations.

## Phase completion
A phase is complete only when:
- typecheck passes
- lint passes
- tests pass
- build passes
- acceptance criteria are satisfied
- documentation is updated

All four commands must pass. A known failure may be carried only if it is documented, has
an owning phase, and is not a security or data-integrity failure — phase 12 may not be
marked complete while any such failure remains open.
