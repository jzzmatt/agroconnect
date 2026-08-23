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

## Database
Never rewrite historical migrations to hide changes. Add new corrective migrations.

## Phase completion
A phase is complete only when:
- typecheck passes
- lint passes
- tests pass or documented known failures exist
- build passes
- acceptance criteria are satisfied
- documentation is updated
